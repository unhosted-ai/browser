import { CaseStudyCard } from "@/components/delta/case-study-card"
import { FEATURED } from "@/lib/delta-data"

export default function DeltaWork() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 lg:px-12 pt-24 md:pt-32 pb-24">
      <header className="grid grid-cols-4 md:grid-cols-12 gap-x-6 mb-16">
        <div className="col-span-4 md:col-span-9">
          <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3 mb-6">
            Index · 2018—2025
          </p>
          <h1 className="font-serif italic text-[40px] md:text-[64px] leading-[1.05] tracking-[-0.015em] text-delta-text">
            Selected work, in chronological reverse.
          </h1>
        </div>
      </header>
      <div>
        {FEATURED.map((c) => (
          <CaseStudyCard key={c.slug} data={c} />
        ))}
        <div className="border-t border-delta-border" />
      </div>
    </div>
  )
}
