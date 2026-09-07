/**
 * Skeleton loading bar. Presentational only (server-safe).
 * Matches the pulse bars previously hand-written in components:
 * animate-pulse, rounded, surface-muted fill. Size via className
 * (e.g. "h-3 w-2/3").
 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-surface-muted ${className}`} />;
}
