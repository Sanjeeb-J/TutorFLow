"use client";

import { useState } from "react";
import { CheckCircle, Circle } from "lucide-react";

export default function HomeworkToggle({
  id,
  completed: initialCompleted,
}: {
  id: string;
  completed: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/student/homework`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !completed }),
      });

      if (res.ok) {
        setCompleted(!completed);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="mt-0.5 flex-shrink-0 disabled:opacity-50"
      aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
    >
      {completed ? (
        <CheckCircle className="w-5 h-5 text-green-600" strokeWidth={1.5} />
      ) : (
        <Circle className="w-5 h-5 text-muted hover:text-accent transition-colors" strokeWidth={1.5} />
      )}
    </button>
  );
}
