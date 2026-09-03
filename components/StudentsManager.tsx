"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import EmptyState from "./EmptyState";

export interface StudentSummary {
  id: string;
  name: string;
  email: string | null;
  subject: string;
  current_level: string | null;
}

export interface NextSessionInfo {
  topic: string;
  start_at: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatNextSession(startAt: string) {
  const d = new Date(startAt);
  return {
    date: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

export default function StudentsManager({
  students,
  nextSessions,
}: {
  students: StudentSummary[];
  nextSessions: Record<string, NextSessionInfo>;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.name, s.subject, s.current_level ?? "", s.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [students, query]);

  return (
    <div>
      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Your student list is empty"
          description="Add your first student to start scheduling sessions, tracking progress, and assigning homework."
          action={
            <Link href="/tutor/students/new" className="btn btn-primary">
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Add your first student
            </Link>
          }
        />
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-4 max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, subject, or level…"
              aria-label="Search students"
              className="input pl-9"
            />
          </div>

          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {filtered.length === students.length
              ? `${students.length} student${students.length === 1 ? "" : "s"}`
              : `Showing ${filtered.length} of ${students.length} students`}
          </p>

          {filtered.length > 0 ? (
            <div className="space-y-2.5">
              {filtered.map((student) => {
                const next = nextSessions[student.id];
                const nextFmt = next ? formatNextSession(next.start_at) : null;
                return (
                  <Link
                    key={student.id}
                    href={`/tutor/students/${student.id}`}
                    className="card card-hover group flex items-center gap-4 px-4 py-3.5"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-light text-sm font-semibold text-accent-strong"
                    >
                      {initials(student.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {student.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {student.subject}
                        {student.current_level ? ` · ${student.current_level}` : ""}
                        {student.email ? ` · ${student.email}` : ""}
                      </p>
                    </div>
                    {next ? (
                      <div className="hidden shrink-0 text-right md:block">
                        <p className="text-xs font-medium text-foreground">Next session</p>
                        <p className="mt-0.5 max-w-[10rem] truncate text-xs text-muted">
                          {nextFmt?.date} · {nextFmt?.time} — {next.topic}
                        </p>
                      </div>
                    ) : null}
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="No students match your search"
              description={`Nothing found for “${query}”. Try a different name, subject, or level.`}
            />
          )}
        </>
      )}
    </div>
  );
}
