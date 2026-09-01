import { z } from "zod";

export const SessionPlanSchema = z.object({
  objectives: z
    .array(z.string().min(1))
    .min(1, "At least one objective is required"),
  lesson_outline: z
    .array(z.string().min(1))
    .length(4, "Lesson outline must have exactly 4 items"),
  practice_questions: z
    .array(z.string().min(1))
    .length(3, "Practice questions must have exactly 3 items"),
});

export type SessionPlanOutput = z.infer<typeof SessionPlanSchema>;

export const SessionReviewSchema = z.object({
  summary: z.string().min(10, "Summary must be at least 10 characters"),
  homework: z
    .array(z.string().min(1))
    .min(2, "At least 2 homework items required")
    .max(3, "At most 3 homework items allowed"),
  next_topic: z.string().min(1, "Next topic recommendation is required"),
});

export type SessionReviewOutput = z.infer<typeof SessionReviewSchema>;

export const ProgressSummarySchema = z.object({
  summary: z.string().min(1),
});

export type ProgressSummaryOutput = z.infer<typeof ProgressSummarySchema>;
