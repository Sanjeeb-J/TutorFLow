import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import HomeworkToggle from "@/components/HomeworkToggle";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import SessionRow from "@/components/SessionRow";
import StatusBadge from "@/components/StatusBadge";

interface HomeworkRow {
  id: string;
  description: string;
  completed: boolean;
  created_at: string;
  review: { session_id: string } | { session_id: string }[] | null;
}

function reviewSessionId(row: HomeworkRow): string | null {
  const r = row.review;
  if (!r) return null;
  if (Array.isArray(r)) return r[0]?.session_id ?? null;
  return r.session_id ?? null;
}

export default async function StudentDashboard() {
  const profile = await getProfile();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: student } = await supabase
    .from("students")
    .select("id, name, subject, current_level")
    .eq("user_id", profile!.id)
    .single();

  const studentId = student?.id ?? "";

  const { data: nextSessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, tutor:profiles!sessions_tutor_id_fkey(full_name)")
    .eq("student_id", studentId)
    .gte("start_at", now)
    .in("status", ["scheduled", "in_progress"])
    .order("start_at", { ascending: true })
    .limit(1);

  const { data: recent } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, tutor:profiles!sessions_tutor_id_fkey(full_name)")
    .eq("student_id", studentId)
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(5);

  const { data: homework } = await supabase
    .from("homework_items")
    .select("id, description, completed, created_at, review:session_reviews(id, session_id)")
    .eq("completed", false)
    .order("created_at", { ascending: false })
    .limit(5);

  const pendingCount = (
    await supabase
      .from("homework_items")
      .select("id", { count: "exact", head: true })
      .eq("completed", false)
  ).count;

  // Map review session ids to topics the student can see
  const sessionIds = Array.from(
    new Set((homework ?? []).map(reviewSessionId).filter(Boolean) as string[]),
  );
  const topicBySession: Record<string, string> = {};
  if (sessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, topic")
      .eq("student_id", studentId)
      .in("id", sessionIds);
    for (const s of sessions ?? []) topicBySession[s.id] = s.topic;
  }

  const next = nextSessions?.[0];
  const tutorArr = next?.tutor as { full_name: string }[] | null;
  const nextTutor = tutorArr?.[0]?.full_name;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={"Welcome back, " + (profile?.full_name?.split(/\s+/)[0] ?? "")}
        subtitle={
          <>
            {student?.subject ?? "Tutoring"}
            {student?.current_level ? ` · ${student.current_level}` : ""}
          </>
        }
      />

      {/* Next session */}
      <section className="mt-8" aria-labelledby="next-heading">
        <h2 id="next-heading" className="section-kicker mb-3">Next session</h2>
        {next ? (
          <div className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-border-subtle bg-surface-muted/70 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {new Date(next.start_at).toLocaleDateString(undefined, { month: "short" })}
                </span>
                <span className="text-lg font-semibold tabular-nums leading-6 text-foreground">
                  {new Date(next.start_at).toLocaleDateString(undefined, { day: "numeric" })}
                </span>
                <span className="text-[10px] text-muted">
                  {new Date(next.start_at).toLocaleDateString(undefined, { weekday: "short" })}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-foreground">{next.topic}</p>
                <p className="mt-1 text-sm text-muted">
                  {new Date(next.start_at).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  {" · "}
                  {new Date(next.start_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {next.end_at
                    ? ` – ${new Date(next.end_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                    : ""}
                </p>
                {nextTutor && <p className="mt-1 text-sm text-muted">with {nextTutor}</p>}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <StatusBadge status={next.status} />
              <Link
                href={`/student/sessions/${next.id}`}
                className="btn btn-primary"
              >
                View session
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming sessions"
            description="When your tutor schedules a session it will appear here."
          />
        )}
      </section>

      {/* Homework */}
      <section className="mt-10" aria-labelledby="homework-heading">
        <SectionHeader
          id="homework-heading"
          kicker
          title={
            <>
              Homework
              {pendingCount && pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
            </>
          }
          action={
            <Link
              href="/student/homework"
              className="flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          }
          className="mb-3"
        />

        {homework && homework.length > 0 ? (
          <div className="card divide-y divide-border overflow-hidden">
            {homework.map((hw) => {
              const sid = reviewSessionId(hw);
              const topic = sid ? topicBySession[sid] : undefined;
              return (
                <div key={hw.id} className="flex items-start gap-3.5 px-4 py-3.5">
                  <HomeworkToggle id={hw.id} description={hw.description} completed={hw.completed} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-relaxed text-foreground">{hw.description}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {topic ? `From ${topic} · ` : ""}
                      Assigned{" "}
                      {new Date(hw.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Nothing pending"
            description="Homework from reviewed sessions will show up here."
          />
        )}
      </section>

      {/* Recent sessions */}
      <section className="mt-10" aria-labelledby="recent-heading">
        <SectionHeader
          id="recent-heading"
          kicker
          title="Recent sessions"
          action={
            <Link
              href="/student/sessions"
              className="flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          }
          className="mb-3"
        />

        {recent && recent.length > 0 ? (
          <div className="space-y-2.5">
            {recent.map((s) => {
              const arr = s.tutor as { full_name: string }[] | null;
              return (
                <SessionRow
                  key={s.id}
                  id={s.id}
                  topic={s.topic}
                  subtitle={arr?.[0]?.full_name ? `with ${arr[0].full_name}` : null}
                  startAt={s.start_at}
                  endAt={s.end_at}
                  status={s.status}
                  href={`/student/sessions/${s.id}`}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No past sessions yet"
            description="Your session history will appear here after your first session."
          />
        )}
      </section>

      {/* Reference to progress page */}
      <div className="mt-12 text-center">
        <Link
          href="/student/progress"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-strong transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-surface-muted hover:text-foreground"
        >
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          See your learning history & progress
        </Link>
      </div>
    </div>
  );
}
