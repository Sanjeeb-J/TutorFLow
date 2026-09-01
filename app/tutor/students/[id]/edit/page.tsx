"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
        setError("Student not found.");
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
      <div className="max-w-lg">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-lg">
        <p className="text-sm text-muted">{error || "Student not found."}</p>
        <Link href="/tutor/students" className="text-sm text-accent mt-2 inline-block">
          Back to students
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <Link
        href={`/tutor/students/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Back to student
      </Link>

      <h1 className="text-2xl font-semibold text-foreground mb-6">Edit Student</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
          <p className="text-xs text-muted">
            Changing this updates the contact email, not the login email.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="subject" className="text-sm font-medium text-foreground">Subject</label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="currentLevel" className="text-sm font-medium text-foreground">Current Level</label>
          <input
            id="currentLevel"
            type="text"
            value={currentLevel}
            onChange={(e) => setCurrentLevel(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="learningGoals" className="text-sm font-medium text-foreground">Learning Goals</label>
          <textarea
            id="learningGoals"
            value={learningGoals}
            onChange={(e) => setLearningGoals(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="weakAreas" className="text-sm font-medium text-foreground">Weak Areas</label>
          <textarea
            id="weakAreas"
            value={weakAreas}
            onChange={(e) => setWeakAreas(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
          />
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href={`/tutor/students/${id}`}
            className="px-4 py-2 text-sm font-medium text-muted border border-border rounded-md hover:text-foreground hover:bg-accent-light/50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
