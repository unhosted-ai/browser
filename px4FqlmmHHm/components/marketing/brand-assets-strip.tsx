"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"

const assets = [
  { label: "Thumbnails", href: "/brand-assets" },
  { label: "OG Image", href: "/brand-assets" },
  { label: "Apple Touch Icon", href: "/brand-assets" },
  { label: "Favicon", href: "/brand-assets" },
]

export function BrandAssetsStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {assets.map((asset) => (
        <Link key={asset.label} href={asset.href}>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground hover:bg-accent transition-colors cursor-pointer">
            {asset.label}
          </Badge>
        </Link>
      ))}
      <Link
        href="/brand-assets"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-2"
      >
        View All →
      </Link>
    </div>
  )
}
