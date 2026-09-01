-- TutorFlow Database Schema
-- Initial application schema migration
--
-- Tables: profiles, students, sessions, session_plans, session_reviews, homework_items
-- Features: role enforcement, double-booking prevention, session state machine,
--           completed-session locking, RLS policies

-- ============================================================
-- EXTENSIONS
-- ============================================================

-- Required for exclusion constraints with scalar types (uuid)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- TABLE: profiles
-- ============================================================
-- One row per auth user. Stores role and display name.
-- profiles.id is the same UUID as auth.users(id).

CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('tutor', 'student')),
  full_name  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: students
-- ============================================================
-- Domain record for a student, owned by a tutor.
-- user_id links to the student's Supabase Auth account (NOT NULL).
-- ON DELETE RESTRICT: deleting an auth user while a student record
-- exists is blocked to protect historical tutoring data.

CREATE TABLE students (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name          text NOT NULL,
  email         text,
  subject       text NOT NULL,
  current_level text,
  learning_goals text,
  weak_areas    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Composite unique constraint required for the sessions composite FK
ALTER TABLE students ADD CONSTRAINT students_id_tutor_unique UNIQUE (id, tutor_id);

-- ============================================================
-- FUNCTION: check_tutor_role()
-- ============================================================
-- Ensures tutor_id references a profile with role = 'tutor'.
-- CHECK constraints cannot query other tables, so a trigger is needed.

CREATE OR REPLACE FUNCTION check_tutor_role()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.tutor_id AND role = 'tutor'
  ) THEN
    RAISE EXCEPTION 'tutor_id must reference a profile with role ''tutor''';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_students_tutor_role
  BEFORE INSERT OR UPDATE OF tutor_id ON students
  FOR EACH ROW
  EXECUTE FUNCTION check_tutor_role();

-- ============================================================
-- FUNCTION: prevent_role_change()
-- ============================================================
-- Prevents users from changing their own role (e.g. student → tutor).
-- Role assignment is controlled by trusted server-side logic only.

CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Role cannot be changed after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_no_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();

-- ============================================================
-- TABLE: sessions
-- ============================================================
-- A one-to-one tutoring session between a tutor and a student.
-- The composite FK (student_id, tutor_id) ensures the student
-- belongs to the tutor who owns the session.

CREATE TABLE sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL,
  topic           text NOT NULL,
  start_at        timestamptz NOT NULL,
  end_at          timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'ai_reviewed')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  ai_reviewed_at  timestamptz,

  -- Ensure end_at > start_at
  CONSTRAINT sessions_time_check CHECK (end_at > start_at),

  -- Composite FK: student must belong to the session's tutor
  CONSTRAINT sessions_student_tutor_fk
    FOREIGN KEY (student_id, tutor_id)
    REFERENCES students(id, tutor_id)
    ON DELETE CASCADE
);

-- ============================================================
-- EXCLUSION CONSTRAINT: double-booking prevention
-- ============================================================
-- Prevents a tutor from having overlapping sessions.
-- Uses tstzrange with '[)' (half-open) so adjacent sessions are allowed:
--   10:00–11:00 and 11:00–12:00 → allowed
--   10:00–11:00 and 10:30–11:30 → rejected
--
-- Applies to ALL sessions (including ai_reviewed) for simplicity.
-- Historical sessions naturally don't overlap future ones.

ALTER TABLE sessions ADD CONSTRAINT sessions_no_overlap
  EXCLUDE USING gist (
    tutor_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  );

-- ============================================================
-- FUNCTION: enforce_session_update()
-- ============================================================
-- Enforces valid session state transitions and completed-session locking.
--
-- Valid transitions:
--   scheduled → in_progress
--   in_progress → completed    (auto-sets completed_at)
--   completed → ai_reviewed    (auto-sets ai_reviewed_at)
--
-- Same-status updates:
--   scheduled/in_progress: allowed (editable fields)
--   completed/ai_reviewed: BLOCKED (row is immutable)
--
-- Auto-set timestamps:
--   completed_at = now() when in_progress → completed
--   ai_reviewed_at = now() when completed → ai_reviewed

CREATE OR REPLACE FUNCTION enforce_session_update()
RETURNS trigger AS $$
BEGIN
  -- Status is not changing
  IF NEW.status = OLD.status THEN
    -- Lock completed and ai_reviewed sessions: no field changes allowed
    IF OLD.status IN ('completed', 'ai_reviewed') THEN
      RAISE EXCEPTION 'Cannot modify a % session', OLD.status;
    END IF;
    -- scheduled/in_progress: allow field updates (topic, notes, times)
    RETURN NEW;
  END IF;

  -- Status IS changing: enforce valid transitions only
  IF OLD.status = 'scheduled' AND NEW.status = 'in_progress' THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
    NEW.completed_at := now();
    RETURN NEW;
  ELSIF OLD.status = 'completed' AND NEW.status = 'ai_reviewed' THEN
    NEW.ai_reviewed_at := now();
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid session transition: % → %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_session_update
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_session_update();

-- ============================================================
-- TABLE: session_plans
-- ============================================================
-- AI-generated session plan. One plan per session.
-- Stores learning objectives, lesson outline, and practice questions.

CREATE TABLE session_plans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         uuid NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  objectives         text[] NOT NULL DEFAULT '{}',
  lesson_outline     jsonb NOT NULL DEFAULT '[]',
  practice_questions text[] NOT NULL DEFAULT '{}',
  ai_model           text,
  ai_prompt_version  text,
  ai_generated_at    timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: session_reviews
-- ============================================================
-- AI-generated session review. One review per session.
-- Contains summary, next-topic suggestion, and links to homework.

CREATE TABLE session_reviews (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  summary           text NOT NULL,
  next_topic        text,
  ai_model          text,
  ai_prompt_version text,
  ai_generated_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: homework_items
-- ============================================================
-- Individual homework tasks from AI-generated session reviews.
-- Linked only via review_id; session and student are derivable
-- through the FK chain: homework_items → session_reviews → sessions.

CREATE TABLE homework_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   uuid NOT NULL REFERENCES session_reviews(id) ON DELETE CASCADE,
  description text NOT NULL,
  completed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Students by tutor (most common tutor query)
CREATE INDEX idx_students_tutor_id ON students (tutor_id);

-- Sessions by tutor + time (tutor's session list + exclusion constraint support)
CREATE INDEX idx_sessions_tutor_start ON sessions (tutor_id, start_at);

-- Sessions by student + time (student dashboard)
CREATE INDEX idx_sessions_student_start ON sessions (student_id, start_at);

-- Homework by review (session detail view)
CREATE INDEX idx_homework_items_review ON homework_items (review_id);

-- ============================================================
-- FUNCTION: update_updated_at()
-- ============================================================
-- Reusable trigger to auto-set updated_at on row updates.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_session_plans_updated_at
  BEFORE UPDATE ON session_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_session_reviews_updated_at
  BEFORE UPDATE ON session_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- PROFILES policies
-- ----------------------------------------------------------

-- Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

-- Users can update their own profile (role changes blocked by trigger)
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Users can insert their own profile (used during signup)
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------
-- STUDENTS policies
-- ----------------------------------------------------------

-- Tutor: read their own students
CREATE POLICY students_tutor_select ON students
  FOR SELECT USING (tutor_id = auth.uid());

-- Tutor: create students for themselves
CREATE POLICY students_tutor_insert ON students
  FOR INSERT WITH CHECK (tutor_id = auth.uid());

-- Tutor: update their own students
CREATE POLICY students_tutor_update ON students
  FOR UPDATE USING (tutor_id = auth.uid()) WITH CHECK (tutor_id = auth.uid());

-- Tutor: delete their own students
CREATE POLICY students_tutor_delete ON students
  FOR DELETE USING (tutor_id = auth.uid());

-- Student: read their own student record
CREATE POLICY students_self_select ON students
  FOR SELECT USING (user_id = auth.uid());

-- ----------------------------------------------------------
-- SESSIONS policies
-- ----------------------------------------------------------

-- Tutor: read their own sessions
CREATE POLICY sessions_tutor_select ON sessions
  FOR SELECT USING (tutor_id = auth.uid());

-- Tutor: create sessions for their own students
-- (composite FK already enforces student belongs to tutor)
CREATE POLICY sessions_tutor_insert ON sessions
  FOR INSERT WITH CHECK (tutor_id = auth.uid());

-- Tutor: update their own sessions
CREATE POLICY sessions_tutor_update ON sessions
  FOR UPDATE USING (tutor_id = auth.uid()) WITH CHECK (tutor_id = auth.uid());

-- Tutor: delete their own sessions
CREATE POLICY sessions_tutor_delete ON sessions
  FOR DELETE USING (tutor_id = auth.uid());

-- Student: read sessions where they are the student
CREATE POLICY sessions_student_select ON sessions
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- ----------------------------------------------------------
-- SESSION PLANS policies
-- ----------------------------------------------------------

-- Tutor: read plans for their sessions
CREATE POLICY plans_tutor_select ON session_plans
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE tutor_id = auth.uid())
  );

-- Tutor: insert plans for their sessions
CREATE POLICY plans_tutor_insert ON session_plans
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE tutor_id = auth.uid())
  );

-- Tutor: update plans for their sessions
CREATE POLICY plans_tutor_update ON session_plans
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE tutor_id = auth.uid())
  ) WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE tutor_id = auth.uid())
  );

-- Student: read plans for their own sessions
CREATE POLICY plans_student_select ON session_plans
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN students st ON s.student_id = st.id
      WHERE st.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------
-- SESSION REVIEWS policies
-- ----------------------------------------------------------

-- Tutor: read reviews for their sessions
CREATE POLICY reviews_tutor_select ON session_reviews
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE tutor_id = auth.uid())
  );

-- Tutor: insert reviews for their sessions
CREATE POLICY reviews_tutor_insert ON session_reviews
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE tutor_id = auth.uid())
  );

-- Tutor: update reviews for their sessions
CREATE POLICY reviews_tutor_update ON session_reviews
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE tutor_id = auth.uid())
  ) WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE tutor_id = auth.uid())
  );

-- Student: read reviews for their own sessions
CREATE POLICY reviews_student_select ON session_reviews
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN students st ON s.student_id = st.id
      WHERE st.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------
-- HOMEWORK ITEMS policies
-- ----------------------------------------------------------

-- Tutor: read homework for their sessions
CREATE POLICY homework_tutor_select ON homework_items
  FOR SELECT USING (
    review_id IN (
      SELECT r.id FROM session_reviews r
      JOIN sessions s ON r.session_id = s.id
      WHERE s.tutor_id = auth.uid()
    )
  );

-- Tutor: insert homework for their sessions
CREATE POLICY homework_tutor_insert ON homework_items
  FOR INSERT WITH CHECK (
    review_id IN (
      SELECT r.id FROM session_reviews r
      JOIN sessions s ON r.session_id = s.id
      WHERE s.tutor_id = auth.uid()
    )
  );

-- Student: read homework for their own sessions
CREATE POLICY homework_student_select ON homework_items
  FOR SELECT USING (
    review_id IN (
      SELECT r.id FROM session_reviews r
      JOIN sessions s ON r.session_id = s.id
      JOIN students st ON s.student_id = st.id
      WHERE st.user_id = auth.uid()
    )
  );

-- Student: update homework (mark completed) for their own sessions
CREATE POLICY homework_student_update ON homework_items
  FOR UPDATE USING (
    review_id IN (
      SELECT r.id FROM session_reviews r
      JOIN sessions s ON r.session_id = s.id
      JOIN students st ON s.student_id = st.id
      WHERE st.user_id = auth.uid()
    )
  ) WITH CHECK (
    review_id IN (
      SELECT r.id FROM session_reviews r
      JOIN sessions s ON r.session_id = s.id
      JOIN students st ON s.student_id = st.id
      WHERE st.user_id = auth.uid()
    )
  );
