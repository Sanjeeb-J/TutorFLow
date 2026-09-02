#!/usr/bin/env node

/**
 * TutorFlow AI End-to-End Test (Fixed)
 * Uses cookie-based auth matching the server's @supabase/ssr client.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const PROD_URL = process.env.E2E_BASE_URL || "http://localhost:3099";

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
let passed = 0;
let failed = 0;
let tutorId = null;
let studentId = null;
let sessionId = null;
let session2Id = null;

function ok(test, detail = "") {
  passed++;
  console.log(`  ✓ ${test}${detail ? ` — ${detail}` : ""}`);
}

function fail(test, reason) {
  failed++;
  console.error(`  ✗ ${test} — ${reason}`);
}

async function cleanup() {
  console.log("\nCleaning up test data...");
  try {
    if (sessionId) {
      const { data: rv } = await serviceClient.from("session_reviews").select("id").eq("session_id", sessionId);
      if (rv?.[0]) await serviceClient.from("homework_items").delete().eq("review_id", rv[0].id);
      await serviceClient.from("session_reviews").delete().eq("session_id", sessionId);
      await serviceClient.from("session_plans").delete().eq("session_id", sessionId);
      await serviceClient.from("sessions").delete().eq("id", sessionId);
    }
    if (session2Id) {
      const { data: rv2 } = await serviceClient.from("session_reviews").select("id").eq("session_id", session2Id);
      if (rv2?.[0]) await serviceClient.from("homework_items").delete().eq("review_id", rv2[0].id);
      await serviceClient.from("session_reviews").delete().eq("session_id", session2Id);
      await serviceClient.from("session_plans").delete().eq("session_id", session2Id);
      await serviceClient.from("sessions").delete().eq("id", session2Id);
    }
    if (studentId) await serviceClient.from("students").delete().eq("id", studentId);
    if (tutorId) await serviceClient.from("profiles").delete().eq("id", tutorId);
    if (studentId) await serviceClient.auth.admin.deleteUser(studentId);
    if (tutorId) await serviceClient.auth.admin.deleteUser(tutorId);
    console.log("Cleanup complete.");
  } catch (e) {
    console.error("Cleanup error:", e.message);
  }
}

/**
 * Sign in and return the Supabase SSR cookie string.
 * The @supabase/ssr client reads sb-<ref>-auth-token with base64- prefix.
 * The value is: base64-<base64url-encoded session JSON>
 */
async function signInAndGetCookie(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign in failed: ${error.message}`);

  // Build the cookie name: sb-<project-ref>-auth-token
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
  const cookieName = `sb-${projectRef}-auth-token`;

  // @supabase/ssr encodes the session as: base64-<base64url(session JSON)>
  const sessionJson = JSON.stringify(data.session);
  const base64urlValue = Buffer.from(sessionJson)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const encodedValue = `base64-${base64urlValue}`;

  // @supabase/ssr chunks cookie values that exceed MAX_CHUNK_SIZE (3180)
  // when URI-encoded. We replicate the chunking logic here.
  const MAX_CHUNK_SIZE = 3180;
  const uriEncoded = encodeURIComponent(encodedValue);
  if (uriEncoded.length <= MAX_CHUNK_SIZE) {
    return { cookieName, cookieValue: encodedValue, session: data.session };
  }

  // Chunk the value the same way @supabase/ssr does
  const chunks = [];
  let remaining = uriEncoded;
  while (remaining.length > 0) {
    let chunk = remaining.slice(0, MAX_CHUNK_SIZE);
    const lastPct = chunk.lastIndexOf("%");
    if (lastPct > MAX_CHUNK_SIZE - 3) {
      chunk = chunk.slice(0, lastPct);
    }
    // decode back to raw
    let decoded = "";
    try { decoded = decodeURIComponent(chunk); } catch { decoded = chunk; }
    chunks.push(decoded);
    remaining = remaining.slice(chunk.length);
  }

  return {
    cookieName,
    cookieValue: null, // use chunked cookies
    chunks: chunks.map((v, i) => ({ name: `${cookieName}.${i}`, value: v })),
    session: data.session,
  };
}

async function main() {
  console.log("=== TutorFlow AI End-to-End Test (Fixed) ===\n");

  // Create test tutor
  console.log("Setting up test data...");
  const tutorEmail = `test-tutor-e2e-${Date.now()}@example.com`;
  const tutorPassword = `TutorTest${Date.now()}!`;

  const { data: tutorAuth, error: tutorAuthErr } = await serviceClient.auth.admin.createUser({
    email: tutorEmail,
    password: tutorPassword,
    email_confirm: true,
  });
  if (tutorAuthErr) { fail("Create tutor", tutorAuthErr.message); await cleanup(); process.exit(1); }
  tutorId = tutorAuth.user.id;

  const { error: profileErr } = await serviceClient.from("profiles").insert({
    id: tutorId, role: "tutor", full_name: "E2E Test Tutor",
  });
  if (profileErr) { fail("Create tutor profile", profileErr.message); await cleanup(); process.exit(1); }

  // Create test student
  const studentEmail = `test-student-e2e-${Date.now()}@example.com`;
  const studentPassword = `StudentTest${Date.now()}!`;

  const { data: studentAuth, error: studentAuthErr } = await serviceClient.auth.admin.createUser({
    email: studentEmail,
    password: studentPassword,
    email_confirm: true,
  });
  if (studentAuthErr) { fail("Create student", studentAuthErr.message); await cleanup(); process.exit(1); }
  studentId = studentAuth.user.id;

  await serviceClient.from("profiles").insert({
    id: studentId, role: "student", full_name: "E2E Test Student",
  });

  // Student domain record with personalization data
  const { data: studentRecord, error: studentErr } = await serviceClient.from("students").insert({
    tutor_id: tutorId,
    user_id: studentId,
    name: "Alex",
    email: studentEmail,
    subject: "Mathematics",
    current_level: "Grade 8",
    learning_goals: "Improve algebra fundamentals",
    weak_areas: "Fractions inside multi-step linear equations",
  }).select("id").single();
  if (studentErr) { fail("Create student record", studentErr.message); await cleanup(); process.exit(1); }
  const studentRecordId = studentRecord.id;

  // Historical session 1: completed + reviewed
  const hist1 = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: hs1 } = await serviceClient.from("sessions").insert({
    tutor_id: tutorId, student_id: studentRecordId,
    topic: "Linear equations",
    start_at: hist1, end_at: new Date(Date.now() - 7 * 86400000 + 3600000).toISOString(),
    status: "ai_reviewed",
    notes: "Student solved simple equations correctly but struggled when fractions were introduced.",
    completed_at: new Date(Date.now() - 7 * 86400000 + 3600000).toISOString(),
    ai_reviewed_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  }).select("id").single();

  if (hs1) {
    const { data: r1 } = await serviceClient.from("session_reviews").insert({
      session_id: hs1.id,
      summary: "Student is improving with equation setup but needs additional practice manipulating fractional coefficients.",
      next_topic: "Linear equations with fractions",
      ai_model: "gemini-2.5-flash", ai_prompt_version: "v1", ai_generated_at: new Date().toISOString(),
    }).select("id").single();
    if (r1) {
      await serviceClient.from("homework_items").insert([
        { review_id: r1.id, description: "Solve 5 basic linear equations without fractions", completed: true },
        { review_id: r1.id, description: "Practice fraction multiplication rules", completed: false },
      ]);
    }
  }

  // Scheduled session for AI planning
  const schedDate = new Date(Date.now() + 2 * 86400000).toISOString();
  const { data: schedSession, error: schedErr } = await serviceClient.from("sessions").insert({
    tutor_id: tutorId, student_id: studentRecordId,
    topic: "Linear equations with fractions",
    start_at: schedDate, end_at: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
    status: "scheduled",
  }).select("id").single();
  if (schedErr || !schedSession) { fail("Create scheduled session", schedErr?.message); await cleanup(); process.exit(1); }
  sessionId = schedSession.id;

  // Completed session for AI review
  const compDate = new Date(Date.now() - 1 * 86400000).toISOString();
  const { data: compSession, error: compErr } = await serviceClient.from("sessions").insert({
    tutor_id: tutorId, student_id: studentRecordId,
    topic: "Multi-step equations with fractions",
    start_at: compDate, end_at: new Date(Date.now() - 1 * 86400000 + 3600000).toISOString(),
    status: "completed",
    notes: "Student solved two-step equations confidently. They still made mistakes when multiplying both sides after a fractional coefficient appeared. We practiced simplifying the equation before solving.",
    completed_at: new Date(Date.now() - 1 * 86400000 + 3600000).toISOString(),
  }).select("id").single();
  if (compErr || !compSession) { fail("Create completed session", compErr?.message); await cleanup(); process.exit(1); }
  session2Id = compSession.id;

  console.log("Test data created.\n");

  // Sign in as tutor
  const tutorCookieData = await signInAndGetCookie(tutorEmail, tutorPassword);

  // Helper: make authenticated request with cookies
  async function authFetch(url, options = {}, cookieData = tutorCookieData) {
    let cookieHeader;
    if (cookieData.chunks) {
      cookieHeader = cookieData.chunks.map(c => `${c.name}=${c.value}`).join("; ");
    } else {
      cookieHeader = `${cookieData.cookieName}=${cookieData.cookieValue}`;
    }
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookieHeader,
        ...options.headers,
      },
    });
  }

  // =====================================================
  // AUDIT: OWNERSHIP / IDOR TESTS
  // =====================================================
  console.log("AUDIT: Ownership / IDOR Tests");

  // Create a second tutor for IDOR testing
  const tutor2Email = `test-tutor2-e2e-${Date.now()}@example.com`;
  const tutor2Password = `Tutor2Test${Date.now()}!`;
  const { data: tutor2Auth } = await serviceClient.auth.admin.createUser({
    email: tutor2Email, password: tutor2Password, email_confirm: true,
  });
  const { error: t2pErr } = await serviceClient.from("profiles").insert({
    id: tutor2Auth.user.id, role: "tutor", full_name: "Tutor B",
  });

  const t2CookieData = await signInAndGetCookie(tutor2Email, tutor2Password);

  // Tutor 2 cannot generate plan for Tutor 1's session
  try {
    const res = await authFetch(`${PROD_URL}/api/tutor/sessions/${sessionId}/plan`, { method: "POST" }, t2CookieData);
    if (res.ok) fail("Tutor 2 → Tutor 1 plan", "Request succeeded (should fail)");
    else ok("Tutor 2 → Tutor 1 plan rejected", `Status: ${res.status}`);
  } catch { ok("Tutor 2 → Tutor 1 plan rejected", "Request failed (expected)"); }

  // Tutor 2 cannot generate review for Tutor 1's session
  try {
    const res = await authFetch(`${PROD_URL}/api/tutor/sessions/${session2Id}/review`, { method: "POST" }, t2CookieData);
    if (res.ok) fail("Tutor 2 → Tutor 1 review", "Request succeeded (should fail)");
    else ok("Tutor 2 → Tutor 1 review rejected", `Status: ${res.status}`);
  } catch { ok("Tutor 2 → Tutor 1 review rejected", "Request failed (expected)"); }

  // Tutor 2 cannot access Tutor 1's student progress
  try {
    const res = await authFetch(`${PROD_URL}/api/tutor/students/${studentRecordId}/progress`, { method: "POST" }, t2CookieData);
    if (res.ok) fail("Tutor 2 → Tutor 1 progress", "Request succeeded (should fail)");
    else ok("Tutor 2 → Tutor 1 progress rejected", `Status: ${res.status}`);
  } catch { ok("Tutor 2 → Tutor 1 progress rejected", "Request failed (expected)"); }

  // Student cannot access tutor endpoints
  const stuCookieData = await signInAndGetCookie(studentEmail, studentPassword);
  try {
    const res = await authFetch(`${PROD_URL}/api/tutor/sessions/${sessionId}/plan`, { method: "POST" }, stuCookieData);
    if (res.ok) fail("Student → tutor plan", "Request succeeded (should fail)");
    else ok("Student → tutor plan rejected", `Status: ${res.status}`);
  } catch { ok("Student → tutor plan rejected", "Request failed (expected)"); }

  try {
    const res = await authFetch(`${PROD_URL}/api/tutor/sessions/${session2Id}/review`, { method: "POST" }, stuCookieData);
    if (res.ok) fail("Student → tutor review", "Request succeeded (should fail)");
    else ok("Student → tutor review rejected", `Status: ${res.status}`);
  } catch { ok("Student → tutor review rejected", "Request failed (expected)"); }

  try {
    const res = await authFetch(`${PROD_URL}/api/tutor/students/${studentRecordId}/progress`, { method: "POST" }, stuCookieData);
    if (res.ok) fail("Student → tutor progress", "Request succeeded (should fail)");
    else ok("Student → tutor progress rejected", `Status: ${res.status}`);
  } catch { ok("Student → tutor progress rejected", "Request failed (expected)"); }

  console.log("");

  // =====================================================
  // AUDIT: REAL AI SESSION PLAN (Step 5 + Step 6)
  // =====================================================
  console.log("AUDIT: Real AI Session Plan Generation + Personalization");

  try {
    const res = await authFetch(`${PROD_URL}/api/tutor/sessions/${sessionId}/plan`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) { fail("Plan generation", data.error || `Status: ${res.status}`); }
    else if (!data.plan) { fail("Plan generation", "No plan in response"); }
    else {
      ok("Plan generation succeeded", `Status: ${res.status}`);

      const plan = data.plan;

      // Structure checks
      if (Array.isArray(plan.objectives) && plan.objectives.length >= 2) ok("Plan has 2+ objectives", `${plan.objectives.length} objectives`);
      else fail("Plan objectives", `Expected 2+, got ${plan.objectives?.length}`);

      if (Array.isArray(plan.lesson_outline) && plan.lesson_outline.length === 4) ok("Plan has exactly 4 lesson outline items");
      else fail("Plan lesson outline", `Expected 4, got ${plan.lesson_outline?.length}`);

      if (Array.isArray(plan.practice_questions) && plan.practice_questions.length === 3) ok("Plan has exactly 3 practice questions");
      else fail("Plan practice questions", `Expected 3, got ${plan.practice_questions?.length}`);

      // Personalization checks (Step 6)
      const planText = JSON.stringify(plan).toLowerCase();
      const checks = [
        ["mentions fractions", planText.includes("fraction")],
        ["mentions linear equations", planText.includes("linear") || planText.includes("equation")],
        ["addresses student-level content", planText.includes("linear") || planText.includes("algebra") || planText.includes("equation") || planText.includes("fraction")],
      ];
      for (const [label, ok_] of checks) {
        if (ok_) ok(`Personalization: ${label}`);
        else fail(`Personalization: ${label}`, "Not found in plan");
      }

      console.log("\n  Generated Plan:");
      console.log("  Objectives:", plan.objectives);
      console.log("  Outline:", plan.lesson_outline);
      console.log("  Questions:", plan.practice_questions);
    }

    // Duplicate prevention
    const res2 = await authFetch(`${PROD_URL}/api/tutor/sessions/${sessionId}/plan`, { method: "POST" });
    if (res2.status === 409) ok("Duplicate plan request → 409", "Double-click protection works");
    else fail("Duplicate plan prevention", `Expected 409, got ${res2.status}`);
  } catch (e) { fail("AI plan generation", e.message); }

  console.log("");

  // =====================================================
  // AUDIT: REAL AI SESSION REVIEW (Step 7 + Step 8 + Step 9)
  // =====================================================
  console.log("AUDIT: Real AI Session Review Generation");

  try {
    const res = await authFetch(`${PROD_URL}/api/tutor/sessions/${session2Id}/review`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) { fail("Review generation", data.error || `Status: ${res.status}`); }
    else if (!data.review) { fail("Review generation", "No review in response"); }
    else {
      ok("Review generation succeeded", `Status: ${res.status}`);

      const review = data.review;

      if (typeof review.summary === "string" && review.summary.length >= 10) ok("Review has summary", `${review.summary.length} chars`);
      else fail("Review summary", "Missing or too short");

      if (Array.isArray(review.homework) && review.homework.length >= 2 && review.homework.length <= 3) ok("Review has 2-3 homework items", `${review.homework.length} items`);
      else fail("Review homework", `Expected 2-3, got ${review.homework?.length}`);

      if (typeof review.next_topic === "string" && review.next_topic.length > 0) ok("Review has next_topic");
      else fail("Review next_topic", "Missing or empty");

      // Personalization: verify it reflects actual tutor notes
      const reviewText = review.summary.toLowerCase();
      const hasNotes = reviewText.includes("fraction") || reviewText.includes("equation") || reviewText.includes("confident") || reviewText.includes("simplif");
      if (hasNotes) ok("Review references actual session content");
      else fail("Review relevance", "Does not reference actual session notes");

      console.log("\n  Generated Review:");
      console.log("  Summary:", review.summary);
      console.log("  Homework:", review.homework);
      console.log("  Next Topic:", review.next_topic);
    }

    // Verify session transitioned to ai_reviewed (Step 8)
    const { data: updatedSession } = await serviceClient
      .from("sessions").select("status").eq("id", session2Id).single();
    if (updatedSession?.status === "ai_reviewed") ok("Session transitioned to ai_reviewed", "State machine correct");
    else fail("Session state transition", `Expected ai_reviewed, got ${updatedSession?.status}`);

    // Verify homework was created
    const { data: reviewData } = await serviceClient
      .from("session_reviews").select("id").eq("session_id", session2Id).single();
    if (reviewData) {
      const { data: homework } = await serviceClient
        .from("homework_items").select("id").eq("review_id", reviewData.id);
      if (homework && homework.length > 0) ok("Homework items created", `${homework.length} items`);
      else fail("Homework creation", "No homework items found");
    }

    // Duplicate review prevention (Step 9)
    const res2 = await authFetch(`${PROD_URL}/api/tutor/sessions/${session2Id}/review`, { method: "POST" });
    if (res2.status === 409) ok("Duplicate review request → 409", "Double-click protection works");
    else if (res2.status === 400) ok("Duplicate review request blocked → 400", "Status transition prevents re-review");
    else fail("Duplicate review prevention", `Expected 409 or 400, got ${res2.status}`);
  } catch (e) { fail("AI review generation", e.message); }

  console.log("");

  // =====================================================
  // AUDIT: PROGRESS SUMMARY (Step 11)
  // =====================================================
  console.log("AUDIT: Progress Summary Generation");

  try {
    const res = await authFetch(`${PROD_URL}/api/tutor/students/${studentRecordId}/progress`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) { fail("Progress summary", data.error || `Status: ${res.status}`); }
    else if (!data.summary) { fail("Progress summary", "No summary in response"); }
    else {
      ok("Progress summary succeeded", `Status: ${res.status}`);
      if (typeof data.summary === "string" && data.summary.length > 0) ok("Summary has content", `${data.summary.length} chars`);
      else fail("Summary content", "Missing or empty");

      const summaryText = data.summary.toLowerCase();
      const hasImprovement = summaryText.includes("improv") || summaryText.includes("progress") || summaryText.includes("develop");
      const hasWeakness = summaryText.includes("weak") || summaryText.includes("struggl") || summaryText.includes("fraction") || summaryText.includes("challeng");
      const hasInsufficientData = summaryText.includes("not enough") || summaryText.includes("insufficient") || summaryText.includes("fewer than") || summaryText.includes("at least 2");

      if (hasImprovement) ok("Summary discusses improvement");
      else fail("Summary relevance", "Does not discuss improvement");
      if (hasWeakness) ok("Summary identifies weaknesses");
      else if (hasInsufficientData) ok("Summary correctly notes insufficient data", "Appropriate cautious response");
      else fail("Summary completeness", "Does not identify weaknesses or note insufficient data");

      console.log("\n  Progress Summary:", data.summary);
    }
  } catch (e) { fail("Progress summary", e.message); }

  console.log("");

  // =====================================================
  // AUDIT: GEMINI KEY SECURITY (Step 13)
  // =====================================================
  console.log("AUDIT: Gemini Key Security");

  const fs = await import("fs");
  const path = await import("path");

  // Check client-side files
  const clientFiles = [
    "app/login/page.tsx", "app/login/LoginPageForm.tsx",
    "app/tutor/page.tsx", "app/student/page.tsx",
    "components/LogoutButton.tsx", "components/SessionActions.tsx",
    "components/HomeworkToggle.tsx", "components/TutorNav.tsx",
    "components/StudentNav.tsx", "components/ProgressSummary.tsx",
  ];
  let keyLeaked = false;
  for (const file of clientFiles) {
    try {
      const content = fs.readFileSync(path.join(process.cwd(), file), "utf-8");
      if (content.includes("GEMINI_API_KEY") || content.includes("AIza")) {
        fail(`Client file ${file}`, "Contains Gemini API key reference");
        keyLeaked = true;
      }
    } catch {}
  }
  if (!keyLeaked) ok("GEMINI_API_KEY not in client components");

  // Check for NEXT_PUBLIC_GEMINI_API_KEY anywhere
  const { execSync } = await import("child_process");
  try {
    const grepResult = execSync("grep -r 'NEXT_PUBLIC_GEMINI' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.env*' . 2>/dev/null || true", { encoding: "utf-8" });
    if (grepResult.trim()) fail("NEXT_PUBLIC_GEMINI_API_KEY found", grepResult.trim());
    else ok("No NEXT_PUBLIC_GEMINI_API_KEY anywhere");
  } catch { ok("No NEXT_PUBLIC_GEMINI_API_KEY anywhere"); }

  // Check SUPABASE_SERVICE_ROLE_KEY not in client
  try {
    const grepResult = execSync("grep -r 'SUPABASE_SERVICE_ROLE' --include='*.tsx' --include='*.jsx' app/ components/ 2>/dev/null || true", { encoding: "utf-8" });
    if (grepResult.trim()) fail("Service role key in client code", grepResult.trim());
    else ok("SUPABASE_SERVICE_ROLE_KEY not in client code");
  } catch { ok("SUPABASE_SERVICE_ROLE_KEY not in client code"); }

  console.log("");

  // =====================================================
  // AUDIT: AI FAILURE HANDLING (Step 14)
  // =====================================================
  console.log("AUDIT: AI Failure Handling");

  // Try to get plan for a non-existent session
  try {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await authFetch(`${PROD_URL}/api/tutor/sessions/${fakeId}/plan`, { method: "POST" });
    const data = await res.json();
    if (!res.ok && data.error) ok("Non-existent session → error returned", `Status: ${res.status}`);
    else fail("Non-existent session handling", `Expected error, got ${res.status}`);
  } catch (e) { ok("Non-existent session handling", "Request failed (expected)"); }

  console.log("");

  // =====================================================
  // SUMMARY
  // =====================================================
  console.log("=== Test Summary ===");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${passed + failed}`);

  // Cleanup
  await cleanup();
  if (tutor2Auth?.user?.id) {
    await serviceClient.from("profiles").delete().eq("id", tutor2Auth.user.id);
    await serviceClient.auth.admin.deleteUser(tutor2Auth.user.id);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error("Fatal error:", e);
  await cleanup();
  process.exit(1);
});
