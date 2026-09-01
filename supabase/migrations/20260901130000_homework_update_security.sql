-- TutorFlow: Homework Update Security
--
-- Fixes HIGH-1 from the security audit.
-- Previously, the homework_student_update RLS policy allowed students
-- to modify ANY column (description, review_id, created_at, etc.).
--
-- This trigger ensures that when the authenticated user is a student
-- (i.e., not the tutor who owns the homework), only the `completed`
-- column may be changed.
--
-- The trigger uses auth.uid() to determine the user and checks
-- whether the user is the tutor (via the session ownership chain).
-- If the user is NOT the tutor, only `completed` may be modified.

CREATE OR REPLACE FUNCTION restrict_homework_student_update()
RETURNS trigger AS $$
DECLARE
  is_tutor boolean;
BEGIN
  -- Check if the current user is the tutor who owns this homework
  SELECT EXISTS (
    SELECT 1
    FROM session_reviews r
    JOIN sessions s ON r.session_id = s.id
    WHERE r.id = NEW.review_id
      AND s.tutor_id = auth.uid()
  ) INTO is_tutor;

  -- Tutors can update freely (within RLS constraints)
  IF is_tutor THEN
    RETURN NEW;
  END IF;

  -- Non-tutors (students) can ONLY change `completed`
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    RAISE EXCEPTION 'Students cannot modify homework description';
  END IF;

  IF NEW.review_id IS DISTINCT FROM OLD.review_id THEN
    RAISE EXCEPTION 'Students cannot change homework review association';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Students cannot modify homework created_at';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Students cannot modify homework id';
  END IF;

  -- Only completed may be changed — this is allowed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_homework_student_update
  BEFORE UPDATE ON homework_items
  FOR EACH ROW
  EXECUTE FUNCTION restrict_homework_student_update();
