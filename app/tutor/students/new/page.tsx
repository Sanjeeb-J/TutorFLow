"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, UserPlus } from "lucide-react";
import Alert from "@/components/Alert";
import PageHeader from "@/components/PageHeader";

export default function NewStudentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [weakAreas, setWeakAreas] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [created, setCreated] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  function validate() {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Student name is required.";
    if (!email.trim()) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (!subject.trim()) errors.subject = "Subject is required.";
    if (tempPassword && tempPassword.length < 8) {
      errors.tempPassword = "Temporary password must be at least 8 characters.";
    }
    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/tutor/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          current_level: currentLevel || null,
          learning_goals: learningGoals || null,
          weak_areas: weakAreas || null,
          temp_password: tempPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create student.");
        setLoading(false);
        return;
      }

      setCreatedStudent({
        name: data.student.name,
        email: data.student.email,
        // Backend returns the generated password only when it auto-generated one
        password: data.temp_password || tempPassword,
      });
      setCreated(true);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (created && createdStudent) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card overflow-hidden">
          <div className="flex items-start gap-3 border-b border-border bg-success-light/60 px-6 py-5">
            <CheckCircle2
              className="mt-0.5 h-6 w-6 shrink-0 text-success"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {createdStudent.name} was added
              </h1>
              <p className="mt-1 text-sm text-muted">
                A student account has been created. Share the sign-in details below —
                they&apos;re shown only once.
              </p>
            </div>
          </div>

          <dl className="space-y-4 px-6 py-5">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Email</dt>
              <dd className="mt-1 break-all font-mono text-sm text-foreground">
                {createdStudent.email}
              </dd>
            </div>
            <div className="flex items-start gap-2">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  Temporary password
                </dt>
                <dd className="mt-1 break-all font-mono text-sm text-foreground">
                  {createdStudent.password}
                </dd>
                <p className="mt-1 text-xs text-muted">
                  The student can change this later if you set up password management.
                </p>
              </div>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2.5 border-t border-border bg-surface-muted/40 px-6 py-4">
            <Link href="/tutor/students" className="btn btn-primary">
              Back to students
            </Link>
            <Link href="/tutor/students/new" className="btn btn-secondary">
              Add another student
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        backHref="/tutor/students"
        backLabel="Back to students"
        title="Add student"
        subtitle="Create a profile for a new student and set up their login account."
      />

      <form onSubmit={handleSubmit} noValidate className="card mt-6 p-6">
        {error && <Alert className="mb-5">{error}</Alert>}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label htmlFor="name" className="label">
              Name <span className="text-danger">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={Boolean(clientErrors.name)}
              className="input"
              placeholder="e.g. Rahul Kumar"
            />
            {clientErrors.name && (
              <p className="field-error" role="alert">{clientErrors.name}</p>
            )}
          </div>

          <div className="field sm:col-span-2">
            <label htmlFor="email" className="label">
              Email <span className="text-danger">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={Boolean(clientErrors.email)}
              className="input"
              placeholder="student@example.com"
            />
            {clientErrors.email ? (
              <p className="field-error" role="alert">{clientErrors.email}</p>
            ) : (
              <p className="hint">A login account will be created for this email.</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="subject" className="label">
              Subject <span className="text-danger">*</span>
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              aria-invalid={Boolean(clientErrors.subject)}
              className="input"
              placeholder="e.g. Mathematics"
            />
            {clientErrors.subject && (
              <p className="field-error" role="alert">{clientErrors.subject}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="currentLevel" className="label">Current level</label>
            <input
              id="currentLevel"
              type="text"
              value={currentLevel}
              onChange={(e) => setCurrentLevel(e.target.value)}
              className="input"
              placeholder="e.g. Grade 10"
            />
          </div>

          <div className="field sm:col-span-2">
            <label htmlFor="tempPassword" className="label">
              Temporary password
            </label>
            <input
              id="tempPassword"
              type="text"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              aria-invalid={Boolean(clientErrors.tempPassword)}
              className="input"
              placeholder="Leave blank to auto-generate"
              autoComplete="new-password"
            />
            {clientErrors.tempPassword ? (
              <p className="field-error" role="alert">{clientErrors.tempPassword}</p>
            ) : (
              <p className="hint">
                If left blank, a secure password is generated and shown once on the next screen.
              </p>
            )}
          </div>

          <div className="field sm:col-span-2">
            <label htmlFor="learningGoals" className="label">Learning goals</label>
            <textarea
              id="learningGoals"
              value={learningGoals}
              onChange={(e) => setLearningGoals(e.target.value)}
              rows={3}
              className="input input-textarea"
              placeholder="What does the student want to achieve?"
            />
          </div>

          <div className="field sm:col-span-2">
            <label htmlFor="weakAreas" className="label">Weak areas</label>
            <textarea
              id="weakAreas"
              value={weakAreas}
              onChange={(e) => setWeakAreas(e.target.value)}
              rows={3}
              className="input input-textarea"
              placeholder="Topics or skills the student struggles with"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-border pt-5">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                Creating…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Create student
              </>
            )}
          </button>
          <Link href="/tutor/students" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
