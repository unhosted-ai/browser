"use client"

const features = [
  { label: "Streaming", on: true },
  { label: "Multi-model", on: true },
  { label: "System Prompt", on: true },
  { label: "Structured Output", on: true },
]

const needsIntegration = [
  { label: "Chat persistence", integration: "Supabase / Neon", icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" },
  { label: "RAG / Vectors", integration: "Upstash Search", icon: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" },
  { label: "Rate limiting", integration: "Upstash Redis", icon: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
  { label: "File uploads", integration: "Vercel Blob", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" },
]

const extendFurther = [
  "Tool calling UI",
  "Multi-modal input",
  "Guardrails",
  "Code sandbox",
  "Web search",
  "Context tracking",
  "Branching",
]

export function ThumbnailCapabilities() {
  return (
    <div className="relative w-full h-full bg-background overflow-hidden flex flex-col text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
            <path d="M12 6V4m0 2a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m-6 8a2 2 0 1 0 0-4m0 4a2 2 0 1 1 0-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 1 0 0-4m0 4a2 2 0 1 1 0-4m0 4v2m0-6V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-semibold text-foreground">Capabilities</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-muted-foreground">15 total</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-[0.8fr_1fr_1.2fr] h-full divide-x divide-border">

          {/* Column 1: Included */}
          <div className="flex flex-col overflow-hidden">
            {/* Feature toggles */}
            <div className="px-3 py-2.5">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Features</span>
              <div className="flex flex-col gap-1.5 mt-2">
                {features.map((f) => (
                  <div key={f.label} className="flex items-center justify-between">
                    <span className="text-[10px] text-foreground">{f.label}</span>
                    <div className={`h-3.5 w-7 rounded-full flex items-center px-0.5 ${f.on ? "bg-emerald-500 justify-end" : "bg-muted justify-start"}`}>
                      <div className="h-2.5 w-2.5 rounded-full bg-background shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stop Sequences */}
            <div className="px-3 py-2.5">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Stop Sequences</span>
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex items-center gap-1.5 bg-muted rounded px-2 py-1">
                  <span className="text-[10px] font-mono text-foreground">{'"\\n\\nHuman:"'}</span>
                  <button type="button" className="ml-auto text-muted-foreground" aria-label="Remove">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 bg-muted rounded px-2 py-1">
                  <span className="text-[10px] font-mono text-foreground">{'"</s>"'}</span>
                  <button type="button" className="ml-auto text-muted-foreground" aria-label="Remove">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Needs Integration */}
          <div className="flex flex-col overflow-hidden px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Needs Integration</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {needsIntegration.map((item) => (
                <div key={item.label} className="flex items-center gap-2 bg-muted rounded-md px-2 py-1.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-amber-500 shrink-0">
                    <path d={item.icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-foreground leading-tight">{item.label}</span>
                    <span className="text-[8px] font-mono text-muted-foreground truncate">{item.integration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Extend Further */}
          <div className="flex flex-col overflow-hidden px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-1.5 w-1.5 rounded-full border border-muted-foreground/50" />
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Extend Further</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {extendFurther.map((item) => (
                <span
                  key={item}
                  className="inline-block rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>

            {/* Summary stats */}
            <div className="mt-auto pt-3 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-muted-foreground"><span className="font-mono">4</span> included</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="text-[9px] text-muted-foreground"><span className="font-mono">4</span> need setup</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full border border-muted-foreground/50" />
                <span className="text-[9px] text-muted-foreground"><span className="font-mono">7</span> extensible</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
