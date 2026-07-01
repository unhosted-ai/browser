// Unhosted mark — three concentric circles (dashed swarm · solid trusted ·
// filled you). Mirrors brand/logo.svg and the canonical unhosted-core mark;
// per BRAND.md the mark is not altered — the browser product is carried by the
// wordmark, not the mark. Colour follows currentColor so callers can override.
type Props = { size?: number; className?: string }

export function UnhostedMark({ size = 14, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={7}
      className={className}
      aria-label="Unhosted"
    >
      <circle cx="50" cy="50" r="44" strokeDasharray="2 6" />
      <circle cx="50" cy="50" r="28" />
      <circle cx="50" cy="50" r="12" fill="currentColor" stroke="none" />
    </svg>
  )
}
