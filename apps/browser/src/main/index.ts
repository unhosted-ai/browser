import { app, BrowserWindow, ipcMain, Menu, protocol, shell, systemPreferences } from "electron"
import { join } from "node:path"
import { TabManager } from "./tabs"
import { listProviders } from "./providers"
import { Agent } from "./agent"
import { SettingsStore } from "./settings"
import { ConversationStore } from "./conversations"
import { registerNewtabProtocol } from "./newtab"
import { buildMenu } from "./menu"
import { PrivacyStore, TrackerBlocker } from "./privacy"
import { setAdBlockEnabled, setExtendedTrackerListEnabled } from "./tracker-list"
import {
  bindReferrerPolicy,
  configureDoH,
  setHttpsOnly,
  setHttpsOnlyBypass,
  setStrictReferrer,
} from "./security"
import { setupAutoUpdater } from "./updater"
import { BookmarkStore } from "./bookmarks"
import { isReaderActive, toggleReader } from "./reader"
import { isSpeaking, startSpeaking, stopSpeaking } from "./tts"
import { HistoryStore } from "./history"
import { DownloadsManager } from "./downloads"
import { clearBrowsingData } from "./browsing-data"
import { pickFolder } from "./newtab-bg"
import { IdentityStore } from "./identity"
import { SchedulesStore } from "./schedules"
import { CredentialsStore } from "./credentials"
import { ExtensionsStore } from "./extensions"
import { SecondBrainStore } from "./second-brain"
import type {
  AgentMessage,
  AgentSendInput,
  ClearScope,
  CredentialImportSelection,
  SystemCredentialEntry,
  IdentityProvider,
  ScheduledTaskInput,
  SettingsUpdate,
  TabId,
} from "@shared/types"

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
let identity: IdentityStore | null = null
let schedules: SchedulesStore | null = null
let credentials: CredentialsStore | null = null
let extensions: ExtensionsStore | null = null
const secondBrain = new SecondBrainStore()

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
  // Apply the persisted discard threshold + soft cap to the freshly-built
  // TabManager. Subsequent edits flow through settings.onChange a few
  // lines above.
  tabs.setDiscardAfterMinutes(settings.get().tabDiscardMinutes)
  tabs.setMaxLiveTabs(settings.get().maxLiveTabs)
  conversations = new ConversationStore()
  agent = new Agent({
    emit: (event) => mainWindow?.webContents.send("agent:event", event),
    readActivePage: () => tabs!.readActivePage(),
    settings,
    tabs: tabs!,
    getVaultPath: () => settings?.get().secondBrainPath ?? null,
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
    // Update check kicks off after first paint so it doesn't compete
    // with the initial UI. Toggle-gated and unsigned-build-safe.
    if (settings?.get().autoUpdateCheck) {
      setupAutoUpdater({ enabled: true, win: mainWindow })
    }
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
  // Memory pip + bulk-discard. sampleMemory is cheap (app.getAppMetrics
  // is the same call Chromium's Task Manager makes), so the renderer can
  // call it on demand; we also broadcast every 5s so the pip stays live.
  ipcMain.handle("tabs:sampleMemory",    () => t.sampleMemory())
  ipcMain.handle("tabs:discardAllIdle",  () => t.discardAllIdle())

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

  // Clear browsing data (cookies / cache / history / downloads / identity).
  ipcMain.handle("data:clear", async (_e, scope: ClearScope) => {
    await clearBrowsingData(scope, { history, downloads, identity })
  })

  // Identity — local profile personalisation, no remote account.
  // See docs/identity.md and main/identity.ts.
  ipcMain.handle("identity:get", () => identity?.get() ?? null)
  ipcMain.handle(
    "identity:signIn",
    async (_e, input: { provider: IdentityProvider; handle: string }) => {
      if (!identity) throw new Error("identity store not ready")
      return identity.signIn(input.provider, input.handle)
    },
  )
  ipcMain.handle("identity:signOut", () => { identity?.signOut() })

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

  // Account lock — local-only PIN/password. Verification stays in main;
  // the renderer only ever passes plaintext over IPC and gets a boolean.
  ipcMain.handle("accountLock:requiresUnlock", () => settings?.requiresUnlock() ?? false)
  ipcMain.handle("accountLock:verify", (_e, secret: string) => settings?.verifyAccountLock(secret) ?? false)

  // Scheduled tasks — local cron-of-one. See main/schedules.ts.
  ipcMain.handle("schedules:list",   () => schedules?.list() ?? [])
  ipcMain.handle("schedules:create", (_e, input: ScheduledTaskInput) => schedules?.create(input))
  ipcMain.handle("schedules:update", (_e, id: string, patch: Partial<ScheduledTaskInput> & { enabled?: boolean }) => schedules?.update(id, patch))
  ipcMain.handle("schedules:delete", (_e, id: string) => { schedules?.delete(id) })
  ipcMain.handle("schedules:runNow", async (_e, id: string) => { await schedules?.runNow(id) })

  // Per-site password import (see main/credentials.ts). The plaintext
  // password never crosses the IPC boundary — pickAndPreview returns
  // hints, importSelected persists with safeStorage encryption,
  // fillActive injects directly into the active tab's content.
  ipcMain.handle("credentials:pickAndPreview", async () => credentials?.pickAndPreview(mainWindow) ?? null)
  ipcMain.handle("credentials:importSelected", (_e, selection: CredentialImportSelection) => credentials?.importSelected(selection) ?? 0)
  ipcMain.handle("credentials:list", () => credentials?.list() ?? [])
  ipcMain.handle("credentials:listForOrigin", (_e, origin: string) => credentials?.listForOrigin(origin) ?? [])
  ipcMain.handle("credentials:remove", (_e, id: string) => { credentials?.remove(id) })
  ipcMain.handle("credentials:fillActive", async (_e, id: string) => {
    if (!credentials || !tabs) return false
    const activeId = tabs.getState().activeId
    const view = activeId ? tabs.getView(activeId) : null
    return credentials.fillActive(id, view?.webContents ?? null)
  })
  ipcMain.handle("credentials:listSystemPasswords", async () => credentials?.listSystemPasswords() ?? [])
  ipcMain.handle("credentials:importFromSystemPasswords", async (_e, entries: SystemCredentialEntry[]) => {
    if (!credentials) return { imported: 0, results: [] }
    return credentials.importFromSystemPasswords(entries ?? [])
  })

  // Default-browser registration. macOS: app.setAsDefaultProtocolClient
  // for http+https registers Delta with LaunchServices; the OS will
  // then offer Delta in System Settings → Desktop & Dock → Default web
  // browser. Windows: opens Settings → Default apps. Linux: xdg-mime.
  ipcMain.handle("defaultBrowser:isDefault", () => isDefaultBrowser())
  ipcMain.handle("defaultBrowser:setDefault", () => setAsDefaultBrowser())

  // Unpacked Chrome-extension loader (see main/extensions.ts).
  ipcMain.handle("extensions:list",       () => extensions?.list() ?? [])
  ipcMain.handle("extensions:pickAndAdd", () => extensions?.pickAndAdd(mainWindow) ?? null)
  ipcMain.handle("extensions:remove",     (_e, id: string) => extensions?.remove(id))
  ipcMain.handle("extensions:reload",     (_e, id: string) => extensions?.reload(id))

  // Second-brain vault (see main/second-brain.ts + apps/os/).
  ipcMain.handle("secondBrain:defaultPath", () => secondBrain.defaultPath())
  ipcMain.handle("secondBrain:status", () => {
    const path = settings?.get().secondBrainPath
    return path ? secondBrain.status(path) : null
  })
  ipcMain.handle("secondBrain:pickAndInit", async () => {
    const defaultPath = secondBrain.defaultPath()
    const chosen = await secondBrain.pickPath(mainWindow, defaultPath)
    if (!chosen) return null
    const status = secondBrain.initialise(chosen)
    settings?.apply({ kind: "secondBrainPath", value: chosen })
    return status
  })
  ipcMain.handle("secondBrain:reinit", () => {
    const path = settings?.get().secondBrainPath
    if (!path) return null
    return secondBrain.initialise(path)
  })

  ipcMain.handle("updater:openRelease", (_e, url: string) => {
    void import("./updater").then(({ openReleasePage }) => openReleasePage(url))
  })
  ipcMain.handle("updater:check", () => {
    if (settings?.get().autoUpdateCheck) {
      setupAutoUpdater({ enabled: true, win: mainWindow })
    }
  })

  // Push tab state changes to the renderer.
  t.onUpdate((state) => {
    mainWindow?.webContents.send("tabs:update", state)
  })

  // 5s memory broadcast — keeps the chrome RAM pip live without the
  // renderer polling. unref()'d so it never holds the event loop open
  // after the window closes; we also stop it if the BrowserWindow goes
  // away mid-tick.
  const memoryTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    try {
      mainWindow.webContents.send("tabs:memory", t.sampleMemory())
    } catch {
      // Window may close between the guard and the send.
    }
  }, 5000)
  memoryTimer.unref?.()
  mainWindow?.on("closed", () => clearInterval(memoryTimer))
}

app.setName("Delta")

// ── Default-browser registration ────────────────────────────────────
// macOS: app.setAsDefaultProtocolClient + LaunchServices does the work.
// Windows: there's no programmatic "make me default" for browsers since
//          Win10 — the OS forces a Settings → Default apps prompt. We
//          open that pane via shell.openExternal.
// Linux:   no portable API; we open xdg-settings via shell where possible
//          and otherwise tell the user to set it from their DE.
function isDefaultBrowser(): boolean {
  try {
    return app.isDefaultProtocolClient("http") && app.isDefaultProtocolClient("https")
  } catch { return false }
}

async function setAsDefaultBrowser(): Promise<boolean> {
  try {
    const okHttp  = app.setAsDefaultProtocolClient("http")
    const okHttps = app.setAsDefaultProtocolClient("https")
    if (process.platform === "win32") {
      // Win10/11 won't let an app silently grab default-browser; opening
      // the Settings pane is the supported path.
      await shell.openExternal("ms-settings:defaultapps")
    } else if (process.platform === "linux") {
      // Best-effort — desktops vary. Most respond to xdg-mime defaults,
      // but firing it requires our .desktop file to be installed, which
      // electron-builder handles for AppImage/.deb. If that fails we
      // open a help link.
      await shell.openExternal("https://wiki.archlinux.org/title/default_applications")
    }
    return okHttp && okHttps
  } catch (err) {
    console.warn("[delta] setAsDefaultBrowser failed:", err)
    return false
  }
}

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
  const initial = settings.get()
  setExtendedTrackerListEnabled(initial.useExtendedTrackerList)
  setAdBlockEnabled(initial.useAdBlock)
  setHttpsOnly(initial.httpsOnly)
  setHttpsOnlyBypass(initial.httpsOnlyBypass)
  setStrictReferrer(initial.strictReferrerPolicy)
  // DoH must be configured BEFORE the session is touched, which means
  // before the TrackerBlocker binds. Subsequent toggles take effect on
  // next launch — Chromium doesn't hot-swap the resolver mode.
  configureDoH({ enabled: initial.dnsOverHttps, provider: initial.dohProvider })
  settings.onChange((s) => {
    setExtendedTrackerListEnabled(s.useExtendedTrackerList)
    setAdBlockEnabled(s.useAdBlock)
    setHttpsOnly(s.httpsOnly)
    setHttpsOnlyBypass(s.httpsOnlyBypass)
    setStrictReferrer(s.strictReferrerPolicy)
    tabs?.setDiscardAfterMinutes(s.tabDiscardMinutes)
    tabs?.setMaxLiveTabs(s.maxLiveTabs)
  })

  // Privacy: build the store + bind the blocker to the default session
  // BEFORE any window is created, so the very first request through any
  // WebContentsView is already filtered. The newtab protocol handler
  // reads `privacy.getReport()` to render the inline stat card.
  privacy = new PrivacyStore()
  blocker = new TrackerBlocker(privacy)
  // Strict referrer policy lives on its own listener slot
  // (onBeforeSendHeaders) so it composes with the blocker rather than
  // having to share onBeforeRequest.
  bindReferrerPolicy()
  bookmarks = new BookmarkStore()
  history = new HistoryStore()
  downloads = new DownloadsManager()
  identity = new IdentityStore()
  identity.onChange((id) => mainWindow?.webContents.send("identity:change", id))
  schedules = new SchedulesStore()
  credentials = new CredentialsStore()
  credentials.onChange((creds) => mainWindow?.webContents.send("credentials:change", creds))
  extensions = new ExtensionsStore()
  extensions.onChange((list) => mainWindow?.webContents.send("extensions:change", list))
  // Load any persisted unpacked extensions into the default session.
  // Done before createWindow so they're hot when the first tab paints.
  // Failures are non-fatal — each entry captures its lastError.
  await extensions.loadAll()
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
  // Bind the scheduler now that mainWindow + tabs + agent exist. The
  // Scheduler timers re-arm on each fire; the bind() call kicks them
  // off for tasks that were saved between launches.
  schedules.bind({
    openTab: (url) => { tabs?.create(url) },
    runAgentPrompt: async (prompt) => {
      // Fresh agent task — appears in the sidebar history as its own
      // conversation. Doesn't attach the active page (the scheduled
      // task should be self-contained).
      try { await agent?.send({ text: prompt, attachActivePage: false }) }
      catch (err) { console.warn("[schedules] agent send failed:", err) }
    },
    emit: (event) => {
      if (event.type === "list") {
        mainWindow?.webContents.send("schedules:list", event.tasks)
      } else if (event.type === "fired") {
        mainWindow?.webContents.send("schedules:fired", {
          id: event.id, label: event.label, action: event.action,
        })
      }
    },
  })
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
