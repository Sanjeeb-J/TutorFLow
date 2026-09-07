import { AlertCircle, CheckCircle2, type LucideIcon } from "lucide-react";

const VARIANTS: Record<
  "error" | "success",
  { icon: LucideIcon; className: string; role: "alert" | "status" }
> = {
  error: { icon: AlertCircle, className: "alert-error", role: "alert" },
  success: { icon: CheckCircle2, className: "alert-success", role: "status" },
};

/**
 * Inline alert banner. Server-safe.
 * Preserves the existing `.alert` markup, role semantics, and layout —
 * only the repeated icon+markup boilerplate is centralized.
 */
export default function Alert({
  variant = "error",
  className = "",
  children,
}: {
  variant?: "error" | "success";
  className?: string;
  children: React.ReactNode;
}) {
  const v = VARIANTS[variant];
  const Icon = v.icon;
  return (
    <div className={`alert ${v.className} ${className}`} role={v.role}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
