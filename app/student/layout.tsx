import { requireStudent } from "@/lib/supabase/auth";
import AppNav from "@/components/AppNav";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStudent();

  return (
    <div className="workspace-shell">
      <AppNav role="student" profile={profile} />
      <div className="lg:pl-60">
        <main className="relative px-4 pb-14 pt-6 sm:px-6 lg:px-6 lg:pb-12 lg:pt-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
