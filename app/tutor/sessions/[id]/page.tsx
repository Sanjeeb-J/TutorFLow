import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SessionActions from "@/components/SessionActions";

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
    .select("*, students(name, email, subject)")
    .eq("id", id)
    .eq("tutor_id", profile!.id)
    .single();

  if (!session) notFound();

  const startDt = new Date(session.start_at);
  const endDt = new Date(session.end_at);

  const student = session.students as { name: string; subject: string; email: string };

  return (
    <div className="max-w-4xl">
      <Link
        href="/tutor/sessions"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Back to sessions
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{session.topic}</h1>
          <p className="text-sm text-muted mt-1">
            {student?.name} — {student?.subject}
          </p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 border border-border rounded-lg">
          <p className="text-xs text-muted mb-0.5">Date</p>
          <p className="text-sm font-medium text-foreground">
            {startDt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="p-3 border border-border rounded-lg">
          <p className="text-xs text-muted mb-0.5">Time</p>
          <p className="text-sm font-medium text-foreground">
            {startDt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            {" – "}
            {endDt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="p-3 border border-border rounded-lg">
          <p className="text-xs text-muted mb-0.5">Student</p>
          <p className="text-sm font-medium text-foreground">{student?.name}</p>
        </div>
        <div className="p-3 border border-border rounded-lg">
          <p className="text-xs text-muted mb-0.5">Status</p>
          <p className="text-sm font-medium text-foreground capitalize">
            {session.status.replace("_", " ")}
          </p>
        </div>
      </div>

      {/* Session Actions */}
      <SessionActions
        sessionId={session.id}
        status={session.status}
        notes={session.notes || ""}
        updatedAt={session.updated_at}
      />
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
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || "text-muted bg-gray-50"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
