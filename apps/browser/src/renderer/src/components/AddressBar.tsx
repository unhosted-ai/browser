import { useEffect, useState } from "react"
import type { Tab } from "@shared/types"

type Props = {
  tab: Tab | null
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ""
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed)) return trimmed
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(trimmed)) return `https://${trimmed}`
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

export function AddressBar({
  tab, onNavigate, onBack, onForward, onReload, sidebarOpen, onToggleSidebar,
}: Props) {
  const [value, setValue] = useState(tab?.url ?? "")

  useEffect(() => {
    setValue(tab?.url ?? "")
  }, [tab?.url, tab?.id])

  return (
    <div className="h-10 flex items-center gap-2 px-3 no-drag">
      <button
        type="button"
        aria-label="Back"
        disabled={!tab?.canGoBack}
        onClick={onBack}
        className="h-7 w-7 grid place-items-center rounded text-chrome-text-2 disabled:opacity-30 hover:text-chrome-text hover:bg-chrome-surface"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Forward"
        disabled={!tab?.canGoForward}
        onClick={onForward}
        className="h-7 w-7 grid place-items-center rounded text-chrome-text-2 disabled:opacity-30 hover:text-chrome-text hover:bg-chrome-surface"
      >
        ›
      </button>
      <button
        type="button"
        aria-label="Reload"
        onClick={onReload}
        className="h-7 w-7 grid place-items-center rounded text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface"
      >
        ⟳
      </button>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const url = normalizeUrl(value)
            if (url) onNavigate(url)
          }
        }}
        placeholder="Search or enter URL"
        spellCheck={false}
        className="flex-1 h-7 px-3 rounded-md bg-chrome-surface border border-chrome-border text-[13px] text-chrome-text placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/60"
      />

      <button
        type="button"
        aria-label="Toggle AI sidebar"
        onClick={onToggleSidebar}
        className={[
          "h-7 px-3 rounded-md text-[11px] tracking-[0.12em] uppercase font-mono",
          "border transition-colors duration-150",
          sidebarOpen
            ? "border-signal/60 text-signal bg-chrome-surface"
            : "border-chrome-border text-chrome-text-2 hover:text-chrome-text",
        ].join(" ")}
      >
        AI
      </button>
    </div>
  )
}
