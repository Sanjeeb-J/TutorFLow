"use client";

import { Sparkles } from "lucide-react";

interface LearningObjective {
  id: string;
  text: string;
}

interface LessonStep {
  id: string;
  text: string;
}

interface PracticeQuestion {
  id: string;
  text: string;
}

interface AILessonPlanData {
  learningObjectives: LearningObjective[];
  lessonOutline: LessonStep[];
  practiceQuestions: PracticeQuestion[];
  preparedFor: string;
}

interface AILessonPlanProps {
  data: AILessonPlanData;
}

export default function AILessonPlan({ data }: AILessonPlanProps) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/15 bg-accent-light text-accent">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-foreground">AI lesson plan</h2>
      </div>

      {/* Learning objectives */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Learning objectives</h3>
          <span className="text-xs text-muted">2-4 recommended</span>
        </div>
        <ol className="mt-3 space-y-2">
          {data.learningObjectives.map((obj) => (
            <li
              key={obj.id}
              className="flex items-start gap-3 rounded-lg bg-accent-light/30 p-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-strong font-semibold text-xs">
                {obj.id}
              </span>
              <p className="text-sm text-foreground">{obj.text}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Lesson outline */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Lesson outline</h3>
          <span className="text-xs text-muted">Exactly {data.lessonOutline.length} steps</span>
        </div>
        <ol className="mt-3 space-y-2">
          {data.lessonOutline.map((step) => (
            <li
              key={step.id}
              className="flex items-start gap-3 rounded-lg bg-surface-muted/50 p-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-foreground font-semibold text-xs">
                {step.id}
              </span>
              <p className="text-sm text-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Practice questions */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Practice questions</h3>
          <span className="text-xs text-muted">Exactly {data.practiceQuestions.length} questions</span>
        </div>
        <ol className="mt-3 space-y-2">
          {data.practiceQuestions.map((q) => (
            <li
              key={q.id}
              className="flex items-start gap-3 rounded-lg bg-accent-light/30 p-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-strong font-semibold text-xs">
                {q.id}
              </span>
              <p className="text-sm text-foreground">{q.text}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted">{data.preparedFor}</p>
      </div>
    </div>
  );
}
