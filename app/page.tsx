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
    <div className="flex flex-col items-center justify-center px-6 py-20 min-h-screen bg-background">
      <div className="flex flex-col items-center text-center max-w-md">
        <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-light mb-6">
          <BookOpen className="w-7 h-7 text-accent" strokeWidth={1.75} />
        </span>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          TutorFlow
        </h1>

        <p className="mt-3 text-base text-muted leading-relaxed">
          A focused workspace for one-to-one tutoring — plan lessons, take live notes,
          and track progress in one calm, organized place.
        </p>

        <a href="/login" className="btn btn-primary mt-8 btn-lg">
          Sign in
        </a>
      </div>
    </div>
  );
}
