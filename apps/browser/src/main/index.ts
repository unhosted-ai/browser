import { app, BrowserWindow, ipcMain, protocol } from "electron"
import { join } from "node:path"
import { TabManager } from "./tabs"
import { listProviders } from "./providers"
import { Agent } from "./agent"
import { SettingsStore } from "./settings"
import { registerNewtabProtocol } from "./newtab"
import type { AgentSendInput, SettingsUpdate, TabId } from "@shared/types"

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
  settings = new SettingsStore()
  agent = new Agent({
    emit: (event) => mainWindow?.webContents.send("agent:event", event),
    readActivePage: () => tabs!.readActivePage(),
    settings,
  })
  // Push settings changes to the renderer so the panel + provider list
  // stay in sync without polling.
  settings.onChange((s) => mainWindow?.webContents.send("settings:change", s))
  registerIpc()

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

  ipcMain.handle("layout:setSidebarOpen",  (_e, open: boolean) => t.setSidebarOpen(open))
  ipcMain.handle("layout:setLeftNavWidth", (_e, px: number)    => t.setLeftNavWidth(px))

  ipcMain.handle("providers:list",    () => listProviders(settings ?? undefined))
  ipcMain.handle("providers:refresh", () => listProviders(settings ?? undefined))

  ipcMain.handle("settings:get",    () => settings?.get())
  ipcMain.handle("settings:update", (_e, update: SettingsUpdate) => settings?.apply(update))

  // Agent (Phase 1: chat). Streaming events are pushed via "agent:event".
  ipcMain.handle("agent:send",   (_e, input: AgentSendInput) => agent?.send(input))
  ipcMain.handle("agent:cancel", (_e, taskId: string) => agent?.cancel(taskId))

  // Push tab state changes to the renderer.
  t.onUpdate((state) => {
    mainWindow?.webContents.send("tabs:update", state)
  })
}

app.setName("Delta")
app.whenReady().then(() => {
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
  registerNewtabProtocol()
  createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
