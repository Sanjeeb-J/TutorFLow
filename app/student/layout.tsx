import { requireStudent } from "@/lib/supabase/auth";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStudent();
  return <>{children}</>;
}
