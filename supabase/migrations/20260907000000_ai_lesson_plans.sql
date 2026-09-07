-- ai_lesson_plans table stores AI-generated lesson plans for students
create table if not exists ai_lesson_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  learning_objectives jsonb not null default '[]',
  lesson_outline jsonb not null default '[]',
  practice_questions jsonb not null default '[]',
  topic text,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table ai_lesson_plans enable row level security;

-- Policies
create policy "Students can view their own lesson plans"
  on ai_lesson_plans for select
  using (auth.uid() = student_id);

create policy "Tutors can view lesson plans for their students"
  on ai_lesson_plans for select
  using (
    exists (
      select 1 from sessions
      where sessions.id = ai_lesson_plans.session_id
      and sessions.tutor_id = auth.uid()
    )
  );

-- Index for faster lookups
create index if not exists ai_lesson_plans_student_id_idx on ai_lesson_plans(student_id);
create index if not exists ai_lesson_plans_session_id_idx on ai_lesson_plans(session_id);
