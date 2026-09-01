"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, Calendar, GraduationCap, Menu, X } from "lucide-react";
import type { UserProfile } from "@/lib/supabase/auth";

const navItems = [
  { href: "/student", label: "Overview", icon: GraduationCap },
  { href: "/student/sessions", label: "Sessions", icon: Calendar },
  { href: "/student/homework", label: "Homework", icon: BookOpen },
];

export default function StudentNav({ profile }: { profile: UserProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/student") return pathname === "/student";
    return pathname.startsWith(href);
  }

  const navContent = (
    <>
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" strokeWidth={1.5} />
          <span className="text-base font-semibold text-foreground">TutorFlow</span>
        </div>
        <p className="mt-2 text-xs text-muted truncate">{profile.full_name}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                active
                  ? "bg-accent-light text-accent font-medium"
                  : "text-muted hover:text-foreground hover:bg-accent-light/50"
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full px-3 py-2 text-sm text-muted hover:text-foreground rounded-md hover:bg-accent-light/50 transition-colors text-left"
        >
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-foreground">TutorFlow</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1 text-muted hover:text-foreground"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/20"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-20 w-56 bg-background border-r border-border flex flex-col transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pt-14">{navContent}</div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex fixed top-0 left-0 bottom-0 w-56 bg-background border-r border-border flex-col">
        {navContent}
      </div>
    </>
  );
}
