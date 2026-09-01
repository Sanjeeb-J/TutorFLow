"use client";

import { useState } from "react";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewStudentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [weakAreas, setWeakAreas] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [created, setCreated] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<{ name: string; email: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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

      setCreatedStudent({ name: data.student.name, email: data.student.email });
      setCreated(true);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (created && createdStudent) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Student Created</h1>
        <div className="p-4 border border-green-200 bg-green-50 rounded-lg mb-6">
          <p className="text-sm text-green-800 font-medium">{createdStudent.name}</p>
          <p className="text-sm text-green-700 mt-1">
            Account created. The student can log in with:
          </p>
          <p className="text-sm text-green-700 mt-1">
            Email: <span className="font-mono">{createdStudent.email}</span>
          </p>
          {tempPassword && (
            <p className="text-sm text-green-700 mt-1">
              Password: <span className="font-mono">{tempPassword}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Link
            href="/tutor/students"
            className="px-3 py-2 text-sm font-medium text-foreground border border-border rounded-md hover:bg-accent-light/50 transition-colors"
          >
            Back to students
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <Link
        href="/tutor/students"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Back to students
      </Link>

      <h1 className="text-2xl font-semibold text-foreground mb-6">Add Student</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            placeholder="Student name"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            placeholder="student@example.com"
          />
          <p className="text-xs text-muted">
            A login account will be created for this email.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="tempPassword" className="text-sm font-medium text-foreground">
            Temporary Password
          </label>
          <input
            id="tempPassword"
            type="text"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            placeholder="Leave blank to auto-generate"
          />
          <p className="text-xs text-muted">
            If left blank, a random password will be generated.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="subject" className="text-sm font-medium text-foreground">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            placeholder="e.g. Mathematics"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="currentLevel" className="text-sm font-medium text-foreground">
            Current Level
          </label>
          <input
            id="currentLevel"
            type="text"
            value={currentLevel}
            onChange={(e) => setCurrentLevel(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            placeholder="e.g. Grade 10"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="learningGoals" className="text-sm font-medium text-foreground">
            Learning Goals
          </label>
          <textarea
            id="learningGoals"
            value={learningGoals}
            onChange={(e) => setLearningGoals(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
            placeholder="What does the student want to achieve?"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="weakAreas" className="text-sm font-medium text-foreground">
            Weak Areas
          </label>
          <textarea
            id="weakAreas"
            value={weakAreas}
            onChange={(e) => setWeakAreas(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
            placeholder="Topics or skills the student struggles with"
          />
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Student"}
          </button>
          <Link
            href="/tutor/students"
            className="px-4 py-2 text-sm font-medium text-muted border border-border rounded-md hover:text-foreground hover:bg-accent-light/50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
