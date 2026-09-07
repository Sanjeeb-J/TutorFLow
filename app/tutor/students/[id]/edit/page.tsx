"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import Alert from "@/components/Alert";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";

interface Student {
  id: string;
  name: string;
  email: string;
  subject: string;
  current_level: string | null;
  learning_goals: string | null;
  weak_areas: string | null;
}

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [weakAreas, setWeakAreas] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/tutor/students");
      const data = await res.json();
      const found = data.students?.find((s: Student) => s.id === id);
      if (!found) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setStudent(found);
      setName(found.name);
      setEmail(found.email);
      setSubject(found.subject);
      setCurrentLevel(found.current_level || "");
      setLearningGoals(found.learning_goals || "");
      setWeakAreas(found.weak_areas || "");
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/tutor/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          current_level: currentLevel || null,
          learning_goals: learningGoals || null,
          weak_areas: weakAreas || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update student.");
        setSaving(false);
        return;
      }

      router.push(`/tutor/students/${id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading student profile…
        </p>
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/tutor/students"
          className="inline-flex items-center gap-1 text-sm text-muted-strong transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          Back to students
        </Link>
        <div className="mt-6">
          <EmptyState
            title="Student not found"
            description="This student may have been removed, or the link is out of date."
            action={
              <Link href="/tutor/students" className="btn btn-secondary">
                Back to students
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        backHref={`/tutor/students/${id}`}
        backLabel={`Back to ${student.name}`}
        title="Edit student"
        subtitle={`Update profile details for ${student.name}.`}
      />

      <form onSubmit={handleSubmit} className="card mt-6 p-6">
        {error && <Alert className="mb-5">{error}</Alert>}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label htmlFor="name" className="label">Name <span className="text-danger">*</span></label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" />
          </div>

          <div className="field sm:col-span-2">
            <label htmlFor="email" className="label">Email <span className="text-danger">*</span></label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
            <p className="hint">Changing this updates the contact email, not the login email.</p>
          </div>

          <div className="field">
            <label htmlFor="subject" className="label">Subject <span className="text-danger">*</span></label>
            <input id="subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="input" />
          </div>

          <div className="field">
            <label htmlFor="currentLevel" className="label">Current level</label>
            <input id="currentLevel" type="text" value={currentLevel} onChange={(e) => setCurrentLevel(e.target.value)} className="input" />
          </div>

          <div className="field sm:col-span-2">
            <label htmlFor="learningGoals" className="label">Learning goals</label>
            <textarea
              id="learningGoals"
              value={learningGoals}
              onChange={(e) => setLearningGoals(e.target.value)}
              rows={3}
              className="input input-textarea"
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
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-border pt-5">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Save changes
              </>
            )}
          </button>
          <Link href={`/tutor/students/${id}`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
