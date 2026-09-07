"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, Loader2, UserPlus } from "lucide-react";
import Alert from "@/components/Alert";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";

interface Student {
  id: string;
  name: string;
  subject: string;
  current_level: string | null;
}

export default function NewSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<Student[]>([]);

  const [studentId, setStudentId] = useState("");
  const [topic, setTopic] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tutor/students");
        const data = await res.json();
        setStudents(data.students || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const startAt = new Date(`${startDate}T${startTime}`);
    const endAt = new Date(`${endDate}T${endTime}`);

    if (!(endAt > startAt)) {
      setError("End time must be after the start time.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/tutor/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          topic,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create session.");
        setSubmitting(false);
        return;
      }

      router.push(`/tutor/sessions/${data.session.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading students…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        backHref="/tutor/sessions"
        backLabel="Back to sessions"
        title="Schedule session"
        subtitle="Sessions with overlapping times are blocked automatically."
      />

      {students.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={UserPlus}
            title="You need a student first"
            description="Add a student to your roster before scheduling a session."
            action={
              <Link href="/tutor/students/new" className="btn btn-primary">
                <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Add your first student
              </Link>
            }
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card mt-6 p-6">
          {error && <Alert className="mb-5">{error}</Alert>}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="field sm:col-span-2">
              <label htmlFor="student" className="label">
                Student <span className="text-danger">*</span>
              </label>
              <select
                id="student"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="input"
              >
                <option value="">Select a student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.subject}
                    {s.current_level ? ` (${s.current_level})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="field sm:col-span-2">
              <label htmlFor="topic" className="label">
                Topic <span className="text-danger">*</span>
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                className="input"
                placeholder="e.g. Quadratic equations review"
              />
            </div>

            <fieldset className="sm:col-span-2">
              <legend className="mb-3 text-sm font-medium text-foreground">
                Start
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label htmlFor="startDate" className="label">Date <span className="text-danger">*</span></label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="input"
                  />
                </div>
                <div className="field">
                  <label htmlFor="startTime" className="label">Time <span className="text-danger">*</span></label>
                  <input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="input"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="sm:col-span-2">
              <legend className="mb-3 text-sm font-medium text-foreground">
                End
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label htmlFor="endDate" className="label">Date <span className="text-danger">*</span></label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="input"
                  />
                </div>
                <div className="field">
                  <label htmlFor="endTime" className="label">Time <span className="text-danger">*</span></label>
                  <input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="input"
                  />
                </div>
              </div>
            </fieldset>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-border pt-5">
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Scheduling…
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  Schedule session
                </>
              )}
            </button>
            <Link href="/tutor/sessions" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
