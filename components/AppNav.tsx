"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { UserProfile } from "@/lib/supabase/auth";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: Record<"tutor" | "student", NavItem[]> = {
  tutor: [
    { href: "/tutor", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tutor/students", label: "Students", icon: Users },
    { href: "/tutor/sessions", label: "Sessions", icon: CalendarDays },
  ],
  student: [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/sessions", label: "Sessions", icon: CalendarDays },
    { href: "/student/homework", label: "Homework", icon: ClipboardList },
    { href: "/student/progress", label: "Progress", icon: TrendingUp },
  ],
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppNav({
  role,
  profile,
}: {
  role: "tutor" | "student";
  profile: UserProfile;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const items = NAV_ITEMS[role];
  const root = `/${role}`;

  // Close the drawer with Escape while it is open
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  function isActive(item: NavItem) {
    return item.href === root ? pathname === root : pathname.startsWith(item.href);
  }

  const brand = (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light">
        <BookOpen className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        TutorFlow
      </span>
    </div>
  );

  const nav = (
    <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-accent-light font-medium text-accent-strong"
                : "text-muted-strong hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
    <div className="border-t border-border px-3 py-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white"
        >
          {getInitials(profile.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {profile.full_name}
          </p>
          <p className="truncate text-xs capitalize text-muted">{role}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-strong transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-60"
      >
        <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        {loggingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );

  const sidebarBody = (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        {brand}
      </div>
      {nav}
      {sidebarFooter}
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        {brand}
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white" aria-hidden="true">
            {getInitials(profile.full_name)}
          </span>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="rounded-md p-1.5 text-muted-strong transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        id="mobile-nav"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface shadow-xl transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        {sidebarBody}
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        {sidebarBody}
      </aside>
    </>
  );
}
