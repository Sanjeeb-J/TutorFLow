import { Clock, Play, CheckCircle2, Sparkles } from "lucide-react";

export type SessionStatus = "scheduled" | "in_progress" | "completed" | "ai_reviewed";

const STATUS_META: Record<
  string,
  { label: string; icon: typeof Clock; chip: string; iconClass: string }
> = {
  scheduled: {
    label: "Scheduled",
    icon: Clock,
    chip: "border-warning/20 text-warning-strong bg-warning-light",
    iconClass: "text-warning",
  },
  in_progress: {
    label: "In progress",
    icon: Play,
    chip: "border-info/20 text-info-strong bg-info-light",
    iconClass: "text-info",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    chip: "border-success/20 text-success-strong bg-success-light",
    iconClass: "text-success",
  },
  ai_reviewed: {
    label: "AI reviewed",
    icon: Sparkles,
    chip: "border-ai/20 text-ai-strong bg-ai-light",
    iconClass: "text-ai",
  },
};

export function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status.replace(/_/g, " ");
}

export default function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? {
    label: statusLabel(status),
    icon: Clock,
    chip: "border-glass-border text-muted-strong bg-surface-muted",
    iconClass: "text-muted",
  };
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.chip} ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${meta.iconClass}`} strokeWidth={2} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
