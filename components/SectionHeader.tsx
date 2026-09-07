/**
 * Section heading row. Server-safe.
 *
 * Two visual patterns, matched to what pages already repeated:
 *  - count mode (count !== undefined): small title + count chip,
 *    e.g. the Upcoming/Past headers on session list pages.
 *  - default mode: base/section-kicker title with optional description
 *    on the left and an action (e.g. "View all") on the right.
 *
 * `id` is passed through so sections can keep aria-labelledby wiring.
 */
export default function SectionHeader({
  id,
  title,
  kicker = false,
  description,
  count,
  action,
  className = "",
}: {
  id?: string;
  title: React.ReactNode;
  /** Render the title as an uppercase section kicker. */
  kicker?: boolean;
  description?: React.ReactNode;
  /** When provided, renders the small-title + count-chip pattern. */
  count?: number;
  action?: React.ReactNode;
  className?: string;
}) {
  if (count !== undefined) {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <h2 id={id} className="text-sm font-semibold text-foreground">
          {title}
        </h2>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-strong">
          {count}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2
          id={id}
          className={kicker ? "section-kicker" : "text-base font-semibold text-foreground"}
        >
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
