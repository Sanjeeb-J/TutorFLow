import { requireStudent } from "@/lib/supabase/auth";
import StudentNav from "@/components/StudentNav";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStudent();

  return (
    <div className="flex min-h-screen bg-background">
      <StudentNav profile={profile} />
      <main className="flex-1 flex flex-col ml-0 md:ml-56">
        <div className="flex-1 p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
