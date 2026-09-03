"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  Lock,
  Play,
  Sparkles,
  Target,
  TrendingDown,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

interface SessionPlan {
  id: string;
  objectives: string[];
  lesson_outline: string[];
  practice_questions: string[];
  ai_generated_at?: string;
}

interface HomeworkItem {
  id?: string;
  description: string;
  completed?: boolean;
}

interface SessionReview {
  id: string;
  summary: string;
  next_topic: string;
  homework: HomeworkItem[];
  ai_generated_at?: string;
}

interface StudentContext {
  name: string;
  subject: string;
  email?: string | null;
  current_level?: string | null;
  learning_goals?: string | null;
  weak_areas?: string | null;
}

interface PreviousSession {
  id: string;
  topic: string;
  start_at: string;
  status: string;
  summary?: string | null;
}

interface Props {
  sessionId: string;
  status: string;
  notes: string;
  updatedAt: string;
  startAt: string;
  endAt: string;
  student: StudentContext;
  previousSessions: PreviousSession[];
}

function hwText(item: HomeworkItem | string): string {
  return typeof item === "string" ? item : item.description;
}

function indexLabel(i: number) {
  return String(i + 1).padStart(2, "0");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeRange(startIso: string, endIso?: string) {
  const start = new Date(startIso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!endIso) return start;
  const end = new Date(endIso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

export default function SessionActions({
  sessionId,
  status: initialStatus,
  notes: initialNotes,
  updatedAt: initialUpdatedAt,
  startAt,
  endAt,
  student,
  previousSessions,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSavedRef = useRef(initialNotes);

  // AI state
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [review, setReview] = useState<SessionReview | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const isEditable = status === "in_progress";
  const isScheduled = status === "scheduled";
  const isCompleted = status === "completed";
  const isReviewed = status === "ai_reviewed";
  const isFinished = isCompleted || isReviewed;

  // Load existing plan and review
  useEffect(() => {
    let cancelled = false;
    async function loadAI() {
      const [planRes, reviewRes] = await Promise.all([
        fetch(`/api/tutor/sessions/${sessionId}/plan`),
        fetch(`/api/tutor/sessions/${sessionId}/review`),
      ]);
      if (cancelled) return;
      const planData = await planRes.json();
      const reviewData = await reviewRes.json();
      if (planData.plan) setPlan(planData.plan);
      if (reviewData.review) setReview(reviewData.review);
    }
    loadAI();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Autosave notes (unchanged semantics: debounce, optimistic concurrency via updated_at)
  const saveNotes = useCallback(
    async (content: string) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSaveStatus("saving");

      try {
        const res = await fetch(`/api/tutor/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: content, updated_at: updatedAt }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409) {
            setSaveStatus("error");
            setError("This session was modified in another tab. Please reload to continue.");
            return;
          }
          setSaveStatus("error");
          return;
        }
        lastSavedRef.current = content;
        setUpdatedAt(data.updated_at);
        setSaveStatus("saved");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setSaveStatus("error");
      }
    },
    [sessionId, updatedAt],
  );

  useEffect(() => {
    if (notes === lastSavedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(notes), 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [notes, saveNotes]);

  async function handleAction(action: string) {
    setActionLoading(true);
    setError("");

    // Flush any pending note save before completing so nothing is lost
    if (action === "complete" && notes !== lastSavedRef.current) {
      await saveNotes(notes);
    }

    try {
      const res = await fetch(`/api/tutor/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed.");
        setActionLoading(false);
        return;
      }
      setStatus(data.status);
      setActionLoading(false);
    } catch {
      setError("Something went wrong.");
      setActionLoading(false);
    }
  }

  async function handleGeneratePlan() {
    setPlanLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tutor/sessions/${sessionId}/plan`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate plan.");
        setPlanLoading(false);
        return;
      }
      setPlan(data.plan);
      setPlanLoading(false);
    } catch {
      setError("Something went wrong.");
      setPlanLoading(false);
    }
  }

  async function handleGenerateReview() {
    setReviewLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tutor/sessions/${sessionId}/review`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate review.");
        setReviewLoading(false);
        return;
      }
      setReview(data.review);
      setStatus("ai_reviewed");
      setReviewLoading(false);
    } catch {
      setError("Something went wrong.");
      setReviewLoading(false);
    }
  }

  const scheduleRange = `${formatDate(startAt)} · ${formatTimeRange(startAt, endAt)}`;

  return (
    <div className="mt-6">
      {error && (
        <div className="alert alert-error mb-5" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        {/* ================= Main column ================= */}
        <div className="min-w-0 space-y-6">
          {/* Scheduled: ready-to-start panel */}
          {isScheduled && (
            <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-light">
                  <CalendarDays className="h-5 w-5 text-info" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Session ready to start</p>
                  <p className="mt-0.5 text-sm text-muted">{scheduleRange}</p>
                  <p className="mt-1 text-xs text-muted">
                    Generate an AI lesson plan, then start the session to open live notes.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {!plan && !planLoading && (
                  <button onClick={handleGeneratePlan} className="btn btn-secondary">
                    <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    AI lesson plan
                  </button>
                )}
                <button
                  onClick={() => handleAction("start")}
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  <Play className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  {actionLoading ? "Starting…" : "Start session"}
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          {isEditable ? (
            <div className="card overflow-hidden focus-within:ring-2 focus-within:ring-accent/30">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted/30 px-5 py-3.5">
                <label htmlFor="live-notes" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
                  Live notes
                </label>
                <div className="flex items-center gap-3">
                  <SaveIndicator status={saveStatus} />
                  <button
                    onClick={() => handleAction("complete")}
                    disabled={actionLoading}
                    className="btn btn-success"
                  >
                    <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    {actionLoading ? "Completing…" : "Complete session"}
                  </button>
                </div>
              </div>
              <textarea
                id="live-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Start writing session notes — what was covered, how the student responded, and what to follow up on…"
                rows={15}
                className="w-full resize-y bg-transparent px-5 py-4 text-[15px] leading-relaxed text-foreground placeholder:text-muted focus:outline-none"
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
                  Session notes
                </p>
                {isFinished && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-strong">
                    <Lock className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                    Read-only after completion
                  </span>
                )}
              </div>
              {isScheduled ? (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
                    <Clock className="h-5 w-5 text-muted" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <p className="text-sm font-medium text-foreground">Notes are locked until you start</p>
                  <p className="mt-1 max-w-sm text-sm text-muted">
                    Start the session to begin taking live notes. They autosave as you type.
                  </p>
                </div>
              ) : notes ? (
                <p className="whitespace-pre-wrap px-5 py-4 text-[15px] leading-relaxed text-foreground">
                  {notes}
                </p>
              ) : (
                <p className="px-5 py-6 text-sm italic text-muted">No notes were recorded for this session.</p>
              )}
            </div>
          )}

          {/* AI Lesson Plan */}
          <section className="card overflow-hidden" aria-labelledby="plan-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <p id="plan-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ai-light">
                  <Sparkles className="h-3.5 w-3.5 text-ai" strokeWidth={1.75} aria-hidden="true" />
                </span>
                AI lesson plan
              </p>
              {planLoading && (
                <span className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Generating plan…
                </span>
              )}
              {!plan && !planLoading && !isReviewed && (
                <button onClick={handleGeneratePlan} className="btn btn-secondary px-3 py-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Generate plan
                </button>
              )}
            </div>

            {planLoading ? (
              <div className="px-5 py-6" aria-live="polite">
                <div className="space-y-2.5">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
                  <div className="h-3 w-11/12 animate-pulse rounded bg-surface-muted" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-surface-muted" />
                </div>
                <p className="mt-4 text-xs text-muted">
                  Planning for {student.name}… this usually takes a few seconds.
                </p>
              </div>
            ) : plan ? (
              <div className="divide-y divide-border">
                <div className="px-5 py-4">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-medium text-foreground">Learning objectives</h3>
                    <span className="text-[11px] text-muted">2–4 recommended</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.objectives.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-light text-xs font-semibold text-accent-strong">
                          {indexLabel(i)}
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-5 py-4">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-medium text-foreground">Lesson outline</h3>
                    <span className="text-[11px] text-muted">Exactly 4 steps</span>
                  </div>
                  <ol className="space-y-2">
                    {plan.lesson_outline.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-muted text-xs font-semibold text-muted-strong">
                          {indexLabel(i)}
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="px-5 py-4">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-medium text-foreground">Practice questions</h3>
                    <span className="text-[11px] text-muted">Exactly 3 questions</span>
                  </div>
                  <ol className="space-y-2">
                    {plan.practice_questions.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-success-light text-xs font-semibold text-success-strong">
                          {indexLabel(i)}
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                  <span className="rounded-md bg-ai-light px-2 py-0.5 text-[11px] font-medium text-ai-strong">
                    AI-generated
                  </span>
                  <span className="text-[11px] text-muted">
                    Prepared for {student.name} from their profile and recent session history.
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted">
                  No plan yet. Generate a structured lesson plan with objectives, an outline, and practice
                  questions before the session.
                </p>
              </div>
            )}
          </section>

          {/* AI Session Review */}
          {isFinished && (
            <section className="card overflow-hidden" aria-labelledby="review-heading">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <p id="review-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ai-light">
                    <Sparkles className="h-3.5 w-3.5 text-ai" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  Session review
                </p>
                {reviewLoading && (
                  <span className="flex items-center gap-2 text-xs text-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Writing review…
                  </span>
                )}
                {!review && !reviewLoading && isCompleted && (
                  <button onClick={handleGenerateReview} className="btn btn-secondary px-3 py-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    Generate review
                  </button>
                )}
              </div>

              {reviewLoading ? (
                <div className="px-5 py-6" aria-live="polite">
                  <div className="space-y-2.5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-surface-muted" />
                    <div className="h-3 w-11/12 animate-pulse rounded bg-surface-muted" />
                    <div className="h-3 w-2/5 animate-pulse rounded bg-surface-muted" />
                  </div>
                  <p className="mt-4 text-xs text-muted">
                    Summarizing the session for {student.name}… this usually takes a few seconds.
                  </p>
                </div>
              ) : review ? (
                <div className="divide-y divide-border">
                  <div className="px-5 py-4">
                    <h3 className="mb-2 text-sm font-medium text-foreground">Summary</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{review.summary}</p>
                  </div>
                  {review.homework.length > 0 && (
                    <div className="px-5 py-4">
                      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <ClipboardList className="h-4 w-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
                        Homework assigned
                      </h3>
                      <ul className="space-y-2">
                        {review.homework.map((hw, i) => (
                          <li key={hw.id || i} className="flex items-start gap-2.5 text-sm text-foreground">
                            <span
                              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border-strong bg-surface"
                              aria-hidden="true"
                            >
                              <Check className="h-3 w-3 text-transparent" strokeWidth={2.5} />
                            </span>
                            <span className="leading-relaxed">{hwText(hw)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-muted">
                        Assigned automatically — {student.name} can mark these complete from their homework list.
                      </p>
                    </div>
                  )}
                  <div className="px-5 py-4">
                    <h3 className="mb-2 text-sm font-medium text-foreground">Recommended next topic</h3>
                    <div className="flex items-start gap-2.5 rounded-lg border border-ai-light bg-ai-light/50 px-3.5 py-3">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ai" strokeWidth={1.75} aria-hidden="true" />
                      <p className="text-sm leading-relaxed text-foreground">{review.next_topic}</p>
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    <span className="rounded-md bg-ai-light px-2 py-0.5 text-[11px] font-medium text-ai-strong">
                      AI-generated from this completed session
                    </span>
                  </div>
                </div>
              ) : isCompleted ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-muted">
                    The session is complete. Generate an AI review with a summary, homework, and a
                    recommendation for the next session.
                  </p>
                </div>
              ) : null}
            </section>
          )}
        </div>

        {/* ================= Context column ================= */}
        <aside className="space-y-4 lg:sticky lg:top-8" aria-label="Student context">
          {/* Student */}
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-light text-sm font-semibold text-accent-strong"
              >
                {student.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? "")
                  .join("")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{student.name}</p>
                <p className="truncate text-xs text-muted">
                  {student.subject}
                  {student.current_level ? ` · ${student.current_level}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={status} />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {scheduleRange}
            </p>
          </div>

          {/* Learning context */}
          <div className="card p-4">
            <p className="section-kicker mb-3">Learning context</p>
            {student.learning_goals || student.weak_areas ? (
              <div className="space-y-3.5 text-sm">
                {student.learning_goals && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                      <Target className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      Goals
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground">
                      {student.learning_goals}
                    </p>
                  </div>
                )}
                {student.weak_areas && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                      <TrendingDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      Weak areas
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground">
                      {student.weak_areas}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">
                No goals or weak areas recorded yet.
              </p>
            )}
          </div>

          {/* Previous sessions */}
          <div className="card p-4">
            <p className="section-kicker mb-3">Previous sessions</p>
            {previousSessions.length > 0 ? (
              <ul className="space-y-3">
                {previousSessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/tutor/sessions/${s.id}`}
                      className="group block rounded-lg border border-border bg-surface-muted/40 p-3 transition-colors hover:border-border-strong hover:bg-surface-muted/70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-foreground">{s.topic}</p>
                        <StatusBadge status={s.status} className="shrink-0" />
                      </div>
                      <p className="mt-1 text-[11px] text-muted">{formatDate(s.start_at)}</p>
                      {s.summary && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-strong">
                          {s.summary}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                No completed sessions to reference yet — this session will set the baseline.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.25} aria-hidden="true" />
        Saved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger-strong" role="alert">
      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
      Unable to save
    </span>
  );
}
