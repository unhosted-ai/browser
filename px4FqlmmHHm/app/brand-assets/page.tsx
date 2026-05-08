"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { ThumbnailVA } from "@/components/marketing/thumbnail-v-a"
import { ThumbnailVB } from "@/components/marketing/thumbnail-v-b"
import { ThumbnailVC } from "@/components/marketing/thumbnail-v-c"
import { ThumbnailVD } from "@/components/marketing/thumbnail-v-d"
import { OGImage } from "@/components/marketing/og-image"
import { AppleTouchIcon } from "@/components/marketing/apple-touch-icon"
import { FaviconIcon } from "@/components/marketing/favicon-icon"

const thumbnails = [
  { key: "a", label: "AI Chat" },
  { key: "b", label: "Multi-Model" },
  { key: "c", label: "Gateway" },
  { key: "d", label: "Ship Fast" },
]

export default function BrandAssetsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header breadcrumb="Brand Assets" />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-6xl px-4 lg:px-6 space-y-16">

          {/* Thumbnails */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-2">Thumbnails</h2>
            <p className="text-sm text-muted-foreground mb-6">Marketing thumbnails — 1200×630</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {thumbnails.map((t) => (
                <div key={t.key} className="space-y-2">
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="relative overflow-hidden" style={{ aspectRatio: "1200/630" }}>
                      <div className="origin-top-left absolute top-0 left-0" style={{ transform: "scale(0.45)", width: "1200px", height: "630px" }}>
                        {t.key === "a" && <ThumbnailVA />}
                        {t.key === "b" && <ThumbnailVB />}
                        {t.key === "c" && <ThumbnailVC />}
                        {t.key === "d" && <ThumbnailVD />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{t.label}</span>
                    <Link href={`/thumbnail?v=${t.key}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Open full-size →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* OG Image */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-2">OpenGraph (OG) Image</h2>
            <p className="text-sm text-muted-foreground mb-6">Social sharing preview — 1200×630</p>
            <div className="space-y-2">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="relative overflow-hidden" style={{ aspectRatio: "1200/630" }}>
                  <div className="origin-top-left absolute top-0 left-0" style={{ transform: "scale(0.45)", width: "1200px", height: "630px" }}>
                    <OGImage />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Link href="/og-preview" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Open full-size →
                </Link>
              </div>
            </div>
          </section>

          {/* Icons */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-2">App Icons</h2>
            <p className="text-sm text-muted-foreground mb-6">Favicon and Apple Touch Icon</p>
            <div className="flex flex-wrap gap-12 items-end">
              <div className="space-y-3">
                <AppleTouchIcon />
                <p className="text-xs text-muted-foreground">Apple Touch Icon — 180×180</p>
              </div>
              <div className="space-y-3">
                <FaviconIcon size={32} />
                <p className="text-xs text-muted-foreground">Favicon — 32×32</p>
              </div>
              <div className="space-y-3">
                <FaviconIcon size={16} />
                <p className="text-xs text-muted-foreground">Favicon — 16×16</p>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
