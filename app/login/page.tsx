import { getUser, getProfile } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { BookOpen, CalendarDays, FileText, TrendingUp } from "lucide-react";
import LoginPageForm from "./LoginPageForm";

/** Concise, true product capabilities (mirrors the existing app copy). */
const VALUE_PROPS = [
  { icon: CalendarDays, label: "Plan lessons" },
  { icon: FileText, label: "Take live notes" },
  { icon: TrendingUp, label: "Track progress" },
];

export default async function LoginPage() {
  // Redirect authenticated users to their dashboard (unchanged)
  const user = await getUser();
  if (user) {
    const profile = await getProfile();
    if (profile) {
      redirect(`/${profile.role}`);
    }
  }

  const brand = (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15"
      >
        <BookOpen className="h-5 w-5 text-accent-ring" strokeWidth={2} />
      </span>
      <span className="login-overlay-text text-lg font-semibold tracking-tight">
        TutorFlow
      </span>
    </span>
  );

  return (
    <div className="login-shell relative min-h-screen overflow-hidden">
      {/* Photographic background + overlay stack (fixed brand atmosphere) */}
      <div aria-hidden="true" className="absolute inset-0">
        <div className="login-photo absolute inset-0" />
        <div className="login-overlay absolute inset-0" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 py-12 sm:px-10 lg:grid-cols-2 lg:gap-14 lg:px-12 lg:py-16">
        {/* Left — branding over the photograph (desktop/tablet landscape) */}
        <div className="hidden flex-col justify-center lg:flex">
          {brand}
          <h2 className="login-overlay-text mt-10 max-w-md text-4xl font-semibold leading-[1.12] tracking-tight xl:text-5xl">
            Better learning,
            <br />
            together.
          </h2>
          <p className="login-overlay-muted mt-5 max-w-md text-base leading-relaxed xl:text-lg">
            A focused workspace for one-to-one tutoring.
          </p>
          <ul className="mt-9 space-y-3.5">
            {VALUE_PROPS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10"
                >
                  <Icon className="h-4 w-4 text-accent-ring" strokeWidth={1.75} />
                </span>
                <span className="login-overlay-muted text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — login panel */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-[440px]">
            <div className="mb-8 flex justify-center lg:hidden">{brand}</div>
            <LoginPageForm />
          </div>
        </div>
      </div>
    </div>
  );
}