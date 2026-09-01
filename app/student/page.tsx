import { getProfile } from "@/lib/supabase/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function StudentPage() {
  const profile = await getProfile();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">TutorFlow</h1>
          <span className="text-xs text-muted">Student</span>
        </div>
        <LogoutButton />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center text-center max-w-md">
          <h2 className="text-xl font-semibold text-foreground">
            Student Workspace
          </h2>
          <p className="mt-2 text-sm text-muted">
            Signed in as {profile?.full_name || profile?.id}
          </p>
        </div>
      </main>
    </div>
  );
}
