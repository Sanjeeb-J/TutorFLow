import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CheckCircle2, ClipboardList } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import HomeworkToggle from "@/components/HomeworkToggle";

interface HomeworkRow {
  id: string;
  description: string;
  completed: boolean;
  created_at: string;
  review: { id: string; session_id: string } | { id: string; session_id: string }[] | null;
}

function reviewOf(row: HomeworkRow) {
  const r = row.review;
  if (!r) return null;
  return Array.isArray(r) ? r[0] : r;
}

export default async function StudentHomeworkPage() {
  await getProfile();
  const supabase = await createClient();

  const { data: homework } = await supabase
    .from("homework_items")
    .select("id, description, completed, created_at, review:session_reviews(id, session_id)")
    .order("created_at", { ascending: false });

  const rows = (homework ?? []) as HomeworkRow[];

  // Resolve session topics for source labels
  const sessionIds = Array.from(
    new Set(rows.map((h) => reviewOf(h)?.session_id).filter(Boolean) as string[]),
  );
  const topicBySession: Record<string, string> = {};
  if (sessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, topic")
      .in("id", sessionIds);
    for (const s of sessions ?? []) topicBySession[s.id] = s.topic;
  }

  const pending = rows.filter((h) => !h.completed);
  const done = rows.filter((h) => h.completed);

  function renderItem(hw: HomeworkRow) {
    const review = reviewOf(hw);
    const topic = review ? topicBySession[review.session_id] : undefined;
    return (
      <li key={hw.id} className="flex items-start gap-3.5 px-4 py-3.5">
        <HomeworkToggle id={hw.id} description={hw.description} completed={hw.completed} />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm leading-relaxed ${
              hw.completed ? "text-muted line-through" : "text-foreground"
            }`}
          >
            {hw.description}
          </p>
          <p className="mt-1 text-xs text-muted">
            {topic && review ? (
              <>
                From{" "}
                <Link
                  href={`/student/sessions/${review.session_id}`}
                  className="font-medium text-accent transition-colors hover:text-accent-strong"
                >
                  {topic}
                </Link>
                {" · "}
              </>
            ) : null}
            Assigned{" "}
            {new Date(hw.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </li>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="page-title">Homework</h1>
        <p className="mt-1 text-sm text-muted">
          {rows.length === 0
            ? "Tasks from your reviewed sessions"
            : `${pending.length} to do · ${done.length} completed`}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={ClipboardList}
            title="No homework yet"
            description="Homework appears here after your tutor completes a session and generates an AI review."
          />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {pending.length > 0 && (
            <section aria-labelledby="pending-heading">
              <h2 id="pending-heading" className="mb-3 text-sm font-semibold text-foreground">
                To do
                <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-strong">
                  {pending.length}
                </span>
              </h2>
              <ul className="card divide-y divide-border overflow-hidden">{pending.map(renderItem)}</ul>
            </section>
          )}

          {done.length > 0 && (
            <section aria-labelledby="done-heading">
              <h2 id="done-heading" className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.75} aria-hidden="true" />
                Completed
                <span className="ml-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-strong">
                  {done.length}
                </span>
              </h2>
              <ul className="card divide-y divide-border overflow-hidden">{done.map(renderItem)}</ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
