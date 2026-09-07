import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Mail,
  Pencil,
  Sparkles,
  Target,
  TrendingDown,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import SessionRow from "@/components/SessionRow";
import EmptyState from "@/components/EmptyState";
import ProgressSummary from "@/components/ProgressSummary";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();

  // Fetch student with ownership check via RLS
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .eq("tutor_id", profile!.id)
    .single();

  if (!student) notFound();

  const now = new Date().toISOString();

  const { data: upcomingSessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status")
    .eq("student_id", student.id)
    .eq("tutor_id", profile!.id)
    .gte("start_at", now)
    .order("start_at", { ascending: true })
    .limit(5);

  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status")
    .eq("student_id", student.id)
    .eq("tutor_id", profile!.id)
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(5);

  const contextBlocks: Array<{ label: string; icon: typeof Target; value: string | null }> = [
    { label: "Learning goals", icon: Target, value: student.learning_goals },
    { label: "Weak areas", icon: TrendingDown, value: student.weak_areas },
  ];

  return (
    <div>
      <Link
        href="/tutor/students"
        className="inline-flex items-center gap-1 text-sm text-muted-strong transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Back to students
      </Link>

      {/* Student header */}
      <div className="card mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={student.name} size="lg" />
          <div className="min-w-0">
            <h1 className="page-title truncate">{student.name}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {student.subject}
              {student.current_level ? ` · ${student.current_level}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href={`/tutor/students/${student.id}/edit`}
            className="btn btn-secondary"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Edit profile
          </Link>
          <Link href="/tutor/sessions/new" className="btn btn-primary">
            Schedule session
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main column */}
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
              Upcoming sessions
            </h2>
            {upcomingSessions && upcomingSessions.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingSessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    id={s.id}
                    topic={s.topic}
                    startAt={s.start_at}
                    endAt={s.end_at}
                    status={s.status}
                    href={`/tutor/sessions/${s.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming sessions"
                description={`Nothing scheduled for ${student.name} yet.`}
              />
            )}
          </section>

          <section aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
              Recent sessions
            </h2>
            {recentSessions && recentSessions.length > 0 ? (
              <div className="space-y-2.5">
                {recentSessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    id={s.id}
                    topic={s.topic}
                    startAt={s.start_at}
                    endAt={s.end_at}
                    status={s.status}
                    href={`/tutor/sessions/${s.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No past sessions yet"
                description="Completed sessions will show up here with their AI reviews."
              />
            )}
          </section>
        </div>

        {/* Context column */}
        <aside className="space-y-4" aria-label="Student profile">
          <div className="card p-4">
            <p className="section-kicker mb-3">Profile</p>
            <dl className="space-y-3 text-sm">
              {student.email && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Mail className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    Email
                  </dt>
                  <dd className="mt-1 break-words text-foreground">{student.email}</dd>
                </div>
              )}
              {student.current_level && (
                <div>
                  <dt className="text-xs font-medium text-muted">Current level</dt>
                  <dd className="mt-1 text-foreground">{student.current_level}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-muted">Subject</dt>
                <dd className="mt-1 text-foreground">{student.subject}</dd>
              </div>
            </dl>
          </div>

          {contextBlocks
            .filter((b) => b.value)
            .map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.label} className="card p-4">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    {b.label}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {b.value}
                  </p>
                </div>
              );
            })}
        </aside>
      </div>

      {/* AI progress summary */}
      <section className="mt-10" aria-labelledby="progress-heading">
        <h2
          id="progress-heading"
          className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground"
        >
          <Sparkles className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
          AI progress summary
        </h2>
        <ProgressSummary studentId={student.id} />
      </section>
    </div>
  );
}
