import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import type { Bookmark, DownloadEntry, HistoryEntry } from "@shared/types"

type Props = {
  open: boolean
  onClose: () => void
  /** Open a URL in a new tab (used by all three lists). */
  onOpenUrl: (url: string) => void
  onOpenSettings: () => void
}

type Tab = "bookmarks" | "history" | "downloads"

/**
 * Top-right menu, opened by the ☰ button in the address bar.
 *
 * Houses Bookmarks / History / Downloads in tabs, plus a "Clear browsing
 * data…" button that opens an inline confirmation. Mirrors the Comet
 * menu shape from the reference screenshot, minus the items that conflict
 * with about.md (Account, Auto-update, Extensions).
 */
export function ChromeMenu({ open, onClose, onOpenUrl, onOpenSettings }: Props) {
  const [tab, setTab] = useState<Tab>("bookmarks")
  const [confirmClear, setConfirmClear] = useState(false)
  const [cacheBusy, setCacheBusy] = useState(false)
  const [cacheDone, setCacheDone] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const clearCacheNow = async () => {
    if (cacheBusy) return
    setCacheBusy(true)
    try {
      await window.api.data.clear({ cache: true })
      setCacheDone(true)
      setTimeout(() => setCacheDone(false), 1200)
    } finally {
      setCacheBusy(false)
    }
  }

  // Close on click-outside and on Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    // Defer the click handler one tick — otherwise the click that *opened*
    // the menu would immediately close it.
    const t = setTimeout(() => window.addEventListener("mousedown", onClick), 0)
    window.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener("mousedown", onClick)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="menu"
          key="chrome-menu"
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -4 }}
          transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
          style={{ transformOrigin: "top right" }}
          className="absolute right-3 top-[72px] z-50 w-[360px] max-h-[520px] flex flex-col rounded-[14px] border border-chrome-border bg-chrome-bg shadow-[0_20px_60px_-10px_rgba(0,0,0,0.45)] no-drag"
        >
      <div className="flex items-center gap-1 px-1.5 pt-1.5">
        <TabBtn label="Bookmarks" active={tab === "bookmarks"} onClick={() => setTab("bookmarks")} />
        <TabBtn label="History"   active={tab === "history"}   onClick={() => setTab("history")} />
        <TabBtn label="Downloads" active={tab === "downloads"} onClick={() => setTab("downloads")} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "bookmarks" && <BookmarksList onOpen={onOpenUrl} onClose={onClose} />}
        {tab === "history"   && <HistoryList onOpen={onOpenUrl} onClose={onClose} />}
        {tab === "downloads" && <DownloadsList />}
      </div>

      <div className="border-t border-chrome-border px-2 py-1.5 flex items-center justify-between">
        {confirmClear ? (
          <ClearBrowsingDataInline onDone={() => { setConfirmClear(false) }} onCancel={() => setConfirmClear(false)} />
        ) : (
          <>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearCacheNow}
                disabled={cacheBusy}
                title="Drop the HTTP / image / GPU shader cache for every site. Cookies, history, and logins are untouched."
                className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text disabled:opacity-50 px-2 py-1 rounded transition-colors"
              >
                {cacheBusy ? "Clearing…" : cacheDone ? "Cleared ✓" : "Clear cache"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text px-2 py-1 rounded transition-colors"
              >
                More…
              </button>
            </div>
            <button
              type="button"
              onClick={() => { onOpenSettings(); onClose() }}
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal px-2 py-1 rounded transition-colors"
              title="Settings  ⌘,"
            >
              Settings ⌘,
            </button>
          </>
        )}
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 h-8 rounded-md font-mono text-[11px] tracking-[0.06em] transition-colors",
        active
          ? "bg-chrome-surface text-chrome-text"
          : "text-chrome-text-3 hover:text-chrome-text-2",
      ].join(" ")}
    >
      {label}
    </button>
  )
}

// ── Bookmarks list ────────────────────────────────────────────
function BookmarksList({ onOpen, onClose }: { onOpen: (url: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<Bookmark[]>([])

  const reload = () => { void window.api.bookmarks.list().then(setItems) }
  useEffect(() => { reload() }, [])

  if (items.length === 0) {
    return <Empty hint="Click ★ in the address bar to bookmark a page." />
  }
  return (
    <ul className="py-1">
      {items.map((b) => (
        <ListRow
          key={b.id}
          title={b.title}
          subtitle={hostFor(b.url)}
          onClick={() => { onOpen(b.url); onClose() }}
          onRemove={async () => { await window.api.bookmarks.remove(b.url); reload() }}
        />
      ))}
    </ul>
  )
}

// ── History list ──────────────────────────────────────────────
function HistoryList({ onOpen, onClose }: { onOpen: (url: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<HistoryEntry[]>([])

  const reload = () => { void window.api.history.list(query, 200).then(setItems) }
  useEffect(() => { reload() }, [query])

  return (
    <div>
      <div className="px-2 pt-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search history…"
          className="w-full h-8 px-2.5 rounded-md text-[12px] bg-chrome-surface border border-chrome-border text-chrome-text placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/60"
        />
      </div>
      {items.length === 0 ? (
        <Empty hint={query ? "Nothing matches that query." : "Browsing history will show up here."} />
      ) : (
        <ul className="py-1">
          {items.map((h) => (
            <ListRow
              key={h.id}
              title={h.title || h.url}
              subtitle={`${hostFor(h.url)} · ${formatRelative(h.visitedAt)}`}
              onClick={() => { onOpen(h.url); onClose() }}
              onRemove={async () => { await window.api.history.removeOne(h.id); reload() }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Downloads list ────────────────────────────────────────────
function DownloadsList() {
  const [items, setItems] = useState<DownloadEntry[]>([])

  useEffect(() => {
    void window.api.downloads.list().then(setItems)
    return window.api.downloads.onChange(setItems)
  }, [])

  if (items.length === 0) return <Empty hint="No downloads yet." />
  return (
    <ul className="py-1">
      {items.map((d) => <DownloadRow key={d.id} item={d} />)}
    </ul>
  )
}

function DownloadRow({ item }: { item: DownloadEntry }) {
  const pct = item.totalBytes > 0 ? Math.round((item.receivedBytes / item.totalBytes) * 100) : 0
  const inFlight = item.state === "in-progress" || item.state === "paused"
  return (
    <li className="px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] text-chrome-text truncate">{item.filename}</p>
          <p className="text-[10px] text-chrome-text-3 truncate font-mono">{hostFor(item.url)}</p>
        </div>
        <span className={[
          "shrink-0 font-mono text-[10px] tracking-[0.04em] uppercase",
          item.state === "completed" ? "text-signal"
            : item.state === "in-progress" ? "text-chrome-text-2"
            : item.state === "paused" ? "text-chrome-text-3"
            : "text-red-400",
        ].join(" ")}>
          {item.state === "in-progress" ? `${pct}%` : item.state}
        </span>
      </div>
      {inFlight && (
        <div className="mt-1 h-[3px] rounded-full bg-chrome-border overflow-hidden">
          <div className="h-full bg-signal" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="mt-1 flex gap-2">
        {inFlight && item.state === "in-progress" && (
          <Action label="Pause" onClick={() => window.api.downloads.pause(item.id)} />
        )}
        {inFlight && item.state === "paused" && (
          <Action label="Resume" onClick={() => window.api.downloads.resume(item.id)} />
        )}
        {inFlight && (
          <Action label="Cancel" onClick={() => window.api.downloads.cancel(item.id)} />
        )}
        {!inFlight && (
          <Action label="Remove" onClick={() => window.api.downloads.removeOne(item.id)} />
        )}
      </div>
    </li>
  )
}

// ── Clear browsing data ──────────────────────────────────────
function ClearBrowsingDataInline({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [scope, setScope] = useState({
    cookies: true,
    cache: true,
    history: true,
    downloads: false,
  })
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await window.api.data.clear(scope)
      onDone()
    } finally { setBusy(false) }
  }

  return (
    <div className="w-full text-[11px]">
      <div className="flex flex-wrap gap-2 px-1 py-1">
        {(["cookies", "cache", "history", "downloads"] as const).map((k) => (
          <label key={k} className="flex items-center gap-1.5 text-chrome-text-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scope[k]}
              onChange={(e) => setScope({ ...scope, [k]: e.target.checked })}
              className="accent-signal"
            />
            <span className="capitalize">{k}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-1 px-1 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text px-2 py-1 rounded"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="font-mono text-[10px] tracking-[0.12em] uppercase text-signal hover:text-signal px-2 py-1 rounded bg-signal/10"
        >
          {busy ? "Clearing…" : "Clear"}
        </button>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────
function ListRow({
  title, subtitle, onClick, onRemove,
}: {
  title: string
  subtitle: string
  onClick: () => void
  onRemove: () => void
}) {
  return (
    <li className="group flex items-center gap-2 px-2 py-1.5 hover:bg-chrome-surface rounded-md mx-1">
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-[12px] text-chrome-text truncate">{title}</p>
        <p className="text-[10px] text-chrome-text-3 truncate font-mono">{subtitle}</p>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        title="Remove"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 grid place-items-center rounded text-chrome-text-3 hover:text-chrome-text hover:bg-chrome-bg"
      >
        ×
      </button>
    </li>
  )
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono text-[10px] tracking-[0.06em] uppercase text-chrome-text-3 hover:text-chrome-text px-1 py-0.5"
    >
      {label}
    </button>
  )
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="px-3 py-8 text-center text-[12px] text-chrome-text-3">
      {hint}
    </div>
  )
}

function hostFor(url: string): string {
  try {
    const u = new URL(url)
    return u.host
  } catch {
    return url
  }
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// satisfy linter for the unused `useMemo`
void useMemo
