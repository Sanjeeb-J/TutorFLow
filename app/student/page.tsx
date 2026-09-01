import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Calendar, BookOpen } from "lucide-react";

export default async function StudentDashboard() {
  const profile = await getProfile();
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Get student record
  const { data: student } = await supabase
    .from("students")
    .select("id, name, subject, current_level")
    .eq("user_id", profile!.id)
    .single();

  // Get upcoming sessions
  const { data: upcoming } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, tutor:profiles!sessions_tutor_id_fkey(full_name)")
    .eq("student_id", student?.id || "")
    .gte("start_at", now)
    .in("status", ["scheduled", "in_progress"])
    .order("start_at", { ascending: true })
    .limit(5);

  // Get recent sessions
  const { data: recent } = await supabase
    .from("sessions")
    .select("id, topic, start_at, status, tutor:profiles!sessions_tutor_id_fkey(full_name)")
    .eq("student_id", student?.id || "")
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(5);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground mb-1">
        Welcome, {profile?.full_name}
      </h1>
      <p className="text-sm text-muted mb-8">
        {student?.subject}{student?.current_level ? ` · ${student.current_level}` : ""}
      </p>

      {/* Upcoming Sessions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Upcoming Sessions</h2>
          <Link href="/student/sessions" className="text-sm text-accent hover:text-accent/80">
            View all
          </Link>
        </div>

        {upcoming && upcoming.length > 0 ? (
          <div className="space-y-2">
            {upcoming.map((s) => {
              const dt = new Date(s.start_at);
              const tutorArr = s.tutor as { full_name: string }[] | null;
              const tutor = tutorArr?.[0];
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
                  <div className="text-right">
                    <p className="text-sm text-foreground">
                      {dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-muted">
                      {dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-6 border border-border rounded-lg text-center">
            <Calendar className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-muted">No upcoming sessions</p>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Sessions</h2>
        {recent && recent.length > 0 ? (
          <div className="space-y-2">
            {recent.map((s) => {
              const dt = new Date(s.start_at);
              const tutorArr = s.tutor as { full_name: string }[] | null;
              const tutor = tutorArr?.[0];
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
                    <StatusBadge status={s.status} />
                    <p className="text-xs text-muted">
                      {dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-6 border border-border rounded-lg text-center">
            <BookOpen className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-muted">No past sessions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "text-blue-700 bg-blue-50",
    in_progress: "text-amber-700 bg-amber-50",
    completed: "text-green-700 bg-green-50",
    ai_reviewed: "text-purple-700 bg-purple-50",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}
