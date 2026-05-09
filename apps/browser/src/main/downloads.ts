// Downloads handler.
//
// Hooks `session.defaultSession.on("will-download")` and tracks each
// DownloadItem's lifecycle. State is persisted to userData/downloads.json
// so the list survives quit/restart, but in-flight items only count
// while the app is running — Electron's resume-after-quit isn't supported
// without re-issuing the request.
//
// The renderer reads via IPC and subscribes to `downloads:update` events
// for live progress (UI shows a tray of in-flight bars).

import { app, session, type DownloadItem, type Session } from "electron"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"

export type DownloadState = "in-progress" | "paused" | "completed" | "cancelled" | "interrupted"

export type DownloadEntry = {
  id: string                // urlChain[0] + startedAt — stable enough
  filename: string
  url: string
  savePath: string
  totalBytes: number
  receivedBytes: number
  state: DownloadState
  startedAt: number
  completedAt?: number
  mimeType?: string
}

type Serialized = {
  version: 1
  entries: DownloadEntry[]
}

const VERSION = 1
const RECENT_MAX = 200

export class DownloadsManager {
  private entries: DownloadEntry[] = []
  /** Live items by id — needed for cancel/pause/resume. */
  private live = new Map<string, DownloadItem>()
  private filePath: string
  private listeners = new Set<(entries: DownloadEntry[]) => void>()
  private flushTimer: NodeJS.Timeout | null = null

  constructor(private sess: Session = session.defaultSession) {
    this.filePath = join(app.getPath("userData"), "downloads.json")
    this.load()
    this.bind()
  }

  private load(): void {
    if (!existsSync(this.filePath)) return
    try {
      const raw = readFileSync(this.filePath, "utf8")
      const parsed = JSON.parse(raw) as Serialized
      if (parsed?.version === VERSION && Array.isArray(parsed.entries)) {
        // Past in-flight items should be marked interrupted on reload —
        // we have no way to resume them.
        this.entries = parsed.entries.map((e) =>
          e.state === "in-progress" || e.state === "paused"
            ? { ...e, state: "interrupted" as const }
            : e,
        )
      }
    } catch { /* corrupt → fresh */ }
  }

  private save(): void {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      try {
        mkdirSync(dirname(this.filePath), { recursive: true })
        const out: Serialized = { version: VERSION, entries: this.entries.slice(-RECENT_MAX) }
        writeFileSync(this.filePath, JSON.stringify(out), "utf8")
      } catch { /* best-effort */ }
    }, 1500)
  }

  /** Sync flush on app quit. */
  flushNow(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      const out: Serialized = { version: VERSION, entries: this.entries.slice(-RECENT_MAX) }
      writeFileSync(this.filePath, JSON.stringify(out), "utf8")
    } catch { /* best-effort */ }
  }

  private notify(): void {
    const snap = this.list()
    for (const cb of this.listeners) cb(snap)
  }

  // ── Public ────────────────────────────────────────────
  onChange(cb: (entries: DownloadEntry[]) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Newest-first list. */
  list(): DownloadEntry[] {
    return [...this.entries].sort((a, b) => b.startedAt - a.startedAt)
  }

  cancel(id: string): void {
    const item = this.live.get(id)
    item?.cancel()
  }

  pause(id: string): void {
    const item = this.live.get(id)
    if (item && !item.isPaused()) item.pause()
  }

  resume(id: string): void {
    const item = this.live.get(id)
    if (item && item.isPaused() && item.canResume()) item.resume()
  }

  removeOne(id: string): void {
    const before = this.entries.length
    this.entries = this.entries.filter((e) => e.id !== id)
    if (this.entries.length !== before) {
      this.save()
      this.notify()
    }
  }

  /** Wipe history rows but leave any in-flight items running. */
  clear(): void {
    const liveIds = new Set(this.live.keys())
    this.entries = this.entries.filter((e) => liveIds.has(e.id))
    this.save()
    this.notify()
  }

  // ── Wiring ───────────────────────────────────────────
  private bind(): void {
    this.sess.on("will-download", (_event, item, _wc) => {
      const id = `${item.getURL()}|${Date.now()}`
      const entry: DownloadEntry = {
        id,
        filename: item.getFilename(),
        url: item.getURL(),
        savePath: "",
        totalBytes: item.getTotalBytes(),
        receivedBytes: item.getReceivedBytes(),
        state: "in-progress",
        startedAt: Date.now(),
        mimeType: item.getMimeType(),
      }
      this.entries.push(entry)
      this.live.set(id, item)
      this.notify()

      item.on("updated", (_e, state) => {
        entry.receivedBytes = item.getReceivedBytes()
        entry.totalBytes = item.getTotalBytes()
        entry.savePath = item.getSavePath() || entry.savePath
        entry.state = state === "interrupted" ? "interrupted"
                    : item.isPaused() ? "paused"
                    : "in-progress"
        this.save()
        this.notify()
      })

      item.once("done", (_e, state) => {
        entry.state = state === "completed" ? "completed"
                    : state === "cancelled" ? "cancelled"
                    : "interrupted"
        entry.savePath = item.getSavePath() || entry.savePath
        entry.completedAt = Date.now()
        this.live.delete(id)
        this.save()
        this.notify()
      })
    })
  }
}
