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
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import SessionRow from "@/components/SessionRow";
import StatCard from "@/components/StatCard";
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
      <PageHeader
        title={<>{greetingFor(new Date().getHours())}, {firstName}</>}
        subtitle="Here's what's happening across your tutoring sessions."
        actions={
          <>
            <Link href="/tutor/students/new" className="btn btn-secondary">
              <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Add student
            </Link>
            <Link href="/tutor/sessions/new" className="btn btn-primary">
              <CalendarPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Schedule session
            </Link>
          </>
        }
      />

      {/* Summary metrics */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <StatCard
            key={m.label}
            icon={m.icon}
            label={m.label}
            value={m.value}
            helper={m.helper}
          />
        ))}
      </div>

      {/* Upcoming sessions */}
      <section className="mt-10" aria-labelledby="upcoming-heading">
        <SectionHeader
          id="upcoming-heading"
          title="Upcoming sessions"
          description={
            upcomingCount && upcomingCount > 0
              ? `${upcomingCount} session${upcomingCount === 1 ? "" : "s"} on your calendar`
              : "Nothing scheduled ahead"
          }
          action={
            <Link
              href="/tutor/sessions"
              className="text-sm font-medium text-accent transition-colors hover:text-accent-strong"
            >
              View all
            </Link>
          }
          className="mb-4"
        />

        {upcomingSessions && upcomingSessions.length > 0 ? (
          <div className="space-y-2.5">
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
        <SectionHeader
          id="recent-heading"
          title="Recent sessions"
          description="Your latest completed work"
          className="mb-4"
        />

        {recentSessions && recentSessions.length > 0 ? (
          <div className="space-y-2.5">
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
