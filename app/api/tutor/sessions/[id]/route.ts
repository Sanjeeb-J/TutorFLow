import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: fetch session detail
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

  const { data: session } = await supabase
    .from("sessions")
    .select("*, students(name, email, subject)")
    .eq("id", id)
    .eq("tutor_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}

// PATCH: state transitions or notes update
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
  const { action, notes, updated_at } = body;

  // Verify ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, updated_at")
    .eq("id", id)
    .eq("tutor_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Handle state transitions
  if (action === "start") {
    if (session.status !== "scheduled") {
      return NextResponse.json(
        { error: "Only scheduled sessions can be started." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("sessions")
      .update({ status: "in_progress" })
      .eq("id", id)
      .eq("tutor_id", user.id)
      .eq("status", "scheduled");

    if (error) {
      return NextResponse.json(
        { error: "Failed to start session. It may have already been started." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, status: "in_progress" });
  }

  if (action === "complete") {
    if (session.status !== "in_progress") {
      return NextResponse.json(
        { error: "Only in-progress sessions can be completed." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("sessions")
      .update({ status: "completed" })
      .eq("id", id)
      .eq("tutor_id", user.id)
      .eq("status", "in_progress");

    if (error) {
      return NextResponse.json(
        { error: "Failed to complete session." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, status: "completed" });
  }

  // Handle notes update
  if (notes !== undefined) {
    if (session.status !== "in_progress") {
      return NextResponse.json(
        { error: "Notes can only be edited during an active session." },
        { status: 400 },
      );
    }

    // Optimistic concurrency: reject if updated_at doesn't match
    if (updated_at && session.updated_at !== updated_at) {
      return NextResponse.json(
        { error: "Session was modified by another request. Please reload." },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("sessions")
      .update({ notes })
      .eq("id", id)
      .eq("tutor_id", user.id)
      .eq("status", "in_progress")
      .select("notes, updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save notes." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, notes: data.notes, updated_at: data.updated_at });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
