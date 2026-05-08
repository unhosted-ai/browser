"use client"

import { ThumbnailVariant } from "./thumbnail-variant"

export function ThumbnailVD() {
  return (
    <ThumbnailVariant
      words="Ship Fast"
      floatingElements={[
        // Behind text - tech stack pills scattered
        {
          content: (
            <div className="bg-card border border-border rounded-full px-3 py-1.5 shadow-lg">
              <span className="text-foreground/80 text-xs font-medium">Next.js</span>
            </div>
          ),
          className: "top-[70px] left-[100px] rotate-[-3deg] z-0 opacity-45",
        },
        {
          content: (
            <div className="bg-card border border-border rounded-full px-3 py-1.5 shadow-lg">
              <span className="text-foreground/80 text-xs font-medium">React</span>
            </div>
          ),
          className: "top-[50px] right-[200px] rotate-[2deg] z-0 opacity-40",
        },
        {
          content: (
            <div className="bg-card border border-border rounded-full px-3 py-1.5 shadow-lg">
              <span className="text-foreground/80 text-xs font-medium">TypeScript</span>
            </div>
          ),
          className: "bottom-[90px] left-[60px] rotate-[1deg] z-0 opacity-35",
        },
        {
          content: (
            <div className="bg-card border border-border rounded-full px-3 py-1.5 shadow-lg">
              <span className="text-foreground/80 text-xs font-medium">Tailwind</span>
            </div>
          ),
          className: "bottom-[60px] right-[150px] rotate-[-1.5deg] z-0 opacity-40",
        },
        // In front - tech pills with color accents
        {
          content: (
            <div className="bg-card border border-border rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-sky-500" />
              <span className="text-foreground text-xs font-medium">shadcn/ui</span>
            </div>
          ),
          className: "top-[120px] right-[100px] rotate-[3deg] z-20 opacity-90",
        },
        {
          content: (
            <div className="bg-card border border-border rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-foreground text-xs font-medium">AI SDK</span>
            </div>
          ),
          className: "bottom-[130px] left-[120px] rotate-[-2deg] z-20 opacity-85",
        },
        // In front - code snippet block
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg w-[260px] font-mono text-[10px]">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500/60" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                <div className="w-2 h-2 rounded-full bg-green-500/60" />
                <span className="text-foreground/30 text-[8px] ml-1">route.ts</span>
              </div>
              <div className="space-y-0.5">
                <p>
                  <span className="text-violet-400">import</span>
                  <span className="text-foreground/60"> {"{ streamText }"} </span>
                  <span className="text-violet-400">from</span>
                  <span className="text-emerald-400"> &apos;ai&apos;</span>
                </p>
                <p>
                  <span className="text-violet-400">import</span>
                  <span className="text-foreground/60"> {"{ openai }"} </span>
                  <span className="text-violet-400">from</span>
                  <span className="text-emerald-400"> &apos;@ai-sdk/openai&apos;</span>
                </p>
                <p className="text-foreground/20 mt-1">
                  {"// "}
                  <span className="text-foreground/30">stream AI responses</span>
                </p>
                <p>
                  <span className="text-sky-400">const</span>
                  <span className="text-foreground/60"> result </span>
                  <span className="text-sky-400">= await</span>
                  <span className="text-yellow-400"> streamText</span>
                  <span className="text-foreground/40">{"({"}</span>
                </p>
                <p>
                  <span className="text-foreground/40">{"  "}</span>
                  <span className="text-foreground/60">model: </span>
                  <span className="text-yellow-400">openai</span>
                  <span className="text-foreground/40">(</span>
                  <span className="text-emerald-400">&apos;gpt-4o&apos;</span>
                  <span className="text-foreground/40">),</span>
                </p>
              </div>
            </div>
          ),
          className: "top-[40px] left-[40px] rotate-[-1deg] z-20 opacity-90",
        },
        // In front - another code snippet
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg w-[220px] font-mono text-[10px]">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500/60" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                <div className="w-2 h-2 rounded-full bg-green-500/60" />
                <span className="text-foreground/30 text-[8px] ml-1">page.tsx</span>
              </div>
              <div className="space-y-0.5">
                <p>
                  <span className="text-sky-400">export default</span>
                  <span className="text-yellow-400"> function</span>
                  <span className="text-foreground/60"> Chat() {"{"}</span>
                </p>
                <p>
                  <span className="text-foreground/40">{"  "}</span>
                  <span className="text-sky-400">const</span>
                  <span className="text-foreground/40"> {"{ "}</span>
                  <span className="text-foreground/60">messages</span>
                  <span className="text-foreground/40">{" } ="}</span>
                </p>
                <p>
                  <span className="text-foreground/40">{"    "}</span>
                  <span className="text-yellow-400">useChat</span>
                  <span className="text-foreground/40">()</span>
                </p>
              </div>
            </div>
          ),
          className: "bottom-[40px] right-[60px] rotate-[1.5deg] z-20 opacity-85",
        },
        // Behind - deployment badge
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-2.5 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-foreground/60 text-[10px] font-medium">
                  Deployed to Production
                </span>
              </div>
            </div>
          ),
          className: "top-[200px] right-[80px] rotate-[-2deg] z-0 opacity-50",
        },
      ]}
    />
  )
}
