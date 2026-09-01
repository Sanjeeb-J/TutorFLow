import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Calendar, Clock } from "lucide-react";

export default async function TutorPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { count: studentCount } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("tutor_id", profile!.id);

  const { count: upcomingCount } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("tutor_id", profile!.id)
    .gte("start_at", now)
    .in("status", ["scheduled", "in_progress"]);

  const { data: upcomingSessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, status, students(name)")
    .eq("tutor_id", profile!.id)
    .gte("start_at", now)
    .in("status", ["scheduled", "in_progress"])
    .order("start_at", { ascending: true })
    .limit(5);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground mb-1">
        Dashboard
      </h1>
      <p className="text-sm text-muted mb-8">
        Welcome back, {profile?.full_name}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 border border-border rounded-lg">
          <div className="flex items-center gap-2 text-muted mb-2">
            <Users className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-xs font-medium uppercase tracking-wide">Students</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{studentCount ?? 0}</p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <div className="flex items-center gap-2 text-muted mb-2">
            <Calendar className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-xs font-medium uppercase tracking-wide">Upcoming</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{upcomingCount ?? 0}</p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <div className="flex items-center gap-2 text-muted mb-2">
            <Clock className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-xs font-medium uppercase tracking-wide">This Week</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {upcomingSessions?.length ?? 0}
          </p>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Upcoming Sessions</h2>
          <Link
            href="/tutor/sessions"
            className="text-sm text-accent hover:text-accent/80 transition-colors"
          >
            View all
          </Link>
        </div>

        {upcomingSessions && upcomingSessions.length > 0 ? (
          <div className="space-y-2">
            {upcomingSessions.map((session) => (
              <Link
                key={session.id}
                href={`/tutor/sessions/${session.id}`}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent-light/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{session.topic}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {Array.isArray(session.students) ? session.students[0]?.name : (session.students as { name: string })?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-foreground">
                    {new Date(session.start_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(session.start_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-6 border border-border rounded-lg text-center">
            <Calendar className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-muted">No upcoming sessions</p>
            <Link
              href="/tutor/sessions"
              className="inline-block mt-2 text-sm text-accent hover:text-accent/80"
            >
              Schedule a session
            </Link>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/tutor/students"
            className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent-light/30 transition-colors"
          >
            <Users className="w-5 h-5 text-accent" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-foreground">Manage Students</p>
              <p className="text-xs text-muted">Add, view, and edit students</p>
            </div>
          </Link>
          <Link
            href="/tutor/sessions"
            className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent-light/30 transition-colors"
          >
            <Calendar className="w-5 h-5 text-accent" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-foreground">Schedule Session</p>
              <p className="text-xs text-muted">Create a new tutoring session</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
