import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function SessionsPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: upcoming } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, students(name)")
    .eq("tutor_id", profile!.id)
    .gte("start_at", now)
    .order("start_at", { ascending: true });

  const { data: past } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, students(name)")
    .eq("tutor_id", profile!.id)
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(20);

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
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

  function renderSessionList(sessions: typeof upcoming) {
    if (!sessions || sessions.length === 0) return null;
    return (
      <div className="space-y-2">
        {sessions.map((s) => {
          const dt = formatDateTime(s.start_at);
          return (
            <Link
              key={s.id}
              href={`/tutor/sessions/${s.id}`}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent-light/30 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{s.topic}</p>
                <p className="text-xs text-muted mt-0.5">
                  {Array.isArray(s.students) ? s.students[0]?.name : (s.students as { name: string })?.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>
                  {s.status.replace("_", " ")}
                </span>
                <div className="text-right text-xs text-muted">
                  <p>{dt.date}</p>
                  <p>{dt.time}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sessions</h1>
        </div>
        <Link
          href="/tutor/sessions/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          New Session
        </Link>
      </div>

      {/* Upcoming */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
          Upcoming ({upcoming?.length ?? 0})
        </h2>
        {renderSessionList(upcoming) || (
          <p className="text-sm text-muted py-4">No upcoming sessions.</p>
        )}
      </div>

      {/* Past */}
      <div>
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
          Past ({past?.length ?? 0})
        </h2>
        {renderSessionList(past) || (
          <p className="text-sm text-muted py-4">No past sessions yet.</p>
        )}
      </div>
    </div>
  );
}
