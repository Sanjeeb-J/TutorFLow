import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateStudentSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  subject: z.string().min(1).optional(),
  current_level: z.string().nullable().optional(),
  learning_goals: z.string().nullable().optional(),
  weak_areas: z.string().nullable().optional(),
});

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

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .eq("tutor_id", user.id)
    .single();

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json({ student });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateStudentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("students")
    .update(parsed.data)
    .eq("id", id)
    .eq("tutor_id", user.id)
    .select("id, name, email")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to update student." },
      { status: 500 },
    );
  }

  return NextResponse.json({ student: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id)
    .eq("tutor_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete student." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
