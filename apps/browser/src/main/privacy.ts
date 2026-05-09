// Privacy runtime: tracker blocking + 30-day rolling stats.
//
// One file because the two responsibilities are tightly coupled — the
// blocker is the only writer to the store, and the store's shape exists
// only to answer the report queries the UI shows.
//
// What it does on every web request from any tab:
//   1. parse the request host
//   2. ask tracker-list.matchTracker() if it's a known tracker
//   3. cancel the request if so, and record:
//      - which tracker domain was blocked
//      - which top-frame origin contacted it (for the "X across N sites" stat)
//
// What it does on every top-frame navigation:
//   - record the origin in `sitesVisited` (denominator for the "% of sites
//     that contacted trackers" stat)
//
// Persistence:
//   - In-memory aggregate, flushed to userData/privacy.json on a 5s timer
//     and on app quit. Pruning to last 30 days happens on load.

import { app, session, type Session } from "electron"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { matchTracker, ownerOf } from "./tracker-list"

const VERSION = 1
const RETENTION_DAYS = 30
const FLUSH_INTERVAL_MS = 5_000

type DayKey = string // YYYY-MM-DD

type DayStats = {
  // tracker domain → number of blocked requests today
  blocked: Map<string, number>
  // tracker domain → set of top-frame origins that contacted it today
  trackerSites: Map<string, Set<string>>
  // every top-frame origin visited today
  sitesVisited: Set<string>
  // origins that contacted at least one tracker today
  sitesWithTrackers: Set<string>
}

type SerializedDay = {
  date: DayKey
  blocked: Record<string, number>
  trackerSites: Record<string, string[]>
  sitesVisited: string[]
  sitesWithTrackers: string[]
}

type SerializedStore = {
  version: number
  days: SerializedDay[]
}

export type PrivacyReport = {
  /** Total tracker requests blocked in the rolling window. */
  totalBlocked: number
  /** Number of distinct sites visited in the window. */
  sitesVisited: number
  /** Number of those that contacted at least one tracker. */
  sitesWithTrackers: number
  /** sitesWithTrackers / sitesVisited × 100, rounded. 0 when sitesVisited === 0. */
  percentWithTrackers: number
  /** Top entry, if any. */
  topTracker: {
    domain: string
    owner: string
    count: number
    sites: number
  } | null
  /** Top 10 trackers by block count, for the "Show More" expansion. */
  topTrackers: Array<{ domain: string; owner: string; count: number; sites: number }>
  /** Per-day block counts oldest → newest, for sparklines. Includes zero days. */
  dailyCounts: Array<{ date: DayKey; count: number }>
  /** ISO timestamp the report was generated. */
  generatedAt: string
  /** True when the runtime has the blocker engaged. */
  blockingEnabled: boolean
}

function todayKey(): DayKey {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function dayKeyAt(daysAgo: number): DayKey {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export class PrivacyStore {
  private days = new Map<DayKey, DayStats>()
  private filePath: string
  private flushTimer: NodeJS.Timeout | null = null
  private dirty = false
  /** Tracks whether the blocker has been wired up. False when constructed
   *  bare for tests; true after a TrackerBlocker is bound. */
  blockingEnabled = false

  constructor() {
    this.filePath = join(app.getPath("userData"), "privacy.json")
    this.load()
  }

  // ── Lifecycle ──────────────────────────────────────────
  /** Ensure the JSON file exists and is readable. Prunes >30-day entries. */
  private load(): void {
    if (!existsSync(this.filePath)) return
    try {
      const raw = readFileSync(this.filePath, "utf8")
      const parsed = JSON.parse(raw) as SerializedStore
      if (!parsed || parsed.version !== VERSION) return
      const cutoff = dayKeyAt(RETENTION_DAYS - 1)
      for (const d of parsed.days) {
        if (d.date < cutoff) continue
        this.days.set(d.date, {
          blocked: new Map(Object.entries(d.blocked ?? {})),
          trackerSites: new Map(
            Object.entries(d.trackerSites ?? {}).map(([k, v]) => [k, new Set(v)] as const),
          ),
          sitesVisited: new Set(d.sitesVisited ?? []),
          sitesWithTrackers: new Set(d.sitesWithTrackers ?? []),
        })
      }
    } catch {
      // Corrupt file; start fresh. Don't crash the app over a stats blob.
    }
  }

  /** Schedule an async flush. Idempotent — multiple calls coalesce. */
  private scheduleFlush(): void {
    this.dirty = true
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      if (this.dirty) this.flushNow()
    }, FLUSH_INTERVAL_MS)
  }

  /** Synchronous flush — called on `app.before-quit`. */
  flushNow(): void {
    if (!this.dirty) return
    this.dirty = false
    const out: SerializedStore = {
      version: VERSION,
      days: [...this.days.entries()].map(([date, s]) => ({
        date,
        blocked: Object.fromEntries(s.blocked),
        trackerSites: Object.fromEntries(
          [...s.trackerSites.entries()].map(([k, v]) => [k, [...v]] as const),
        ),
        sitesVisited: [...s.sitesVisited],
        sitesWithTrackers: [...s.sitesWithTrackers],
      })),
    }
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      writeFileSync(this.filePath, JSON.stringify(out), "utf8")
    } catch {
      // Best-effort. A failed write loses today's stats but never breaks the app.
    }
  }

  // ── Recording ──────────────────────────────────────────
  private dayFor(key: DayKey): DayStats {
    let s = this.days.get(key)
    if (!s) {
      s = {
        blocked: new Map(),
        trackerSites: new Map(),
        sitesVisited: new Set(),
        sitesWithTrackers: new Set(),
      }
      this.days.set(key, s)
    }
    return s
  }

  recordSiteVisit(origin: string | null): void {
    if (!origin) return
    const s = this.dayFor(todayKey())
    if (!s.sitesVisited.has(origin)) {
      s.sitesVisited.add(origin)
      this.scheduleFlush()
    }
  }

  recordBlock(trackerDomain: string, topFrameOrigin: string | null): void {
    const s = this.dayFor(todayKey())
    s.blocked.set(trackerDomain, (s.blocked.get(trackerDomain) ?? 0) + 1)
    if (topFrameOrigin) {
      let sites = s.trackerSites.get(trackerDomain)
      if (!sites) {
        sites = new Set()
        s.trackerSites.set(trackerDomain, sites)
      }
      sites.add(topFrameOrigin)
      s.sitesWithTrackers.add(topFrameOrigin)
    }
    this.scheduleFlush()
  }

  // ── Reporting ─────────────────────────────────────────
  /** Aggregate the last `RETENTION_DAYS` days into a report shape. */
  getReport(): PrivacyReport {
    const cutoff = dayKeyAt(RETENTION_DAYS - 1)
    const blocked = new Map<string, number>()
    const trackerSites = new Map<string, Set<string>>()
    const sitesVisited = new Set<string>()
    const sitesWithTrackers = new Set<string>()

    for (const [date, s] of this.days) {
      if (date < cutoff) continue
      for (const [k, v] of s.blocked) blocked.set(k, (blocked.get(k) ?? 0) + v)
      for (const [k, sites] of s.trackerSites) {
        let acc = trackerSites.get(k)
        if (!acc) {
          acc = new Set()
          trackerSites.set(k, acc)
        }
        for (const site of sites) acc.add(site)
      }
      for (const o of s.sitesVisited) sitesVisited.add(o)
      for (const o of s.sitesWithTrackers) sitesWithTrackers.add(o)
    }

    const totalBlocked = [...blocked.values()].reduce((a, b) => a + b, 0)
    const sortedTrackers = [...blocked.entries()]
      .map(([domain, count]) => ({
        domain,
        owner: ownerOf(domain),
        count,
        sites: trackerSites.get(domain)?.size ?? 0,
      }))
      .sort((a, b) => b.count - a.count || b.sites - a.sites)

    const dailyCounts: Array<{ date: DayKey; count: number }> = []
    for (let i = RETENTION_DAYS - 1; i >= 0; i--) {
      const k = dayKeyAt(i)
      const day = this.days.get(k)
      const count = day ? [...day.blocked.values()].reduce((a, b) => a + b, 0) : 0
      dailyCounts.push({ date: k, count })
    }

    const sitesVisitedCount = sitesVisited.size
    const sitesWithTrackersCount = sitesWithTrackers.size
    const percentWithTrackers = sitesVisitedCount === 0
      ? 0
      : Math.round((sitesWithTrackersCount / sitesVisitedCount) * 100)

    return {
      totalBlocked,
      sitesVisited: sitesVisitedCount,
      sitesWithTrackers: sitesWithTrackersCount,
      percentWithTrackers,
      topTracker: sortedTrackers[0] ?? null,
      topTrackers: sortedTrackers.slice(0, 10),
      dailyCounts,
      generatedAt: new Date().toISOString(),
      blockingEnabled: this.blockingEnabled,
    }
  }

  // ── Maintenance ───────────────────────────────────────
  /** Wipe everything. Surfaced via the Settings UI as "Reset privacy stats". */
  reset(): void {
    this.days.clear()
    this.scheduleFlush()
  }
}

// ──────────────────────────────────────────────────────────
// TrackerBlocker — webRequest hook over the default session.
// One per app; safe to construct after `app.ready`.
// ──────────────────────────────────────────────────────────
export class TrackerBlocker {
  constructor(private store: PrivacyStore, private sess: Session = session.defaultSession) {
    this.bind()
    this.store.blockingEnabled = true
  }

  private bind(): void {
    // onBeforeRequest fires for every navigation + sub-resource. We only
    // care about sub-resources whose host is a known tracker.
    //
    // The `details.url` is the request URL; `details.webContentsId` lets us
    // resolve the top-frame origin for the "across N websites" stat. When
    // the request comes from a service worker or the main process itself,
    // there's no webContents — we still block but don't attribute it to a
    // top-frame origin.
    this.sess.webRequest.onBeforeRequest((details, callback) => {
      try {
        const u = new URL(details.url)
        const host = u.hostname
        const tracker = matchTracker(host)
        if (!tracker) return callback({ cancel: false })

        // Don't block top-frame navigations to a tracker domain. If a user
        // explicitly types `googletagmanager.com` into the address bar, let
        // them see it. (Sub-resources of a navigation are `mainFrame: false`.)
        if (details.resourceType === "mainFrame") return callback({ cancel: false })

        const topOrigin = pickTopOrigin(details)
        this.store.recordBlock(tracker, topOrigin)
        return callback({ cancel: true })
      } catch {
        return callback({ cancel: false })
      }
    })

    // onCompleted on a mainFrame request gives us a reliable top-frame
    // origin to count for the denominator. We ignore data:/about:/delta:.
    this.sess.webRequest.onCompleted((details) => {
      if (details.resourceType !== "mainFrame") return
      try {
        const u = new URL(details.url)
        if (u.protocol !== "https:" && u.protocol !== "http:") return
        this.store.recordSiteVisit(u.origin)
      } catch {
        /* malformed URL — ignore */
      }
    })
  }
}

/**
 * Try a few sources to find the page that triggered this sub-resource:
 *   1. `details.frame.url`         — Electron 27+: the frame's URL
 *   2. `details.firstPartyUrl`     — present on some Electron versions
 *   3. `details.referrer`          — coarse fallback
 *   4. `details.initiator`         — origin string, sometimes available
 */
function pickTopOrigin(details: Electron.OnBeforeRequestListenerDetails): string | null {
  // The Electron typings don't include all of these consistently across
  // versions, so we cast through `any` to read the optional fields.
  const d = details as unknown as {
    frame?: { url?: string }
    firstPartyUrl?: string
    referrer?: string
    initiator?: string
  }
  const candidates = [d.frame?.url, d.firstPartyUrl, d.referrer, d.initiator]
  for (const c of candidates) {
    if (!c) continue
    try {
      const u = new URL(c)
      if (u.protocol === "http:" || u.protocol === "https:") return u.origin
    } catch {
      /* not a URL — try next */
    }
  }
  return null
}
