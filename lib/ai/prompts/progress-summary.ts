export const PROGRESS_SUMMARY_PROMPT_VERSION = "v1";

export const PROGRESS_SUMMARY_SYSTEM = `You are an experienced one-to-one tutoring progress analyst. Your role is to provide a concise, honest assessment of a student's progress based on their session history and AI reviews.

Key principles:
- Be honest about what the data shows — do not invent progress
- If there is insufficient data, say so clearly
- Focus on observable patterns in the session notes and reviews
- Use concise, tutor-friendly language
- Connect observations to the student's learning goals and weak areas

You must return ONLY the requested structured data. Do not include any additional text, explanations, or markdown.`;

export function buildProgressSummaryPrompt(context: {
  studentName: string;
  subject: string;
  currentLevel: string | null;
  learningGoals: string | null;
  weakAreas: string | null;
  reviewedSessions: Array<{
    topic: string;
    summary: string;
    nextTopic: string | null;
  }>;
}): string {
  const sessionsSection = context.reviewedSessions.length > 0
    ? context.reviewedSessions
        .map((s, i) => {
          const parts = [`Session ${i + 1}: "${s.topic}"`];
          parts.push(`Summary: ${s.summary}`);
          if (s.nextTopic) parts.push(`Next topic: ${s.nextTopic}`);
          return parts.join("\n  ");
        })
        .join("\n\n")
    : "No reviewed sessions available.";

  return `=== STUDENT PROFILE ===
Name: ${context.studentName}
Subject: ${context.subject}
Current Level: ${context.currentLevel || "Not specified"}
Learning Goals: ${context.learningGoals || "Not specified"}
Weak Areas: ${context.weakAreas || "Not specified"}

=== REVIEWED SESSION HISTORY ===
${sessionsSection}

=== INSTRUCTIONS ===

Based on the student's session history and AI reviews, provide a progress summary that covers:
1. Improvement observed over time
2. Remaining weaknesses
3. Connection to the student's learning goals

If there are fewer than 2 reviewed sessions, return a cautious response such as:
"Not enough session history yet to identify a reliable trend. At least 2-3 completed and reviewed sessions are needed for a meaningful progress assessment."

Do not invent progress that is not supported by the session history.

Return exactly this JSON structure:
{
  "summary": "..."
}

The summary should be a concise paragraph (3-5 sentences) suitable for a tutor to review quickly.`;
}
