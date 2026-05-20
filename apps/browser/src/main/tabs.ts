import { app, BrowserWindow, WebContentsView } from "electron"
import { randomUUID } from "node:crypto"
import type { MemorySample, Tab, TabId, TabsState } from "@shared/types"
import { clearReaderState } from "./reader"
import { clearSpeakingState } from "./tts"
import type { HistoryStore } from "./history"

// Layout constants — kept in sync with renderer chrome.
const CHROME_TOP = 80          // tab strip + address bar height

type Entry = {
  id: TabId
  /** Live WebContentsView, or null while the tab is discarded. */
  view: WebContentsView | null
  title: string
  url: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  /** Reset to 0 on each top-level navigation; bumped by TrackerBlocker. */
  trackersBlocked: number
  /** Unix ms of the most recent activation. Drives the auto-discard sweep. */
  lastActiveAt: number
  /** True iff the WebContentsView was torn down to free memory. The tab
   *  metadata (url, title, ids) is still here; activating it again will
   *  rebuild a fresh view and re-navigate to `url`. */
  discarded: boolean
}

export class TabManager {
  private win: BrowserWindow
  private entries = new Map<TabId, Entry>()
  private activeId: TabId | null = null
  private rightReservation = 0
  private leftNavWidth = 0
  private listeners = new Set<(state: TabsState) => void>()
  // Stack of recently-closed tabs (for ⌘⇧T). Captures URL + title at close
  // time; we don't keep the WebContentsView (that gets destroyed). 16-deep
  // ring is plenty for muscle-memory undo.
  private closedStack: Array<{ url: string; title: string }> = []
  private static CLOSED_STACK_MAX = 16
  /** Optional history store — set after construction (history is built in
   *  app.whenReady alongside the other stores). */
  private history: HistoryStore | null = null

  // Auto-discard. Default 30 minutes; 0 disables. Renderer can flip via
  // a future settings toggle — for now we expose the setter and run on
  // a 60s tick. Discarding does NOT touch the active tab.
  private discardAfterMs = 30 * 60 * 1000
  private discardTimer: NodeJS.Timeout | null = null
  // Soft cap on live (non-discarded) tabs. 0 = unlimited. Enforced after
  // create + revive-on-activate + when the setter tightens the cap.
  // Oldest non-active live tabs get discarded until the count is back
  // within range.
  private maxLiveTabs = 0

  constructor(win: BrowserWindow) {
    this.win = win
    win.on("resize", () => this.relayoutActive())
    // Cheap 60s sweep — the discard threshold is in minutes, not seconds,
    // so we don't need fine granularity. unref() so this doesn't hold
    // the event loop open.
    this.discardTimer = setInterval(() => this.discardSweep(), 60_000)
    this.discardTimer.unref?.()
  }

  /** How long a tab must be inactive before the sweep discards its WebContentsView.
   *  Pass 0 to disable. Wired to settings.tabDiscardMinutes. */
  setDiscardAfterMinutes(minutes: number): void {
    this.discardAfterMs = Math.max(0, Math.floor(minutes)) * 60 * 1000
  }

  /** Set the max-live-tabs soft cap. 0 = unlimited. Tightening enforces
   *  immediately by discarding the oldest non-active live tabs. */
  setMaxLiveTabs(n: number): void {
    this.maxLiveTabs = Math.max(0, Math.floor(n))
    this.enforceTabCap()
  }

  /** Discard oldest non-active live tabs until the live count is at or
   *  below maxLiveTabs. No-op when the cap is 0 (unlimited). */
  private enforceTabCap(): void {
    if (this.maxLiveTabs <= 0) return
    const live = [...this.entries.values()].filter((e) => !e.discarded && e.id !== this.activeId)
    let over = (live.length + (this.activeId ? 1 : 0)) - this.maxLiveTabs
    if (over <= 0) return
    // Oldest first by last activation.
    live.sort((a, b) => a.lastActiveAt - b.lastActiveAt)
    for (const e of live) {
      if (over <= 0) break
      this.discard(e.id)
      over -= 1
    }
  }

  /** Discard every non-active, non-already-discarded tab. Used by the
   *  RAM-pip "Discard idle tabs" button. Returns the number of tabs
   *  actually discarded so the UI can show a confirmation. */
  discardAllIdle(): number {
    let n = 0
    for (const e of this.entries.values()) {
      if (e.id === this.activeId) continue
      if (e.discarded) continue
      this.discard(e.id)
      n += 1
    }
    return n
  }

  /** Snapshot of process memory across this window's tabs + the main process.
   *  Uses app.getAppMetrics which is cheap (Chromium exposes it via IPC the
   *  same way Task Manager does). Per-tab attribution by matching the
   *  WebContents OS pid to the metrics entries.
   *
   *  Notes:
   *  - Memory units in getAppMetrics are KB (Electron docs); we report MB.
   *  - On macOS we sum workingSetSize + privateBytes-equivalent (the
   *    "Memory" column Activity Monitor shows). On other platforms we fall
   *    back to workingSetSize.
   *  - Discarded tabs contribute 0 — their WebContents is gone. */
  sampleMemory(): MemorySample {
    let total = 0
    let main = 0
    let tabs = 0
    let discarded = 0

    const metrics = app.getAppMetrics()
    const pidBytes = new Map<number, number>()
    for (const m of metrics) {
      const kb = (m.memory?.workingSetSize ?? 0) + (m.memory?.privateBytes ?? 0)
      pidBytes.set(m.pid, kb * 1024)
      if (m.type === "Browser") main += kb * 1024
      total += kb * 1024
    }

    const perTab: MemorySample["perTab"] = []
    for (const e of this.entries.values()) {
      if (e.discarded || !e.view || e.view.webContents.isDestroyed()) {
        discarded += e.discarded ? 1 : 0
        perTab.push({ id: e.id, title: e.title || "New tab", url: e.url, bytes: 0, discarded: e.discarded })
        continue
      }
      const pid = e.view.webContents.getOSProcessId()
      const bytes = pid ? (pidBytes.get(pid) ?? 0) : 0
      tabs += bytes
      perTab.push({ id: e.id, title: e.title || "New tab", url: e.url, bytes, discarded: false })
    }

    return {
      sampledAt: Date.now(),
      totalBytes: total,
      mainBytes: main,
      tabsBytes: tabs,
      tabCount: this.entries.size,
      discardedCount: discarded,
      perTab,
    }
  }

  setHistoryStore(h: HistoryStore): void {
    this.history = h
  }

  // ── Public API ──────────────────────────────────
  getState(): TabsState {
    return {
      tabs: [...this.entries.values()].map(this.toTab),
      activeId: this.activeId,
    }
  }

  onUpdate(cb: (state: TabsState) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  setRightReservation(px: number): void {
    const w = Math.max(0, Math.floor(px))
    if (this.rightReservation === w) return
    this.rightReservation = w
    this.relayoutActive()
  }

  setLeftNavWidth(px: number): void {
    const w = Math.max(0, Math.floor(px))
    if (this.leftNavWidth === w) return
    this.leftNavWidth = w
    this.relayoutActive()
  }

  create(url = "delta://newtab"): Tab {
    const id = randomUUID()
    const entry: Entry = {
      id,
      view: null,                  // filled by buildView
      title: "New tab",
      url,
      loading: true,
      canGoBack: false,
      canGoForward: false,
      trackersBlocked: 0,
      lastActiveAt: Date.now(),
      discarded: false,
    }
    this.entries.set(id, entry)
    entry.view = this.buildView(entry, url)
    this.activate(id)
    // activate() updates lastActiveAt, so the cap can rely on it to pick
    // the oldest *idle* tab when the new one pushes us over.
    this.enforceTabCap()
    return this.toTab(entry)
  }

  /** Build a fresh WebContentsView and attach all the lifecycle
   *  handlers. Used by both create() and revive(). */
  private buildView(entry: Entry, url: string): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    const wc = view.webContents
    wc.on("page-title-updated", (_e, title) => {
      entry.title = title
      // Patch the most recent history entry — page titles often arrive
      // after did-navigate (slow render).
      this.history?.updateTitle(entry.url, title)
      this.emit()
    })
    wc.on("did-start-loading", () => {
      entry.loading = true
      this.emit()
    })
    wc.on("did-stop-loading", () => {
      entry.loading = false
      entry.canGoBack = wc.navigationHistory.canGoBack()
      entry.canGoForward = wc.navigationHistory.canGoForward()
      entry.url = wc.getURL()
      this.emit()
    })
    wc.on("did-navigate", (_e, navUrl) => {
      entry.url = navUrl
      // Top-level nav resets the per-tab tracker counter — Comet/Brave
      // pattern: shield shows what was blocked on *this page*, not lifetime.
      entry.trackersBlocked = 0
      // A fresh page has fresh reader/TTS state. Drop any prior tracking
      // so the address-bar buttons return to their default look.
      clearReaderState(wc.id)
      clearSpeakingState(wc.id)
      // Record the visit for the history list.
      this.history?.record(navUrl, entry.title)
      this.emit()
    })
    wc.on("did-navigate-in-page", (_e, navUrl) => {
      entry.url = navUrl
      this.emit()
    })

    // Convert window.open() / target=_blank into Delta tabs instead of
    // letting Electron spawn a separate child BrowserWindow with no chrome.
    // OAuth flows that depend on the postMessage opener bridge may break
    // here — acceptable v1 trade-off; users overwhelmingly prefer tabs.
    wc.setWindowOpenHandler(({ url: nextUrl }) => {
      this.create(nextUrl)
      return { action: "deny" }
    })

    // Intercept internal control links from delta://newtab (and friends).
    // Anchor clicks to `delta://settings` or `delta://settings/privacy`
    // open the Settings panel via the same channel the menu uses, instead
    // of trying to load a non-existent page in the WebContentsView.
    wc.on("will-navigate", (e, navUrl) => {
      try {
        const u = new URL(navUrl)
        if (u.protocol !== "delta:") return
        if (u.hostname === "settings") {
          e.preventDefault()
          // delta://settings/privacy deep-links to the Privacy section.
          // Anything else just opens Settings to the top.
          const channel = u.pathname.startsWith("/privacy")
            ? "menu:openPrivacySettings"
            : "menu:openSettings"
          this.win.webContents.send(channel)
        }
      } catch {
        /* not a URL — ignore */
      }
    })

    void wc.loadURL(url)
    return view
  }

  /** Tear down a tab's WebContentsView to free its renderer process,
   *  but keep the Entry so the tab strip still shows it. The next
   *  activate() will rebuild from `entry.url`. The active tab is
   *  never auto-discarded. */
  discard(id: TabId): void {
    const entry = this.entries.get(id)
    if (!entry) return
    if (entry.discarded) return
    if (id === this.activeId) return
    if (entry.view && !this.win.isDestroyed()) {
      try { this.win.contentView.removeChildView(entry.view) } catch { /* destroyed */ }
    }
    if (entry.view && !entry.view.webContents.isDestroyed()) {
      try { entry.view.webContents.close() } catch { /* gone */ }
    }
    entry.view = null
    entry.discarded = true
    entry.loading = false
    this.emit()
  }

  /** Periodic sweep — discard tabs that have been inactive longer than
   *  discardAfterMs. Cheap (the inner loop just compares timestamps). */
  private discardSweep(): void {
    if (this.discardAfterMs <= 0) return
    const cutoff = Date.now() - this.discardAfterMs
    for (const e of this.entries.values()) {
      if (e.discarded) continue
      if (e.id === this.activeId) continue
      if (e.lastActiveAt < cutoff) this.discard(e.id)
    }
  }

  close(id: TabId): void {
    const entry = this.entries.get(id)
    if (!entry) return
    // Remember it for ⌘⇧T — don't push the new-tab page (no point).
    if (!entry.url.startsWith("delta:")) {
      this.closedStack.push({ url: entry.url, title: entry.title })
      if (this.closedStack.length > TabManager.CLOSED_STACK_MAX) {
        this.closedStack.shift()
      }
    }
    // Same window-close race as relayoutActive — once the BrowserWindow
    // is gone, contentView is destroyed and removeChildView throws.
    // The renderer can fire one extra tabs:close on shutdown.
    if (entry.view && !this.win.isDestroyed()) {
      try { this.win.contentView.removeChildView(entry.view) } catch { /* destroyed */ }
    }
    if (entry.view && !entry.view.webContents.isDestroyed()) {
      try { entry.view.webContents.close() } catch { /* already gone */ }
    }
    this.entries.delete(id)

    if (this.activeId === id) {
      const next = [...this.entries.keys()].pop() ?? null
      this.activeId = null
      if (next) this.activate(next)
      else this.emit()
    } else {
      this.emit()
    }
  }

  activate(id: TabId): void {
    const entry = this.entries.get(id)
    if (!entry) return
    if (this.win.isDestroyed()) return

    // Revive a discarded tab on the fly — the renderer-side click on
    // a tab strip entry will trigger activate(); rebuilding here keeps
    // the discard machinery invisible to the caller.
    const revived = entry.discarded || !entry.view
    if (revived) {
      entry.view = this.buildView(entry, entry.url)
      entry.discarded = false
      entry.loading = true
    }
    if (entry.view!.webContents.isDestroyed()) return

    // Detach previous active view
    if (this.activeId && this.activeId !== id) {
      const prev = this.entries.get(this.activeId)
      if (prev?.view && !prev.view.webContents.isDestroyed()) {
        try { this.win.contentView.removeChildView(prev.view) } catch { /* destroyed */ }
      }
    }

    this.activeId = id
    entry.lastActiveAt = Date.now()
    try { this.win.contentView.addChildView(entry.view!) } catch { return }
    this.relayoutActive()
    // A revive added one more live renderer — enforce the cap so the
    // oldest non-active live tab gets pushed out. Bypass when no revive
    // happened to keep activate cheap on the hot path.
    if (revived) this.enforceTabCap()
    this.emit()
  }

  navigate(id: TabId, url: string): void {
    const entry = this.entries.get(id)
    if (!entry) return
    // Discarded — revive then navigate. We update the entry's url so
    // revive lands on the new destination, not the old one.
    if (entry.discarded || !entry.view) {
      entry.url = url
      this.activate(id)
      return
    }
    void entry.view.webContents.loadURL(url)
  }

  back(id: TabId): void {
    const entry = this.entries.get(id)
    if (entry?.view && entry.view.webContents.navigationHistory.canGoBack()) {
      entry.view.webContents.navigationHistory.goBack()
    }
  }

  forward(id: TabId): void {
    const entry = this.entries.get(id)
    if (entry?.view && entry.view.webContents.navigationHistory.canGoForward()) {
      entry.view.webContents.navigationHistory.goForward()
    }
  }

  reload(id: TabId): void {
    const entry = this.entries.get(id)
    if (!entry) return
    // Reloading a discarded tab = reviving it; that already does a loadURL.
    if (entry.discarded || !entry.view) { this.activate(id); return }
    entry.view.webContents.reload()
  }

  /** Re-open the most recently-closed tab. ⌘⇧T. No-op when the stack is empty. */
  reopenClosed(): Tab | null {
    const last = this.closedStack.pop()
    if (!last) return null
    return this.create(last.url)
  }

  /** Activate the Nth tab (1-indexed; ⌘1..⌘9). Last tab on ⌘9 by convention. */
  activateNth(n: number): void {
    const ids = [...this.entries.keys()]
    if (ids.length === 0) return
    const idx = n === 9 ? ids.length - 1 : Math.min(n - 1, ids.length - 1)
    if (idx < 0) return
    this.activate(ids[idx]!)
  }

  // ── Find in page ─────────────────────────────────
  startFindInActive(query: string, opts?: { forward?: boolean; findNext?: boolean }): void {
    if (!this.activeId) return
    const entry = this.entries.get(this.activeId)
    if (!entry?.view || !query) return
    entry.view.webContents.findInPage(query, {
      forward: opts?.forward ?? true,
      findNext: opts?.findNext ?? false,
      matchCase: false,
    })
  }
  stopFindInActive(): void {
    if (!this.activeId) return
    const entry = this.entries.get(this.activeId)
    if (!entry?.view) return
    entry.view.webContents.stopFindInPage("clearSelection")
  }

  /**
   * Read the active tab's rendered text (innerText). Used by the agent for
   * "ask the page" context. Returns null when there's no active tab or the
   * page can't be read (cross-origin, internal pages, etc.).
   */
  async readActivePage(): Promise<{ title: string; url: string; text: string } | null> {
    if (!this.activeId) return null
    return this.readTabPage(this.activeId)
  }

  /** Read a specific tab's rendered text by id. Returns null for
   *  discarded tabs — the agent should call activate() first to revive
   *  if it needs the live text. */
  async readTabPage(id: TabId): Promise<{ title: string; url: string; text: string } | null> {
    const entry = this.entries.get(id)
    if (!entry?.view) return null
    try {
      const text = (await entry.view.webContents.executeJavaScript(
        "document.body && document.body.innerText || ''",
        true,
      )) as string
      return { title: entry.title, url: entry.url, text }
    } catch {
      return null
    }
  }

  // ── Internal ────────────────────────────────────
  private relayoutActive(): void {
    if (!this.activeId) return
    const entry = this.entries.get(this.activeId)
    if (!entry) return
    if (!entry.view) return                 // discarded — nothing to lay out
    // Late IPC + window-close race: the renderer can fire one more
    // layout:setRightReservation after the BrowserWindow + its
    // WebContentsViews are torn down. Touching getContentBounds() or
    // view.setBounds() then throws "Object has been destroyed". Skip
    // silently — there is nothing to lay out.
    if (this.win.isDestroyed()) return
    if (entry.view.webContents.isDestroyed()) return
    const { width, height } = this.win.getContentBounds()
    const right = this.rightReservation
    const leftNav = this.leftNavWidth
    entry.view.setBounds({
      x: leftNav,
      y: CHROME_TOP,
      width: Math.max(0, width - right - leftNav),
      height: Math.max(0, height - CHROME_TOP),
    })
  }

  private toTab = (e: Entry): Tab => ({
    id: e.id,
    title: e.title || "New tab",
    url: e.url,
    loading: e.loading,
    canGoBack: e.canGoBack,
    canGoForward: e.canGoForward,
    trackersBlocked: e.trackersBlocked,
    discarded: e.discarded || undefined,
  })

  /**
   * Called by TrackerBlocker when a sub-resource is cancelled. We look up
   * the entry by webContents id (cheap; small map) and bump the counter.
   * Silent no-op if the request didn't originate in any of our tabs.
   */
  recordTrackerBlock(webContentsId: number): void {
    for (const entry of this.entries.values()) {
      if (entry.view && entry.view.webContents.id === webContentsId) {
        entry.trackersBlocked += 1
        this.emit()
        return
      }
    }
  }

  /** Used by reader / TTS / bookmark IPC handlers to find the underlying view.
   *  Returns null for discarded tabs — callers must handle that (or call
   *  activate() first to revive). */
  getView(id: TabId): WebContentsView | null {
    return this.entries.get(id)?.view ?? null
  }

  /** Used by bookmark logic — best-effort current title for save. */
  getActiveTitle(): string {
    const entry = this.activeId ? this.entries.get(this.activeId) : null
    return entry?.title ?? ""
  }

  /** Used by bookmark logic — current URL for the active tab. */
  getActiveUrl(): string {
    const entry = this.activeId ? this.entries.get(this.activeId) : null
    return entry?.url ?? ""
  }

  private emit(): void {
    const state = this.getState()
    for (const cb of this.listeners) cb(state)
  }
}
