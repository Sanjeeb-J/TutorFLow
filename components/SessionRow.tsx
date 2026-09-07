import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatDateLine, formatDateTile, formatTimeRange } from "@/lib/format";
import StatusBadge from "./StatusBadge";

export default function SessionRow({
  topic,
  subtitle,
  startAt,
  endAt,
  status,
  href,
}: {
  id: string;
  topic: string;
  subtitle?: string | null;
  startAt: string;
  endAt?: string | null;
  status: string;
  href: string;
}) {
  const { month, day, weekday } = formatDateTile(startAt);
  const time = formatTimeRange(startAt, endAt);
  const fullDate = formatDateLine(startAt);

  return (
    <Link
      href={href}
      className="card card-hover group flex items-center gap-4 px-4 py-3.5"
    >
      {/* Date tile (desktop/tablet) */}
      <div className="hidden w-14 shrink-0 flex-col items-center rounded-lg border border-border-subtle bg-surface-muted/70 py-1.5 sm:flex">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {month}
        </span>
        <span className="text-lg font-semibold tabular-nums leading-6 text-foreground">
          {day}
        </span>
        <span className="text-[10px] text-muted">{weekday}</span>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-foreground">{topic}</p>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
        )}
        <p className="mt-1 text-xs text-muted sm:hidden">
          {fullDate} · {time}
        </p>
      </div>

      {/* Status + time (desktop/tablet) */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={status} />
        <p className="hidden text-xs tabular-nums text-muted sm:block">{time}</p>
      </div>

      <ChevronRight
        className="hidden h-4 w-4 shrink-0 text-muted transition-transform duration-[var(--duration-fast)] ease-[var(--ease-standard)] group-hover:translate-x-0.5 md:block"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </Link>
  );
}
