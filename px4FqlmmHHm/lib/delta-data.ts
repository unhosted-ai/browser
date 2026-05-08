import type { CaseStudy } from "@/components/delta/case-study-card"
import type { DecisionEntry } from "@/components/delta/decision-log"

export const FEATURED: CaseStudy[] = [
  {
    slug: "lattice-recall",
    project: "Designing recall under uncertainty",
    client: "Lattice",
    role: "Principal designer · AI",
    year: "2025",
    outcome:
      "Reframed search-as-retrieval to search-as-confidence: every result carries a probability, every empty state explains why nothing met the bar.",
    metric: { label: "Time-to-first-action", value: "−38%" },
    confidence: 0.84,
  },
  {
    slug: "anvil-decision",
    project: "Decision logs for high-stakes copilots",
    client: "Anvil",
    role: "Design lead · AI/UX",
    year: "2024",
    outcome:
      "Built a reversible, auditable trail for every model-driven action — operators can rewind, dissent, or annotate without leaving the canvas.",
    metric: { label: "Reversal rate", value: "12.4%" },
    confidence: 0.62,
  },
  {
    slug: "north-band-eval",
    project: "An evaluation surface non-engineers will actually use",
    client: "North-Band",
    role: "Staff designer",
    year: "2023",
    outcome:
      "Replaced spreadsheet-based prompt review with a side-by-side eval that PMs ran themselves; reduced engineering bottleneck without reducing rigor.",
    confidence: 0.41,
  },
]

export const SAMPLE_LOG: DecisionEntry[] = [
  {
    ts: "2025-02-11",
    kind: "decision",
    title: "Show probability, not a confidence label.",
    rationale:
      "Operators were collapsing 'High / Med / Low' into a binary ('safe / not'). The numeric P-value forced a more careful read. We kept the label as secondary scaffolding.",
    confidence: 0.78,
  },
  {
    ts: "2025-02-19",
    kind: "discard",
    title: "Drop the green checkmark on high-confidence items.",
    rationale:
      "Green read as 'verified' to users, which the model could not promise. Replaced with the same amber as the indicator track, kept the affordance.",
    confidence: 0.71,
  },
  {
    ts: "2025-03-04",
    kind: "reverse",
    title: "Re-add empty-state explanations that we cut for speed.",
    rationale:
      "Without an explanation, low-recall searches read as bugs. The latency cost (~120ms) was worth the 14pt drop in support tickets.",
    confidence: 0.55,
  },
  {
    ts: "2025-03-22",
    kind: "observe",
    title: "Operators trust an unsure system more than a wrong-confident one.",
    rationale:
      "Six interviews after launch; the strongest pattern in feedback was relief at being told when the system didn't know. Confidence-aware UI is positioned as honesty, not hedging.",
    confidence: 0.34,
  },
]
