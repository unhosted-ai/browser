import type { Safety } from "../lib/safety"

// Color recipes per category. Each maps to a (text, bg, ring) triple expressed
// as Tailwind arbitrary values keyed off the theme — uses HSL so the same
// recipe reads on both light and dark canvases.
const COLORS: Record<
  Safety["kind"],
  { text: string; bg: string; ring: string }
> = {
  government: {
    text: "text-[hsl(212_75%_55%)] dark:text-[hsl(212_85%_72%)]",
    bg:   "bg-[hsl(212_70%_55%/0.10)] dark:bg-[hsl(212_70%_60%/0.14)]",
    ring: "ring-[hsl(212_70%_55%/0.25)] dark:ring-[hsl(212_70%_60%/0.30)]",
  },
  education: {
    text: "text-[hsl(180_45%_38%)] dark:text-[hsl(180_50%_70%)]",
    bg:   "bg-[hsl(180_45%_45%/0.10)] dark:bg-[hsl(180_45%_50%/0.14)]",
    ring: "ring-[hsl(180_45%_45%/0.25)] dark:ring-[hsl(180_45%_50%/0.28)]",
  },
  nonprofit: {
    text: "text-[hsl(268_45%_50%)] dark:text-[hsl(268_55%_78%)]",
    bg:   "bg-[hsl(268_45%_55%/0.10)] dark:bg-[hsl(268_45%_60%/0.14)]",
    ring: "ring-[hsl(268_45%_55%/0.25)] dark:ring-[hsl(268_45%_60%/0.28)]",
  },
  internal: {
    text: "text-signal",
    bg:   "bg-signal/10 dark:bg-signal/12",
    ring: "ring-signal/25 dark:ring-signal/28",
  },
  unsafe: {
    text: "text-[hsl(0_70%_45%)] dark:text-[hsl(0_75%_70%)]",
    bg:   "bg-[hsl(0_70%_55%/0.12)] dark:bg-[hsl(0_75%_60%/0.16)]",
    ring: "ring-[hsl(0_70%_55%/0.30)] dark:ring-[hsl(0_75%_60%/0.35)]",
  },
  general: {
    text: "text-chrome-text-3",
    bg:   "bg-chrome-border/40",
    ring: "ring-chrome-border",
  },
}

export function SafetyBadge({ safety }: { safety: Safety }) {
  const c = COLORS[safety.kind]
  return (
    <span
      title={safety.hint}
      className={[
        "inline-flex items-center justify-center shrink-0",
        "h-[18px] px-1.5 rounded-full",
        "text-[9px] tracking-[0.12em] font-mono font-medium uppercase",
        "ring-1 ring-inset",
        c.text, c.bg, c.ring,
      ].join(" ")}
      aria-label={`Safety classification: ${safety.label}`}
    >
      {safety.label}
    </span>
  )
}
