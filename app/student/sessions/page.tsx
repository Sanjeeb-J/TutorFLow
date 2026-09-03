import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import SessionRow from "@/components/SessionRow";
import EmptyState from "@/components/EmptyState";

type TutorInfo = { full_name: string }[] | null;

export default async function StudentSessionsPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", profile!.id)
    .single();

  const studentId = student?.id ?? "";

  const { data: upcoming } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, tutor:profiles!sessions_tutor_id_fkey(full_name)")
    .eq("student_id", studentId)
    .gte("start_at", now)
    .order("start_at", { ascending: true });

  const { data: past } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, tutor:profiles!sessions_tutor_id_fkey(full_name)")
    .eq("student_id", studentId)
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(20);

  const upcomingCount = upcoming?.length ?? 0;
  const pastCount = past?.length ?? 0;

  return (
    <div>
      <div>
        <h1 className="page-title">Sessions</h1>
        <p className="mt-1 text-sm text-muted">
          {upcomingCount + pastCount === 0
            ? "Your tutoring sessions"
            : `${upcomingCount} upcoming · ${pastCount} past`}
        </p>
      </div>

      <section className="mt-8" aria-labelledby="upcoming-heading">
        <div className="mb-3 flex items-center gap-2.5">
          <h2 id="upcoming-heading" className="text-sm font-semibold text-foreground">
            Upcoming
          </h2>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-strong">
            {upcomingCount}
          </span>
        </div>
        {upcoming && upcoming.length > 0 ? (
          <div className="space-y-2.5">
            {upcoming.map((s) => {
              const tutor = s.tutor as TutorInfo;
              return (
                <SessionRow
                  key={s.id}
                  id={s.id}
                  topic={s.topic}
                  subtitle={tutor?.[0]?.full_name ? `with ${tutor[0].full_name}` : null}
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
            icon={CalendarDays}
            title="No upcoming sessions"
            description="Your tutor will share new session times with you here."
          />
        )}
      </section>

      <section className="mt-10" aria-labelledby="past-heading">
        <div className="mb-3 flex items-center gap-2.5">
          <h2 id="past-heading" className="text-sm font-semibold text-foreground">
            Past
          </h2>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-strong">
            {pastCount}
          </span>
        </div>
        {past && past.length > 0 ? (
          <div className="space-y-2.5">
            {past.map((s) => {
              const tutor = s.tutor as TutorInfo;
              return (
                <SessionRow
                  key={s.id}
                  id={s.id}
                  topic={s.topic}
                  subtitle={tutor?.[0]?.full_name ? `with ${tutor[0].full_name}` : null}
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
            icon={CheckCircle2}
            title="No past sessions yet"
            description="Completed sessions will appear here with their notes and AI reviews."
          />
        )}
      </section>
    </div>
  );
}
