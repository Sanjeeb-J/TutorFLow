import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateStructuredJSON, GEMINI_MODEL } from "@/lib/ai/gemini";
import { SessionPlanSchema, type SessionPlanOutput } from "@/lib/ai/schemas";
import {
  SESSION_PLAN_SYSTEM,
  SESSION_PLAN_PROMPT_VERSION,
  buildSessionPlanPrompt,
} from "@/lib/ai/prompts/session-plan";
import { getStudentAIContext } from "@/lib/ai/context";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify tutor role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "tutor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Verify session belongs to tutor
  const { data: session } = await supabase
    .from("sessions")
    .select("id, topic, start_at, student_id, status")
    .eq("id", id)
    .eq("tutor_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Check if plan already exists
  const { data: existingPlan } = await supabase
    .from("session_plans")
    .select("id")
    .eq("session_id", id)
    .single();

  if (existingPlan) {
    return NextResponse.json(
      { error: "A plan already exists for this session." },
      { status: 409 },
    );
  }

  try {
    // Gather context
    const context = await getStudentAIContext(session.student_id, user.id);

    // Build prompt
    const prompt = buildSessionPlanPrompt({
      ...context,
      sessionTopic: session.topic,
      sessionDate: new Date(session.start_at).toLocaleDateString(),
    });

    // Generate with Gemini
    const output = await generateStructuredJSON<SessionPlanOutput>(
      prompt,
      {
        type: "object",
        properties: {
          objectives: { type: "array", items: { type: "string" } },
          lesson_outline: { type: "array", items: { type: "string" } },
          practice_questions: { type: "array", items: { type: "string" } },
        },
        required: ["objectives", "lesson_outline", "practice_questions"],
      },
      SESSION_PLAN_SYSTEM,
    );

    // Validate with Zod
    const validated = SessionPlanSchema.parse(output);

    // Save to database
    const { data: plan, error } = await supabase
      .from("session_plans")
      .insert({
        session_id: id,
        objectives: validated.objectives,
        lesson_outline: validated.lesson_outline,
        practice_questions: validated.practice_questions,
        ai_model: GEMINI_MODEL,
        ai_prompt_version: SESSION_PLAN_PROMPT_VERSION,
        ai_generated_at: new Date().toISOString(),
      })
      .select("id, objectives, lesson_outline, practice_questions")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save session plan." },
        { status: 500 },
      );
    }

    return NextResponse.json({ plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";

    if (message.includes("JSON")) {
      return NextResponse.json(
        { error: "AI returned an invalid plan. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "AI planning is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: plan } = await supabase
    .from("session_plans")
    .select("id, objectives, lesson_outline, practice_questions, ai_model, ai_prompt_version, ai_generated_at")
    .eq("session_id", id)
    .single();

  if (!plan) {
    return NextResponse.json({ plan: null });
  }

  return NextResponse.json({ plan });
}
