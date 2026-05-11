// Delta brand mark — Δ with a small spark above the apex.
// Sized via `size` (px); colour follows currentColor so callers can override.
// Mirrors brand/icon-mark.svg: pure line-art, no fill, single stroke weight.
type Props = { size?: number; className?: string }

export function DeltaLogo({ size = 14, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-label="Delta"
    >
      <circle cx="8" cy="2.4" r="1.1" fill="currentColor" />
      <path
        d="M8 5 L13 13.5 L3 13.5 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
