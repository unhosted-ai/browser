// Local browsing history. One row per top-level navigation.
//
// Stored in userData/history.json. Capped at HISTORY_MAX entries on a
// FIFO basis — old entries fall off the back. Tracks: url, title (best
// effort, can be empty when navigation is in flight), visitedAt.
//
// Privacy posture: same as bookmarks/conversations — never leaves the
// device. The Clear-browsing-data dialog wipes this in addition to
// session storage.

import { app } from "electron"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { randomUUID } from "node:crypto"

export type HistoryEntry = {
  id: string
  url: string
  title: string
  visitedAt: number
}

type Serialized = {
  version: 1
  entries: HistoryEntry[]
}

const VERSION = 1
const HISTORY_MAX = 5000  // ~30-90 days of typical browsing
const FLUSH_INTERVAL_MS = 5_000

export class HistoryStore {
  private entries: HistoryEntry[] = []
  private filePath: string
  private flushTimer: NodeJS.Timeout | null = null
  private dirty = false

  constructor() {
    this.filePath = join(app.getPath("userData"), "history.json")
    this.load()
  }

  private load(): void {
    if (!existsSync(this.filePath)) return
    try {
      const raw = readFileSync(this.filePath, "utf8")
      const parsed = JSON.parse(raw) as Serialized
      if (parsed?.version === VERSION && Array.isArray(parsed.entries)) {
        this.entries = parsed.entries
      }
    } catch {
      // Corrupt file → start fresh.
    }
  }

  private scheduleFlush(): void {
    this.dirty = true
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      if (this.dirty) this.flushNow()
    }, FLUSH_INTERVAL_MS)
  }

  flushNow(): void {
    if (!this.dirty) return
    this.dirty = false
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      const out: Serialized = { version: VERSION, entries: this.entries }
      writeFileSync(this.filePath, JSON.stringify(out), "utf8")
    } catch {
      // Best-effort.
    }
  }

  // ── Public ──────────────────────────────────────────
  /**
   * Record a top-level navigation. We dedupe back-to-back identical URLs
   * (often a navigation fires twice in Electron for the same page) by
   * checking the most recent entry — saves space without a real index.
   *
   * Skips internal pages (delta:) and non-http(s) (data:, about:, file:).
   */
  record(url: string, title: string): void {
    if (!isRecordable(url)) return
    const last = this.entries[this.entries.length - 1]
    if (last && last.url === url) {
      // Refresh title + timestamp on a re-visit so the list reflects the
      // most recent state.
      last.visitedAt = Date.now()
      if (title && !last.title) last.title = title
      this.scheduleFlush()
      return
    }
    this.entries.push({
      id: randomUUID(),
      url,
      title,
      visitedAt: Date.now(),
    })
    if (this.entries.length > HISTORY_MAX) {
      this.entries.splice(0, this.entries.length - HISTORY_MAX)
    }
    this.scheduleFlush()
  }

  /**
   * Title may arrive after navigation completes (page-title-updated event).
   * We patch the last entry that matches the URL, no-op if none.
   */
  updateTitle(url: string, title: string): void {
    if (!title) return
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].url === url) {
        if (this.entries[i].title !== title) {
          this.entries[i].title = title
          this.scheduleFlush()
        }
        return
      }
    }
  }

  /**
   * Returns the most-recent N entries matching `query` (case-insensitive
   * substring on url + title). When `query` is empty, returns the most
   * recent N regardless.
   */
  list(opts: { query?: string; limit?: number } = {}): HistoryEntry[] {
    const limit = opts.limit ?? 200
    const q = (opts.query ?? "").trim().toLowerCase()
    const newest = [...this.entries].reverse()
    if (!q) return newest.slice(0, limit)
    const out: HistoryEntry[] = []
    for (const e of newest) {
      if (e.url.toLowerCase().includes(q) || e.title.toLowerCase().includes(q)) {
        out.push(e)
        if (out.length >= limit) break
      }
    }
    return out
  }

  removeOne(id: string): void {
    const before = this.entries.length
    this.entries = this.entries.filter((e) => e.id !== id)
    if (this.entries.length !== before) this.scheduleFlush()
  }

  /** Wipe everything. Triggered from Clear-browsing-data. */
  clear(): void {
    this.entries = []
    this.scheduleFlush()
  }
}

function isRecordable(url: string): boolean {
  if (!url) return false
  return url.startsWith("http://") || url.startsWith("https://")
}
