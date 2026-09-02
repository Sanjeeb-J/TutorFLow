import { getUser, getProfile } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import LoginPageForm from "./LoginPageForm";

export default async function LoginPage() {
  // Redirect authenticated users to their dashboard
  const user = await getUser();
  if (user) {
    const profile = await getProfile();
    if (profile) {
      redirect(`/${profile.role}`);
    }
  }

  return <LoginPageForm />;
}
