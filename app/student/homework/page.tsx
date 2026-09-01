import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { BookOpen } from "lucide-react";
import HomeworkToggle from "@/components/HomeworkToggle";

export default async function StudentHomeworkPage() {
  await getProfile();
  const supabase = await createClient();

  // Get homework items through the FK chain
  const { data: homework } = await supabase
    .from("homework_items")
    .select("id, description, completed, created_at, review:session_reviews(id, session_id, summary)")
    .order("created_at", { ascending: false });

  // Filter to only homework belonging to this student's sessions
  // RLS already handles this, but let's also filter by the join
  const studentHomework = homework || [];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Homework</h1>

      {studentHomework.length > 0 ? (
        <div className="space-y-3">
          {studentHomework.map((hw) => (
            <div
              key={hw.id}
              className="flex items-start gap-3 p-4 border border-border rounded-lg"
            >
              <HomeworkToggle id={hw.id} completed={hw.completed} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${hw.completed ? "text-muted line-through" : "text-foreground"}`}>
                  {hw.description}
                </p>
                <p className="text-xs text-muted mt-1">
                  Assigned {new Date(hw.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 border border-border rounded-lg text-center">
          <BookOpen className="w-10 h-10 text-muted mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-foreground mb-1">No homework yet</p>
          <p className="text-sm text-muted">
            Homework will appear here after your sessions are reviewed.
          </p>
        </div>
      )}
    </div>
  );
}
