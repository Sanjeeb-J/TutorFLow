"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Student {
  id: string;
  name: string;
  subject: string;
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
      const res = await fetch("/api/tutor/students");
      const data = await res.json();
      setStudents(data.students || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const startAt = new Date(`${startDate}T${startTime}`).toISOString();
    const endAt = new Date(`${endDate}T${endTime}`).toISOString();

    try {
      const res = await fetch("/api/tutor/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          topic,
          start_at: startAt,
          end_at: endAt,
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
      <div className="max-w-lg">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <Link
        href="/tutor/sessions"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Back to sessions
      </Link>

      <h1 className="text-2xl font-semibold text-foreground mb-6">Schedule Session</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="student" className="text-sm font-medium text-foreground">
            Student <span className="text-red-500">*</span>
          </label>
          <select
            id="student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          >
            <option value="">Select a student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.subject}
              </option>
            ))}
          </select>
          {students.length === 0 && (
            <p className="text-xs text-muted">
              No students yet.{" "}
              <Link href="/tutor/students/new" className="text-accent hover:underline">
                Add one first
              </Link>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="topic" className="text-sm font-medium text-foreground">
            Topic <span className="text-red-500">*</span>
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            placeholder="e.g. Quadratic equations review"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startDate" className="text-sm font-medium text-foreground">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startTime" className="text-sm font-medium text-foreground">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endDate" className="text-sm font-medium text-foreground">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endTime" className="text-sm font-medium text-foreground">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={submitting || students.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Scheduling..." : "Schedule Session"}
          </button>
          <Link
            href="/tutor/sessions"
            className="px-4 py-2 text-sm font-medium text-muted border border-border rounded-md hover:text-foreground hover:bg-accent-light/50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
