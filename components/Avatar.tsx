/**
 * Initials avatar. Pure presentational (server-safe).
 *
 * Sizes map to the exact combinations previously scattered through the
 * app:
 *   xs — tiny, solid accent, round   (mobile top bar)
 *   sm — small, solid accent, round  (sidebar footer)
 *   md — medium, soft accent, rounded-lg   (roster rows, session context)
 *   lg — large, soft accent, rounded-xl    (student detail header)
 */

const SIZE_STYLES = {
  xs: { box: "h-7 w-7", text: "text-[10px]", radius: "rounded-full", tone: "solid" },
  sm: { box: "h-8 w-8", text: "text-xs", radius: "rounded-full", tone: "solid" },
  md: { box: "h-10 w-10", text: "text-sm", radius: "rounded-lg", tone: "soft" },
  lg: { box: "h-14 w-14", text: "text-lg", radius: "rounded-xl", tone: "soft" },
} as const;

const TONE_STYLES = {
  solid: "bg-accent text-[var(--on-accent)] font-semibold",
  soft: "bg-accent-light text-accent-strong font-semibold",
} as const;

export type AvatarSize = keyof typeof SIZE_STYLES;

/** "Rahul Kumar" -> "RK" (first two name parts, uppercased). */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Avatar({
  name,
  size = "sm",
  className = "",
  label,
}: {
  name: string;
  size?: AvatarSize;
  className?: string;
  /** When provided, the avatar is exposed to assistive tech with this label. */
  label?: string;
}) {
  const s = SIZE_STYLES[size];
  return (
    <span
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={`flex shrink-0 items-center justify-center ${s.box} ${s.radius} ${TONE_STYLES[s.tone]} ${s.text} ${className}`}
    >
      {getInitials(name)}
    </span>
  );
}
