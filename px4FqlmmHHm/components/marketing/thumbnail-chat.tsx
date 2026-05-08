"use client"

import { Badge } from "@/components/ui/badge"

export function ThumbnailChat() {
  return (
    <div className="relative w-full h-full bg-background overflow-hidden flex flex-col">
      {/* Mini header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-foreground flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-background">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">AI Gateway Starter</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-violet-500/15 text-violet-400 border border-violet-500/20">
            Claude Opus 4.6
          </Badge>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Streaming
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 px-6 py-3 flex flex-col gap-2.5 overflow-hidden">
        {/* User message */}
        <div className="flex gap-2.5 items-start">
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground">R</span>
          </div>
          <div className="bg-muted rounded-2xl rounded-tl-md px-3.5 py-2 max-w-[60%]">
            <p className="text-[11px] text-foreground leading-relaxed">Show me how to set up streaming with the AI SDK and Gateway.</p>
          </div>
        </div>

        {/* AI response with code */}
        <div className="flex gap-2.5 items-start justify-end">
          <div className="max-w-[78%] flex flex-col gap-1.5">
            <div className="bg-violet-500/10 border border-violet-500/15 rounded-2xl rounded-tr-md px-3.5 py-2">
              <p className="text-[11px] text-foreground/90 leading-relaxed mb-2">
                Two files are all you need. The route handler streams from any gateway model:
              </p>
              {/* Code block */}
              <div className="bg-background/80 rounded-lg px-3 py-2 font-mono text-[9px] leading-[1.6] border border-border/50">
                <div><span className="text-violet-400">import</span> <span className="text-foreground/70">{"{ streamText }"}</span> <span className="text-violet-400">from</span> <span className="text-amber-400">{'"ai"'}</span></div>
                <div><span className="text-violet-400">import</span> <span className="text-foreground/70">{"{ gateway }"}</span> <span className="text-violet-400">from</span> <span className="text-amber-400">{'"@ai-sdk/gateway"'}</span></div>
                <div className="mt-1"><span className="text-violet-400">const</span> <span className="text-foreground/90">result</span> = <span className="text-violet-400">await</span> <span className="text-emerald-400">streamText</span>({"{"}</div>
                <div className="pl-3"><span className="text-foreground/70">model:</span> <span className="text-emerald-400">gateway</span>(<span className="text-amber-400">{'"anthropic/claude-opus-4.6"'}</span>),</div>
                <div className="pl-3"><span className="text-foreground/70">messages</span></div>
                <div>{"})"}</div>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground text-right px-1">Zero API keys needed on Vercel</p>
          </div>
          <div className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-violet-400">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="px-6 pb-3">
        <div className="flex items-center gap-2 bg-muted/80 border border-border rounded-xl px-4 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted-foreground/50">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] text-muted-foreground flex-1">Ask anything...</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-muted-foreground/50 font-mono">⌘↵</span>
            <div className="h-6 w-6 rounded-lg bg-foreground flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="text-background">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
