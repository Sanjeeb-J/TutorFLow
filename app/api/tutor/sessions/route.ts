import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSessionSchema = z.object({
  student_id: z.string().uuid("Invalid student"),
  topic: z.string().min(1, "Topic is required"),
  start_at: z.string().datetime("Invalid start time"),
  end_at: z.string().datetime("Invalid end time"),
}).refine((data) => new Date(data.end_at) > new Date(data.start_at), {
  message: "End time must be after start time",
  path: ["end_at"],
});

export async function GET() {
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

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, topic, start_at, end_at, status, students(name)")
    .eq("tutor_id", user.id)
    .order("start_at", { ascending: false });

  return NextResponse.json({ sessions: sessions || [] });
}

export async function POST(request: Request) {
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

  const body = await request.json();
  const parsed = createSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { student_id, topic, start_at, end_at } = parsed.data;

  // Verify student belongs to this tutor (RLS also enforces this)
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", student_id)
    .eq("tutor_id", user.id)
    .single();

  if (!student) {
    return NextResponse.json(
      { error: "Student not found or does not belong to you." },
      { status: 404 },
    );
  }

  // Insert session — PostgreSQL exclusion constraint handles double-booking
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      tutor_id: user.id,
      student_id,
      topic,
      start_at,
      end_at,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error) {
    // Check for exclusion constraint violation (double-booking)
    if (error.message?.includes("exclusion") || error.message?.includes("overlap") || error.code === "23P01") {
      return NextResponse.json(
        { error: "This time overlaps with another session. Choose a different time." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create session." },
      { status: 500 },
    );
  }

  return NextResponse.json({ session });
}
