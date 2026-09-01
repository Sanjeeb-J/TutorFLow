import { createClient } from "./server";
import { redirect } from "next/navigation";

export type UserRole = "tutor" | "student";

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get the authenticated Supabase user.
 * Returns null if not authenticated.
 */
export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current user's profile from the profiles table.
 * Returns null if not authenticated or no profile exists.
 */
export async function getProfile(): Promise<UserProfile | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

/**
 * Require an authenticated user. Redirects to /login if not authenticated.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Require a tutor profile. Redirects appropriately if not a tutor.
 */
export async function requireTutor() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "tutor") redirect(`/${profile.role}`);
  return profile;
}

/**
 * Require a student profile. Redirects appropriately if not a student.
 */
export async function requireStudent() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student") redirect(`/${profile.role}`);
  return profile;
}
