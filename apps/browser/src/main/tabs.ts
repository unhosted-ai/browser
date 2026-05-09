import { BrowserWindow, WebContentsView } from "electron"
import { randomUUID } from "node:crypto"
import type { Tab, TabId, TabsState } from "@shared/types"

// Layout constants — kept in sync with renderer chrome.
const CHROME_TOP = 80          // tab strip + address bar height

type Entry = {
  id: TabId
  view: WebContentsView
  title: string
  url: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
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

  constructor(win: BrowserWindow) {
    this.win = win
    win.on("resize", () => this.relayoutActive())
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
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    const entry: Entry = {
      id,
      view,
      title: "New tab",
      url,
      loading: true,
      canGoBack: false,
      canGoForward: false,
    }
    this.entries.set(id, entry)

    const wc = view.webContents
    wc.on("page-title-updated", (_e, title) => {
      entry.title = title
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

    void wc.loadURL(url)
    this.activate(id)
    return this.toTab(entry)
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
    this.win.contentView.removeChildView(entry.view)
    entry.view.webContents.close()
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

    // Detach previous active view
    if (this.activeId && this.activeId !== id) {
      const prev = this.entries.get(this.activeId)
      if (prev) this.win.contentView.removeChildView(prev.view)
    }

    this.activeId = id
    this.win.contentView.addChildView(entry.view)
    this.relayoutActive()
    this.emit()
  }

  navigate(id: TabId, url: string): void {
    const entry = this.entries.get(id)
    if (!entry) return
    void entry.view.webContents.loadURL(url)
  }

  back(id: TabId): void {
    const entry = this.entries.get(id)
    if (entry?.view.webContents.navigationHistory.canGoBack()) {
      entry.view.webContents.navigationHistory.goBack()
    }
  }

  forward(id: TabId): void {
    const entry = this.entries.get(id)
    if (entry?.view.webContents.navigationHistory.canGoForward()) {
      entry.view.webContents.navigationHistory.goForward()
    }
  }

  reload(id: TabId): void {
    this.entries.get(id)?.view.webContents.reload()
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
    if (!entry || !query) return
    entry.view.webContents.findInPage(query, {
      forward: opts?.forward ?? true,
      findNext: opts?.findNext ?? false,
      matchCase: false,
    })
  }
  stopFindInActive(): void {
    if (!this.activeId) return
    const entry = this.entries.get(this.activeId)
    if (!entry) return
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

  /** Read a specific tab's rendered text by id. */
  async readTabPage(id: TabId): Promise<{ title: string; url: string; text: string } | null> {
    const entry = this.entries.get(id)
    if (!entry) return null
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
  })

  private emit(): void {
    const state = this.getState()
    for (const cb of this.listeners) cb(state)
  }
}
