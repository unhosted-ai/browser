"use client"

const providers = [
  { name: "Anthropic", highlighted: true },
  { name: "OpenAI", highlighted: false },
  { name: "xAI", highlighted: false },
  { name: "Google", highlighted: false },
  { name: "Fireworks", highlighted: false },
  { name: "AWS Bedrock", highlighted: false },
]

const models = [
  { name: "Claude Opus 4.6", provider: "Anthropic", active: true },
  { name: "Claude Sonnet 4", provider: "Anthropic", active: false },
  { name: "GPT-4o", provider: "OpenAI", active: false },
  { name: "Grok 3 Mini", provider: "xAI", active: false },
  { name: "GPT-4o Mini", provider: "OpenAI", active: false },
  { name: "Gemini 2.0 Flash", provider: "Google", active: false },
]

export function ThumbnailModels() {
  return (
    <div className="relative w-full h-full bg-background overflow-hidden flex flex-col text-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-semibold text-foreground">Multi-Model</span>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">6 providers</span>
      </div>

      {/* 3-column grid */}
      <div className="flex-1 grid grid-cols-[1fr_1.2fr_0.8fr] divide-x divide-border overflow-hidden">
        {/* Col 1: Providers */}
        <div className="p-3 flex flex-col gap-2 overflow-hidden">
          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Zero-Config Providers</span>
          <div className="grid grid-cols-2 gap-1.5">
            {providers.map((p) => (
              <div
                key={p.name}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 px-1 ${
                  p.highlighted
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[10px] font-medium truncate">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Model Roster */}
        <div className="p-3 flex flex-col gap-2 overflow-hidden">
          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Available Models</span>
          <div className="flex flex-col gap-1">
            {models.map((m) => (
              <div
                key={m.name}
                className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${
                  m.active
                    ? "bg-foreground text-background"
                    : "bg-transparent text-foreground"
                }`}
              >
                {/* Radio indicator */}
                <span className={`w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  m.active ? "border-background" : "border-muted-foreground"
                }`}>
                  {m.active && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                </span>
                <span className="text-[10px] font-medium flex-1 truncate">{m.name}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                  m.active
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {m.provider}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Gateway */}
        <div className="p-3 flex flex-col gap-3 overflow-hidden">
          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Architecture</span>

          {/* Mini routing diagram */}
          <svg viewBox="0 0 120 100" className="w-full" fill="none">
            {/* Your App box */}
            <rect x="25" y="2" width="70" height="18" rx="3" className="stroke-muted-foreground fill-muted" strokeWidth="1" />
            <text x="60" y="14" textAnchor="middle" className="fill-foreground text-[8px] font-medium" fontSize="8">Your App</text>

            {/* Connecting line down */}
            <line x1="60" y1="20" x2="60" y2="36" className="stroke-muted-foreground" strokeWidth="1" />
            <polygon points="57,34 60,38 63,34" className="fill-muted-foreground" />

            {/* AI Gateway box */}
            <rect x="15" y="38" width="90" height="18" rx="3" className="stroke-foreground fill-foreground" strokeWidth="1" />
            <text x="60" y="50" textAnchor="middle" className="fill-background text-[8px] font-semibold" fontSize="8">AI Gateway</text>

            {/* Fan-out lines */}
            <line x1="35" y1="56" x2="20" y2="74" className="stroke-muted-foreground" strokeWidth="1" />
            <line x1="60" y1="56" x2="60" y2="74" className="stroke-muted-foreground" strokeWidth="1" />
            <line x1="85" y1="56" x2="100" y2="74" className="stroke-muted-foreground" strokeWidth="1" />

            {/* Provider dots */}
            <circle cx="20" cy="78" r="4" className="fill-emerald-500" />
            <circle cx="60" cy="78" r="4" className="fill-emerald-500" />
            <circle cx="100" cy="78" r="4" className="fill-emerald-500" />

            {/* Provider labels */}
            <text x="20" y="92" textAnchor="middle" className="fill-muted-foreground text-[6px]" fontSize="6">Anthropic</text>
            <text x="60" y="92" textAnchor="middle" className="fill-muted-foreground text-[6px]" fontSize="6">OpenAI</text>
            <text x="100" y="92" textAnchor="middle" className="fill-muted-foreground text-[6px]" fontSize="6">Google</text>
          </svg>

          {/* Stats stack */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">Providers</span>
              <span className="text-[9px] font-mono text-foreground">6</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">Models</span>
              <span className="text-[9px] font-mono text-foreground">8+</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">API Keys</span>
              <span className="text-[9px] font-mono text-foreground">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
