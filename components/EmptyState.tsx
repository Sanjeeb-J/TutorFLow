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
      className={`card flex flex-col items-center px-6 py-10 text-center ${className}`}
    >
      {Icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted">
          <Icon className="h-5 w-5 text-muted" strokeWidth={1.75} aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
