import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/supabase/auth";
import { BookOpen } from "lucide-react";

export default async function Home() {
  const user = await getUser();

  if (user) {
    const profile = await getProfile();
    if (profile) {
      redirect(`/${profile.role}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent-light mb-6">
          <BookOpen className="w-6 h-6 text-accent" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          TutorFlow
        </h1>

        <p className="mt-3 text-base text-muted leading-relaxed">
          A focused workspace for one-to-one tutoring.
        </p>

        <a
          href="/login"
          className="mt-8 px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 transition-colors"
        >
          Sign in
        </a>
      </div>
    </div>
  );
}
