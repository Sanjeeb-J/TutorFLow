import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, completed } = body;

  if (typeof completed !== "boolean") {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  // Update only the completed field — RLS ensures the student owns this homework
  const { data, error } = await supabase
    .from("homework_items")
    .update({ completed })
    .eq("id", id)
    .select("id, completed")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to update homework." },
      { status: 500 },
    );
  }

  return NextResponse.json({ homework: data });
}
