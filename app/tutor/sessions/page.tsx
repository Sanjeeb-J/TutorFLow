import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CalendarDays, CheckCircle2, CalendarPlus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
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

function studentNameOf(session: SessionLike): string | null {
  if (!session.students) return null;
  if (Array.isArray(session.students)) {
    return (session.students[0] as { name?: string } | undefined)?.name ?? null;
  }
  return (session.students as { name?: string })?.name ?? null;
}

export default async function SessionsPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const selectFields = "id, topic, start_at, end_at, status, students(name)";

  const { data: upcoming } = await supabase
    .from("sessions")
    .select(selectFields)
    .eq("tutor_id", profile!.id)
    .gte("start_at", now)
    .order("start_at", { ascending: true });

  const { data: past } = await supabase
    .from("sessions")
    .select(selectFields)
    .eq("tutor_id", profile!.id)
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(20);

  const upcomingCount = upcoming?.length ?? 0;
  const pastCount = past?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle={
          upcomingCount + pastCount === 0
            ? "Plan, run, and review your tutoring sessions"
            : `${upcomingCount} upcoming · ${pastCount} past`
        }
        actions={
          <Link href="/tutor/sessions/new" className="btn btn-primary">
            <CalendarPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Schedule session
          </Link>
        }
      />

      {/* Upcoming */}
      <section className="mt-8" aria-labelledby="upcoming-heading">
        <SectionHeader id="upcoming-heading" title="Upcoming" count={upcomingCount} className="mb-3" />
        {upcoming && upcoming.length > 0 ? (
          <div className="space-y-2.5">
            {upcoming.map((s) => (
              <SessionRow
                key={s.id}
                id={s.id}
                topic={s.topic}
                subtitle={studentNameOf(s)}
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
            description="When you schedule a session it will appear here."
            action={
              <Link href="/tutor/sessions/new" className="btn btn-primary">
                <CalendarPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Schedule a session
              </Link>
            }
          />
        )}
      </section>

      {/* Past */}
      <section className="mt-10" aria-labelledby="past-heading">
        <SectionHeader id="past-heading" title="Past" count={pastCount} className="mb-3" />
        {past && past.length > 0 ? (
          <div className="space-y-2.5">
            {past.map((s) => (
              <SessionRow
                key={s.id}
                id={s.id}
                topic={s.topic}
                subtitle={studentNameOf(s)}
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
            description="Completed sessions will appear here with their status and AI reviews."
          />
        )}
      </section>
    </div>
  );
}
