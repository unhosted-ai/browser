"use client"

import { ThumbnailVariant } from "./thumbnail-variant"

export function ThumbnailVA() {
  return (
    <ThumbnailVariant
      words="AI Chat"
      floatingElements={[
        // Behind text - chat bubbles
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg w-[220px]">
              <p className="text-foreground/80 text-sm">How do I deploy a Next.js app?</p>
            </div>
          ),
          className: "top-[80px] left-[60px] rotate-[-2deg] z-0 opacity-40",
        },
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg w-[260px]">
              <p className="text-foreground/80 text-sm">
                You can deploy with Vercel, Docker, or any Node.js host...
              </p>
            </div>
          ),
          className: "top-[160px] right-[80px] rotate-[1deg] z-0 opacity-35",
        },
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg w-[200px]">
              <p className="text-foreground/80 text-sm">Explain streaming responses</p>
            </div>
          ),
          className: "bottom-[120px] left-[100px] rotate-[2deg] z-0 opacity-30",
        },
        // In front - model chips
        {
          content: (
            <div className="bg-card border border-border rounded-full px-3 py-1.5 shadow-lg">
              <span className="text-foreground text-xs font-medium">Claude Opus 4.6</span>
            </div>
          ),
          className: "top-[60px] right-[180px] rotate-[3deg] z-20 opacity-90",
        },
        {
          content: (
            <div className="bg-card border border-border rounded-full px-3 py-1.5 shadow-lg">
              <span className="text-foreground text-xs font-medium">GPT-4o</span>
            </div>
          ),
          className: "bottom-[80px] right-[120px] rotate-[-1deg] z-20 opacity-85",
        },
        {
          content: (
            <div className="bg-card border border-border rounded-full px-3 py-1.5 shadow-lg">
              <span className="text-foreground text-xs font-medium">Gemini Pro</span>
            </div>
          ),
          className: "top-[140px] left-[200px] rotate-[-3deg] z-20 opacity-80",
        },
        // Behind - another chat bubble
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg w-[240px]">
              <p className="text-foreground/80 text-sm">
                Write a function that fetches data from an API
              </p>
            </div>
          ),
          className: "bottom-[60px] right-[200px] rotate-[1.5deg] z-0 opacity-40",
        },
        // In front - chat bubble
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg w-[180px]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-foreground/60 text-xs">Streaming</span>
              </div>
              <p className="text-foreground/90 text-sm">Sure! Here&apos;s an async...</p>
            </div>
          ),
          className: "bottom-[140px] left-[40px] rotate-[-1.5deg] z-20 opacity-95",
        },
      ]}
    />
  )
}
