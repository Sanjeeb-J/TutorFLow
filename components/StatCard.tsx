import type { LucideIcon } from "lucide-react";

/**
 * Dashboard metric card. Server-safe.
 * Icon + label row, large value, optional supporting text. The helper
 * line is always reserved so a grid of cards keeps even heights.
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  valueClassName,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  helper?: string;
  /** Override the value typography when a card needs a non-numeric value. */
  valueClassName?: string;
  className?: string;
}) {
  const valueClasses =
    valueClassName ??
    "mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground";

  return (
    <div className={`card glass-card card-hover overflow-hidden p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/15 bg-accent-light text-accent shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08)]">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </span>
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
      </div>
      <p className={valueClasses}>{value}</p>
      {helper ? (
        <p className="mt-1 text-xs text-muted">{helper}</p>
      ) : (
        <div className="mt-1 h-4" aria-hidden="true" />
      )}
    </div>
  );
}
