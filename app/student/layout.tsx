import { requireStudent } from "@/lib/supabase/auth";
import AppNav from "@/components/AppNav";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStudent();

  return (
    <div className="min-h-screen bg-background">
      <AppNav role="student" profile={profile} />
      <div className="lg:pl-64">
        <main className="px-4 pb-14 pt-20 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
