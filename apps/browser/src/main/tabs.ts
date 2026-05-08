import { BrowserWindow, WebContentsView } from "electron"
import { randomUUID } from "node:crypto"
import type { Tab, TabId, TabsState } from "@shared/types"

// Layout constants — kept in sync with renderer chrome.
const CHROME_TOP = 80          // tab strip + address bar height
const SIDEBAR_WIDTH = 360      // when open

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
  private sidebarOpen = false
  private listeners = new Set<(state: TabsState) => void>()

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

  setSidebarOpen(open: boolean): void {
    if (this.sidebarOpen === open) return
    this.sidebarOpen = open
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

    void wc.loadURL(url)
    this.activate(id)
    return this.toTab(entry)
  }

  close(id: TabId): void {
    const entry = this.entries.get(id)
    if (!entry) return
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

  /**
   * Read the active tab's rendered text (innerText). Used by the agent for
   * "ask the page" context. Returns null when there's no active tab or the
   * page can't be read (cross-origin, internal pages, etc.).
   */
  async readActivePage(): Promise<{ title: string; url: string; text: string } | null> {
    if (!this.activeId) return null
    const entry = this.entries.get(this.activeId)
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
    const sidebar = this.sidebarOpen ? SIDEBAR_WIDTH : 0
    entry.view.setBounds({
      x: 0,
      y: CHROME_TOP,
      width: Math.max(0, width - sidebar),
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
