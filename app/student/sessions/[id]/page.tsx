import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardList, Clock, FileText, Sparkles } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import HomeworkToggle from "@/components/HomeworkToggle";

export default async function StudentSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", profile!.id)
    .single();

  if (!student) notFound();

  const { data: session } = await supabase
    .from("sessions")
    .select("*, tutor:profiles!sessions_tutor_id_fkey(full_name)")
    .eq("id", id)
    .eq("student_id", student.id)
    .single();

  if (!session) notFound();

  const startDt = new Date(session.start_at);
  const endDt = new Date(session.end_at);
  const tutorArr = session.tutor as { full_name: string }[] | null;
  const tutor = tutorArr?.[0];

  const isReviewed = session.status === "ai_reviewed";
  const isCompleted = session.status === "completed" || isReviewed;

  let review = null;
  let homework: Array<{ id: string; description: string; completed: boolean }> = [];
  if (isReviewed) {
    const { data: reviewData } = await supabase
      .from("session_reviews")
      .select("id, summary, next_topic, ai_generated_at")
      .eq("session_id", id)
      .single();
    review = reviewData;

    if (review) {
      const { data: hwData } = await supabase
        .from("homework_items")
        .select("id, description, completed")
        .eq("review_id", review.id)
        .order("created_at", { ascending: true });
      homework = hwData || [];
    }
  }

  const pendingCount = homework.filter((h) => !h.completed).length;

  return (
    <div>
      <Link
        href="/student/sessions"
        className="inline-flex items-center gap-1 text-sm text-muted-strong transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Back to sessions
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">{session.topic}</h1>
          {tutor && <p className="mt-1 text-sm text-muted">with {tutor.full_name}</p>}
        </div>
        <StatusBadge status={session.status} className="shrink-0 self-start sm:mt-1" />
      </div>

      {/* Meta */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light">
            <CalendarDays className="h-4 w-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Date</p>
            <p className="truncate text-sm font-medium text-foreground">
              {startDt.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light">
            <Clock className="h-4 w-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Time</p>
            <p className="truncate text-sm font-medium text-foreground">
              {startDt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              {" – "}
              {endDt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light">
            <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Review status</p>
            <p className="truncate text-sm font-medium text-foreground">
              {isReviewed ? "Available below" : isCompleted ? "Pending" : "After completion"}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <section className="mt-8" aria-labelledby="notes-heading">
        <h2 id="notes-heading" className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <FileText className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
          Session notes
        </h2>
        {session.notes ? (
          <div className="card px-5 py-4">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
              {session.notes}
            </p>
          </div>
        ) : isCompleted ? (
          <EmptyState
            title="No notes recorded for this session"
            description="Your tutor didn't leave written notes for this one."
          />
        ) : (
          <EmptyState
            title="Notes appear after the session"
            description="Your tutor's notes will be available here once the session is completed."
          />
        )}
      </section>

      {/* AI Review */}
      {review ? (
        <section className="mt-8" aria-labelledby="review-heading">
          <h2 id="review-heading" className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
            Session review
          </h2>
          <div className="card divide-y divide-border overflow-hidden">
            <div className="px-5 py-4">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Summary</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {review.summary}
              </p>
            </div>
            {homework.length > 0 && (
              <div className="px-5 py-4">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                  <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Homework
                  {pendingCount > 0 ? ` · ${pendingCount} to do` : " · all done"}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {homework.map((hw) => (
                    <li key={hw.id} className="flex items-start gap-3">
                      <HomeworkToggle id={hw.id} description={hw.description} completed={hw.completed} />
                      <p
                        className={`text-sm leading-relaxed ${
                          hw.completed ? "text-muted line-through" : "text-foreground"
                        }`}
                      >
                        {hw.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {review.next_topic && (
              <div className="px-5 py-4">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                  Recommended next topic
                </p>
                <div className="flex items-start gap-2.5 rounded-lg border border-ai-light bg-ai-light/50 px-3.5 py-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ai" strokeWidth={1.75} aria-hidden="true" />
                  <p className="text-sm leading-relaxed text-foreground">{review.next_topic}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : isCompleted ? (
        <section className="mt-8" aria-labelledby="review-heading">
          <h2 id="review-heading" className="mb-3 text-base font-semibold text-foreground">
            Session review
          </h2>
          <EmptyState
            icon={Sparkles}
            title="Review not available yet"
            description="Your tutor generates the AI review after the session. Check back soon."
          />
        </section>
      ) : null}
    </div>
  );
}
