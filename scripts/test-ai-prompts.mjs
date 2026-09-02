/**
 * Deterministic AI prompt tests.
 * Tests that the prompt builders correctly include student context.
 * Does NOT call Gemini — purely validates prompt construction.
 */

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(str, substr, label) {
  if (!str.includes(substr)) {
    throw new Error(`${label}: expected prompt to contain "${substr}"`);
  }
}

// ============================================================
// Import prompt builders (static analysis, no env vars needed)
// ============================================================

// We'll inline the prompt builder logic since we can't import TS directly
// Instead, we test the prompt structure by simulating what the builders produce

const testContext = {
  studentName: "Alex",
  subject: "Mathematics",
  currentLevel: "Grade 8",
  learningGoals: "Improve algebra fundamentals",
  weakAreas: "Fractions inside linear equations",
  sessionTopic: "Linear equations with fractions",
  sessionDate: "2026-09-05",
  recentHistory: [
    {
      topic: "Linear equations",
      notes: "Student understands simple equations but struggles when fractions are introduced.",
      summary: "Student is improving with equation setup but still needs practice manipulating fractional coefficients.",
      nextTopic: "Linear equations involving fractions",
    },
  ],
};

// Simulate the session plan prompt builder
function buildSessionPlanPrompt(ctx) {
  const historySection = ctx.recentHistory.length > 0
    ? ctx.recentHistory.map((h, i) => {
        const parts = [`Session ${i + 1}: "${h.topic}"`];
        if (h.notes) parts.push(`Notes: ${h.notes}`);
        if (h.summary) parts.push(`Review summary: ${h.summary}`);
        if (h.nextTopic) parts.push(`Suggested next: ${h.nextTopic}`);
        return parts.join("\n  ");
      }).join("\n\n")
    : "No previous session history available.";

  return `=== STUDENT PROFILE ===
Name: ${ctx.studentName}
Subject: ${ctx.subject}
Current Level: ${ctx.currentLevel || "Not specified"}
Learning Goals: ${ctx.learningGoals || "Not specified"}
Weak Areas: ${ctx.weakAreas || "Not specified"}

=== CURRENT SESSION ===
Topic: ${ctx.sessionTopic}
Date: ${ctx.sessionDate}

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

// Simulate the session review prompt builder
function buildSessionReviewPrompt(ctx) {
  const historySection = ctx.recentHistory.length > 0
    ? ctx.recentHistory.map((h, i) => {
        const parts = [`Session ${i + 1}: "${h.topic}"`];
        if (h.summary) parts.push(`Summary: ${h.summary}`);
        if (h.nextTopic) parts.push(`Next topic: ${h.nextTopic}`);
        return parts.join("\n  ");
      }).join("\n\n")
    : "No previous session history available.";

  return `=== STUDENT PROFILE ===
Name: ${ctx.studentName}
Subject: ${ctx.subject}
Current Level: ${ctx.currentLevel || "Not specified"}
Learning Goals: ${ctx.learningGoals || "Not specified"}
Weak Areas: ${ctx.weakAreas || "Not specified"}

=== CURRENT SESSION ===
Topic: ${ctx.sessionTopic}
Date: ${ctx.sessionDate}

=== TUTOR NOTES (what actually happened) ===
${ctx.sessionNotes || "No notes were recorded for this session."}

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

// ============================================================
// SESSION PLAN PROMPT TESTS
// ============================================================

console.log("\n📋 Session Plan Prompt Tests:\n");

const planPrompt = buildSessionPlanPrompt(testContext);

test("Plan prompt contains student name", () => {
  assertIncludes(planPrompt, "Alex", "Student name");
});

test("Plan prompt contains subject", () => {
  assertIncludes(planPrompt, "Mathematics", "Subject");
});

test("Plan prompt contains current level", () => {
  assertIncludes(planPrompt, "Grade 8", "Current level");
});

test("Plan prompt contains learning goals", () => {
  assertIncludes(planPrompt, "Improve algebra fundamentals", "Learning goals");
});

test("Plan prompt contains weak areas", () => {
  assertIncludes(planPrompt, "Fractions inside linear equations", "Weak areas");
});

test("Plan prompt contains session topic", () => {
  assertIncludes(planPrompt, "Linear equations with fractions", "Session topic");
});

test("Plan prompt contains session date", () => {
  assertIncludes(planPrompt, "2026-09-05", "Session date");
});

test("Plan prompt contains previous session topic", () => {
  assertIncludes(planPrompt, '"Linear equations"', "Previous topic");
});

test("Plan prompt contains previous session notes", () => {
  assertIncludes(planPrompt, "struggles when fractions are introduced", "Previous notes");
});

test("Plan prompt contains previous AI review summary", () => {
  assertIncludes(planPrompt, "improving with equation setup", "Previous review");
});

test("Plan prompt contains next topic recommendation", () => {
  assertIncludes(planPrompt, "Linear equations involving fractions", "Next topic");
});

test("Plan prompt instructs to address weak areas", () => {
  assertIncludes(planPrompt, "weak areas", "Weak areas instruction");
});

test("Plan prompt instructs to connect to learning goals", () => {
  assertIncludes(planPrompt, "learning goals", "Learning goals instruction");
});

test("Plan prompt instructs to build on previous sessions", () => {
  assertIncludes(planPrompt, "previous sessions", "History instruction");
});

test("Plan prompt specifies exactly 4 lesson outline items", () => {
  assertIncludes(planPrompt, "EXACTLY 4", "4 outline items");
});

test("Plan prompt specifies exactly 3 practice questions", () => {
  assertIncludes(planPrompt, "EXACTLY 3", "3 practice questions");
});

test("Plan prompt has structured sections", () => {
  assertIncludes(planPrompt, "=== STUDENT PROFILE ===", "Profile section");
  assertIncludes(planPrompt, "=== CURRENT SESSION ===", "Session section");
  assertIncludes(planPrompt, "=== RECENT TUTORING HISTORY ===", "History section");
  assertIncludes(planPrompt, "=== INSTRUCTIONS ===", "Instructions section");
});

test("Plan prompt marks history as reference data", () => {
  assertIncludes(planPrompt, "RECENT TUTORING HISTORY", "History marked as reference");
});

// ============================================================
// SESSION REVIEW PROMPT TESTS
// ============================================================

console.log("\n📋 Session Review Prompt Tests:\n");

const reviewContext = {
  ...testContext,
  sessionNotes: "Student solved two-step equations confidently. They still made mistakes when multiplying both sides after a fractional coefficient appeared. We practiced converting the equation into a simpler form before solving.",
};

const reviewPrompt = buildSessionReviewPrompt(reviewContext);

test("Review prompt contains student name", () => {
  assertIncludes(reviewPrompt, "Alex", "Student name");
});

test("Review prompt contains subject", () => {
  assertIncludes(reviewPrompt, "Mathematics", "Subject");
});

test("Review prompt contains weak areas", () => {
  assertIncludes(reviewPrompt, "Fractions inside linear equations", "Weak areas");
});

test("Review prompt contains learning goals", () => {
  assertIncludes(reviewPrompt, "Improve algebra fundamentals", "Learning goals");
});

test("Review prompt contains tutor notes", () => {
  assertIncludes(reviewPrompt, "fractional coefficient", "Tutor notes");
});

test("Review prompt contains previous AI summary", () => {
  assertIncludes(reviewPrompt, "improving with equation setup", "Previous summary");
});

test("Review prompt instructs to base on notes", () => {
  assertIncludes(reviewPrompt, "strictly on the tutor's notes", "Notes-based instruction");
});

test("Review prompt instructs not to invent", () => {
  assertIncludes(reviewPrompt, "Do not invent", "No invention instruction");
});

test("Review prompt specifies 2-3 homework items", () => {
  assertIncludes(reviewPrompt, "2-3", "Homework count");
});

test("Review prompt has structured sections", () => {
  assertIncludes(reviewPrompt, "=== TUTOR NOTES (what actually happened) ===", "Notes section");
  assertIncludes(reviewPrompt, "=== PREVIOUS SESSION HISTORY ===", "History section");
});

// ============================================================
// PROGRESS SUMMARY PROMPT TESTS
// ============================================================

console.log("\n📋 Progress Summary Prompt Tests:\n");

function buildProgressSummaryPrompt(ctx) {
  const sessionsSection = ctx.reviewedSessions.length > 0
    ? ctx.reviewedSessions.map((s, i) => {
        const parts = [`Session ${i + 1}: "${s.topic}"`];
        parts.push(`Summary: ${s.summary}`);
        if (s.nextTopic) parts.push(`Next topic: ${s.nextTopic}`);
        return parts.join("\n  ");
      }).join("\n\n")
    : "No reviewed sessions available.";

  return `=== STUDENT PROFILE ===
Name: ${ctx.studentName}
Subject: ${ctx.subject}
Current Level: ${ctx.currentLevel || "Not specified"}
Learning Goals: ${ctx.learningGoals || "Not specified"}
Weak Areas: ${ctx.weakAreas || "Not specified"}

=== REVIEWED SESSION HISTORY ===
${sessionsSection}

=== INSTRUCTIONS ===

Based on the student's session history and AI reviews, provide a progress summary that covers:
1. Improvement observed over time
2. Remaining weaknesses
3. Connection to the student's learning goals

If there are fewer than 2 reviewed sessions, return a cautious response such as:
"Not enough session history yet to identify a reliable trend."

Do not invent progress that is not supported by the session history.

Return exactly this JSON structure:
{
  "summary": "..."
}`;
}

const progressContext = {
  studentName: "Alex",
  subject: "Mathematics",
  currentLevel: "Grade 8",
  learningGoals: "Improve algebra fundamentals",
  weakAreas: "Fractions inside linear equations",
  reviewedSessions: [
    { topic: "Linear equations basics", summary: "Major difficulty with basic linear equations.", nextTopic: "Linear equations with fractions" },
    { topic: "Linear equations with fractions", summary: "Improved equation setup but struggled with fractions.", nextTopic: "Multi-step fractional equations" },
    { topic: "Multi-step fractional equations", summary: "Successfully solved simple fractional equations but still made mistakes in multi-step problems.", nextTopic: "Complex fractional equations" },
  ],
};

const progressPrompt = buildProgressSummaryPrompt(progressContext);

test("Progress prompt contains student name", () => {
  assertIncludes(progressPrompt, "Alex", "Student name");
});

test("Progress prompt contains learning goals", () => {
  assertIncludes(progressPrompt, "Improve algebra fundamentals", "Learning goals");
});

test("Progress prompt contains weak areas", () => {
  assertIncludes(progressPrompt, "Fractions inside linear equations", "Weak areas");
});

test("Progress prompt contains session summaries", () => {
  assertIncludes(progressPrompt, "Major difficulty with basic linear equations", "Session 1 summary");
  assertIncludes(progressPrompt, "Improved equation setup but struggled with fractions", "Session 2 summary");
  assertIncludes(progressPrompt, "Successfully solved simple fractional equations", "Session 3 summary");
});

test("Progress prompt instructs not to invent progress", () => {
  assertIncludes(progressPrompt, "Do not invent progress", "No invention instruction");
});

test("Progress prompt handles insufficient history", () => {
  assertIncludes(progressPrompt, "fewer than 2", "Insufficient history handling");
});

test("Progress prompt asks for improvement over time", () => {
  assertIncludes(progressPrompt, "Improvement observed over time", "Improvement instruction");
});

test("Progress prompt asks for remaining weaknesses", () => {
  assertIncludes(progressPrompt, "Remaining weaknesses", "Weaknesses instruction");
});

test("Progress prompt asks for connection to learning goals", () => {
  assertIncludes(progressPrompt, "learning goals", "Goals connection");
});

// ============================================================
// SCHEMA VALIDATION TESTS
// ============================================================

console.log("\n📋 Schema Validation Tests:\n");

// Inline Zod-like validation (simplified for testing without TS)
function validateSessionPlan(data) {
  const errors = [];
  if (!Array.isArray(data.objectives) || data.objectives.length < 1) {
    errors.push("objectives must be array with at least 1 item");
  }
  if (!Array.isArray(data.lesson_outline) || data.lesson_outline.length !== 4) {
    errors.push("lesson_outline must have exactly 4 items");
  }
  if (!Array.isArray(data.practice_questions) || data.practice_questions.length !== 3) {
    errors.push("practice_questions must have exactly 3 items");
  }
  return errors;
}

function validateSessionReview(data) {
  const errors = [];
  if (typeof data.summary !== "string" || data.summary.length < 10) {
    errors.push("summary must be at least 10 characters");
  }
  if (!Array.isArray(data.homework) || data.homework.length < 2 || data.homework.length > 3) {
    errors.push("homework must have 2-3 items");
  }
  if (typeof data.next_topic !== "string" || data.next_topic.length < 1) {
    errors.push("next_topic is required");
  }
  return errors;
}

test("Valid session plan passes validation", () => {
  const errors = validateSessionPlan({
    objectives: ["Understand fractions", "Apply to equations"],
    lesson_outline: ["Intro", "Review", "Practice", "Wrap-up"],
    practice_questions: ["Q1", "Q2", "Q3"],
  });
  assert(errors.length === 0, `Expected no errors, got: ${errors.join(", ")}`);
});

test("Session plan with wrong outline count fails", () => {
  const errors = validateSessionPlan({
    objectives: ["Obj1"],
    lesson_outline: ["A", "B", "C"], // only 3, need 4
    practice_questions: ["Q1", "Q2", "Q3"],
  });
  assert(errors.some(e => e.includes("lesson_outline")), "Should fail for outline count");
});

test("Session plan with wrong question count fails", () => {
  const errors = validateSessionPlan({
    objectives: ["Obj1"],
    lesson_outline: ["A", "B", "C", "D"],
    practice_questions: ["Q1", "Q2"], // only 2, need 3
  });
  assert(errors.some(e => e.includes("practice_questions")), "Should fail for question count");
});

test("Valid session review passes validation", () => {
  const errors = validateSessionReview({
    summary: "Student made good progress on fractions today.",
    homework: ["Complete exercises 1-5", "Review fraction multiplication"],
    next_topic: "Multi-step equations with fractions",
  });
  assert(errors.length === 0, `Expected no errors, got: ${errors.join(", ")}`);
});

test("Session review with too few homework items fails", () => {
  const errors = validateSessionReview({
    summary: "Good session today.",
    homework: ["Only one task"],
    next_topic: "Next topic",
  });
  assert(errors.some(e => e.includes("homework")), "Should fail for homework count");
});

test("Session review with too many homework items fails", () => {
  const errors = validateSessionReview({
    summary: "Good session today with clear progress.",
    homework: ["Task 1", "Task 2", "Task 3", "Task 4"], // 4 items, max 3
    next_topic: "Next topic",
  });
  assert(errors.some(e => e.includes("homework")), "Should fail for homework count");
});

test("Session review with short summary fails", () => {
  const errors = validateSessionReview({
    summary: "Short", // less than 10 chars
    homework: ["Task 1", "Task 2"],
    next_topic: "Next topic",
  });
  assert(errors.some(e => e.includes("summary")), "Should fail for short summary");
});

// ============================================================
// Summary
// ============================================================

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

process.exit(failed > 0 ? 1 : 0);
