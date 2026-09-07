# TutorFlow

TutorFlow is a small web application for one-to-one online tutoring. It provides separate tutor and student experiences, session lifecycle management, session notes, homework, progress tracking, and AI-assisted lesson planning and session review.

## Live Application

**Live URL:** https://tutorflow-chi.vercel.app

**Login:** https://tutorflow-chi.vercel.app/login

> The application is deployed and intended to be tested using the credentials in [`TEST_CREDENTIALS.md`](./TEST_CREDENTIALS.md).

## Project Overview

### Tutor

A tutor can:

- Add and manage students
- Schedule tutoring sessions
- Start and complete sessions
- Write session notes with autosave
- Generate an AI lesson plan before a session
- Trigger an AI review after a session
- View previous sessions and student context

### Student

A student can:

- Sign in with their own account
- View their upcoming sessions
- View previous session information and notes
- View homework
- Track learning progress
- View AI-generated learning information associated with their sessions

## Tech Stack

| Area            | Technology                             |
| --------------- | -------------------------------------- |
| Framework       | Next.js 16.3.4                         |
| Language        | TypeScript                             |
| UI              | React 19                               |
| Styling         | Tailwind CSS v4 + custom CSS variables |
| Icons           | lucide-react                           |
| Database        | Supabase / PostgreSQL                  |
| Authentication  | Supabase Auth                          |
| AI              | Google Gemini                          |
| Deployment      | Vercel                                 |
| Package manager | npm                                    |

## Architecture

TutorFlow uses the Next.js App Router.

The application keeps sensitive operations on the server, including authentication/authorization checks, session state transitions, and AI API calls.

Important areas of the codebase:

```text
app/
├── api/
│   ├── auth/
│   └── tutor/
│       └── sessions/
│           └── [id]/
│               ├── route.ts
│               ├── plan/
│               │   └── route.ts
│               └── review/
│                   └── route.ts
├── login/
├── tutor/
└── student/

components/
├── AppNav.tsx
├── SessionActions.tsx
├── SessionRow.tsx
├── StatCard.tsx
├── StudentsManager.tsx
├── AILessonPlan.tsx
├── HomeworkToggle.tsx
└── ...

lib/
├── ai/
│   ├── gemini.ts
│   └── prompts/
├── supabase/
│   └── auth.ts
└── theme/

supabase/
└── migrations/
```

## Authentication and Authorization

TutorFlow uses Supabase Auth with email/password authentication.

Role authorization is handled server-side:

- `lib/supabase/auth.ts` provides `getProfile()`, `requireTutor()`, and `requireStudent()`.
- `app/tutor/layout.tsx` protects tutor routes.
- `app/student/layout.tsx` protects student routes.
- Tutor API operations verify the authenticated tutor and the tutor's ownership of the requested session.
- Student queries are scoped to the authenticated student's identity.
- Tutor queries are scoped to the authenticated tutor.
- Logout is handled through the application logout API and returns the user to `/login`.

The application does not rely only on hiding buttons in the frontend for role separation.

## Database

TutorFlow uses Supabase PostgreSQL.

### `profiles`

Stores application user profile information.

Important fields include:

- `id`
- `full_name`
- `role`

The profile is associated with the authenticated Supabase user.

### `students`

Stores student records and their tutor relationship.

Important fields include:

- `id`
- `user_id`
- `name`
- `subject`
- `current_level`
- `tutor_id`

### `sessions`

Stores tutoring sessions.

Important fields include:

- `id`
- `topic`
- `start_at`
- `end_at`
- `status`
- `notes`
- `tutor_id`
- `student_id`
- `updated_at`

Session status values are:

- `scheduled`
- `in_progress`
- `completed`
- `ai_reviewed`

### `session_plans`

Stores AI-generated session plans.

Important fields include:

- `id`
- `session_id`
- `objectives`
- `lesson_outline`
- `practice_questions`
- `ai_model`
- `ai_prompt_version`
- `ai_generated_at`

### `session_reviews`

Stores AI-generated post-session reviews.

Important fields include:

- `id`
- `session_id`
- `summary`
- `next_topic`
- `homework`
- `ai_generated_at`

### `homework_items`

Stores individual homework items generated from session reviews.

Important fields include:

- `id`
- `description`
- `completed`
- `created_at`
- `review_id`

### `ai_lesson_plans`

An additional lesson-plan table was introduced in:

`supabase/migrations/20260907000000_ai_lesson_plans.sql`

Important fields include:

- `id`
- `student_id`
- `session_id`
- `learning_objectives`
- `lesson_outline`
- `practice_questions`
- `topic`
- `generated_at`
- `updated_at`

## Session Lifecycle

The core session state machine is:

```text
Scheduled
    ↓
In progress
    ↓
Completed
    ↓
AI reviewed
```

The corresponding stored values are:

```text
scheduled
in_progress
completed
ai_reviewed
```

### Scheduled → In progress

The tutor starts a scheduled session through:

`app/api/tutor/sessions/[id]/route.ts`

The server validates the current state before changing it to `in_progress`.

### In progress → Completed

The same API handles completion.

Before completion, the current session notes are flushed/saved. The server validates that the current session is `in_progress` before allowing the transition to `completed`.

### Completed → AI reviewed

AI review is triggered through:

`app/api/tutor/sessions/[id]/review/route.ts`

The review operation is only available after the session has reached `completed`, and the review operation moves the session to `ai_reviewed`.

### Completed session locking

Completed sessions are treated as read-only for normal session editing. AI review remains the allowed post-completion operation.

### Concurrency

Session notes use `updated_at` for optimistic concurrency handling. The client handles conflict responses (409) and uses an `AbortController` for request management.

## Double Booking

The application requirements specify that a tutor must not be able to double-book a session.

**Important:** the current repository audit did not fully verify a database-level or server-side overlap constraint for this rule.

Before final submission, this should be explicitly verified in:

- `app/api/tutor/sessions/...`
- Supabase migrations / database constraints
- session creation logic

The README intentionally does not claim a double-booking constraint that has not been verified.

## Session Notes and Autosave

The session workspace is implemented primarily in:

`components/SessionActions.tsx`

Notes are:

- editable while a session is in progress
- autosaved with an 800 ms debounce
- saved with optimistic concurrency using `updated_at`
- displayed with saving/saved/error feedback
- flushed before completing a session
- read-only after completion

## AI Features

TutorFlow uses Google Gemini through:

`lib/ai/gemini.ts`

### AI Session Plan

Endpoint:

`POST /api/tutor/sessions/[id]/plan`

Implementation:

`app/api/tutor/sessions/[id]/plan/route.ts`

The lesson plan is generated from:

- a system prompt
- the session-plan prompt builder
- student AI context
- student profile information
- previous sessions and reviews
- learning goals / weak areas when available
- the current session context

The prompt implementation is located under:

`lib/ai/prompts/session-plan/`

The generated response is validated with a Zod `SessionPlanSchema` and is expected to contain:

- objectives
- lesson outline
- practice questions

The generated plan is persisted and displayed in the tutor and student experiences.

### AI Session Review

Endpoint:

`POST /api/tutor/sessions/[id]/review`

Implementation:

`app/api/tutor/sessions/[id]/review/route.ts`

The review uses:

- session notes
- student profile context
- session topic
- session duration
- relevant student/history context

The result contains:

- session summary
- homework
- next-topic recommendation

The review is persisted in `session_reviews`, with homework items stored in `homework_items`.

### AI Prompt Source

The canonical AI prompt implementation should be considered the source of truth:

```text
lib/ai/prompts/session-plan/
```

The plan route also uses `getStudentAIContext()` to provide student-specific information.

> Note: this README documents the prompt architecture and inputs from the current project audit. The exact full prompt wording should be kept synchronized with the source files above rather than duplicated manually in this document.

## API Routes

Important server endpoints include:

```text
POST /api/auth/login
POST /api/auth/logout

PATCH /api/tutor/sessions/[id]

POST /api/tutor/sessions/[id]/plan
POST /api/tutor/sessions/[id]/review
```

Sensitive session and AI operations are performed through server-side routes.

## UI

The current UI includes:

- Landing page
- Login page
- Tutor dashboard
- Tutor student management
- Tutor session list
- Tutor session creation
- Tutor session workspace
- Student dashboard
- Student sessions
- Student session details
- Student homework
- Student progress
- Account menu
- Theme picker

Reusable UI components include:

- `AppNav`
- `PageHeader`
- `SectionHeader`
- `SessionRow`
- `StatCard`
- `StatusBadge`
- `EmptyState`
- `StudentsManager`
- `Avatar`
- `AILessonPlan`
- `HomeworkToggle`
- `Skeleton`
- `Alert`

The design uses a dark-first glassmorphic visual system with CSS design tokens and responsive layouts.

## Themes

The current default theme is **Dark**.

Theme persistence uses:

```text
tf:theme
```

The theme bootstrap in `app/layout.tsx` prevents a flash of the wrong theme during initial load.

The theme system also includes reduced-motion support through:

```css
@media (prefers-reduced-motion: reduce);
```

### Current verified theme configuration

The latest repository audit verified the dark default but only verified `light` and `dark` as currently configured themes.

If additional theme variants are present in the deployed build, they should be documented here after confirming the current `lib/theme/config.ts`.

## Environment Variables

Do not commit secret values.

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

Optional local-development variable:

```text
DATABASE_URL
```

The service-role key and Gemini API key must remain server-side secrets.

## Local Development

Install dependencies:

```bash
npm install
```

Create an environment file containing the required Supabase and Gemini configuration.

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Validation

The project uses standard Next.js validation commands.

Recommended checks:

```bash
npm run lint
npm run build
```

TypeScript can also be checked with the project's configured TypeScript command.

The final repository audit identified no automated test suite in the repository.

## Test Accounts

The evaluator test accounts are documented separately in:

[`TEST_CREDENTIALS.md`](./TEST_CREDENTIALS.md)

Available roles:

- Tutor
- Student

The student accounts allow testing the student experience with separate student identities.

## Security Notes

The application is designed around server-side authorization rather than frontend-only access control.

Important protections include:

- Supabase authentication
- server-side role checks
- tutor ownership checks
- student identity scoping
- server-side session transition checks
- optimistic concurrency for session notes
- server-side AI API routes
- secrets stored through environment variables

The repository audit identified two areas that should be explicitly verified before final submission:

1. Server/database enforcement against overlapping tutor sessions.
2. Completeness of Supabase RLS policies.

## Repository

**GitHub repository:** https://github.com/Sanjeeb-J/TutorFLow
