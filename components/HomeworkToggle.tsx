"use client";

import { useState } from "react";
import { AlertCircle, Check, Circle, Loader2 } from "lucide-react";

export default function HomeworkToggle({
  id,
  description,
  completed: initialCompleted,
}: {
  id: string;
  description: string;
  completed: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleToggle() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/student/homework`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !completed }),
      });

      if (res.ok) {
        setCompleted(!completed);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="mt-0.5 inline-flex flex-shrink-0 flex-col items-center gap-1">
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={completed}
        aria-label={`${completed ? "Mark as incomplete" : "Mark as complete"}: ${description}`}
        className="group rounded-full p-0.5 transition-colors hover:bg-success-light disabled:opacity-60"
      >
        {loading ? (
          <Loader2
            className="h-5 w-5 animate-spin text-muted"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        ) : completed ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          </span>
        ) : (
          <Circle
            className="h-5 w-5 text-border-strong transition-colors group-hover:text-success"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
      </button>
      {error && (
        <span
          className="flex items-center gap-0.5 text-[10px] text-danger-strong"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          Failed
        </span>
      )}
    </span>
  );
}
