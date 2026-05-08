import Link from "next/link"
import { CaseStudyCard } from "@/components/delta/case-study-card"
import { Confidence } from "@/components/delta/confidence"
import { FEATURED } from "@/lib/delta-data"

export default function DeltaHome() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
      {/* HERO ─────────────────────────────────────────── */}
      <section className="grid grid-cols-4 md:grid-cols-12 gap-x-6 pt-24 md:pt-40 pb-24 md:pb-40">
        <div className="col-span-4 md:col-span-9">
          <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3 mb-8">
            Principal · AI/UX · 2014—Present
          </p>
          <h1 className="font-serif italic text-[44px] md:text-[80px] leading-[1.02] tracking-[-0.02em] text-delta-text max-w-[18ch]">
            A design practice for systems that aren&apos;t&nbsp;sure.
          </h1>
          <p className="mt-10 text-[18px] leading-[1.65] text-delta-text-2 max-w-[58ch]">
            Delta Practice helps teams ship AI products that are honest about
            what they know — interfaces with confidence, decision logs, and
            reversibility built in from the first sketch.
          </p>
          <div className="mt-10">
            <Confidence
              value={0.91}
              label="Practice direction"
              shineOnEnter
            />
          </div>
        </div>
      </section>

      {/* FEATURED WORK ────────────────────────────────── */}
      <section className="pb-24">
        <header className="flex items-baseline justify-between mb-2">
          <h2 className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3">
            Selected work
          </h2>
          <Link
            href="/delta-practice/work"
            className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-2 hover:text-signal transition-colors duration-150 ease-delta-snap"
          >
            All projects →
          </Link>
        </header>
        <div>
          {FEATURED.map((c) => (
            <CaseStudyCard key={c.slug} data={c} />
          ))}
          <div className="border-t border-delta-border" />
        </div>
      </section>

      {/* ABOUT BLURB ──────────────────────────────────── */}
      <section className="grid grid-cols-4 md:grid-cols-12 gap-x-6 py-24 border-t border-delta-border">
        <div className="col-span-4 md:col-span-3">
          <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3">
            About the practice
          </p>
        </div>
        <div className="col-span-4 md:col-span-7">
          <p className="font-serif italic text-[26px] md:text-[32px] leading-[1.3] tracking-[-0.01em] text-delta-text mb-6">
            I&apos;ve spent a decade designing software that uses
            machine&nbsp;learning, and the last four leading the&nbsp;design of
            it.
          </p>
          <p className="text-[16px] leading-[1.7] text-delta-text-2 max-w-[58ch] mb-8">
            Delta Practice is a one-person studio — engagements are scoped to
            principal-level design work on AI-shaped products: probabilistic
            interfaces, evaluation surfaces, decision support, copilots, and the
            quieter scaffolding (prompt tooling, eval ops) that keeps these
            products honest.
          </p>
          <Link
            href="/delta-practice/about"
            className="inline-block font-mono text-[12px] tracking-[0.12em] uppercase text-signal hover:text-delta-text transition-colors duration-150 ease-delta-snap"
          >
            Read the long version →
          </Link>
        </div>
      </section>
    </div>
  )
}
