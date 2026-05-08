import { Confidence } from "./confidence"

export type DecisionEntry = {
  ts: string
  kind: "decision" | "discard" | "reverse" | "observe"
  title: string
  rationale: string
  confidence: number
}

const KIND_LABEL: Record<DecisionEntry["kind"], string> = {
  decision: "DECIDED",
  discard:  "DISCARDED",
  reverse:  "REVERSED",
  observe:  "OBSERVED",
}

export function DecisionLog({ entries }: { entries: DecisionEntry[] }) {
  return (
    <ol className="border-l border-delta-border pl-6 space-y-12">
      {entries.map((e, i) => (
        <li key={i} className="relative">
          <span
            aria-hidden
            className="absolute -left-[27px] top-2 h-1.5 w-1.5 rounded-full bg-signal"
          />
          <div className="flex flex-wrap items-baseline gap-x-4 mb-2 font-mono text-[11px] tracking-[0.12em] uppercase text-delta-text-3">
            <time dateTime={e.ts} className="tabular-nums">
              {e.ts}
            </time>
            <span className="text-delta-text-2">{KIND_LABEL[e.kind]}</span>
          </div>
          <h4 className="font-serif italic text-[22px] leading-[1.25] tracking-[-0.005em] text-delta-text mb-3 max-w-[40ch]">
            {e.title}
          </h4>
          <p className="text-[15px] leading-[1.65] text-delta-text-2 max-w-[60ch] mb-4">
            {e.rationale}
          </p>
          <Confidence value={e.confidence} label="At time of decision" />
        </li>
      ))}
    </ol>
  )
}
