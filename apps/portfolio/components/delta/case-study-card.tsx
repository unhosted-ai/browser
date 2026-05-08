import Link from "next/link"
import { Confidence } from "./confidence"

export type CaseStudy = {
  slug: string
  project: string
  client?: string
  role: string
  year: string
  outcome: string
  metric?: { label: string; value: string }
  confidence: number
}

export function CaseStudyCard({ data }: { data: CaseStudy }) {
  return (
    <Link
      href={`/delta-practice/work/${data.slug}`}
      className="
        group block border-t border-delta-border py-10
        transition-colors duration-200 ease-delta-settled
        hover:bg-delta-surface/40
      "
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-5 font-mono text-[11px] tracking-[0.12em] uppercase text-delta-text-3">
        <span className="tabular-nums">{data.year}</span>
        <span>{data.role}</span>
        {data.client && <span>{data.client}</span>}
        {data.metric && (
          <span className="text-delta-text-2">
            {data.metric.label}{" "}
            <span className="text-signal tabular-nums">
              {data.metric.value}
            </span>
          </span>
        )}
      </div>

      <h3 className="font-serif italic text-[34px] md:text-[44px] leading-[1.1] tracking-[-0.015em] text-delta-text mb-3 max-w-[20ch]">
        {data.project}
      </h3>

      <p className="text-[16px] leading-[1.6] text-delta-text-2 max-w-[55ch] mb-6">
        {data.outcome}
      </p>

      <Confidence value={data.confidence} label="Outcome certainty" />
    </Link>
  )
}
