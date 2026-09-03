import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, ClipboardList, Sparkles, TrendingUp } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";

interface ReviewedSession {
  id: string;
  topic: string;
  start_at: string;
  session_reviews: Array<{ summary: string; next_topic: string | null }> | null;
}

export default async function StudentProgressPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, name, subject, current_level")
    .eq("user_id", profile!.id)
    .single();

  if (!student) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="page-title">Progress</h1>
        <div className="mt-8">
          <EmptyState
            icon={TrendingUp}
            title="Progress isn't available yet"
            description="Your progress history is built from AI-reviewed tutoring sessions."
          />
        </div>
      </div>
    );
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, session_reviews(summary, next_topic)")
    .eq("student_id", student.id)
    .eq("status", "ai_reviewed")
    .order("start_at", { ascending: false })
    .limit(20);

  const { data: homework } = await supabase
    .from("homework_items")
    .select("id, completed");

  const reviewed = ((sessions ?? []) as ReviewedSession[]).map((s) => ({
    id: s.id,
    topic: s.topic,
    start_at: s.start_at,
    review: s.session_reviews?.[0] ?? null,
  }));

  const doneCount = (homework ?? []).filter((h) => h.completed).length;
  const totalCount = homework?.length ?? 0;
  const latest = reviewed[0];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">Progress</h1>
      <p className="mt-1 text-sm text-muted">
        {student.name} · {student.subject}
        {student.current_level ? ` · ${student.current_level}` : ""}
      </p>

      {reviewed.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={TrendingUp}
            title="Not enough history yet"
            description="Once your tutor completes sessions and generates AI reviews, your learning history and recommendations will appear here."
          />
        </div>
      ) : (
        <>
          {/* Overview */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                <BookOpenCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Reviewed sessions
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {reviewed.length}
              </p>
            </div>
            <div className="card p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                <ClipboardList className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Homework completed
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {doneCount}
                <span className="text-base font-medium text-muted"> / {totalCount}</span>
              </p>
            </div>
            <div className="card p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                All caught up
              </p>
              <p className="mt-2 text-sm font-medium leading-7 text-foreground">
                {doneCount >= totalCount && totalCount > 0
                  ? "Yes — great work!"
                  : `${Math.max(totalCount - doneCount, 0)} item${totalCount - doneCount === 1 ? "" : "s"} to go`}
              </p>
            </div>
          </div>

          {/* Latest recommendation */}
          {latest?.review?.next_topic && (
            <section className="mt-8" aria-labelledby="focus-heading">
              <h2 id="focus-heading" className="section-kicker mb-3">Suggested focus</h2>
              <div className="card flex items-start gap-3.5 border-l-4 border-l-ai p-5">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-ai" strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <p className="text-sm text-muted">Recommended from your latest reviewed session</p>
                  <p className="mt-1 text-[15px] font-medium text-foreground">
                    {latest.review.next_topic}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Learning history */}
          <section className="mt-10" aria-labelledby="history-heading">
            <h2 id="history-heading" className="section-kicker mb-3">Learning history</h2>
            <div className="space-y-3">
              {reviewed.map((s) => (
                <Link
                  key={s.id}
                  href={`/student/sessions/${s.id}`}
                  className="card card-hover group block p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{s.topic}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {new Date(s.start_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <StatusBadge status="ai_reviewed" className="shrink-0" />
                  </div>
                  {s.review?.summary && (
                    <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted-strong">
                      {s.review.summary}
                    </p>
                  )}
                  <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-accent transition-colors group-hover:text-accent-strong">
                    View review
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
