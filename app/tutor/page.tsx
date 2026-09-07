import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  BarChart3,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import EditProfileDialog from "@/components/EditProfileDialog";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import SessionRow from "@/components/SessionRow";
import StatCard from "@/components/StatCard";

type SessionLike = {
  id: string;
  topic: string;
  start_at: string;
  end_at?: string | null;
  status: string;
  students?: unknown;
};

type WeeklySession = {
  start_at: string;
  end_at: string | null;
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

  
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  // Start from the most recent Sunday to get a full 7-day week
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
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
      .gte("start_at", now.toISOString())
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
    .gte("start_at", now.toISOString())
    .in("status", ["scheduled", "in_progress"])
    .order("start_at", { ascending: true })
    .limit(6);

  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, students(name)")
    .eq("tutor_id", profile!.id)
    .neq("status", "scheduled")
    .order("start_at", { ascending: false })
    .limit(6);

  const { data: weeklySessions } = await supabase
    .from("sessions")
    .select("start_at, end_at")
    .eq("tutor_id", profile!.id)
    .gte("start_at", weekStart.toISOString())
    .in("status", ["completed", "ai_reviewed"]);

  const dayBuckets = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return {
      // Use local date string (YYYY-MM-DD) to match session dates converted to local time
      key: day.toLocaleDateString('en-CA'), // en-CA gives YYYY-MM-DD format in local time
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      minutes: 0,
    };
  });
  const minutesByDay = new Map(dayBuckets.map((day) => [day.key, day]));
  for (const session of (weeklySessions ?? []) as WeeklySession[]) {
    // Convert UTC session time to local date for matching
    const sessionDate = new Date(session.start_at);
    // Get local date in YYYY-MM-DD format
    const localYear = sessionDate.getFullYear();
    const localMonth = String(sessionDate.getMonth() + 1).padStart(2, '0');
    const localDay = String(sessionDate.getDate()).padStart(2, '0');
    const sessionKey = `${localYear}-${localMonth}-${localDay}`;
    const bucket = minutesByDay.get(sessionKey);
    if (!bucket) continue;
    const start = sessionDate.getTime();
    const end = session.end_at ? new Date(session.end_at).getTime() : start;
    bucket.minutes += Math.max(0, Math.round((end - start) / 60000));
  }
  const weeklyMinutes = dayBuckets.reduce((total, day) => total + day.minutes, 0);
  const maxDayMinutes = Math.max(...dayBuckets.map((day) => day.minutes), 1);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySessions = (upcomingSessions ?? []).filter(
    (session) => session.start_at.slice(0, 10) === todayKey,
  );

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
            <EditProfileDialog
              initialName={profile?.full_name ?? ""}
              role={profile?.role ?? ""}
              triggerClassName="btn btn-secondary"
            />
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

      {/* Live workspace overview — derived from the tutor's real sessions. */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.75fr)]">
        <section className="card glass-card overflow-hidden p-5 sm:p-6" aria-labelledby="activity-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/15 bg-accent-light text-accent">
                  <BarChart3 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h2 id="activity-heading" className="section-title">Weekly activity</h2>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {weeklyMinutes >= 60
                  ? `${Math.floor(weeklyMinutes / 60)}h ${weeklyMinutes % 60}m`
                  : `${weeklyMinutes}m`}
              </p>
              <p className="mt-1 text-sm text-muted">Completed tutoring time over the last seven days</p>
            </div>
            <span className="rounded-full border border-glass-border bg-surface-muted/70 px-3 py-1 text-xs font-medium text-muted-strong">
              {weeklySessions?.length ?? 0} completed
            </span>
          </div>
          <div className="mt-7 flex h-32 items-end gap-2 sm:gap-3" aria-label="Completed tutoring time by day">
            {dayBuckets.map((day) => {
              const height = day.minutes ? Math.max(14, (day.minutes / maxDayMinutes) * 100) : 5;
              return (
                <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end rounded-lg bg-surface-muted/40 px-1.5 pt-1.5">
                    <div
                      className="w-full rounded-md bg-accent shadow-[0_8px_18px_-10px_rgb(91_155_255_/_0.9)]"
                      style={{ height: `${height}%` }}
                      title={`${day.label}: ${day.minutes} minutes`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-muted">{day.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card glass-card p-5 sm:p-6" aria-labelledby="today-heading">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-glass-border bg-surface-muted/70 text-muted-strong">
              <Clock3 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h2 id="today-heading" className="section-title">Today&apos;s timeline</h2>
              <p className="mt-0.5 text-xs text-muted">Your scheduled sessions</p>
            </div>
          </div>
          {todaySessions.length > 0 ? (
            <ol className="mt-5 space-y-3">
              {todaySessions.map((session) => (
                <li key={session.id} className="flex items-start gap-3">
                  <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-light)]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{session.topic}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(session.start_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      {sessionStudentName(session) ? ` · ${sessionStudentName(session)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-glass-border bg-surface-muted/35 px-4 py-5">
              <p className="text-sm font-medium text-foreground">Nothing else scheduled today</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">Your next sessions remain available below.</p>
            </div>
          )}
        </section>
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
