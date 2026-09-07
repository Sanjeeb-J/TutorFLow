import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import SessionActions from "@/components/SessionActions";
import StatusBadge from "@/components/StatusBadge";
import { formatDateLine, formatTimeRange } from "@/lib/format";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "*, students(name, email, subject, current_level, learning_goals, weak_areas)",
    )
    .eq("id", id)
    .eq("tutor_id", profile!.id)
    .single();

  if (!session) notFound();

  // Context for the workspace: recent completed work for the same student
  const { data: previous } = await supabase
    .from("sessions")
    .select("id, topic, start_at, status, session_reviews(summary)")
    .eq("student_id", session.student_id)
    .eq("tutor_id", profile!.id)
    .neq("id", session.id)
    .in("status", ["completed", "ai_reviewed"])
    .order("start_at", { ascending: false })
    .limit(3);

  const student = session.students as {
    name: string;
    email?: string | null;
    subject: string;
    current_level?: string | null;
    learning_goals?: string | null;
    weak_areas?: string | null;
  };

  const previousSessions = (previous ?? []).map((s) => {
    const reviews = s.session_reviews as Array<{ summary: string }> | null;
    return {
      id: s.id,
      topic: s.topic,
      start_at: s.start_at,
      status: s.status,
      summary: reviews?.[0]?.summary ?? null,
    };
  });

  return (
    <div>
      <PageHeader
        backHref="/tutor/sessions"
        backLabel="Back to sessions"
        title={session.topic}
        subtitle={
          <span className="block">
            {student?.name} · {student?.subject}
            {student?.current_level ? ` · ${student.current_level}` : ""}
            <span className="mt-0.5 block text-xs">
              {formatDateLine(session.start_at)} · {formatTimeRange(session.start_at, session.end_at)}
            </span>
          </span>
        }
        actions={<StatusBadge status={session.status} className="shrink-0" />}
      />

      <SessionActions
        sessionId={session.id}
        status={session.status}
        notes={session.notes || ""}
        updatedAt={session.updated_at}
        startAt={session.start_at}
        endAt={session.end_at}
        student={student}
        previousSessions={previousSessions}
      />
    </div>
  );
}
