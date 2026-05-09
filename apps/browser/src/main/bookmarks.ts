// Local-only bookmark store. Single JSON file in userData. No sync, no
// cloud, ever — same posture as the rest of Delta. The renderer talks
// to it through the IPC handlers wired in main/index.ts.
//
// Schema is intentionally flat (no folders, no tags) for v1. Folders +
// search land when there's enough volume to justify the UI; right now a
// linear list is the right shape for a thousand bookmarks or fewer.

import { app } from "electron"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { randomUUID } from "node:crypto"

export type Bookmark = {
  id: string
  url: string
  title: string
  addedAt: number
}

type SerializedStore = {
  version: 1
  bookmarks: Bookmark[]
}

const VERSION = 1

export class BookmarkStore {
  private bookmarks: Bookmark[] = []
  private filePath: string

  constructor() {
    this.filePath = join(app.getPath("userData"), "bookmarks.json")
    this.load()
  }

  // ── Lifecycle ──────────────────────────────────────────
  private load(): void {
    if (!existsSync(this.filePath)) return
    try {
      const raw = readFileSync(this.filePath, "utf8")
      const parsed = JSON.parse(raw) as SerializedStore
      if (parsed?.version === VERSION && Array.isArray(parsed.bookmarks)) {
        this.bookmarks = parsed.bookmarks
      }
    } catch {
      // Corrupt file → start fresh. The user's bookmarks are user data,
      // but a corrupt blob shouldn't take the browser down.
    }
  }

  private save(): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      const out: SerializedStore = { version: VERSION, bookmarks: this.bookmarks }
      writeFileSync(this.filePath, JSON.stringify(out, null, 2), "utf8")
    } catch {
      // Best-effort. A failed write is logged-but-non-fatal.
    }
  }

  // ── Public ────────────────────────────────────────────
  list(): Bookmark[] {
    // Sort newest-first for the menu list view.
    return [...this.bookmarks].sort((a, b) => b.addedAt - a.addedAt)
  }

  /** Idempotent — no-op when the URL is already bookmarked. */
  add(url: string, title: string): Bookmark {
    const existing = this.bookmarks.find((b) => b.url === url)
    if (existing) {
      // Refresh title in case the page renamed itself.
      if (title && existing.title !== title) {
        existing.title = title
        this.save()
      }
      return existing
    }
    const next: Bookmark = {
      id: randomUUID(),
      url,
      title: title || url,
      addedAt: Date.now(),
    }
    this.bookmarks.push(next)
    this.save()
    return next
  }

  /** Removes by URL — what the address-bar star toggle needs. */
  remove(url: string): boolean {
    const before = this.bookmarks.length
    this.bookmarks = this.bookmarks.filter((b) => b.url !== url)
    if (this.bookmarks.length !== before) {
      this.save()
      return true
    }
    return false
  }

  has(url: string): boolean {
    return this.bookmarks.some((b) => b.url === url)
  }
}
