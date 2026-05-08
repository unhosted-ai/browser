"use client"

export function OGImage() {
  return (
    <div className="relative w-[1200px] h-[630px] bg-background overflow-hidden flex items-center justify-center">
      {/* Floating elements - behind and in front of text */}

      {/* Behind text elements (low z-index, low opacity) */}
      <div className="absolute top-16 left-16 z-0 opacity-30 bg-card border border-border rounded-lg p-4 shadow-lg rotate-2">
        {/* Mini chat bubble */}
        <div className="w-48 space-y-2">
          <div className="bg-muted rounded-lg px-3 py-2 w-3/4">
            <div className="h-2 bg-muted-foreground/30 rounded w-full" />
          </div>
          <div className="bg-foreground rounded-lg px-3 py-2 w-4/5 ml-auto">
            <div className="h-2 bg-background/50 rounded w-full" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 right-20 z-0 opacity-40 bg-card border border-border rounded-lg p-3 shadow-lg -rotate-1">
        {/* Mini model chips */}
        <div className="flex gap-1.5">
          <div className="px-2 py-1 bg-foreground text-background rounded text-[9px] font-mono">Claude</div>
          <div className="px-2 py-1 bg-muted text-muted-foreground rounded text-[9px] font-mono">GPT-4o</div>
          <div className="px-2 py-1 bg-muted text-muted-foreground rounded text-[9px] font-mono">Grok</div>
        </div>
      </div>

      {/* In-front elements (high z-index, high opacity) */}
      <div className="absolute top-20 right-32 z-20 opacity-90 bg-card border border-border rounded-lg p-3 shadow-xl rotate-1">
        {/* Layers icon */}
        <div className="h-10 w-10 rounded-md bg-foreground flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-background">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Big words */}
      <h1 className="relative z-10 font-mono font-black text-[110px] leading-none tracking-tight text-foreground text-center select-none">
        AI Gateway
      </h1>

      {/* Subtitle */}
      <p className="absolute bottom-16 z-10 text-lg font-mono text-muted-foreground tracking-wide">
        STARTER KIT
      </p>
    </div>
  )
}
