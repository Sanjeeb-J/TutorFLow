import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Page header: optional back link, eyebrow, title, subtitle, and a row
 * of actions on the right. Server-safe.
 *
 * Renders the same structure the pages previously repeated by hand:
 *   - back link (when backHref is provided), followed by the header row
 *   - header row: title/subtitle on the left, actions on the right
 */
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  backHref,
  backLabel = "Back",
  className = "",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-strong transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          {backLabel}
        </Link>
      )}

      <div
        className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${
          backHref ? "mt-4" : ""
        } ${className}`}
      >
        <div className="min-w-0">
          {eyebrow && <p className="section-kicker mb-1.5">{eyebrow}</p>}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}
