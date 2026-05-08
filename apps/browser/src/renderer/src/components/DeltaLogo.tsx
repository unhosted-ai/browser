// Delta brand mark — a clean equilateral triangle, signal-coloured.
// Sized via `size` (px); colour follows currentColor so callers can override.
type Props = { size?: number; className?: string }

export function DeltaLogo({ size = 14, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-label="Delta"
    >
      <path
        d="M7 1.5 L12.5 11.5 L1.5 11.5 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.18"
      />
    </svg>
  )
}
