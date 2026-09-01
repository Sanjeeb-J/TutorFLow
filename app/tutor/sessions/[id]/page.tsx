import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

  function statusColor(status: string) {
    switch (status) {
      case "scheduled": return "text-blue-700 bg-blue-50";
      case "in_progress": return "text-amber-700 bg-amber-50";
      case "completed": return "text-green-700 bg-green-50";
      case "ai_reviewed": return "text-purple-700 bg-purple-50";
      default: return "text-muted bg-gray-50";
    }
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/tutor/sessions"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Back to sessions
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{session.topic}</h1>
          <p className="text-sm text-muted mt-1">
            {(session.students as { name: string })?.name}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(session.status)}`}>
          {session.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="p-4 border border-border rounded-lg">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Date</p>
          <p className="text-sm text-foreground">
            {startDt.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Time</p>
          <p className="text-sm text-foreground">
            {startDt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            {" — "}
            {endDt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Student</p>
          <p className="text-sm text-foreground">
            {(session.students as { name: string })?.name}
          </p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Subject</p>
          <p className="text-sm text-foreground">
            {(session.students as { subject: string })?.subject}
          </p>
        </div>
      </div>

      {session.notes && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">Notes</h2>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-foreground whitespace-pre-wrap">{session.notes}</p>
          </div>
        </div>
      )}

      <div className="p-6 border border-border rounded-lg text-center">
        <p className="text-sm text-muted">
          Session workflow (notes, AI planning, review) will be available in a future update.
        </p>
      </div>
    </div>
  );
}
