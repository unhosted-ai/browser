import { notFound } from "next/navigation"
import { Confidence } from "@/components/delta/confidence"
import { DecisionLog } from "@/components/delta/decision-log"
import { FEATURED, SAMPLE_LOG } from "@/lib/delta-data"

export function generateStaticParams() {
  return FEATURED.map((c) => ({ slug: c.slug }))
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = FEATURED.find((c) => c.slug === slug)
  if (!data) notFound()

  return (
    <article>
      {/* COVER ──────────────────────────────────────── */}
      <section className="border-b border-delta-border">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 pt-24 md:pt-32 pb-24 grid grid-cols-4 md:grid-cols-12 gap-x-6">
          <div className="col-span-4 md:col-span-9">
            <div className="flex flex-wrap gap-x-6 gap-y-1 mb-10 font-mono text-[11px] tracking-[0.12em] uppercase text-delta-text-3">
              <span className="tabular-nums">{data.year}</span>
              <span>{data.role}</span>
              {data.client && <span>{data.client}</span>}
              <span>Case study · {slug}</span>
            </div>
            <h1 className="font-serif italic text-[44px] md:text-[80px] leading-[1.02] tracking-[-0.02em] text-delta-text mb-10 max-w-[20ch]">
              {data.project}
            </h1>
            <p className="text-[20px] leading-[1.5] text-delta-text-2 max-w-[58ch]">
              {data.outcome}
            </p>
          </div>
          <aside className="col-span-4 md:col-span-3 md:col-start-10 mt-10 md:mt-0 space-y-8">
            {data.metric && (
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-delta-text-3 mb-2">
                  {data.metric.label}
                </p>
                <p className="font-serif italic text-[40px] leading-none text-signal tabular-nums">
                  {data.metric.value}
                </p>
              </div>
            )}
            <Confidence value={data.confidence} label="Outcome certainty" />
          </aside>
        </div>
      </section>

      {/* CONTEXT ────────────────────────────────────── */}
      <section className="border-b border-delta-border">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 py-24 grid grid-cols-4 md:grid-cols-12 gap-x-6">
          <div className="col-span-4 md:col-span-3">
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3 sticky top-24">
              01 — Context
            </p>
          </div>
          <div className="col-span-4 md:col-span-6">
            <p className="font-serif italic text-[24px] md:text-[28px] leading-[1.35] tracking-[-0.005em] text-delta-text mb-8 max-w-[36ch]">
              The team had built a recall system that worked, and a UI that
              didn&apos;t admit it could be wrong.
            </p>
            <div className="space-y-5 text-[16px] leading-[1.75] text-delta-text-2 max-w-[640px]">
              <p>
                Engagement began six weeks after launch, with a backlog of
                support tickets framed as &ldquo;the search is broken.&rdquo;
                Investigation showed the ML side was performing close to spec —
                what was breaking was operator trust. The interface presented
                ranked results without a probability, which trained users to
                treat the top result as authoritative.
              </p>
              <p>
                The brief I accepted was narrower than the brief I delivered.
                The team wanted a sort filter; the system needed a different
                relationship to uncertainty.
              </p>
            </div>
          </div>
          <div className="col-span-4 md:col-span-3 mt-8 md:mt-0">
            <ul className="space-y-3 font-mono text-[12px] leading-[1.6] tracking-[0.04em] text-delta-text-3 border-l border-delta-border pl-4">
              <li>
                <span className="text-signal">N1.</span> Six operator interviews,
                week 1.
              </li>
              <li>
                <span className="text-signal">N2.</span> Recall@10 ≈ 0.82 — not
                the bottleneck.
              </li>
              <li>
                <span className="text-signal">N3.</span> Top-1 click-through
                ≈&nbsp;94%.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* DECISION LOG ───────────────────────────────── */}
      <section className="border-b border-delta-border">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 py-24 grid grid-cols-4 md:grid-cols-12 gap-x-6">
          <div className="col-span-4 md:col-span-3">
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3 sticky top-24">
              02 — Decision log
            </p>
          </div>
          <div className="col-span-4 md:col-span-8">
            <DecisionLog entries={SAMPLE_LOG} />
          </div>
        </div>
      </section>

      {/* OUTCOME + REFLECTION ──────────────────────── */}
      <section>
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 py-24 grid grid-cols-4 md:grid-cols-12 gap-x-6">
          <div className="col-span-4 md:col-span-3">
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3 sticky top-24">
              03 — Outcome
            </p>
          </div>
          <div className="col-span-4 md:col-span-8">
            <p className="font-serif italic text-[24px] md:text-[28px] leading-[1.35] tracking-[-0.005em] text-delta-text mb-10 max-w-[36ch]">
              The team didn&apos;t need a smarter model. They needed a UI that
              could say &ldquo;I don&apos;t&nbsp;know.&rdquo;
            </p>
            <div className="space-y-5 text-[16px] leading-[1.75] text-delta-text-2 max-w-[640px]">
              <p>
                Three months after the redesign, support tickets framed as
                &ldquo;broken search&rdquo; dropped 41%. The recall metric
                didn&apos;t change. What changed was the operator&apos;s
                relationship to ambiguity — they stopped treating absence of an
                answer as a failure of the tool.
              </p>
              <p>
                Reflection, with the benefit of a year: the confidence
                indicator was the smallest part of the change. The bigger
                shift was procedural — every decision in the redesign was
                logged with a probability the team would defend later. That
                discipline outlasted the engagement.
              </p>
            </div>
          </div>
        </div>
      </section>
    </article>
  )
}
