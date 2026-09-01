import { BookOpen } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent-light mb-6">
          <BookOpen className="w-6 h-6 text-accent" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          TutorFlow
        </h1>

        <p className="mt-3 text-base text-muted leading-relaxed">
          A focused workspace for one-to-one tutoring.
        </p>

        <div className="mt-10 flex flex-col items-center gap-2">
          <span className="text-xs font-medium tracking-wide uppercase text-muted">
            Project setup
          </span>
          <span className="text-sm text-foreground">
            Development environment ready
          </span>
        </div>
      </div>
    </div>
  );
}
