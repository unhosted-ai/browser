"use client"

import { ThumbnailVariant } from "./thumbnail-variant"

export function ThumbnailVC() {
  return (
    <ThumbnailVariant
      words="Gateway"
      floatingElements={[
        // Behind text - settings panel excerpt
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-4 shadow-lg w-[240px]">
              <p className="text-foreground/70 text-xs font-medium mb-3">Configuration</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-foreground/50 text-[10px]">Temperature</span>
                    <span className="text-foreground/70 text-[10px] font-mono">0.7</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full">
                    <div className="w-[70%] h-full bg-foreground/30 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-foreground/50 text-[10px]">Max Tokens</span>
                    <span className="text-foreground/70 text-[10px] font-mono">4096</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-md px-1.5 flex items-center">
                    <span className="text-foreground/40 text-[8px]">4096</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-foreground/50 text-[10px]">Top P</span>
                    <span className="text-foreground/70 text-[10px] font-mono">0.9</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full">
                    <div className="w-[90%] h-full bg-foreground/30 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ),
          className: "top-[50px] left-[40px] rotate-[-1.5deg] z-0 opacity-40",
        },
        // Behind text - another settings block
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-4 shadow-lg w-[220px]">
              <p className="text-foreground/70 text-xs font-medium mb-3">Routing</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-foreground/50 text-[10px]">Fallback</span>
                  <div className="w-8 h-4 bg-emerald-500/30 rounded-full flex items-center justify-end px-0.5">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/50 text-[10px]">Load Balance</span>
                  <div className="w-8 h-4 bg-muted rounded-full flex items-center px-0.5">
                    <div className="w-3 h-3 bg-foreground/30 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/50 text-[10px]">Caching</span>
                  <div className="w-8 h-4 bg-emerald-500/30 rounded-full flex items-center justify-end px-0.5">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ),
          className: "bottom-[60px] right-[50px] rotate-[2deg] z-0 opacity-35",
        },
        // In front - streaming dots
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-foreground/60 text-xs">Streaming</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/20 animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          ),
          className: "top-[70px] right-[140px] rotate-[1deg] z-20 opacity-90",
        },
        // In front - layers icon
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-foreground/70"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
          ),
          className: "bottom-[130px] left-[80px] rotate-[-3deg] z-20 opacity-85",
        },
        // In front - API endpoint badge
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-2.5 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                  POST
                </span>
                <span className="text-foreground/60 text-[10px] font-mono">/api/chat</span>
              </div>
            </div>
          ),
          className: "top-[180px] right-[60px] rotate-[-1deg] z-20 opacity-80",
        },
        // Behind - latency card
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg w-[160px]">
              <p className="text-foreground/50 text-[10px] mb-1">Avg. Latency</p>
              <p className="text-foreground/80 text-lg font-mono font-bold">124ms</p>
              <p className="text-emerald-400/60 text-[9px]">-12% from last hour</p>
            </div>
          ),
          className: "bottom-[40px] left-[160px] rotate-[1.5deg] z-0 opacity-40",
        },
        // In front - request counter
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-2.5 shadow-lg">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-foreground/60 text-[10px] font-mono">2,847 req/min</span>
              </div>
            </div>
          ),
          className: "top-[40px] left-[240px] rotate-[2deg] z-20 opacity-75",
        },
      ]}
    />
  )
}
