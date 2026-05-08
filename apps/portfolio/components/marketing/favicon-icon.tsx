"use client"

export function FaviconIcon({ size = 32 }: { size?: 16 | 32 }) {
  const iconSize = size === 32 ? 16 : 8
  return (
    <div className="bg-foreground flex items-center justify-center rounded-sm" style={{ width: size, height: size }}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" className="text-background">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
