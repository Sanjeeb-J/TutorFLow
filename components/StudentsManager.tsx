"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Mail, Plus, Search, Users } from "lucide-react";
import { formatDateLine, formatTime } from "@/lib/format";
import Avatar from "./Avatar";
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
          {/* Search + result count */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
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
            <p className="shrink-0 text-sm text-muted" aria-live="polite">
              {filtered.length === students.length
                ? `${students.length} student${students.length === 1 ? "" : "s"}`
                : `Showing ${filtered.length} of ${students.length} students`}
            </p>
          </div>

          {filtered.length > 0 ? (
            <div className="space-y-2.5">
              {filtered.map((student) => {
                const next = nextSessions[student.id];
                return (
                  <Link
                    key={student.id}
                    href={`/tutor/students/${student.id}`}
                    className="card card-hover group flex items-center gap-4 px-4 py-3.5"
                  >
                    <Avatar name={student.name} size="md" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-foreground">
                        {student.name}
                      </p>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                        <span className="shrink-0 font-medium text-muted-strong">
                          {student.subject}
                        </span>
                        {student.current_level ? (
                          <span className="truncate">
                            <span aria-hidden="true">·</span> {student.current_level}
                          </span>
                        ) : null}
                        {student.email ? (
                          <span className="flex min-w-0 items-center gap-1 truncate">
                            <span aria-hidden="true" className="shrink-0">
                              ·
                            </span>
                            <Mail
                              className="h-3 w-3 shrink-0 text-muted"
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                            <span className="truncate">{student.email}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {next ? (
                      <div className="hidden shrink-0 flex-col items-end gap-0.5 md:flex">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Next session
                        </p>
                        <p className="max-w-[12rem] truncate text-xs font-medium text-muted-strong">
                          {next.topic}
                        </p>
                        <p className="text-xs tabular-nums text-muted">
                          {formatDateLine(next.start_at)} · {formatTime(next.start_at)}
                        </p>
                      </div>
                    ) : null}

                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted transition-transform duration-[var(--duration-fast)] ease-[var(--ease-standard)] group-hover:translate-x-0.5"
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
