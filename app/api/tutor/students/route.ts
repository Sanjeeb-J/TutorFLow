import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { z } from "zod";

const createStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  current_level: z.string().nullable().optional(),
  learning_goals: z.string().nullable().optional(),
  weak_areas: z.string().nullable().optional(),
  temp_password: z.string().min(8).optional(),
});

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: students } = await supabase
    .from("students")
    .select("id, name, email, subject, current_level, learning_goals, weak_areas, created_at")
    .eq("tutor_id", user.id)
    .order("name", { ascending: true });

  return NextResponse.json({ students: students || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the user is a tutor
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "tutor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createStudentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { name, email, subject, current_level, learning_goals, weak_areas, temp_password } = parsed.data;
  const password = temp_password || generatePassword();

  const admin = createAdminClient();

  // Step 1: Create Supabase Auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message?.includes("already")) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 },
    );
  }

  // Step 2: Create profile
  const { error: profileError } = await admin
    .from("profiles")
    .insert({
      id: authData.user.id,
      role: "student",
      full_name: name,
    });

  if (profileError) {
    // Rollback: delete the auth user if profile creation fails
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: "Failed to create student profile." },
      { status: 500 },
    );
  }

  // Step 3: Create student domain record
  const { data: studentData, error: studentError } = await admin
    .from("students")
    .insert({
      tutor_id: user.id,
      user_id: authData.user.id,
      name,
      email,
      subject,
      current_level: current_level || null,
      learning_goals: learning_goals || null,
      weak_areas: weak_areas || null,
    })
    .select("id, name, email")
    .single();

  if (studentError) {
    // Rollback: delete profile and auth user if student creation fails
    await admin.from("profiles").delete().eq("id", authData.user.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: "Failed to create student record." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    student: studentData,
    temp_password: temp_password ? undefined : password,
  });
}
