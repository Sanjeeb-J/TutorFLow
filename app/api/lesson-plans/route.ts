import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Get the session details
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("topic, student_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify the user is either the student or tutor
    const isStudent = session.student_id === profile.id;
    const isTutor = (
      await supabase
        .from("sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("tutor_id", profile.id)
    ).data?.length === 1;

    if (!isStudent && !isTutor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate AI lesson plan based on the topic
    // In a real app, this would call an AI API
    const lessonPlan = generateLessonPlan(session.topic);

    // Save or update the lesson plan
    const { data: existingPlan } = await supabase
      .from("ai_lesson_plans")
      .select("id")
      .eq("student_id", session.student_id)
      .eq("session_id", sessionId)
      .single();

    let result;
    if (existingPlan) {
      result = await supabase
        .from("ai_lesson_plans")
        .update({
          learning_objectives: lessonPlan.learningObjectives,
          lesson_outline: lessonPlan.lessonOutline,
          practice_questions: lessonPlan.practiceQuestions,
          topic: session.topic,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPlan.id);
    } else {
      result = await supabase.from("ai_lesson_plans").insert({
        student_id: session.student_id,
        session_id: sessionId,
        learning_objectives: lessonPlan.learningObjectives,
        lesson_outline: lessonPlan.lessonOutline,
        practice_questions: lessonPlan.practiceQuestions,
        topic: session.topic,
      });
    }

    return NextResponse.json({ success: true, lessonPlan });
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateLessonPlan(topic: string) {
  // This is a placeholder - in production, call an AI API
  // For now, return a generic template based on the topic
  const idPrefix = topic.slice(0, 3).toUpperCase();

  return {
    learningObjectives: [
      { id: `${idPrefix}01`, text: `Explain the fundamental concepts of ${topic}` },
      { id: `${idPrefix}02`, text: `Apply ${topic} principles to solve problems` },
      { id: `${idPrefix}03`, text: `Analyze real-world applications of ${topic}` },
      { id: `${idPrefix}04`, text: `Evaluate the significance of ${topic} in the field` },
    ],
    lessonOutline: [
      { id: `${idPrefix}01`, text: `Introduction to ${topic}: Key concepts and historical context` },
      { id: `${idPrefix}02`, text: `Core principles and theories of ${topic}` },
      { id: `${idPrefix}03`, text: `Practical applications and problem-solving with ${topic}` },
      { id: `${idPrefix}04`, text: `Review and assessment of ${topic} understanding` },
    ],
    practiceQuestions: [
      { id: `${idPrefix}01`, text: `Explain the key concepts of ${topic} and their importance.` },
      { id: `${idPrefix}02`, text: `Solve a problem related to ${topic} using the learned principles.` },
      { id: `${idPrefix}03`, text: `Describe a real-world application of ${topic}.` },
    ],
  };
}
