import { createClient } from "@/lib/supabase/server";

interface StudentAIContext {
  studentName: string;
  subject: string;
  currentLevel: string | null;
  learningGoals: string | null;
  weakAreas: string | null;
  recentHistory: Array<{
    topic: string;
    notes: string | null;
    summary: string | null;
    nextTopic: string | null;
  }>;
}

/**
 * Gather AI context for a student.
 * Verifies tutor ownership and retrieves only authorized data.
 */
export async function getStudentAIContext(
  studentId: string,
  tutorId: string,
): Promise<StudentAIContext> {
  const supabase = await createClient();

  // Verify student belongs to this tutor
  const { data: student } = await supabase
    .from("students")
    .select("name, subject, current_level, learning_goals, weak_areas")
    .eq("id", studentId)
    .eq("tutor_id", tutorId)
    .single();

  if (!student) {
    throw new Error("Student not found or access denied");
  }

  // Get recent completed sessions with reviews
  const { data: sessions } = await supabase
    .from("sessions")
    .select(`
      id, topic, notes, start_at,
      session_reviews(summary, next_topic)
    `)
    .eq("student_id", studentId)
    .eq("tutor_id", tutorId)
    .in("status", ["completed", "ai_reviewed"])
    .order("start_at", { ascending: false })
    .limit(5);

  const recentHistory = (sessions || []).map((s) => {
    const reviews = s.session_reviews as Array<{ summary: string; next_topic: string }> | null;
    const review = reviews?.[0];
    return {
      topic: s.topic,
      notes: s.notes,
      summary: review?.summary || null,
      nextTopic: review?.next_topic || null,
    };
  });

  return {
    studentName: student.name,
    subject: student.subject,
    currentLevel: student.current_level,
    learningGoals: student.learning_goals,
    weakAreas: student.weak_areas,
    recentHistory,
  };
}

/**
 * Get session-specific context for review generation.
 */
export async function getSessionReviewContext(
  sessionId: string,
  tutorId: string,
) {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, topic, notes, start_at, student_id")
    .eq("id", sessionId)
    .eq("tutor_id", tutorId)
    .single();

  if (!session) {
    throw new Error("Session not found or access denied");
  }

  const studentContext = await getStudentAIContext(session.student_id, tutorId);

  return {
    ...studentContext,
    sessionTopic: session.topic,
    sessionDate: new Date(session.start_at).toLocaleDateString(),
    sessionNotes: session.notes || "",
  };
}
