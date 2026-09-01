import { requireTutor } from "@/lib/supabase/auth";
import TutorNav from "@/components/TutorNav";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireTutor();

  return (
    <div className="flex min-h-screen bg-background">
      <TutorNav profile={profile} />
      <main className="flex-1 flex flex-col ml-0 md:ml-56">
        <div className="flex-1 p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
