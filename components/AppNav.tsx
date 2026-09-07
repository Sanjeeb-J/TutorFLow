"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
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
import { THEMES } from "@/lib/theme/config";
import Avatar from "./Avatar";
import { useTheme } from "./ThemeProvider";

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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AppNav({
  role,
  profile,
}: {
  role: "tutor" | "student";
  profile: UserProfile;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close the account menu when the route changes (derived state during
  // render — the standard React pattern for resetting state on prop change).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setAccountOpen(false);
  }

  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const accountTriggerRef = useRef<HTMLButtonElement | null>(null);
  const desktopAccountRef = useRef<HTMLDivElement | null>(null);
  const mobileAccountRef = useRef<HTMLDivElement | null>(null);
  const desktopPanelRef = useRef<HTMLDivElement | null>(null);
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);

  const items = NAV_ITEMS[role];
  const root = `/${role}`;
  const isDark = theme === 'dark';

  function isActive(item: NavItem) {
    return item.href === root ? pathname === root : pathname.startsWith(item.href);
  }

  /** Close the mobile drawer and return focus to the menu trigger. */
  const closeMobile = useCallback(() => {
    const focusInsideDrawer =
      drawerRef.current?.contains(document.activeElement) ?? false;
    setMobileOpen(false);
    if (focusInsideDrawer) menuButtonRef.current?.focus();
  }, []);

  /** Close the account menu and return focus to whichever trigger opened it. */
  const closeAccount = useCallback(() => {
    setAccountOpen(false);
    if (accountTriggerRef.current) accountTriggerRef.current.focus();
  }, []);

  const openAccount = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    accountTriggerRef.current = e.currentTarget;
    setMobileOpen(false);
    setAccountOpen(true);
  }, []);

  const toggleMobile = useCallback(() => {
    setAccountOpen(false);
    setMobileOpen((open) => !open);
  }, []);

  // Move focus into the account panel when it opens.
  useEffect(() => {
    if (!accountOpen) return;
    const visible = desktopPanelRef.current?.offsetParent
      ? desktopPanelRef.current
      : mobilePanelRef.current;
    visible?.focus({ preventScroll: true });
  }, [accountOpen]);

  // Move focus to the drawer's close control when it opens.
  useEffect(() => {
    if (mobileOpen) closeButtonRef.current?.focus();
  }, [mobileOpen]);

  // Close the account menu on Escape.
  useEffect(() => {
    if (!accountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAccount();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accountOpen, closeAccount]);

  // Close the account menu on outside click.
  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const inside =
        desktopAccountRef.current?.contains(target) ||
        mobileAccountRef.current?.contains(target);
      if (!inside) closeAccount();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [accountOpen, closeAccount]);

  // Close the drawer on Escape (unless the account menu is handling it).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !accountOpen) closeMobile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, accountOpen, closeMobile]);

  // Prevent page scrolling while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  // Keep Tab focus inside the drawer while it is open.
  const handleDrawerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Tab") return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusables = Array.from(
        drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !drawer.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [],
  );

  // Arrow-key navigation inside the account menu (menu pattern).
  const handleAccountMenuKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const panel = e.currentTarget;
      const items = Array.from(
        panel.querySelectorAll<HTMLButtonElement>('button[role="menuitem"], button[role="menuitemradio"]'),
      );
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLButtonElement);

      const focusAt = (next: number) => {
        e.preventDefault();
        items[next]?.focus();
      };

      if (e.key === "ArrowDown") focusAt(index < 0 ? 0 : (index + 1) % items.length);
      else if (e.key === "ArrowUp")
        focusAt(index <= 0 ? items.length - 1 : index - 1);
      else if (e.key === "Home") focusAt(0);
      else if (e.key === "End") focusAt(items.length - 1);
    },
    [],
  );

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  const brand = (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
      >
        <BookOpen className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--sidebar-text)' }}>
        TutorFlow
      </span>
    </div>
  );

  const navList = (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={closeMobile}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
                active
                  ? "border border-accent/20 bg-accent-light font-medium text-accent-strong shadow-[var(--glow-accent)]"
                  : "text-muted-strong hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                />
              )}
              <Icon
                className="h-4 w-4 shrink-0"
                strokeWidth={active ? 2 : 1.75}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const nav = (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
      {navList}
    </nav>
  );

  /** Identity block inside the account menu. */
  const accountIdentity = (
    <div className={`flex items-center gap-3 border-b p-3 ${isDark ? "border-white/10" : "border-gray-200"}`}>
      <Avatar name={profile.full_name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: isDark ? 'var(--foreground)' : 'var(--sidebar-text)' }}>
          {profile.full_name}
        </p>
        <p className="truncate text-xs capitalize" style={{ color: isDark ? 'var(--muted)' : 'var(--sidebar-muted)' }}>{role}</p>
      </div>
    </div>
  );

  /** Theme picker rows rendered from the Stage 1 theme config. */
  const themeOptions = (
    <ul className="px-1.5 pb-1.5">
      {THEMES.map((t) => {
        const selected = theme === t.id;
        return (
          <li key={t.id}>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              onClick={() => setTheme(t.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
                selected
                  ? "border border-accent/20 bg-accent-light font-medium text-accent-strong shadow-[var(--glow-accent)]"
                  : isDark
                    ? "text-muted-strong hover:bg-surface-muted hover:text-foreground"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 rounded-full border ${isDark ? "border-white/20" : "border-gray-300"}`}
                style={{ backgroundColor: t.swatch }}
              />
              <span className="flex-1 text-left">{t.label}</span>
              {selected && (
                <Check className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden="true" style={{ color: isDark ? 'var(--accent)' : 'var(--accent-strong)' }} />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const signOutItem = (
    <button
      type="button"
      role="menuitem"
      onClick={handleLogout}
      disabled={loggingOut}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] disabled:opacity-60 ${
        isDark
          ? "text-muted-strong hover:bg-surface-muted hover:text-foreground"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {loggingOut ? "Signing out…" : "Sign out"}
    </button>
  );

  /** Popover body shared by the desktop and mobile account menus. */
  const accountMenuBody = (
    <>
      {accountIdentity}
      <div className="px-3 pb-1 pt-3">
        <p className="caption" style={{ color: isDark ? 'var(--muted)' : 'var(--sidebar-muted)' }}>Theme</p>
      </div>
      {themeOptions}
      <div className={`p-1.5 ${isDark ? "border-t border-white/10" : "border-t border-gray-200"}`}>{signOutItem}</div>
    </>
  );

  const sidebarBase = isDark
    ? "glass-surface fixed inset-y-0 left-0 z-30 hidden w-64 flex flex-col border-r border-glass-border shadow-[var(--shadow-elevated)] lg:flex"
    : "fixed inset-y-0 left-0 z-30 hidden w-64 flex flex-col border-r border-border bg-[var(--sidebar-surface)] lg:flex";
  const sidebarHeaderBase = isDark
    ? "flex h-16 shrink-0 items-center border-b border-glass-border px-5"
    : "flex h-16 shrink-0 items-center border-b border-border px-5";
  const sidebarFooterBase = isDark
    ? "border-t border-glass-border p-3"
    : "border-t border-border p-3";

  const accountTriggerBase =
    isDark
      ? "rounded-md text-muted-strong transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-surface-muted hover:text-foreground"
      : "rounded-md text-[var(--sidebar-muted)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-black/5 hover:text-[var(--sidebar-text)]";

  return (
    <>
      {/* Mobile top bar */}
      <header className="glass-surface fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-glass-border px-4 lg:hidden">
        {brand}
        <div className="relative flex items-center gap-1.5" ref={mobileAccountRef}>
          <button
            type="button"
            onClick={openAccount}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-controls="account-menu-mobile"
            aria-label={`Account menu for ${profile.full_name}`}
            className={accountTriggerBase}
          >
            <Avatar name={profile.full_name} size="xs" />
          </button>
          <button
            ref={menuButtonRef}
            onClick={toggleMobile}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className={accountTriggerBase}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>

          {accountOpen && (
            <div
              ref={mobilePanelRef}
              id="account-menu-mobile"
              role="menu"
              aria-label="Account menu"
              tabIndex={-1}
              onKeyDown={handleAccountMenuKeyDown}
              className="surface-popover absolute right-0 top-full z-50 mt-2 max-h-[min(26rem,calc(100vh-5rem))] w-60 overflow-y-auto"
            >
              {accountMenuBody}
            </div>
          )}
        </div>
      </header>

      {/* Mobile drawer overlay — sits below the top bar so the header
          (account avatar + menu trigger) stays crisp and interactive. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        ref={drawerRef}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        inert={!mobileOpen}
        onKeyDown={handleDrawerKeyDown}
        className={`glass-surface fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-glass-border shadow-xl transition-transform duration-[var(--duration-normal)] ease-[var(--ease-standard)] lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`flex h-14 shrink-0 items-center justify-between border-b px-5 ${isDark ? "border-glass-border" : "border-border"}`}>
          {brand}
          <button
            ref={closeButtonRef}
            onClick={closeMobile}
            aria-label="Close menu"
            className={`rounded-md p-1.5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] lg:hidden ${
              isDark
                ? "text-muted-strong hover:bg-surface-muted hover:text-foreground"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        {nav}
        {/* Static identity + sign out inside the drawer (unchanged). */}
        <div className={`p-3 ${isDark ? "border-t border-glass-border" : "border-t border-border"}`}>
          <div className={`flex items-center gap-3 rounded-xl p-2.5 shadow-[var(--glass-highlight)] ${
            isDark
              ? "border border-glass-border bg-surface-muted/60"
              : "border-black/10 bg-black/5"
          }`}>
            <Avatar name={profile.full_name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color: isDark ? 'var(--foreground)' : 'var(--sidebar-text)' }}>
                {profile.full_name}
              </p>
              <p className="truncate text-xs capitalize" style={{ color: isDark ? 'var(--muted)' : 'var(--sidebar-muted)' }}>{role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] disabled:opacity-60 ${
              isDark
                ? "text-muted-strong hover:bg-surface-muted hover:text-foreground"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className={sidebarBase} style={{ color: isDark ? undefined : 'var(--sidebar-text)' }}>
        <div className={sidebarHeaderBase} style={isDark ? undefined : { borderColor: 'var(--border)', color: 'var(--sidebar-text)' }}>
          {brand}
        </div>
        {nav}
        <div className={sidebarFooterBase} style={isDark ? undefined : { borderColor: 'var(--border)' }}>
          <div className="relative" ref={desktopAccountRef}>
            <button
              type="button"
              onClick={openAccount}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-controls="account-menu-desktop"
              aria-label={`Account menu for ${profile.full_name}`}
              className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left shadow-[var(--glass-highlight)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-surface-muted ${
                isDark
                  ? "border-glass-border bg-surface-muted/60"
                  : "border-black/10 bg-black/5"
              }`}
            >
              <Avatar name={profile.full_name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium" style={{ color: isDark ? 'var(--foreground)' : 'var(--sidebar-text)' }}>
                  {profile.full_name}
                </span>
                <span className="block truncate text-xs capitalize" style={{ color: isDark ? 'var(--muted)' : 'var(--sidebar-muted)' }}>
                  {role}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-[var(--duration-normal)] ease-[var(--ease-standard)] ${
                  accountOpen ? "rotate-180" : ""
                }`}
                strokeWidth={1.75}
                style={{ color: isDark ? 'var(--muted)' : 'var(--sidebar-muted)' }}
                aria-hidden="true"
              />
            </button>

            {accountOpen && (
              <div
                ref={desktopPanelRef}
                id="account-menu-desktop"
                role="menu"
                aria-label="Account menu"
                tabIndex={-1}
                onKeyDown={handleAccountMenuKeyDown}
                className={`absolute bottom-full left-0 z-50 mb-2 max-h-[min(26rem,calc(100vh-4rem))] w-60 overflow-y-auto rounded-xl p-1.5 shadow-[var(--shadow-popover)] ${
                  isDark
                    ? "border border-white/10 bg-[#202020]"
                    : "border border-black/10 bg-white"
                }`}
              >
                {accountMenuBody}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
