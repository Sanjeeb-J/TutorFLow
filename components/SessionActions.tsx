"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, CheckCircle, Clock, Lock } from "lucide-react";

interface Props {
  sessionId: string;
  status: string;
  notes: string;
  updatedAt: string;
}

export default function SessionActions({ sessionId, status: initialStatus, notes: initialNotes, updatedAt: initialUpdatedAt }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSavedRef = useRef(initialNotes);

  const isEditable = status === "in_progress";
  const isScheduled = status === "scheduled";
  const isCompleted = status === "completed" || status === "ai_reviewed";

  // Autosave notes
  const saveNotes = useCallback(async (content: string) => {
    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

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
      if ((e as Error).name !== "AbortError") {
        setSaveStatus("error");
      }
    }
  }, [sessionId, updatedAt]);

  // Debounced save on notes change
  useEffect(() => {
    if (notes === lastSavedRef.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      saveNotes(notes);
    }, 800);

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

  return (
    <div className="space-y-6">
      {/* Error */}
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

        {isCompleted && (
          <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted border border-border rounded-md">
            <Lock className="w-4 h-4" strokeWidth={1.5} />
            Session completed
          </div>
        )}
      </div>

      {/* Notes Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">Notes</h2>
          {isEditable && (
            <SaveIndicator status={saveStatus} />
          )}
          {isCompleted && (
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
            <p className="text-sm text-muted">
              Start the session to begin taking notes.
            </p>
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

      {/* AI Review Placeholder */}
      {isCompleted && (
        <div className="p-4 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted">
            AI session review will be available after processing.
          </p>
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
