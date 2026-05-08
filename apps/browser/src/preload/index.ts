import { contextBridge, ipcRenderer } from "electron"
import type { BrowserApi, TabsState, TabId, ProviderInfo } from "@shared/types"

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
    setSidebarOpen: (open: boolean) => ipcRenderer.invoke("layout:setSidebarOpen", open),
  },
  providers: {
    list:    () => ipcRenderer.invoke("providers:list") as Promise<ProviderInfo[]>,
    refresh: () => ipcRenderer.invoke("providers:refresh") as Promise<ProviderInfo[]>,
  },
}

contextBridge.exposeInMainWorld("api", api)
// Re-export for type narrowing where the preload bundle is consumed.
export type { BrowserApi }
// satisfy TS when TabId import isn't used at runtime
export type _TabId = TabId
