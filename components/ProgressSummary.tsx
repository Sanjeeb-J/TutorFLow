"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import Alert from "./Alert";
import Skeleton from "./Skeleton";

export default function ProgressSummary({ studentId }: { studentId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tutor/students/${studentId}/progress`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate summary.");
        setLoading(false);
        return;
      }
      setSummary(data.summary);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm leading-relaxed text-muted">
          A written overview of this student&apos;s learning, drawn from their session
          history and AI reviews.
        </p>
        {!loading &&
          (summary ? (
            <button onClick={handleGenerate} className="btn btn-ghost">
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Regenerate summary
            </button>
          ) : (
            <button onClick={handleGenerate} className="btn btn-secondary">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Generate summary
            </button>
          ))}
      </div>

      {error && <Alert className="mt-4">{error}</Alert>}

      {loading && (
        <div className="mt-5" aria-live="polite">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Analyzing session history…
          </p>
          <div className="mt-4 space-y-2.5" aria-hidden="true">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      )}

      {summary && !loading && (
        <div className="mt-5 rounded-lg border border-border bg-surface-muted/40 p-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
            {summary}
          </p>
        </div>
      )}
    </div>
  );
}
