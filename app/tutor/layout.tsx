import { requireTutor } from "@/lib/supabase/auth";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTutor();
  return <>{children}</>;
}
