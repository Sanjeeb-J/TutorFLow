import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`card flex flex-col items-center px-6 py-12 text-center ${className}`}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-surface-muted/70">
          <Icon className="h-5 w-5 text-muted" strokeWidth={1.75} aria-hidden="true" />
        </div>
      )}
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
