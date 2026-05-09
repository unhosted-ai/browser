import { contextBridge, ipcRenderer } from "electron"
import type {
  AgentEvent,
  AgentSendInput,
  BrowserApi,
  ProviderInfo,
  SettingsUpdate,
  TabId,
  TabsState,
  UserSettings,
} from "@shared/types"

const api: BrowserApi = {
  tabs: {
    list:     () => ipcRenderer.invoke("tabs:list"),
    create:   (url) => ipcRenderer.invoke("tabs:create", url),
    close:    (id) => ipcRenderer.invoke("tabs:close", id),
    activate: (id) => ipcRenderer.invoke("tabs:activate", id),
    navigate: (id, url) => ipcRenderer.invoke("tabs:navigate", id, url),
    back:     (id) => ipcRenderer.invoke("tabs:back", id),
    forward:  (id) => ipcRenderer.invoke("tabs:forward", id),
    reload:   (id) => ipcRenderer.invoke("tabs:reload", id),
    onUpdate: (cb: (state: TabsState) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, state: TabsState) => cb(state)
      ipcRenderer.on("tabs:update", listener)
      return () => ipcRenderer.removeListener("tabs:update", listener)
    },
  },
  layout: {
    setRightReservation: (px: number) => ipcRenderer.invoke("layout:setRightReservation", px),
    setLeftNavWidth:     (px: number) => ipcRenderer.invoke("layout:setLeftNavWidth", px),
  },
  find: {
    start: (query: string, opts?: { forward?: boolean; findNext?: boolean }) => ipcRenderer.invoke("find:start", query, opts),
    stop:  () => ipcRenderer.invoke("find:stop"),
  },
  menu: {
    onAction: (cb) => {
      const listener = (_e: Electron.IpcRendererEvent, kind: string) => cb(kind as Parameters<typeof cb>[0])
      ipcRenderer.on("menu:focusAddressBar", (_e) => listener(_e, "focusAddressBar"))
      ipcRenderer.on("menu:openSettings",    (_e) => listener(_e, "openSettings"))
      ipcRenderer.on("menu:toggleAssistant", (_e) => listener(_e, "toggleAssistant"))
      ipcRenderer.on("menu:openFind",        (_e) => listener(_e, "openFind"))
      return () => {
        ipcRenderer.removeAllListeners("menu:focusAddressBar")
        ipcRenderer.removeAllListeners("menu:openSettings")
        ipcRenderer.removeAllListeners("menu:toggleAssistant")
        ipcRenderer.removeAllListeners("menu:openFind")
      }
    },
  },
  providers: {
    list:    () => ipcRenderer.invoke("providers:list") as Promise<ProviderInfo[]>,
    refresh: () => ipcRenderer.invoke("providers:refresh") as Promise<ProviderInfo[]>,
  },
  agent: {
    send:   (input: AgentSendInput) => ipcRenderer.invoke("agent:send", input),
    cancel: (taskId: string) => ipcRenderer.invoke("agent:cancel", taskId),
    onEvent: (cb: (e: AgentEvent) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, ev: AgentEvent) => cb(ev)
      ipcRenderer.on("agent:event", listener)
      return () => ipcRenderer.removeListener("agent:event", listener)
    },
  },
  settings: {
    get:    () => ipcRenderer.invoke("settings:get") as Promise<UserSettings>,
    update: (u: SettingsUpdate) => ipcRenderer.invoke("settings:update", u) as Promise<UserSettings>,
    onChange: (cb: (s: UserSettings) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, s: UserSettings) => cb(s)
      ipcRenderer.on("settings:change", listener)
      return () => ipcRenderer.removeListener("settings:change", listener)
    },
  },
}

contextBridge.exposeInMainWorld("api", api)
// Re-export for type narrowing where the preload bundle is consumed.
export type { BrowserApi }
// satisfy TS when TabId import isn't used at runtime
export type _TabId = TabId
