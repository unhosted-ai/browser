"use client"

import { ThumbnailVariant } from "./thumbnail-variant"

export function ThumbnailVB() {
  return (
    <ThumbnailVariant
      words="Multi-Model"
      floatingElements={[
        // Behind text - provider grid
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-md p-3 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-orange-400 text-xs font-bold">A</span>
                  </div>
                  <span className="text-foreground/70 text-[10px] font-medium">Anthropic</span>
                </div>
                <div className="bg-muted rounded-md p-3 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 text-xs font-bold">O</span>
                  </div>
                  <span className="text-foreground/70 text-[10px] font-medium">OpenAI</span>
                </div>
                <div className="bg-muted rounded-md p-3 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-xs font-bold">x</span>
                  </div>
                  <span className="text-foreground/70 text-[10px] font-medium">xAI</span>
                </div>
                <div className="bg-muted rounded-md p-3 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center">
                    <span className="text-sky-400 text-xs font-bold">G</span>
                  </div>
                  <span className="text-foreground/70 text-[10px] font-medium">Google</span>
                </div>
              </div>
            </div>
          ),
          className: "top-[60px] left-[50px] rotate-[-2deg] z-0 opacity-40",
        },
        // Behind text - another provider grid variant
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-md p-3 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <span className="text-violet-400 text-xs font-bold">M</span>
                  </div>
                  <span className="text-foreground/70 text-[10px] font-medium">Mistral</span>
                </div>
                <div className="bg-muted rounded-md p-3 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
                    <span className="text-rose-400 text-xs font-bold">C</span>
                  </div>
                  <span className="text-foreground/70 text-[10px] font-medium">Cohere</span>
                </div>
              </div>
            </div>
          ),
          className: "bottom-[70px] right-[60px] rotate-[1.5deg] z-0 opacity-35",
        },
        // In front - model switcher row (top right)
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-2.5 shadow-lg flex items-center gap-2">
              <div className="bg-orange-500/20 border border-orange-500/30 rounded-full px-2.5 py-1">
                <span className="text-orange-400 text-[10px] font-medium">Claude Opus 4.6</span>
              </div>
              <div className="bg-muted rounded-full px-2.5 py-1">
                <span className="text-foreground/60 text-[10px] font-medium">GPT-4o</span>
              </div>
              <div className="bg-muted rounded-full px-2.5 py-1">
                <span className="text-foreground/60 text-[10px] font-medium">Grok-2</span>
              </div>
            </div>
          ),
          className: "top-[50px] right-[100px] rotate-[2deg] z-20 opacity-90",
        },
        // In front - model switcher row (bottom left)
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-2.5 shadow-lg flex items-center gap-2">
              <div className="bg-muted rounded-full px-2.5 py-1">
                <span className="text-foreground/60 text-[10px] font-medium">Sonnet 4.5</span>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded-full px-2.5 py-1">
                <span className="text-green-400 text-[10px] font-medium">GPT-4.1</span>
              </div>
              <div className="bg-muted rounded-full px-2.5 py-1">
                <span className="text-foreground/60 text-[10px] font-medium">Gemini 2.5</span>
              </div>
            </div>
          ),
          className: "bottom-[50px] left-[80px] rotate-[-1deg] z-20 opacity-85",
        },
        // In front - active model indicator
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-foreground/80 text-xs font-medium">Active: Claude Opus 4.6</span>
              </div>
              <p className="text-foreground/50 text-[10px] mt-1">200k context window</p>
            </div>
          ),
          className: "top-[180px] left-[160px] rotate-[1deg] z-20 opacity-80",
        },
        // Behind - comparison badge
        {
          content: (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg w-[160px]">
              <p className="text-foreground/60 text-[10px] font-medium mb-1.5">Compare models</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-foreground/50 text-[9px]">Speed</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-orange-500/60 rounded-full" />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50 text-[9px]">Quality</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="w-full h-full bg-orange-500/60 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ),
          className: "bottom-[160px] right-[50px] rotate-[-2deg] z-0 opacity-40",
        },
      ]}
    />
  )
}
