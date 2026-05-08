const PRINCIPLES = [
  {
    n: "01",
    label: "Probabilistic, not deterministic",
    body: "AI products that hide uncertainty teach users to mistrust them later. Show the probability. Make 'I don't know' a first-class state.",
  },
  {
    n: "02",
    label: "Editorial over decorative",
    body: "Type and information hierarchy do the heavy lifting. Illustration is a last resort. If a layout works in plain HTML, it will survive every redesign.",
  },
  {
    n: "03",
    label: "Technical literacy, visible",
    body: "The interface should feel like it was made by people who understand the system underneath — monospace where data lives, restraint where motion would patronize.",
  },
  {
    n: "04",
    label: "Quiet confidence",
    body: "No gradients-as-personality. No glowing orbs, no neural-net wallpaper. The work should not need to perform 'AI' to be obviously about it.",
  },
]

const CLIENTS = [
  "Anvil",
  "Lattice",
  "North-Band",
  "Replit",
  "Stripe",
  "Vercel",
]

export default function DeltaAbout() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 lg:px-12 pt-24 md:pt-32 pb-24">
      {/* BIO ──────────────────────────────────────────── */}
      <section className="grid grid-cols-4 md:grid-cols-12 gap-x-6 mb-32">
        <div className="col-span-4 md:col-span-3">
          <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3">
            About
          </p>
        </div>
        <div className="col-span-4 md:col-span-7">
          <h1 className="font-serif italic text-[40px] md:text-[64px] leading-[1.05] tracking-[-0.015em] text-delta-text mb-12 max-w-[18ch]">
            A one-person practice, by intention.
          </h1>
          <div className="space-y-5 text-[18px] leading-[1.7] text-delta-text-2 max-w-[58ch]">
            <p>
              I&apos;ve spent a decade designing software that uses machine
              learning, and the last four leading the design of it — at
              consumer-scale companies, at enterprise scale, and (for the past
              two years) inside teams shipping language models into
              high-stakes&nbsp;workflows.
            </p>
            <p>
              Delta Practice exists because the work I find most interesting —
              probabilistic interfaces, evaluation surfaces, decision support —
              doesn&apos;t fit neatly into a permanent role. Engagements are
              short, principal-level, and tend to leave behind a system the
              in-house team can keep running.
            </p>
            <p>
              I work mostly remote, occasionally on-site, never on retainer.
            </p>
          </div>
        </div>
      </section>

      {/* PRINCIPLES ──────────────────────────────────── */}
      <section className="grid grid-cols-4 md:grid-cols-12 gap-x-6 mb-32 border-t border-delta-border pt-16">
        <div className="col-span-4 md:col-span-3">
          <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3 sticky top-24">
            Principles
          </p>
        </div>
        <ol className="col-span-4 md:col-span-8 space-y-12">
          {PRINCIPLES.map((p) => (
            <li key={p.n}>
              <div className="flex items-baseline gap-4 mb-3">
                <span className="font-mono text-[11px] tracking-[0.16em] text-signal">
                  {p.n}
                </span>
                <h3 className="font-serif italic text-[24px] leading-[1.25] tracking-[-0.005em] text-delta-text">
                  {p.label}
                </h3>
              </div>
              <p className="ml-10 text-[16px] leading-[1.7] text-delta-text-2 max-w-[58ch]">
                {p.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* CLIENTS ─────────────────────────────────────── */}
      <section className="grid grid-cols-4 md:grid-cols-12 gap-x-6 border-t border-delta-border pt-16">
        <div className="col-span-4 md:col-span-3">
          <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3">
            Selected clients
          </p>
        </div>
        <ul className="col-span-4 md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-y-3 font-mono text-[13px] tracking-[0.04em] text-delta-text">
          {CLIENTS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
