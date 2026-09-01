import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateStructuredJSON, GEMINI_MODEL } from "@/lib/ai/gemini";
import { ProgressSummarySchema, type ProgressSummaryOutput } from "@/lib/ai/schemas";
import {
  PROGRESS_SUMMARY_SYSTEM,
  PROGRESS_SUMMARY_PROMPT_VERSION,
  buildProgressSummaryPrompt,
} from "@/lib/ai/prompts/progress-summary";
import { getStudentAIContext } from "@/lib/ai/context";

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

  // Verify student belongs to tutor
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", id)
    .eq("tutor_id", user.id)
    .single();

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    // Get student context
    const context = await getStudentAIContext(id, user.id);

    // Get reviewed sessions for progress
    const { data: reviewedSessions } = await supabase
      .from("sessions")
      .select(`
        id, topic, start_at,
        session_reviews(summary, next_topic)
      `)
      .eq("student_id", id)
      .eq("tutor_id", user.id)
      .eq("status", "ai_reviewed")
      .order("start_at", { ascending: false })
      .limit(10);

    const sessionsForPrompt = (reviewedSessions || []).map((s) => {
      const reviews = s.session_reviews as Array<{ summary: string; next_topic: string }> | null;
      const review = reviews?.[0];
      return {
        topic: s.topic,
        summary: review?.summary || "",
        nextTopic: review?.next_topic || null,
      };
    });

    // Build prompt
    const prompt = buildProgressSummaryPrompt({
      studentName: context.studentName,
      subject: context.subject,
      currentLevel: context.currentLevel,
      learningGoals: context.learningGoals,
      weakAreas: context.weakAreas,
      reviewedSessions: sessionsForPrompt,
    });

    // Generate with Gemini
    const output = await generateStructuredJSON<ProgressSummaryOutput>(
      prompt,
      {
        type: "object",
        properties: {
          summary: { type: "string" },
        },
        required: ["summary"],
      },
      PROGRESS_SUMMARY_SYSTEM,
    );

    // Validate with Zod
    const validated = ProgressSummarySchema.parse(output);

    return NextResponse.json({
      summary: validated.summary,
      model: GEMINI_MODEL,
      promptVersion: PROGRESS_SUMMARY_PROMPT_VERSION,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";

    if (message.includes("JSON")) {
      return NextResponse.json(
        { error: "AI returned an invalid response. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "AI summary is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
