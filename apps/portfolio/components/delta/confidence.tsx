"use client"

import { cn } from "@/lib/utils"

export type ConfidenceProps = {
  value: number
  label?: string
  cells?: number
  className?: string
  shineOnEnter?: boolean
}

export function Confidence({
  value,
  label = "Confidence",
  cells = 12,
  className,
  shineOnEnter = false,
}: ConfidenceProps) {
  const clamped = Math.max(0, Math.min(1, value))
  const filled = Math.round(clamped * cells)
  const tier =
    clamped >= 0.75 ? "high" : clamped >= 0.45 ? "med" : "low"
  const tierLabel = tier === "high" ? "HIGH" : tier === "med" ? "MED" : "LOW"

  return (
    <div className={cn("inline-flex flex-col gap-1.5 select-none", className)}>
      <div className="flex items-baseline gap-3 font-mono text-[11px] tracking-[0.12em] uppercase leading-none">
        <span className="text-delta-text-3">{label}</span>
        <span className="text-signal tabular-nums">
          p={clamped.toFixed(2)}
        </span>
        <span className="text-delta-text-2">{tierLabel}</span>
      </div>
      <div
        className={cn(
          "flex gap-[2px]",
          tier === "high" && shineOnEnter && "delta-shine-once"
        )}
        data-tier={tier}
        role="meter"
        aria-label={`${label} ${tierLabel}, probability ${clamped.toFixed(2)}`}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={1}
      >
        {Array.from({ length: cells }).map((_, i) => {
          const isOn = i < filled
          const wavering = tier === "low" && isOn
          return (
            <span
              key={i}
              className={cn(
                "h-[6px] w-3 transition-[background-color,opacity] duration-300 ease-delta-settled",
                isOn
                  ? tier === "low"
                    ? "bg-signal-dim"
                    : "bg-signal"
                  : "bg-signal-trace",
                wavering && "delta-waver"
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            />
          )
        })}
      </div>
    </div>
  )
}
