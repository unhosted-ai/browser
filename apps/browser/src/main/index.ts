import { app, BrowserWindow, ipcMain, Menu, protocol, systemPreferences } from "electron"
import { join } from "node:path"
import { TabManager } from "./tabs"
import { listProviders } from "./providers"
import { Agent } from "./agent"
import { SettingsStore } from "./settings"
import { ConversationStore } from "./conversations"
import { registerNewtabProtocol } from "./newtab"
import { buildMenu } from "./menu"
import { PrivacyStore, TrackerBlocker } from "./privacy"
import { setExtendedTrackerListEnabled } from "./tracker-list"
import { BookmarkStore } from "./bookmarks"
import { isReaderActive, toggleReader } from "./reader"
import { isSpeaking, startSpeaking, stopSpeaking } from "./tts"
import { HistoryStore } from "./history"
import { DownloadsManager } from "./downloads"
import { clearBrowsingData } from "./browsing-data"
import { pickFolder } from "./newtab-bg"
import type { AgentMessage, AgentSendInput, ClearScope, SettingsUpdate, TabId } from "@shared/types"

const isDev = !app.isPackaged

// The custom delta:// scheme must be declared as privileged BEFORE app is
// ready. Marking it `standard` lets it behave like http:// (relative paths,
// origin model); `secure` lets fetch + service workers work; `supportFetchAPI`
// lets `protocol.handle` use Request/Response.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "delta",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
])

let mainWindow: BrowserWindow | null = null
let tabs: TabManager | null = null
let agent: Agent | null = null
let settings: SettingsStore | null = null
let conversations: ConversationStore | null = null
let privacy: PrivacyStore | null = null
let blocker: TrackerBlocker | null = null
let bookmarks: BookmarkStore | null = null
let history: HistoryStore | null = null
let downloads: DownloadsManager | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: "Delta",
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 480,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0c0c0e",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once("ready-to-show", () => mainWindow?.show())

  // Load the renderer (Vite dev server in dev, bundled file in prod).
  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }

  tabs = new TabManager(mainWindow)
  // settings is already constructed in app.whenReady (before the tracker
  // blocker binds). We assert non-null here — the createWindow path
  // can't run without it.
  if (!settings) throw new Error("settings store wasn't initialised before createWindow")
  conversations = new ConversationStore()
  agent = new Agent({
    emit: (event) => mainWindow?.webContents.send("agent:event", event),
    readActivePage: () => tabs!.readActivePage(),
    settings,
    tabs: tabs!,
  })
  // Push settings changes to the renderer so the panel + provider list
  // stay in sync without polling.
  settings.onChange((s) => mainWindow?.webContents.send("settings:change", s))
  registerIpc()

  // Native menu — gives us global keyboard accelerators that fire even
  // when focus is inside a WebContentsView, plus a real macOS menu bar.
  Menu.setApplicationMenu(buildMenu({ win: mainWindow!, tabs: tabs! }))

  // Open one tab on first paint — defaults to delta://newtab.
  mainWindow.webContents.once("did-finish-load", () => {
    tabs?.create()
  })
}

function registerIpc(): void {
  if (!tabs) return
  const t = tabs

  ipcMain.handle("tabs:list",     () => t.getState())
  ipcMain.handle("tabs:create",   (_e, url?: string) => t.create(url))
  ipcMain.handle("tabs:close",    (_e, id: TabId) => t.close(id))
  ipcMain.handle("tabs:activate", (_e, id: TabId) => t.activate(id))
  ipcMain.handle("tabs:navigate", (_e, id: TabId, url: string) => t.navigate(id, url))
  ipcMain.handle("tabs:back",     (_e, id: TabId) => t.back(id))
  ipcMain.handle("tabs:forward",  (_e, id: TabId) => t.forward(id))
  ipcMain.handle("tabs:reload",   (_e, id: TabId) => t.reload(id))

  ipcMain.handle("layout:setRightReservation", (_e, px: number) => t.setRightReservation(px))
  ipcMain.handle("layout:setLeftNavWidth",     (_e, px: number) => t.setLeftNavWidth(px))

  ipcMain.handle("providers:list",    () => listProviders(settings ?? undefined))
  ipcMain.handle("providers:refresh", () => listProviders(settings ?? undefined))

  ipcMain.handle("settings:get",    () => settings?.get())
  ipcMain.handle("settings:update", (_e, update: SettingsUpdate) => settings?.apply(update))

  // Find in page
  ipcMain.handle("find:start", (_e, query: string, opts?: { findNext?: boolean; forward?: boolean }) => t.startFindInActive(query, opts))
  ipcMain.handle("find:stop",  () => t.stopFindInActive())

  // Conversation persistence (Phase 5 prep — for now, the renderer drives
  // saves on idle transitions; the store is just a key-value JSON layer).
  ipcMain.handle("conversations:list",   () => conversations?.list() ?? [])
  ipcMain.handle("conversations:load",   (_e, id: string) => conversations?.load(id) ?? null)
  ipcMain.handle("conversations:save",   (_e, id: string, messages: AgentMessage[]) => { conversations?.save(id, messages) })
  ipcMain.handle("conversations:delete", (_e, id: string) => { conversations?.delete(id) })

  // Privacy report — read by Settings → Privacy and the newtab card.
  ipcMain.handle("privacy:getReport", () => privacy?.getReport())
  ipcMain.handle("privacy:reset",     () => { privacy?.reset() })

  // Bookmarks — local-only, no sync.
  ipcMain.handle("bookmarks:list",   () => bookmarks?.list() ?? [])
  ipcMain.handle("bookmarks:add",    (_e, url: string, title: string) => bookmarks?.add(url, title))
  ipcMain.handle("bookmarks:remove", (_e, url: string) => bookmarks?.remove(url) ?? false)
  ipcMain.handle("bookmarks:has",    (_e, url: string) => bookmarks?.has(url) ?? false)

  // Reader mode — Mozilla Readability injected into the active tab.
  ipcMain.handle("reader:toggle", async (_e, id: TabId) => {
    const view = t.getView(id)
    if (!view) return false
    return toggleReader(view)
  })
  ipcMain.handle("reader:isActive", (_e, id: TabId) => {
    const view = t.getView(id)
    return view ? isReaderActive(view) : false
  })

  // Listen / TTS — Web Speech API on the page.
  ipcMain.handle("tts:start", async (_e, id: TabId) => {
    const view = t.getView(id)
    if (!view) return false
    return startSpeaking(view)
  })
  ipcMain.handle("tts:stop", async (_e, id: TabId) => {
    const view = t.getView(id)
    if (view) await stopSpeaking(view)
  })
  ipcMain.handle("tts:isSpeaking", (_e, id: TabId) => {
    const view = t.getView(id)
    return view ? isSpeaking(view) : false
  })

  // History
  ipcMain.handle("history:list",      (_e, query?: string, limit?: number) => history?.list({ query, limit }) ?? [])
  ipcMain.handle("history:removeOne", (_e, id: string) => { history?.removeOne(id) })
  ipcMain.handle("history:clear",     () => { history?.clear() })

  // Downloads
  ipcMain.handle("downloads:list",      () => downloads?.list() ?? [])
  ipcMain.handle("downloads:cancel",    (_e, id: string) => { downloads?.cancel(id) })
  ipcMain.handle("downloads:pause",     (_e, id: string) => { downloads?.pause(id) })
  ipcMain.handle("downloads:resume",    (_e, id: string) => { downloads?.resume(id) })
  ipcMain.handle("downloads:removeOne", (_e, id: string) => { downloads?.removeOne(id) })
  ipcMain.handle("downloads:clear",     () => { downloads?.clear() })

  // Clear browsing data (cookies / cache / history / downloads).
  ipcMain.handle("data:clear", async (_e, scope: ClearScope) => {
    await clearBrowsingData(scope, { history, downloads })
  })

  // New-tab background folder picker — opens a native dialog and returns
  // the chosen path. The renderer then writes it via settings:update.
  ipcMain.handle("newtabBg:pickFolder", async () => {
    return await pickFolder(mainWindow)
  })

  // Agent (Phase 1: chat + Phase 2: read tools + Phase 3: act tools).
  // Streaming events are pushed via "agent:event".
  ipcMain.handle("agent:send",   (_e, input: AgentSendInput) => agent?.send(input))
  ipcMain.handle("agent:ask",    (_e, input: AgentSendInput) => agent?.ask(input))
  ipcMain.handle("agent:cancel", (_e, taskId: string) => agent?.cancel(taskId))
  ipcMain.handle("agent:respondToPermission", (_e, permissionId: string, decision: "allow" | "block" | "always_allow") => agent?.resolvePermission(permissionId, decision))

  // Push tab state changes to the renderer.
  t.onUpdate((state) => {
    mainWindow?.webContents.send("tabs:update", state)
  })
}

app.setName("Delta")

// Opt-in app lock: if the user has flipped requireBiometric in settings, we
// prompt for Touch ID (or fail-closed on platforms without it) before
// creating any window. Done in a tiny pre-pass so the store isn't built
// against the keychain until after the user's identity is confirmed.
async function biometricGatePassed(): Promise<boolean> {
  // Read settings.json directly via the SettingsStore — we don't keep the
  // instance around past this check because the main flow re-instantiates
  // it inside createWindow().
  const pre = new SettingsStore()
  if (!pre.get().requireBiometric) return true

  if (process.platform !== "darwin" || !systemPreferences.canPromptTouchID()) {
    // The toggle was set on a machine that can't prompt biometrics — likely
    // a settings.json copied from another OS. Fail-open with a console
    // note rather than locking the user out of their own browser; the UI
    // disables the toggle on these platforms so this is a recovery path.
    console.warn("[delta] requireBiometric is set but Touch ID is unavailable; opening anyway.")
    return true
  }

  try {
    await systemPreferences.promptTouchID("unlock delta")
    return true
  } catch {
    return false
  }
}

app.whenReady().then(async () => {
  if (!(await biometricGatePassed())) {
    app.quit()
    return
  }
  // macOS dock icon during dev — the packaged app gets its icon from
  // build/icon.icns via electron-builder, but in dev the binary still ships
  // with the default Electron mark unless we override here.
  if (process.platform === "darwin" && isDev && app.dock) {
    try {
      app.dock.setIcon(join(__dirname, "../../build/icon.png"))
    } catch {
      // Best-effort; if the icon file isn't present, just skip.
    }
  }
  // Settings — lifted ahead of the tracker blocker so the extended-list
  // toggle (useExtendedTrackerList) is honoured from the very first
  // request. Without this, the blocker binds before settings exist and
  // the user's "off" preference wouldn't apply until the next launch.
  settings = new SettingsStore()
  setExtendedTrackerListEnabled(settings.get().useExtendedTrackerList)
  settings.onChange((s) => setExtendedTrackerListEnabled(s.useExtendedTrackerList))

  // Privacy: build the store + bind the blocker to the default session
  // BEFORE any window is created, so the very first request through any
  // WebContentsView is already filtered. The newtab protocol handler
  // reads `privacy.getReport()` to render the inline stat card.
  privacy = new PrivacyStore()
  blocker = new TrackerBlocker(privacy)
  bookmarks = new BookmarkStore()
  history = new HistoryStore()
  downloads = new DownloadsManager()
  registerNewtabProtocol(
    () => privacy?.getReport() ?? null,
    () => {
      const s = settings?.get()
      return {
        mode: s?.newtabBackground ?? "procedural",
        folder: s?.newtabFolder ?? null,
      }
    },
  )
  createWindow()
  // Per-tab counters: every block tells the active TabManager which tab
  // owned the request, so the address-bar shield can show "N blocked here".
  blocker.onBlock((webContentsId) => tabs?.recordTrackerBlock(webContentsId))
  // Plumb the history store into TabManager so navigations are recorded.
  if (tabs && history) tabs.setHistoryStore(history)
  // Push downloads list updates to the renderer so the tray + menu list
  // reflect live progress without polling.
  downloads.onChange((entries) => mainWindow?.webContents.send("downloads:update", entries))
})

// Flush all rolling stores on quit so the last few seconds of writes
// survive. The per-store timers cover steady-state.
app.on("before-quit", () => {
  privacy?.flushNow()
  history?.flushNow()
  downloads?.flushNow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
