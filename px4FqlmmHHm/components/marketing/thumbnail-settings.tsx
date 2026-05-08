"use client"

export function ThumbnailSettings() {
  const sliders = [
    { label: "Temperature", value: "0.7", fill: 35 },
    { label: "Top-p", value: "0.95", fill: 95 },
    { label: "Top-k", value: "40", fill: 40 },
    { label: "Freq Penalty", value: "0", fill: 0 },
    { label: "Pres Penalty", value: "0", fill: 0 },
  ]

  const outputFormats = [
    { label: "Markdown", active: true },
    { label: "Plain Text", active: false },
    { label: "JSON", active: false },
    { label: "Structured", active: false },
  ]

  return (
    <div className="relative w-full h-full bg-background overflow-hidden flex flex-col text-xs">
      {/* Header bar */}
      <div className="px-5 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-semibold text-foreground">Agent Settings</span>
        </div>
        <span className="text-[9px] font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">7 parameters</span>
      </div>

      {/* 3-column grid */}
      <div className="flex-1 grid grid-cols-[1fr_1fr_1.2fr] divide-x divide-border overflow-hidden">
        {/* Col 1: Model + Tokens */}
        <div className="px-4 py-3 flex flex-col gap-3 overflow-hidden">
          {/* Model */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Model</span>
            <div className="bg-muted rounded-md px-2.5 py-2 flex items-center justify-between">
              <span className="text-[10px] text-foreground truncate">anthropic/claude-opus-4.6</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-muted-foreground flex-shrink-0 ml-1">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[9px] text-muted-foreground">Anthropic</span>
          </div>

          {/* Max Tokens */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Max Tokens</span>
            <div className="bg-muted rounded-md px-2.5 py-2">
              <span className="text-[10px] font-mono text-foreground">4,096</span>
            </div>
            <span className="text-[8px] text-muted-foreground">256 – 128,000</span>
          </div>
        </div>

        {/* Col 2: Sampling Parameters */}
        <div className="px-4 py-3 flex flex-col gap-2 overflow-hidden">
          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Sampling</span>
          <div className="flex flex-col gap-2.5">
            {sliders.map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">{s.label}</span>
                  <span className="text-[9px] font-mono text-foreground">{s.value}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  {s.fill > 0 && (
                    <div
                      className="h-full bg-foreground rounded-full"
                      style={{ width: `${s.fill}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: System Prompt + Output Format */}
        <div className="px-4 py-3 flex flex-col gap-3 overflow-hidden">
          {/* System Prompt */}
          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">System Prompt</span>
            <div className="bg-muted rounded-md px-2.5 py-2 flex-1 min-h-0 overflow-hidden">
              <p className="text-[10px] text-foreground leading-relaxed">You are a helpful assistant. Be concise and direct in your responses.</p>
            </div>
          </div>

          {/* Output Format */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Output Format</span>
            <div className="flex flex-wrap gap-1.5">
              {outputFormats.map((f) => (
                <span
                  key={f.label}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    f.active
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
