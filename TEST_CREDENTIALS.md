# TutorFlow Test Credentials

These credentials are provided for evaluating the deployed TutorFlow application.

## Login URL

https://tutorflow-chi.vercel.app/login

## Tutor Account

| Field | Value |
|---|---|
| Role | Tutor |
| Email | tutor@gmail.com |
| Password | password123 |

### What to test

The tutor account can be used to test:

- Tutor dashboard
- Student management
- Session scheduling
- Session lifecycle
- Session notes/autosave
- AI session planning
- AI session review
- Tutor-side session workspace

## Student Accounts

### Student 1

| Field | Value |
|---|---|
| Role | Student |
| Email | student1@gmail.com |
| Password | password123 |

### Student 2

| Field | Value |
|---|---|
| Role | Student |
| Email | student2@gmail.com |
| Password | password123 |

### Student 3

| Field | Value |
|---|---|
| Role | Student |
| Email | student3@gmail.com |
| Password | password123 |

### What to test

Student accounts can be used to test:

- Student authentication
- Student dashboard
- Upcoming sessions
- Past sessions
- Session notes/review information
- Homework
- Progress
- Student-specific data isolation

Using multiple student accounts is useful for checking that one student cannot access another student's data.

## Important Notes

- These are evaluator/test credentials, not production user credentials.
- Do not reuse these passwords for real users.
- If the credentials are changed in Supabase Auth, update this file before submission.
- The evaluator should start at the login URL above.
