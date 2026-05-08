"use client"

export function FeatureTicker() {
  const cards = [
    {
      name: "Streaming Chat",
      content: (
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-16 rounded-full bg-muted" />
          <div className="h-2.5 w-24 rounded-full bg-foreground/10 self-end" />
          <div className="h-2.5 w-14 rounded-full bg-muted" />
        </div>
      ),
    },
    {
      name: "Model Switcher",
      content: (
        <div className="flex gap-1.5">
          <div className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-medium text-background">
            Claude
          </div>
          <div className="rounded-full border border-border px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
            GPT-4o
          </div>
          <div className="rounded-full border border-border px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
            Grok
          </div>
        </div>
      ),
    },
    {
      name: "Agent Settings",
      content: (
        <div className="flex flex-col gap-1.5">
          <div className="relative h-1.5 w-full rounded-full bg-muted">
            <div className="absolute left-[60%] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-foreground" />
          </div>
          <div className="h-4 w-full rounded border border-border bg-muted/50" />
          <div className="h-8 w-full rounded border border-border bg-muted/50" />
        </div>
      ),
    },
    {
      name: "AI Gateway",
      content: (
        <div className="grid grid-cols-2 gap-1">
          <div className="rounded border border-border bg-muted/50 px-1 py-0.5 text-center text-[8px] text-muted-foreground">
            Anthropic
          </div>
          <div className="rounded border border-border bg-muted/50 px-1 py-0.5 text-center text-[8px] text-muted-foreground">
            OpenAI
          </div>
          <div className="rounded border border-border bg-muted/50 px-1 py-0.5 text-center text-[8px] text-muted-foreground">
            xAI
          </div>
          <div className="rounded border border-border bg-muted/50 px-1 py-0.5 text-center text-[8px] text-muted-foreground">
            Google
          </div>
        </div>
      ),
    },
    {
      name: "System Prompt",
      content: (
        <div className="h-10 w-full rounded border border-border bg-muted/50 p-1.5">
          <span className="text-[8px] text-muted-foreground/60">
            You are a helpful...
          </span>
        </div>
      ),
    },
    {
      name: "Temperature",
      content: (
        <div className="flex items-center gap-2">
          <div className="relative h-1.5 flex-1 rounded-full bg-muted">
            <div className="absolute left-[70%] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-foreground" />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">
            0.7
          </span>
        </div>
      ),
    },
    {
      name: "Streaming",
      content: (
        <div className="flex items-center gap-1.5 pt-1">
          <div
            className="h-2 w-2 rounded-full bg-foreground"
            style={{ animation: "ticker-bounce 1.4s ease-in-out infinite" }}
          />
          <div
            className="h-2 w-2 rounded-full bg-foreground"
            style={{
              animation: "ticker-bounce 1.4s ease-in-out 0.2s infinite",
            }}
          />
          <div
            className="h-2 w-2 rounded-full bg-foreground"
            style={{
              animation: "ticker-bounce 1.4s ease-in-out 0.4s infinite",
            }}
          />
        </div>
      ),
    },
    {
      name: "Mobile Nav",
      content: (
        <div className="mx-auto flex h-12 w-8 flex-col items-center justify-center gap-[3px] rounded-md border-2 border-muted-foreground/40">
          <div className="h-[2px] w-3.5 rounded-full bg-muted-foreground/60" />
          <div className="h-[2px] w-3.5 rounded-full bg-muted-foreground/60" />
          <div className="h-[2px] w-3.5 rounded-full bg-muted-foreground/60" />
        </div>
      ),
    },
    {
      name: "shadcn/ui",
      content: (
        <div className="flex items-center gap-2">
          <div className="rounded bg-foreground px-2 py-0.5 text-[8px] font-medium text-background">
            Button
          </div>
          <div className="rounded-full border border-border px-1.5 py-0.5 text-[8px] text-muted-foreground">
            Badge
          </div>
          <div className="flex items-center">
            <div className="h-3 w-5 rounded-full bg-foreground p-[1px]">
              <div className="h-full aspect-square rounded-full bg-background ml-auto" />
            </div>
          </div>
        </div>
      ),
    },
    {
      name: "App Router",
      content: (
        <div className="flex flex-col gap-0.5 font-mono text-[9px] text-muted-foreground">
          <div>/</div>
          <div className="ml-3">/chat</div>
          <div className="ml-6">/api/chat</div>
        </div>
      ),
    },
  ]

  return (
    <div
      className="relative w-full overflow-hidden border-t border-b border-border bg-muted/20"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
      }}
    >
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ticker-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
      <div
        className="flex gap-4 py-4 hover:[animation-play-state:paused]"
        style={{
          animation: "ticker-scroll 45s linear infinite",
          width: "max-content",
        }}
      >
        {[...cards, ...cards].map((card, i) => (
          <div
            key={i}
            className="w-[270px] shrink-0 bg-card border border-border rounded-lg p-3"
          >
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {card.name}
            </div>
            {card.content}
          </div>
        ))}
      </div>
    </div>
  )
}
