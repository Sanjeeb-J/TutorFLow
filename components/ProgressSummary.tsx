"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

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
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">Progress Summary</h2>
        {!summary && !loading && (
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent border border-accent/30 rounded-md hover:bg-accent-light transition-colors"
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            Generate summary
          </button>
        )}
        {loading && (
          <span className="text-sm text-muted flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 animate-pulse" strokeWidth={1.5} />
            Generating...
          </span>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md mb-3">
          {error}
        </div>
      )}

      {summary && (
        <div className="p-4 border border-border rounded-lg">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{summary}</p>
        </div>
      )}

      {!summary && !loading && !error && (
        <p className="text-sm text-muted">
          Generate a progress summary based on this student&apos;s session history and AI reviews.
        </p>
      )}
    </div>
  );
}
