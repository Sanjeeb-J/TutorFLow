#!/usr/bin/env node

/**
 * TutorFlow AI End-to-End Test
 * Tests real Gemini integration with contextual prompts.
 * 
 * IMPORTANT: This test uses temporary test users that are cleaned up afterward.
 * It does NOT affect real user accounts.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

console.log("Note: Gemini runs server-side on Vercel. No local GEMINI_API_KEY needed.");

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
    // Delete homework items
    if (sessionId) {
      await serviceClient.from("homework_items").delete().eq("review_id", 
        (await serviceClient.from("session_reviews").select("id").eq("session_id", sessionId)).data?.[0]?.id || ""
      );
    }
    if (session2Id) {
      await serviceClient.from("homework_items").delete().eq("review_id",
        (await serviceClient.from("session_reviews").select("id").eq("session_id", session2Id)).data?.[0]?.id || ""
      );
    }
    
    // Delete reviews
    if (sessionId) await serviceClient.from("session_reviews").delete().eq("session_id", sessionId);
    if (session2Id) await serviceClient.from("session_reviews").delete().eq("session_id", session2Id);
    
    // Delete plans
    if (sessionId) await serviceClient.from("session_plans").delete().eq("session_id", sessionId);
    if (session2Id) await serviceClient.from("session_plans").delete().eq("session_id", session2Id);
    
    // Delete sessions
    if (sessionId) await serviceClient.from("sessions").delete().eq("id", sessionId);
    if (session2Id) await serviceClient.from("sessions").delete().eq("id", session2Id);
    
    // Delete student domain record
    if (studentId) await serviceClient.from("students").delete().eq("id", studentId);
    
    // Delete profile
    if (tutorId) await serviceClient.from("profiles").delete().eq("id", tutorId);
    
    // Delete auth users
    if (studentId) await serviceClient.auth.admin.deleteUser(studentId);
    if (tutorId) await serviceClient.auth.admin.deleteUser(tutorId);
    
    console.log("Cleanup complete.");
  } catch (e) {
    console.error("Cleanup error:", e.message);
  }
}

async function main() {
  console.log("=== TutorFlow AI End-to-End Test ===\n");
  
  // Create test tutor
  console.log("Setting up test data...");
  
  const tutorEmail = `test-tutor-ai-${Date.now()}@example.com`;
  const tutorPassword = `TutorTest${Date.now()}!`;
  
  const { data: tutorAuth, error: tutorAuthErr } = await serviceClient.auth.admin.createUser({
    email: tutorEmail,
    password: tutorPassword,
    email_confirm: true,
  });
  
  if (tutorAuthErr) {
    fail("Create tutor auth user", tutorAuthErr.message);
    await cleanup();
    process.exit(1);
  }
  
  tutorId = tutorAuth.user.id;
  
  // Create tutor profile
  const { error: profileErr } = await serviceClient.from("profiles").insert({
    id: tutorId,
    role: "tutor",
    full_name: "AI Test Tutor",
  });
  
  if (profileErr) {
    fail("Create tutor profile", profileErr.message);
    await cleanup();
    process.exit(1);
  }
  
  // Create test student
  const studentEmail = `test-student-ai-${Date.now()}@example.com`;
  const studentPassword = `StudentTest${Date.now()}!`;
  
  const { data: studentAuth, error: studentAuthErr } = await serviceClient.auth.admin.createUser({
    email: studentEmail,
    password: studentPassword,
    email_confirm: true,
  });
  
  if (studentAuthErr) {
    fail("Create student auth user", studentAuthErr.message);
    await cleanup();
    process.exit(1);
  }
  
  studentId = studentAuth.user.id;
  
  // Create student profile
  await serviceClient.from("profiles").insert({
    id: studentId,
    role: "student",
    full_name: "AI Test Student",
  });
  
  // Create student domain record
  const { data: studentRecord, error: studentErr } = await serviceClient.from("students").insert({
    tutor_id: tutorId,
    user_id: studentId,
    name: "Alex Johnson",
    email: studentEmail,
    subject: "Mathematics",
    current_level: "Grade 8",
    learning_goals: "Improve algebra fundamentals, especially solving linear equations with fractions",
    weak_areas: "Fractions inside linear equations, multi-step problem solving",
  }).select("id").single();
  
  if (studentErr) {
    fail("Create student record", studentErr.message);
    await cleanup();
    process.exit(1);
  }
  
  studentId = studentRecord.id;
  
  // Create historical session 1 (completed, with notes)
  const histDate1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: histSession1 } = await serviceClient.from("sessions").insert({
    tutor_id: tutorId,
    student_id: studentId,
    topic: "Introduction to Linear Equations",
    start_at: histDate1,
    end_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    status: "ai_reviewed",
    notes: "Student understands basic equation setup. Can solve x + 5 = 12 correctly. Struggled when I introduced fractional coefficients.",
    completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    ai_reviewed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  }).select("id").single();
  
  if (histSession1) {
    // Create review for session 1
    const { data: review1 } = await serviceClient.from("session_reviews").insert({
      session_id: histSession1.id,
      summary: "Alex can set up basic linear equations but needs significant work with fractional coefficients. The core concept of balancing equations is understood.",
      next_topic: "Linear equations with fractions",
      ai_model: "gemini-2.5-flash",
      ai_prompt_version: "v1",
      ai_generated_at: new Date().toISOString(),
    }).select("id").single();
    
    if (review1) {
      await serviceClient.from("homework_items").insert([
        { review_id: review1.id, description: "Solve 5 basic linear equations (no fractions)", completed: true },
        { review_id: review1.id, description: "Practice converting fractions to decimals for equation coefficients", completed: false },
        { review_id: review1.id, description: "Review fraction multiplication rules", completed: false },
      ]);
    }
  }
  
  // Create historical session 2 (completed, with notes)
  const histDate2 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: histSession2 } = await serviceClient.from("sessions").insert({
    tutor_id: tutorId,
    student_id: studentId,
    topic: "Solving Two-Step Equations",
    start_at: histDate2,
    end_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    status: "ai_reviewed",
    notes: "Much improved. Student solved two-step equations without fractions confidently. When I introduced 2x/3 + 4 = 10, they initially forgot to multiply both sides by 3. After guidance, they solved it correctly.",
    completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    ai_reviewed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  }).select("id").single();
  
  if (histSession2) {
    const { data: review2 } = await serviceClient.from("session_reviews").insert({
      session_id: histSession2.id,
      summary: "Good progress on two-step equations. Fractional coefficients remain challenging but Alex showed improvement with guided practice. Next step is independent practice with fractional equations.",
      next_topic: "Multi-step equations with fractions",
      ai_model: "gemini-2.5-flash",
      ai_prompt_version: "v1",
      ai_generated_at: new Date().toISOString(),
    }).select("id").single();
    
    if (review2) {
      await serviceClient.from("homework_items").insert([
        { review_id: review2.id, description: "Solve 3 equations with fractional coefficients (2x/3 + 4 = 10 type)", completed: false },
        { review_id: review2.id, description: "Practice clearing fractions before solving", completed: false },
      ]);
    }
  }
  
  // Create a scheduled session for AI planning
  const schedDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data: schedSession, error: schedErr } = await serviceClient.from("sessions").insert({
    tutor_id: tutorId,
    student_id: studentId,
    topic: "Linear Equations with Fractions",
    start_at: schedDate,
    end_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    status: "scheduled",
  }).select("id").single();
  
  if (schedErr || !schedSession) {
    fail("Create scheduled session", schedErr?.message || "unknown");
    await cleanup();
    process.exit(1);
  }
  
  sessionId = schedSession.id;
  
  // Create a completed session for AI review
  const compDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const { data: compSession, error: compErr } = await serviceClient.from("sessions").insert({
    tutor_id: tutorId,
    student_id: studentId,
    topic: "Multi-step Equations with Fractions",
    start_at: compDate,
    end_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    status: "completed",
    notes: "Good session. Alex successfully solved equations of the form (2x + 1)/3 = 5. Still made errors when the fraction appeared on both sides of the equation (x/2 + 3 = 2x/5 + 1). We practiced clearing fractions by multiplying through by the LCD. By the end, Alex could clear fractions independently about 70% of the time.",
    completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
  }).select("id").single();
  
  if (compErr || !compSession) {
    fail("Create completed session", compErr?.message || "unknown");
    await cleanup();
    process.exit(1);
  }
  
  session2Id = compSession.id;
  
  console.log("Test data created.\n");
  
  // Create authenticated clients
  const tutorClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await tutorClient.auth.signInWithPassword({ email: tutorEmail, password: tutorPassword });
  
  const studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await studentClient.auth.signInWithPassword({ email: studentEmail, password: studentPassword });
  
  // =====================================================
  // AUDIT 13: OWNERSHIP / IDOR TESTS
  // =====================================================
  console.log("AUDIT 13: Ownership / IDOR Tests");
  
  // Create a second tutor
  const tutor2Email = `test-tutor2-ai-${Date.now()}@example.com`;
  const tutor2Password = `Tutor2Test${Date.now()}!`;
  const { data: tutor2Auth } = await serviceClient.auth.admin.createUser({
    email: tutor2Email,
    password: tutor2Password,
    email_confirm: true,
  });
  
  const tutor2Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await tutor2Client.auth.signInWithPassword({ email: tutor2Email, password: tutor2Password });
  
  // Tutor 2 cannot generate plan for Tutor 1's session
  try {
    const res = await tutor2Client.functions.invoke("generate-plan", {
      body: { session_id: sessionId },
    });
    // If using API routes instead:
    const res2 = await fetch(`https://tutorflow-chi.vercel.app/api/tutor/sessions/${sessionId}/plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${(await tutor2Client.auth.getSession()).data.session?.access_token}`,
      },
    });
    if (res2.ok) {
      fail("Tutor 2 cannot generate plan for Tutor 1's session", "Request succeeded (should fail)");
    } else {
      ok("Tutor 2 cannot generate plan for Tutor 1's session", `Status: ${res2.status}`);
    }
  } catch {
    ok("Tutor 2 cannot generate plan for Tutor 1's session", "Request failed (expected)");
  }
  
  // Student cannot generate plan
  try {
    const session = await studentClient.auth.getSession();
    const res = await fetch(`https://tutorflow-chi.vercel.app/api/tutor/sessions/${sessionId}/plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.data.session?.access_token}`,
      },
    });
    if (res.ok) {
      fail("Student cannot generate plan", "Request succeeded (should fail)");
    } else {
      ok("Student cannot generate plan", `Status: ${res.status}`);
    }
  } catch {
    ok("Student cannot generate plan", "Request failed (expected)");
  }
  
  console.log("");
  
  // =====================================================
  // AUDIT 14: REAL AI SESSION PLAN TEST
  // =====================================================
  console.log("AUDIT 14: Real AI Session Plan Generation");
  
  try {
    const session = await tutorClient.auth.getSession();
    const res = await fetch(`https://tutorflow-chi.vercel.app/api/tutor/sessions/${sessionId}/plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.data.session?.access_token}`,
      },
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      fail("Plan generation request", data.error || `Status: ${res.status}`);
    } else if (!data.plan) {
      fail("Plan generation", "No plan in response");
    } else {
      ok("Plan generation request succeeded", `Status: ${res.status}`);
      
      const plan = data.plan;
      
      // Verify structure
      if (Array.isArray(plan.objectives) && plan.objectives.length >= 1) {
        ok("Plan has objectives", `${plan.objectives.length} objectives`);
      } else {
        fail("Plan objectives", "Missing or invalid");
      }
      
      if (Array.isArray(plan.lesson_outline) && plan.lesson_outline.length === 4) {
        ok("Plan has exactly 4 lesson outline items");
      } else {
        fail("Plan lesson outline", `Expected 4, got ${plan.lesson_outline?.length}`);
      }
      
      if (Array.isArray(plan.practice_questions) && plan.practice_questions.length === 3) {
        ok("Plan has exactly 3 practice questions");
      } else {
        fail("Plan practice questions", `Expected 3, got ${plan.practice_questions?.length}`);
      }
      
      // Verify contextual relevance
      const planText = JSON.stringify(plan).toLowerCase();
      const hasFractions = planText.includes("fraction");
      const hasLinear = planText.includes("linear") || planText.includes("equation");
      const hasAlgebra = planText.includes("algebra");
      
      if (hasFractions) {
        ok("Plan mentions fractions", "Contextual relevance confirmed");
      } else {
        fail("Plan contextual relevance", "Does not mention fractions (student's weak area)");
      }
      
      if (hasLinear || hasAlgebra) {
        ok("Plan mentions linear equations/algebra", "Subject relevance confirmed");
      } else {
        fail("Plan subject relevance", "Does not mention linear equations or algebra");
      }
      
      console.log("\n  Generated Plan:");
      console.log("  Objectives:", plan.objectives);
      console.log("  Outline:", plan.lesson_outline);
      console.log("  Questions:", plan.practice_questions);
    }
    
    // Test duplicate prevention
    const res2 = await fetch(`https://tutorflow-chi.vercel.app/api/tutor/sessions/${sessionId}/plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.data.session?.access_token}`,
      },
    });
    
    if (res2.status === 409) {
      ok("Duplicate plan request returns 409", "Double-click protection works");
    } else {
      fail("Duplicate plan prevention", `Expected 409, got ${res2.status}`);
    }
  } catch (e) {
    fail("AI plan generation", e.message);
  }
  
  console.log("");
  
  // =====================================================
  // AUDIT 15: REAL AI SESSION REVIEW TEST
  // =====================================================
  console.log("AUDIT 15: Real AI Session Review Generation");
  
  try {
    const session = await tutorClient.auth.getSession();
    const res = await fetch(`https://tutorflow-chi.vercel.app/api/tutor/sessions/${session2Id}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.data.session?.access_token}`,
      },
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      fail("Review generation request", data.error || `Status: ${res.status}`);
    } else if (!data.review) {
      fail("Review generation", "No review in response");
    } else {
      ok("Review generation request succeeded", `Status: ${res.status}`);
      
      const review = data.review;
      
      // Verify structure
      if (typeof review.summary === "string" && review.summary.length >= 10) {
        ok("Review has summary", `${review.summary.length} chars`);
      } else {
        fail("Review summary", "Missing or too short");
      }
      
      if (Array.isArray(review.homework) && review.homework.length >= 2 && review.homework.length <= 3) {
        ok("Review has 2-3 homework items", `${review.homework.length} items`);
      } else {
        fail("Review homework", `Expected 2-3, got ${review.homework?.length}`);
      }
      
      if (typeof review.next_topic === "string" && review.next_topic.length > 0) {
        ok("Review has next_topic recommendation");
      } else {
        fail("Review next_topic", "Missing or empty");
      }
      
      // Verify contextual relevance
      const reviewText = review.summary.toLowerCase();
      const hasNotes = reviewText.includes("fraction") || reviewText.includes("equation") || reviewText.includes("clearing");
      
      if (hasNotes) {
        ok("Review references actual session content", "Contextual relevance confirmed");
      } else {
        fail("Review contextual relevance", "Does not reference actual session notes content");
      }
      
      console.log("\n  Generated Review:");
      console.log("  Summary:", review.summary);
      console.log("  Homework:", review.homework);
      console.log("  Next Topic:", review.next_topic);
    }
    
    // Verify session transitioned to ai_reviewed
    const { data: updatedSession } = await serviceClient
      .from("sessions")
      .select("status")
      .eq("id", session2Id)
      .single();
    
    if (updatedSession?.status === "ai_reviewed") {
      ok("Session transitioned to ai_reviewed", "State machine worked correctly");
    } else {
      fail("Session state transition", `Expected ai_reviewed, got ${updatedSession?.status}`);
    }
    
    // Verify homework was created
    const { data: reviewData } = await serviceClient
      .from("session_reviews")
      .select("id")
      .eq("session_id", session2Id)
      .single();
    
    if (reviewData) {
      const { data: homework } = await serviceClient
        .from("homework_items")
        .select("id")
        .eq("review_id", reviewData.id);
      
      if (homework && homework.length > 0) {
        ok("Homework items created", `${homework.length} items`);
      } else {
        fail("Homework creation", "No homework items found");
      }
    }
    
    // Test duplicate prevention
    const res2 = await fetch(`https://tutorflow-chi.vercel.app/api/tutor/sessions/${session2Id}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.data.session?.access_token}`,
      },
    });
    
    if (res2.status === 409) {
      ok("Duplicate review request returns 409", "Double-click protection works");
    } else {
      fail("Duplicate review prevention", `Expected 409, got ${res2.status}`);
    }
  } catch (e) {
    fail("AI review generation", e.message);
  }
  
  console.log("");
  
  // =====================================================
  // AUDIT 16: PROGRESS SUMMARY TEST
  // =====================================================
  console.log("AUDIT 16: Progress Summary Generation");
  
  try {
    const session = await tutorClient.auth.getSession();
    const res = await fetch(`https://tutorflow-chi.vercel.app/api/tutor/students/${studentRecord.id}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.data.session?.access_token}`,
      },
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      fail("Progress summary request", data.error || `Status: ${res.status}`);
    } else if (!data.summary) {
      fail("Progress summary", "No summary in response");
    } else {
      ok("Progress summary request succeeded", `Status: ${res.status}`);
      
      if (typeof data.summary === "string" && data.summary.length > 0) {
        ok("Progress summary has content", `${data.summary.length} chars`);
      } else {
        fail("Progress summary content", "Missing or empty");
      }
      
      // Verify it references actual progress
      const summaryText = data.summary.toLowerCase();
      const hasProgress = summaryText.includes("improv") || summaryText.includes("progress") || summaryText.includes("develop");
      const hasWeakness = summaryText.includes("weak") || summaryText.includes("struggl") || summaryText.includes("fraction") || summaryText.includes("challeng");
      
      if (hasProgress) {
        ok("Progress summary discusses improvement", "Relevance confirmed");
      } else {
        fail("Progress summary relevance", "Does not discuss improvement");
      }
      
      if (hasWeakness) {
        ok("Progress summary identifies remaining weaknesses", "Completeness confirmed");
      } else {
        fail("Progress summary completeness", "Does not identify weaknesses");
      }
      
      console.log("\n  Generated Progress Summary:");
      console.log("  ", data.summary);
    }
  } catch (e) {
    fail("Progress summary generation", e.message);
  }
  
  console.log("");
  
  // =====================================================
  // AUDIT 17: DATA PRIVACY
  // =====================================================
  console.log("AUDIT 17: Data Privacy Verification");
  
  // Verify GEMINI_API_KEY is not in client code
  const fs = await import("fs");
  const path = await import("path");
  
  const checkFiles = [
    "app/login/page.tsx",
    "components/LogoutButton.tsx",
    "components/SessionActions.tsx",
    "components/HomeworkToggle.tsx",
    "components/TutorNav.tsx",
    "components/StudentNav.tsx",
    "components/ProgressSummary.tsx",
  ];
  
  let keyLeaked = false;
  for (const file of checkFiles) {
    try {
      const content = fs.readFileSync(path.join(process.cwd(), file), "utf-8");
      if (content.includes("GEMINI_API_KEY") || content.includes("AIza")) {
        fail(`Client file ${file}`, "Contains Gemini API key reference");
        keyLeaked = true;
      }
    } catch {
      // File doesn't exist, skip
    }
  }
  
  if (!keyLeaked) {
    ok("GEMINI_API_KEY not found in client components", "Data privacy verified");
  }
  
  // Verify no NEXT_PUBLIC_GEMINI_API_KEY
  try {
    const envExample = fs.readFileSync(path.join(process.cwd(), ".env.example"), "utf-8");
    if (envExample.includes("NEXT_PUBLIC_GEMINI_API_KEY")) {
      fail(".env.example", "Contains NEXT_PUBLIC_GEMINI_API_KEY (should not exist)");
    } else {
      ok("No NEXT_PUBLIC_GEMINI_API_KEY in .env.example");
    }
  } catch {
    ok("No .env.example with Gemini key");
  }
  
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
  
  // Update tutor2 cleanup
  if (tutor2Auth?.user?.id) {
    await serviceClient.auth.admin.deleteUser(tutor2Auth.user.id);
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error("Fatal error:", e);
  await cleanup();
  process.exit(1);
});
