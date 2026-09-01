export const SESSION_PLAN_PROMPT_VERSION = "v1";

export const SESSION_PLAN_SYSTEM = `You are an experienced one-to-one tutoring planning assistant. Your role is to create personalized, actionable session plans based on the student's specific profile and learning history.

Key principles:
- Prioritize the student's weak areas and learning goals
- Build on what was covered in previous sessions
- Avoid repeating material the student has already mastered
- Keep the plan realistic for a single tutoring session
- Make objectives specific and measurable
- Ensure practice questions target the student's current level

You must return ONLY the requested structured data. Do not include any additional text, explanations, or markdown.`;

export function buildSessionPlanPrompt(context: {
  studentName: string;
  subject: string;
  currentLevel: string | null;
  learningGoals: string | null;
  weakAreas: string | null;
  sessionTopic: string;
  sessionDate: string;
  recentHistory: Array<{
    topic: string;
    notes: string | null;
    summary: string | null;
    nextTopic: string | null;
  }>;
}): string {
  const historySection = context.recentHistory.length > 0
    ? context.recentHistory
        .map((h, i) => {
          const parts = [`Session ${i + 1}: "${h.topic}"`];
          if (h.notes) parts.push(`Notes: ${h.notes}`);
          if (h.summary) parts.push(`Review summary: ${h.summary}`);
          if (h.nextTopic) parts.push(`Suggested next: ${h.nextTopic}`);
          return parts.join("\n  ");
        })
        .join("\n\n")
    : "No previous session history available.";

  return `=== STUDENT PROFILE ===
Name: ${context.studentName}
Subject: ${context.subject}
Current Level: ${context.currentLevel || "Not specified"}
Learning Goals: ${context.learningGoals || "Not specified"}
Weak Areas: ${context.weakAreas || "Not specified"}

=== CURRENT SESSION ===
Topic: ${context.sessionTopic}
Date: ${context.sessionDate}

=== RECENT TUTORING HISTORY ===
${historySection}

=== INSTRUCTIONS ===

Create a personalized session plan for this student. The plan should:
1. Address the student's specific weak areas
2. Connect to their learning goals
3. Build appropriately on previous sessions
4. Be achievable in a single tutoring session

Return exactly this JSON structure:
{
  "objectives": ["..."],
  "lesson_outline": ["...", "...", "...", "..."],
  "practice_questions": ["...", "...", "..."]
}

Requirements:
- objectives: 2-4 specific learning objectives for this session
- lesson_outline: EXACTLY 4 items representing the lesson flow
- practice_questions: EXACTLY 3 questions appropriate for the student's level`;
}
