"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, CheckCircle, Clock, Lock, Sparkles, RefreshCw } from "lucide-react";

interface SessionPlan {
  id: string;
  objectives: string[];
  lesson_outline: string[];
  practice_questions: string[];
  ai_model?: string;
  ai_prompt_version?: string;
  ai_generated_at?: string;
}

interface HomeworkItem {
  id: string;
  description: string;
  completed: boolean;
}

interface SessionReview {
  id: string;
  summary: string;
  next_topic: string;
  homework: HomeworkItem[];
  ai_model?: string;
  ai_prompt_version?: string;
  ai_generated_at?: string;
}

interface Props {
  sessionId: string;
  status: string;
  notes: string;
  updatedAt: string;
}

export default function SessionActions({
  sessionId,
  status: initialStatus,
  notes: initialNotes,
  updatedAt: initialUpdatedAt,
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

  // Load existing plan and review
  useEffect(() => {
    async function loadAI() {
      const [planRes, reviewRes] = await Promise.all([
        fetch(`/api/tutor/sessions/${sessionId}/plan`),
        fetch(`/api/tutor/sessions/${sessionId}/review`),
      ]);
      const planData = await planRes.json();
      const reviewData = await reviewRes.json();
      if (planData.plan) setPlan(planData.plan);
      if (reviewData.review) setReview(reviewData.review);
    }
    loadAI();
  }, [sessionId]);

  // Autosave notes
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
            setError("Session was modified elsewhere. Please reload.");
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {isScheduled && (
          <button
            onClick={() => handleAction("start")}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            <Play className="w-4 h-4" strokeWidth={1.5} />
            {actionLoading ? "Starting..." : "Start Session"}
          </button>
        )}
        {isEditable && (
          <button
            onClick={() => handleAction("complete")}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
            {actionLoading ? "Completing..." : "Complete Session"}
          </button>
        )}
        {(isCompleted || isReviewed) && (
          <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted border border-border rounded-md">
            <Lock className="w-4 h-4" strokeWidth={1.5} />
            Session {isReviewed ? "AI reviewed" : "completed"}
          </div>
        )}
      </div>

      {/* Session Plan */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Session Plan</h2>
          {!plan && !planLoading && (
            <button
              onClick={handleGeneratePlan}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent border border-accent/30 rounded-md hover:bg-accent-light transition-colors"
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              Generate plan
            </button>
          )}
          {plan && !planLoading && (
            <button
              onClick={handleGeneratePlan}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted border border-border rounded-md hover:text-foreground hover:bg-accent-light/50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              Regenerate
            </button>
          )}
          {planLoading && (
            <span className="text-sm text-muted flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-pulse" strokeWidth={1.5} />
              Generating...
            </span>
          )}
        </div>

        {plan ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Learning Objectives</h3>
              <ul className="space-y-1">
                {plan.objectives.map((obj, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-muted font-medium">{i + 1}.</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Lesson Outline</h3>
              <ol className="space-y-1">
                {plan.lesson_outline.map((item, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-muted font-medium">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Practice Questions</h3>
              <ol className="space-y-1">
                {plan.practice_questions.map((q, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-muted font-medium">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : !planLoading ? (
          <p className="text-sm text-muted">
            {isScheduled
              ? "Generate a session plan before starting."
              : "No plan generated yet."}
          </p>
        ) : null}
      </div>

      {/* Notes Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">Notes</h2>
          {isEditable && <SaveIndicator status={saveStatus} />}
          {(isCompleted || isReviewed) && (
            <div className="flex items-center gap-1 text-xs text-muted">
              <Lock className="w-3 h-3" strokeWidth={1.5} />
              Read-only
            </div>
          )}
        </div>

        {isEditable ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Start writing session notes..."
            rows={12}
            className="w-full px-4 py-3 text-sm border border-border rounded-lg bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-y leading-relaxed"
          />
        ) : isScheduled ? (
          <div className="p-6 border border-border rounded-lg text-center">
            <Clock className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-muted">Start the session to begin taking notes.</p>
          </div>
        ) : (
          <div className="p-4 border border-border rounded-lg">
            {notes ? (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{notes}</p>
            ) : (
              <p className="text-sm text-muted italic">No notes recorded.</p>
            )}
          </div>
        )}
      </div>

      {/* AI Review */}
      {(isCompleted || isReviewed) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">AI Review</h2>
            {!review && isCompleted && !reviewLoading && (
              <button
                onClick={handleGenerateReview}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent border border-accent/30 rounded-md hover:bg-accent-light transition-colors"
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                Generate review
              </button>
            )}
            {reviewLoading && (
              <span className="text-sm text-muted flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-pulse" strokeWidth={1.5} />
                Generating review...
              </span>
            )}
          </div>

          {review ? (
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-2">Summary</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{review.summary}</p>
              </div>
              {review.homework.length > 0 && (
                <div className="p-4 border border-border rounded-lg">
                  <h3 className="text-sm font-medium text-foreground mb-2">Homework</h3>
                  <ul className="space-y-1">
                    {review.homework.map((hw, i) => (
                      <li key={hw.id || i} className="text-sm text-foreground flex gap-2">
                        <span className="text-muted">•</span>
                        {hw.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="p-4 border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-2">Next Session</h3>
                <p className="text-sm text-foreground">{review.next_topic}</p>
              </div>
            </div>
          ) : !reviewLoading && isCompleted ? (
            <div className="p-6 border border-dashed border-border rounded-lg text-center">
              <p className="text-sm text-muted">
                Generate an AI review after completing the session.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {status === "saving" && (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-muted">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-muted">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-red-600">Unable to save</span>
        </>
      )}
    </div>
  );
}
