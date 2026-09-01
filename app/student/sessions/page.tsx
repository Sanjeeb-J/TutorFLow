import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function StudentSessionsPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", profile!.id)
    .single();

  const { data: upcoming } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, tutor:profiles!sessions_tutor_id_fkey(full_name)")
    .eq("student_id", student?.id || "")
    .gte("start_at", now)
    .order("start_at", { ascending: true });

  const { data: past } = await supabase
    .from("sessions")
    .select("id, topic, start_at, status, tutor:profiles!sessions_tutor_id_fkey(full_name)")
    .eq("student_id", student?.id || "")
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(20);

  function renderList(sessions: { id: string; topic: string; start_at: string; status: string; tutor: { full_name: string }[] | null }[] | null) {
    if (!sessions || sessions.length === 0) return null;
    return (
      <div className="space-y-2">
        {sessions.map((s) => {
          const dt = new Date(s.start_at);
          const tutor = s.tutor?.[0];
          return (
            <Link
              key={s.id}
              href={`/student/sessions/${s.id}`}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent-light/30 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{s.topic}</p>
                <p className="text-xs text-muted mt-0.5">{tutor?.full_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>
                  {s.status.replace("_", " ")}
                </span>
                <p className="text-xs text-muted">
                  {dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  {" "}
                  {dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Sessions</h1>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
          Upcoming ({upcoming?.length ?? 0})
        </h2>
        {renderList(upcoming) || (
          <p className="text-sm text-muted py-4">No upcoming sessions.</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
          Past ({past?.length ?? 0})
        </h2>
        {renderList(past) || (
          <p className="text-sm text-muted py-4">No past sessions yet.</p>
        )}
      </div>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "scheduled": return "text-blue-700 bg-blue-50";
    case "in_progress": return "text-amber-700 bg-amber-50";
    case "completed": return "text-green-700 bg-green-50";
    case "ai_reviewed": return "text-purple-700 bg-purple-50";
    default: return "text-muted bg-gray-50";
  }
}
