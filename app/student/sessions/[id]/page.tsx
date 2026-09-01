import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function StudentSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();

  // Get student record
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", profile!.id)
    .single();

  if (!student) notFound();

  // Fetch session with ownership check via RLS
  const { data: session } = await supabase
    .from("sessions")
    .select("*, tutor:profiles!sessions_tutor_id_fkey(full_name)")
    .eq("id", id)
    .eq("student_id", student.id)
    .single();

  if (!session) notFound();

  const startDt = new Date(session.start_at);
  const endDt = new Date(session.end_at);
  const tutor = session.tutor as { full_name: string } | null;

  const colors: Record<string, string> = {
    scheduled: "text-blue-700 bg-blue-50",
    in_progress: "text-amber-700 bg-amber-50",
    completed: "text-green-700 bg-green-50",
    ai_reviewed: "text-purple-700 bg-purple-50",
  };

  return (
    <div className="max-w-4xl">
      <Link
        href="/student/sessions"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Back to sessions
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{session.topic}</h1>
          <p className="text-sm text-muted mt-1">{tutor?.full_name}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[session.status] || ""}`}>
          {session.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 border border-border rounded-lg">
          <p className="text-xs text-muted mb-0.5">Date</p>
          <p className="text-sm font-medium text-foreground">
            {startDt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <p className="text-xs text-muted mb-0.5">Time</p>
          <p className="text-sm font-medium text-foreground">
            {startDt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            {" – "}
            {endDt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Session Notes</h2>
        {session.notes ? (
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{session.notes}</p>
          </div>
        ) : session.status === "completed" || session.status === "ai_reviewed" ? (
          <p className="text-sm text-muted italic">No notes recorded for this session.</p>
        ) : (
          <p className="text-sm text-muted">Notes will be available after the session is completed.</p>
        )}
      </div>

      {/* AI Review Placeholder */}
      <div className="p-4 border border-dashed border-border rounded-lg">
        <p className="text-sm text-muted">
          {session.status === "ai_reviewed"
            ? "AI review will be displayed here."
            : "AI session review will be available after processing."}
        </p>
      </div>
    </div>
  );
}
