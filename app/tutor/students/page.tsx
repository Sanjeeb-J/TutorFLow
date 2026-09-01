import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, User } from "lucide-react";

export default async function StudentsPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, name, email, subject, current_level")
    .eq("tutor_id", profile!.id)
    .order("name", { ascending: true });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Students</h1>
          <p className="text-sm text-muted mt-1">
            {students?.length ?? 0} student{(students?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/tutor/students/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Add Student
        </Link>
      </div>

      {students && students.length > 0 ? (
        <div className="space-y-2">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/tutor/students/${student.id}`}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent-light/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-light">
                  <User className="w-4 h-4 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{student.name}</p>
                  <p className="text-xs text-muted">{student.subject}</p>
                </div>
              </div>
              <div className="text-right">
                {student.current_level && (
                  <p className="text-xs text-muted">{student.current_level}</p>
                )}
                {student.email && (
                  <p className="text-xs text-muted">{student.email}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-8 border border-border rounded-lg text-center">
          <User className="w-10 h-10 text-muted mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-foreground mb-1">No students yet</p>
          <p className="text-sm text-muted mb-4">
            Add your first student to start scheduling sessions.
          </p>
          <Link
            href="/tutor/students/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Add Student
          </Link>
        </div>
      )}
    </div>
  );
}
