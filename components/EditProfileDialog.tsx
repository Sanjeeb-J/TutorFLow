"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import Alert from "./Alert";
import Avatar from "./Avatar";

interface ProfileDetails {
  id: string;
  role: string;
  full_name: string;
  email: string | null;
}

/**
 * "Edit profile" dialog: shows the signed-in user's profile details
 * (name, role, email) and lets them update their full name.
 *
 * The trigger is a plain button so it can be styled as a header action
 * or as an account-menu item. The dialog itself is portaled to
 * document.body so it stays viewport-anchored even when opened from a
 * glass/backdrop-filtered surface (which would otherwise become the
 * containing block for position:fixed).
 */
export default function EditProfileDialog({
  initialName,
  role,
  triggerClassName = "",
  triggerLabel = "Edit profile",
  triggerRole,
  onOpen,
}: {
  initialName: string;
  role: string;
  triggerClassName?: string;
  triggerLabel?: string;
  /** Set to "menuitem" when the trigger lives inside a role="menu" panel. */
  triggerRole?: "menuitem";
  /** Called when the trigger opens the dialog (e.g. close an open menu). */
  onOpen?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [name, setName] = useState(initialName);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  const openDialog = useCallback(() => {
    onOpen?.();
    setError("");
    setSaved(false);
    setLoadingDetails(true);
    setDetails(null);
    setOpen(true);
    // Remember what to return focus to when the dialog closes.
    returnFocusRef.current = document.activeElement as HTMLElement | null;
  }, [onOpen]);

  const closeDialog = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(false);
    returnFocusRef.current?.focus();
  }, []);

  // Load fresh details (including email) whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((data: { profile: ProfileDetails }) => {
        if (cancelled) return;
        setDetails(data.profile);
        setName(data.profile.full_name);
        setLoadingDetails(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to the passed-in data so the dialog still works offline.
        setDetails({
          id: "",
          role,
          full_name: initialName,
          email: null,
        });
        setLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, initialName, role]);

  // Focus the name field when the dialog opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeDialog]);

  // Prevent page scrolling while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save changes.");
        setSaving(false);
        return;
      }
      setDetails((d) => (d ? { ...d, full_name: trimmed } : d));
      setSaving(false);
      setSaved(true);
      // Re-render server components so the sidebar/dashboard name updates.
      router.refresh();
      closeTimerRef.current = setTimeout(closeDialog, 900);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        role={triggerRole}
        onClick={openDialog}
        className={`inline-flex items-center gap-2 ${triggerClassName}`}
      >
        <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        {triggerLabel}
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            onClick={closeDialog}
          >
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-profile-title"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-surface-popover shadow-[var(--shadow-dialog)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2
                  id="edit-profile-title"
                  className="text-base font-semibold tracking-tight text-foreground"
                >
                  Edit profile
                </h2>
                <button
                  type="button"
                  onClick={closeDialog}
                  aria-label="Close"
                  className="rounded-md p-1.5 text-muted-strong transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-surface-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                {loadingDetails ? (
                  <p className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Loading profile…
                  </p>
                ) : (
                  details && (
                    <div className="flex items-center gap-3 rounded-xl bg-surface-muted/60 px-3 py-3">
                      <Avatar name={details.full_name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {details.full_name}
                        </p>
                        <p className="truncate text-xs capitalize text-muted">{details.role}</p>
                        {details.email && (
                          <p className="truncate text-xs text-muted">{details.email}</p>
                        )}
                      </div>
                    </div>
                  )
                )}

                <form onSubmit={handleSave} className="mt-4 space-y-4" noValidate>
                  {error && <Alert>{error}</Alert>}

                  <div className="field">
                    <label htmlFor="profile-name" className="label">
                      Full name
                    </label>
                    <input
                      id="profile-name"
                      ref={inputRef}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input"
                      placeholder="Your name"
                      autoComplete="name"
                      maxLength={80}
                    />
                  </div>

                  <div className="flex justify-end gap-2.5">
                    <button type="button" onClick={closeDialog} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || saved}
                      className="btn btn-primary min-w-28"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          Saving…
                        </>
                      ) : saved ? (
                        <>
                          <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                          Saved
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}