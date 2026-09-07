import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StudentsManager, {
  type NextSessionInfo,
  type StudentSummary,
} from "@/components/StudentsManager";

export default async function StudentsPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: students } = await supabase
    .from("students")
    .select("id, name, email, subject, current_level")
    .eq("tutor_id", profile!.id)
    .order("name", { ascending: true });

  // Next upcoming session per student (single pass, real data)
  const { data: upcoming } = await supabase
    .from("sessions")
    .select("id, student_id, topic, start_at, status")
    .eq("tutor_id", profile!.id)
    .gte("start_at", now)
    .in("status", ["scheduled", "in_progress"])
    .order("start_at", { ascending: true });

  const nextSessions: Record<string, NextSessionInfo> = {};
  for (const s of upcoming ?? []) {
    if (!nextSessions[s.student_id]) {
      nextSessions[s.student_id] = { topic: s.topic, start_at: s.start_at };
    }
  }

  const count = students?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={
          count === 0
            ? "Manage the students you tutor"
            : `${count} student${count === 1 ? "" : "s"} on your roster`
        }
        actions={
          <Link href="/tutor/students/new" className="btn btn-primary">
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Add Student
          </Link>
        }
      />

      <div className="mt-8">
        <StudentsManager
          students={(students ?? []) as StudentSummary[]}
          nextSessions={nextSessions}
        />
      </div>
    </div>
  );
}
