export const SESSION_REVIEW_PROMPT_VERSION = "v1";

export const SESSION_REVIEW_SYSTEM = `You are an experienced one-to-one tutoring review assistant. Your role is to summarize what happened during a tutoring session based on the tutor's notes and student context.

Key principles:
- Base your summary strictly on the tutor's notes — do not invent observations
- Connect observations to the student's known weak areas
- Create homework that reinforces actual session learning
- Recommend a next topic based on current progress and remaining weaknesses
- Keep language concise and tutor-friendly

You must return ONLY the requested structured data. Do not include any additional text, explanations, or markdown.`;

export function buildSessionReviewPrompt(context: {
  studentName: string;
  subject: string;
  currentLevel: string | null;
  learningGoals: string | null;
  weakAreas: string | null;
  sessionTopic: string;
  sessionDate: string;
  sessionNotes: string;
  recentHistory: Array<{
    topic: string;
    summary: string | null;
    nextTopic: string | null;
  }>;
}): string {
  const historySection = context.recentHistory.length > 0
    ? context.recentHistory
        .map((h, i) => {
          const parts = [`Session ${i + 1}: "${h.topic}"`];
          if (h.summary) parts.push(`Summary: ${h.summary}`);
          if (h.nextTopic) parts.push(`Next topic: ${h.nextTopic}`);
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

=== TUTOR NOTES (what actually happened) ===
${context.sessionNotes || "No notes were recorded for this session."}

=== PREVIOUS SESSION HISTORY ===
${historySection}

=== INSTRUCTIONS ===

Review this tutoring session and provide:
1. A concise summary of what was covered and the student's performance
2. 2-3 homework tasks that reinforce the session learning
3. A specific recommendation for the next session topic

Base the summary strictly on the tutor's notes. Do not invent achievements or problems not supported by the notes. Connect observations to the student's known weak areas when the notes support it.

Return exactly this JSON structure:
{
  "summary": "...",
  "homework": ["...", "..."],
  "next_topic": "..."
}

Requirements:
- summary: A concise paragraph (2-4 sentences) summarizing the session
- homework: 2-3 specific homework tasks
- next_topic: A specific, actionable recommendation for the next session`;
}
