import type { Metadata } from "next"
import { DeltaNav } from "@/components/delta/nav"
import { DeltaFooter } from "@/components/delta/footer"

export const metadata: Metadata = {
  title: { template: "%s · Delta Practice", default: "Delta Practice" },
  description:
    "A Principal-level AI/UX design practice. Confidence-aware interfaces for high-stakes work.",
}

const LAST_UPDATED = "2025-04-29"

export default function DeltaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-delta-bg text-delta-text font-sans antialiased">
      <DeltaNav />
      <main>{children}</main>
      <DeltaFooter lastUpdated={LAST_UPDATED} />
    </div>
  )
}
