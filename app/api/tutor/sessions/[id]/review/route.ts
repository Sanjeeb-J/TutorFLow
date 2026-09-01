import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateStructuredJSON, GEMINI_MODEL } from "@/lib/ai/gemini";
import { SessionReviewSchema, type SessionReviewOutput } from "@/lib/ai/schemas";
import {
  SESSION_REVIEW_SYSTEM,
  SESSION_REVIEW_PROMPT_VERSION,
  buildSessionReviewPrompt,
} from "@/lib/ai/prompts/session-review";
import { getSessionReviewContext } from "@/lib/ai/context";

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

  // Verify session belongs to tutor and is completed
  const { data: session } = await supabase
    .from("sessions")
    .select("id, topic, start_at, student_id, status, notes")
    .eq("id", id)
    .eq("tutor_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "completed") {
    return NextResponse.json(
      { error: "Only completed sessions can be AI reviewed." },
      { status: 400 },
    );
  }

  // Check if review already exists
  const { data: existingReview } = await supabase
    .from("session_reviews")
    .select("id")
    .eq("session_id", id)
    .single();

  if (existingReview) {
    return NextResponse.json(
      { error: "This session has already been reviewed." },
      { status: 409 },
    );
  }

  try {
    // Gather context
    const context = await getSessionReviewContext(id, user.id);

    // Build prompt
    const prompt = buildSessionReviewPrompt(context);

    // Generate with Gemini
    const output = await generateStructuredJSON<SessionReviewOutput>(
      prompt,
      {
        type: "object",
        properties: {
          summary: { type: "string" },
          homework: { type: "array", items: { type: "string" } },
          next_topic: { type: "string" },
        },
        required: ["summary", "homework", "next_topic"],
      },
      SESSION_REVIEW_SYSTEM,
    );

    // Validate with Zod
    const validated = SessionReviewSchema.parse(output);

    // Save review
    const { data: review, error: reviewError } = await supabase
      .from("session_reviews")
      .insert({
        session_id: id,
        summary: validated.summary,
        next_topic: validated.next_topic,
        ai_model: GEMINI_MODEL,
        ai_prompt_version: SESSION_REVIEW_PROMPT_VERSION,
        ai_generated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (reviewError) {
      return NextResponse.json(
        { error: "Failed to save review." },
        { status: 500 },
      );
    }

    // Save homework items
    if (validated.homework.length > 0) {
      const homeworkInserts = validated.homework.map((description) => ({
        review_id: review.id,
        description,
        completed: false,
      }));

      const { error: hwError } = await supabase
        .from("homework_items")
        .insert(homeworkInserts);

      if (hwError) {
        // Review saved but homework failed — still proceed with transition
        console.error("Failed to save homework items:", hwError);
      }
    }

    // Transition: completed → ai_reviewed
    const { error: transitionError } = await supabase
      .from("sessions")
      .update({ status: "ai_reviewed" })
      .eq("id", id)
      .eq("tutor_id", user.id)
      .eq("status", "completed");

    if (transitionError) {
      return NextResponse.json(
        { error: "Failed to complete AI review transition." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      review: {
        id: review.id,
        summary: validated.summary,
        homework: validated.homework,
        next_topic: validated.next_topic,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";

    if (message.includes("JSON")) {
      return NextResponse.json(
        { error: "AI returned an invalid review. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "AI review is temporarily unavailable. Please try again." },
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

  const { data: review } = await supabase
    .from("session_reviews")
    .select("id, summary, next_topic, ai_model, ai_prompt_version, ai_generated_at")
    .eq("session_id", id)
    .single();

  if (!review) {
    return NextResponse.json({ review: null });
  }

  // Get homework items
  const { data: homework } = await supabase
    .from("homework_items")
    .select("id, description, completed")
    .eq("review_id", review.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ review: { ...review, homework: homework || [] } });
}
