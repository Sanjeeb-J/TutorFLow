import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

  // Fetch upcoming sessions for this student
  const now = new Date().toISOString();
  const { data: upcomingSessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status")
    .eq("student_id", student.id)
    .eq("tutor_id", profile!.id)
    .gte("start_at", now)
    .order("start_at", { ascending: true })
    .limit(5);

  // Fetch recent sessions
  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status")
    .eq("student_id", student.id)
    .eq("tutor_id", profile!.id)
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(5);

  return (
    <div className="max-w-4xl">
      <Link
        href="/tutor/students"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Back to students
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{student.name}</h1>
          <p className="text-sm text-muted mt-1">{student.subject}</p>
        </div>
        <Link
          href={`/tutor/students/${student.id}/edit`}
          className="px-3 py-1.5 text-sm font-medium text-muted border border-border rounded-md hover:text-foreground hover:bg-accent-light/50 transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {student.email && (
          <div className="p-4 border border-border rounded-lg">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Email</p>
            <p className="text-sm text-foreground">{student.email}</p>
          </div>
        )}
        {student.current_level && (
          <div className="p-4 border border-border rounded-lg">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Level</p>
            <p className="text-sm text-foreground">{student.current_level}</p>
          </div>
        )}
        {student.learning_goals && (
          <div className="p-4 border border-border rounded-lg sm:col-span-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Learning Goals</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{student.learning_goals}</p>
          </div>
        )}
        {student.weak_areas && (
          <div className="p-4 border border-border rounded-lg sm:col-span-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Weak Areas</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{student.weak_areas}</p>
          </div>
        )}
      </div>

      {/* Upcoming Sessions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Upcoming Sessions</h2>
        {upcomingSessions && upcomingSessions.length > 0 ? (
          <div className="space-y-2">
            {upcomingSessions.map((s) => (
              <Link
                key={s.id}
                href={`/tutor/sessions/${s.id}`}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent-light/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.topic}</p>
                  <p className="text-xs text-muted">
                    {new Date(s.start_at).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    {new Date(s.start_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="text-xs font-medium text-muted capitalize">{s.status.replace("_", " ")}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No upcoming sessions.</p>
        )}
      </div>

      {/* Recent Sessions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent Sessions</h2>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <Link
                key={s.id}
                href={`/tutor/sessions/${s.id}`}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent-light/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.topic}</p>
                  <p className="text-xs text-muted">
                    {new Date(s.start_at).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span className="text-xs font-medium text-muted capitalize">{s.status.replace("_", " ")}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No past sessions yet.</p>
        )}
      </div>
    </div>
  );
}
