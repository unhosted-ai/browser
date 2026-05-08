"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { HeroCarousel } from "@/components/marketing/hero-carousel"
import { FeatureCards } from "@/components/marketing/feature-cards"
import { TechStack } from "@/components/marketing/tech-stack"
import { ExploreCards } from "@/components/marketing/explore-cards"
import { FeatureTicker } from "@/components/marketing/feature-ticker"
import { BrandAssetsStrip } from "@/components/marketing/brand-assets-strip"

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <FeatureTicker />

        {/* Hero */}
        <section className="pt-6 pb-12 lg:pt-8 lg:pb-16">
          <div className="mx-auto max-w-6xl px-4 lg:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1 text-xs bg-secondary text-secondary-foreground">
                    AI SDK 6
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1 text-xs bg-secondary text-secondary-foreground">
                    Claude Opus 4.6 by default
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Production-ready chatbot with Opus 4.6 out of the box. Switch models on the Vercel AI Gateway with zero config.
                </p>
              </div>
              <Button size="sm" asChild className="shrink-0">
                <Link href="/chat">Open Chat</Link>
              </Button>
            </div>

            <HeroCarousel />
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 lg:px-6">
            <div className="flex flex-col gap-4 mb-12 text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground text-balance">
                Everything you need to ship an AI chat app
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From streaming to model switching, this starter covers the full stack so you can focus on your product.
              </p>
            </div>
            <FeatureCards />
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-16 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 lg:px-6">
            <div className="flex flex-col gap-4 mb-10 text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground text-balance">
                Built on proven foundations
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Modern stack, minimal footprint, maximum flexibility.
              </p>
            </div>
            <TechStack />
          </div>
        </section>

        {/* Brand Assets */}
        <section className="py-16 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 lg:px-6">
            <div className="flex flex-col gap-4 mb-10 text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground text-balance">
                Brand assets
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Ready-made thumbnails, OG images, and app icons.
              </p>
            </div>
            <BrandAssetsStrip />
          </div>
        </section>

        {/* Explore */}
        <section className="py-16 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 lg:px-6">
            <div className="flex flex-col gap-4 mb-12 text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground text-balance">
                Get started
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Try the live demo, explore the code, or deploy your own instance.
              </p>
            </div>
            <ExploreCards />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-5 w-5 rounded bg-foreground flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-background">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span>AI Gateway Starter</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="https://sdk.vercel.ai" target="_blank" className="hover:text-foreground transition-colors">
              AI SDK Docs
            </Link>
            <Link href="https://vercel.com" target="_blank" className="hover:text-foreground transition-colors">
              Vercel
            </Link>
            <Link href="https://github.com/vercel/ai" target="_blank" className="hover:text-foreground transition-colors">
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
