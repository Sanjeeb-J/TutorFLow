import { requireTutor } from "@/lib/supabase/auth";
import AppNav from "@/components/AppNav";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireTutor();

  return (
    <div className="min-h-screen bg-background">
      <AppNav role="tutor" profile={profile} />
      <div className="lg:pl-64">
        <main className="px-4 pb-14 pt-20 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
