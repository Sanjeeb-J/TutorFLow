import { requireTutor } from "@/lib/supabase/auth";
import AppNav from "@/components/AppNav";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireTutor();

  return (
    <div className="workspace-shell">
      <AppNav role="tutor" profile={profile} />
      <div className="lg:pl-60">
        <main className="relative px-4 pb-14 pt-6 sm:px-6 lg:px-6 lg:pb-12 lg:pt-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
