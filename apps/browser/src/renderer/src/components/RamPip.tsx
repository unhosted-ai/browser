import { useEffect, useRef, useState } from "react"
import type { MemorySample } from "@shared/types"

/** Compact memory readout for the right end of the TabStrip.
 *  Live-updates from the main-process broadcast (5s tick) and lets the
 *  user one-click reclaim memory by discarding idle tabs. */
export function RamPip() {
  const [sample, setSample] = useState<MemorySample | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const pipRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    void window.api.tabs.sampleMemory().then(setSample).catch(() => {})
    return window.api.tabs.onMemorySample(setSample)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (popoverRef.current?.contains(t)) return
      if (pipRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const tabCount = sample?.tabCount ?? 0
  const totalMB = sample ? sample.totalBytes / (1024 * 1024) : 0
  const tone = totalMB > 4096 ? "danger" : totalMB > 2048 ? "warn" : "ok"

  const onDiscard = async () => {
    setBusy(true)
    try {
      const n = await window.api.tabs.discardAllIdle()
      // Refresh immediately rather than wait for the 5s tick.
      const next = await window.api.tabs.sampleMemory()
      setSample(next)
      // Close the popover only if we actually freed something; otherwise
      // the user can see the "nothing to discard" state.
      if (n > 0) setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative no-drag">
      <button
        ref={pipRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Memory: ${formatBytes(sample?.totalBytes ?? 0)} across ${tabCount} tabs`}
        title={`Memory: ${formatBytes(sample?.totalBytes ?? 0)} • ${tabCount} tabs (${sample?.discardedCount ?? 0} discarded)`}
        className={[
          "h-7 px-2 grid grid-flow-col gap-1.5 items-center rounded-md",
          "text-[11px] font-medium tabular-nums",
          "transition-colors duration-150",
          tone === "ok"
            ? "text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface/70"
            : tone === "warn"
              ? "text-amber-400 hover:bg-chrome-surface/70"
              : "text-red-400 hover:bg-chrome-surface/70",
        ].join(" ")}
      >
        <span aria-hidden className={["h-1.5 w-1.5 rounded-full", tone === "ok" ? "bg-chrome-text-3" : tone === "warn" ? "bg-amber-400" : "bg-red-400"].join(" ")} />
        <span>{tabCount}</span>
        <span className="text-chrome-text-3">·</span>
        <span>{formatBytes(sample?.totalBytes ?? 0)}</span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Memory and tabs"
          className="absolute right-0 top-9 z-50 w-[300px] rounded-lg border border-chrome-border bg-chrome-surface-2 shadow-xl p-3 text-[12px]"
        >
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3 tabular-nums">
            <span className="text-chrome-text-3">Total memory</span>
            <span className="text-chrome-text justify-self-end">{formatBytes(sample?.totalBytes ?? 0)}</span>
            <span className="text-chrome-text-3">Tab renderers</span>
            <span className="text-chrome-text-2 justify-self-end">{formatBytes(sample?.tabsBytes ?? 0)}</span>
            <span className="text-chrome-text-3">Main process</span>
            <span className="text-chrome-text-2 justify-self-end">{formatBytes(sample?.mainBytes ?? 0)}</span>
            <span className="text-chrome-text-3">Tabs</span>
            <span className="text-chrome-text-2 justify-self-end">
              {tabCount} ({sample?.discardedCount ?? 0} discarded)
            </span>
          </div>

          <button
            type="button"
            disabled={busy || idleTabCount(sample) === 0}
            onClick={onDiscard}
            className={[
              "w-full h-8 rounded-md text-[12px] font-medium transition-colors duration-150",
              busy || idleTabCount(sample) === 0
                ? "bg-chrome-surface text-chrome-text-3 cursor-default"
                : "bg-signal/10 text-signal hover:bg-signal/15",
            ].join(" ")}
          >
            {busy
              ? "Discarding…"
              : idleTabCount(sample) === 0
                ? "No idle tabs to discard"
                : `Discard ${idleTabCount(sample)} idle tab${idleTabCount(sample) === 1 ? "" : "s"}`}
          </button>

          <p className="mt-2 text-[11px] leading-snug text-chrome-text-3">
            Discarding frees a tab&apos;s renderer process. The tab stays in the strip; clicking it reloads the page.
          </p>
        </div>
      )}
    </div>
  )
}

function idleTabCount(s: MemorySample | null): number {
  if (!s) return 0
  // The sample doesn't carry activeId, but discardAllIdle on the main
  // side always preserves the active tab. So the count we can reclaim
  // is non-discarded minus one (the active one stays).
  return Math.max(0, s.perTab.filter((t) => !t.discarded).length - 1)
}

function formatBytes(n: number): string {
  if (!n || !Number.isFinite(n)) return "0 MB"
  const mb = n / (1024 * 1024)
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}
