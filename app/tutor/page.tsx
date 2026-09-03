import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import SessionRow from "@/components/SessionRow";
import EmptyState from "@/components/EmptyState";

type SessionLike = {
  id: string;
  topic: string;
  start_at: string;
  end_at?: string | null;
  status: string;
  students?: unknown;
};

function sessionStudentName(session: SessionLike): string | null {
  if (!session.students) return null;
  if (Array.isArray(session.students)) {
    const first = session.students[0] as { name?: string } | undefined;
    return first?.name ?? null;
  }
  return (session.students as { name?: string })?.name ?? null;
}

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function TutorPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  const now = new Date().toISOString();
  const firstName = profile?.full_name?.split(/\s+/)[0] ?? "there";

  const studentCount = (
    await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("tutor_id", profile!.id)
  ).count;

  const upcomingCount = (
    await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("tutor_id", profile!.id)
      .gte("start_at", now)
      .in("status", ["scheduled", "in_progress"])
  ).count;

  const completedCount = (
    await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("tutor_id", profile!.id)
      .in("status", ["completed", "ai_reviewed"])
  ).count;

  const reviewCount = (
    await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("tutor_id", profile!.id)
      .eq("status", "completed")
  ).count;

  const { data: upcomingSessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, students(name)")
    .eq("tutor_id", profile!.id)
    .gte("start_at", now)
    .in("status", ["scheduled", "in_progress"])
    .order("start_at", { ascending: true })
    .limit(6);

  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, students(name)")
    .eq("tutor_id", profile!.id)
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(6);

  const metrics = [
    {
      label: "Students",
      value: studentCount ?? 0,
      icon: Users,
    },
    {
      label: "Upcoming sessions",
      value: upcomingCount ?? 0,
      icon: CalendarDays,
    },
    {
      label: "Sessions completed",
      value: completedCount ?? 0,
      icon: CheckCircle2,
    },
    {
      label: "Awaiting review",
      value: reviewCount ?? 0,
      icon: Sparkles,
      helper: "Completed sessions ready for AI review",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">
            {greetingFor(new Date().getHours())}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Here&apos;s what&apos;s happening across your tutoring sessions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/tutor/students/new" className="btn btn-secondary">
            <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Add student
          </Link>
          <Link href="/tutor/sessions/new" className="btn btn-primary">
            <CalendarPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Schedule session
          </Link>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card p-4">
              <div className="flex items-center gap-1.5 text-muted">
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <p className="text-xs font-medium uppercase tracking-wide">
                  {m.label}
                </p>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {m.value}
              </p>
              {m.helper && <p className="mt-1 text-xs text-muted">{m.helper}</p>}
            </div>
          );
        })}
      </div>

      {/* Upcoming sessions */}
      <section className="mt-10" aria-labelledby="upcoming-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="upcoming-heading" className="text-base font-semibold text-foreground">
              Upcoming sessions
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {upcomingCount && upcomingCount > 0
                ? `${upcomingCount} session${upcomingCount === 1 ? "" : "s"} on your calendar`
                : "Nothing scheduled ahead"}
            </p>
          </div>
          <Link
            href="/tutor/sessions"
            className="shrink-0 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
          >
            View all
          </Link>
        </div>

        {upcomingSessions && upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map((s) => (
              <SessionRow
                key={s.id}
                id={s.id}
                topic={s.topic}
                subtitle={sessionStudentName(s)}
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
            description="When you schedule sessions, they'll show up here so you can prepare and start them on time."
            action={
              <Link href="/tutor/sessions/new" className="btn btn-primary">
                <CalendarPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Schedule a session
              </Link>
            }
          />
        )}
      </section>

      {/* Recent sessions */}
      <section className="mt-10" aria-labelledby="recent-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="recent-heading" className="text-base font-semibold text-foreground">
              Recent sessions
            </h2>
            <p className="mt-0.5 text-sm text-muted">Your latest completed work</p>
          </div>
        </div>

        {recentSessions && recentSessions.length > 0 ? (
          <div className="space-y-3">
            {recentSessions.map((s) => (
              <SessionRow
                key={s.id}
                id={s.id}
                topic={s.topic}
                subtitle={sessionStudentName(s)}
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
            description="Your session history will appear here once you complete your first session."
          />
        )}
      </section>
    </div>
  );
}
