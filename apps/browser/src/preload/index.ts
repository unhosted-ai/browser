import { contextBridge, ipcRenderer } from "electron"
import type {
  AgentEvent,
  AgentMessage,
  AgentSendInput,
  Bookmark,
  BrowserApi,
  ClearScope,
  ConversationRecord,
  ConversationSummary,
  CredentialImportPreview,
  CredentialImportSelection,
  ExtensionEntry,
  DownloadEntry,
  HistoryEntry,
  Identity,
  IdentityProvider,
  PrivacyReport,
  ProviderInfo,
  SavedCredential,
  ScheduledTask,
  ScheduledTaskAction,
  ScheduledTaskInput,
  SettingsUpdate,
  MemorySample,
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
    sampleMemory:    () => ipcRenderer.invoke("tabs:sampleMemory") as Promise<MemorySample>,
    discardAllIdle:  () => ipcRenderer.invoke("tabs:discardAllIdle") as Promise<number>,
    onMemorySample:  (cb: (sample: MemorySample) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, sample: MemorySample) => cb(sample)
      ipcRenderer.on("tabs:memory", listener)
      return () => ipcRenderer.removeListener("tabs:memory", listener)
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
      ipcRenderer.on("menu:focusAddressBar",     (_e) => listener(_e, "focusAddressBar"))
      ipcRenderer.on("menu:openSettings",        (_e) => listener(_e, "openSettings"))
      ipcRenderer.on("menu:openPrivacySettings", (_e) => listener(_e, "openPrivacySettings"))
      ipcRenderer.on("menu:toggleAssistant",     (_e) => listener(_e, "toggleAssistant"))
      ipcRenderer.on("menu:openFind",            (_e) => listener(_e, "openFind"))
      return () => {
        ipcRenderer.removeAllListeners("menu:focusAddressBar")
        ipcRenderer.removeAllListeners("menu:openSettings")
        ipcRenderer.removeAllListeners("menu:openPrivacySettings")
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
    ask:    (input: AgentSendInput) => ipcRenderer.invoke("agent:ask", input),
    cancel: (taskId: string) => ipcRenderer.invoke("agent:cancel", taskId),
    onEvent: (cb: (e: AgentEvent) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, ev: AgentEvent) => cb(ev)
      ipcRenderer.on("agent:event", listener)
      return () => ipcRenderer.removeListener("agent:event", listener)
    },
    respondToPermission: (permissionId, decision) =>
      ipcRenderer.invoke("agent:respondToPermission", permissionId, decision),
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
  conversations: {
    list:   () => ipcRenderer.invoke("conversations:list") as Promise<ConversationSummary[]>,
    load:   (id: string) => ipcRenderer.invoke("conversations:load", id) as Promise<ConversationRecord | null>,
    save:   (id: string, messages: AgentMessage[]) => ipcRenderer.invoke("conversations:save", id, messages) as Promise<void>,
    delete: (id: string) => ipcRenderer.invoke("conversations:delete", id) as Promise<void>,
  },
  privacy: {
    getReport: () => ipcRenderer.invoke("privacy:getReport") as Promise<PrivacyReport>,
    reset:     () => ipcRenderer.invoke("privacy:reset") as Promise<void>,
  },
  bookmarks: {
    list:   () => ipcRenderer.invoke("bookmarks:list") as Promise<Bookmark[]>,
    add:    (url: string, title: string) => ipcRenderer.invoke("bookmarks:add", url, title) as Promise<Bookmark>,
    remove: (url: string) => ipcRenderer.invoke("bookmarks:remove", url) as Promise<boolean>,
    has:    (url: string) => ipcRenderer.invoke("bookmarks:has", url) as Promise<boolean>,
  },
  reader: {
    toggle:   (tabId: TabId) => ipcRenderer.invoke("reader:toggle", tabId) as Promise<boolean>,
    isActive: (tabId: TabId) => ipcRenderer.invoke("reader:isActive", tabId) as Promise<boolean>,
  },
  tts: {
    start:      (tabId: TabId) => ipcRenderer.invoke("tts:start", tabId) as Promise<boolean>,
    stop:       (tabId: TabId) => ipcRenderer.invoke("tts:stop", tabId) as Promise<void>,
    isSpeaking: (tabId: TabId) => ipcRenderer.invoke("tts:isSpeaking", tabId) as Promise<boolean>,
  },
  history: {
    list:      (query?: string, limit?: number) => ipcRenderer.invoke("history:list", query, limit) as Promise<HistoryEntry[]>,
    removeOne: (id: string) => ipcRenderer.invoke("history:removeOne", id) as Promise<void>,
    clear:     () => ipcRenderer.invoke("history:clear") as Promise<void>,
  },
  downloads: {
    list:      () => ipcRenderer.invoke("downloads:list") as Promise<DownloadEntry[]>,
    cancel:    (id: string) => ipcRenderer.invoke("downloads:cancel", id) as Promise<void>,
    pause:     (id: string) => ipcRenderer.invoke("downloads:pause", id) as Promise<void>,
    resume:    (id: string) => ipcRenderer.invoke("downloads:resume", id) as Promise<void>,
    removeOne: (id: string) => ipcRenderer.invoke("downloads:removeOne", id) as Promise<void>,
    clear:     () => ipcRenderer.invoke("downloads:clear") as Promise<void>,
    onChange: (cb: (entries: DownloadEntry[]) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, entries: DownloadEntry[]) => cb(entries)
      ipcRenderer.on("downloads:update", listener)
      return () => ipcRenderer.removeListener("downloads:update", listener)
    },
  },
  data: {
    clear: (scope: ClearScope) => ipcRenderer.invoke("data:clear", scope) as Promise<void>,
  },
  identity: {
    get:     () => ipcRenderer.invoke("identity:get") as Promise<Identity | null>,
    signIn:  (input: { provider: IdentityProvider; handle: string }) =>
      ipcRenderer.invoke("identity:signIn", input) as Promise<Identity>,
    signOut: () => ipcRenderer.invoke("identity:signOut") as Promise<void>,
    onChange: (cb: (id: Identity | null) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, id: Identity | null) => cb(id)
      ipcRenderer.on("identity:change", listener)
      return () => ipcRenderer.removeListener("identity:change", listener)
    },
  },
  newtabBg: {
    pickFolder: () => ipcRenderer.invoke("newtabBg:pickFolder") as Promise<string | null>,
  },
  updater: {
    check:       () => ipcRenderer.invoke("updater:check") as Promise<void>,
    openRelease: (url: string) => ipcRenderer.invoke("updater:openRelease", url) as Promise<void>,
    onAvailable: (cb) => {
      const listener = (_e: Electron.IpcRendererEvent, info: { version: string; releaseDate?: string; releaseUrl: string }) => cb(info)
      ipcRenderer.on("updater:available", listener)
      return () => ipcRenderer.removeListener("updater:available", listener)
    },
  },
  accountLock: {
    requiresUnlock: () => ipcRenderer.invoke("accountLock:requiresUnlock") as Promise<boolean>,
    verify:         (secret: string) => ipcRenderer.invoke("accountLock:verify", secret) as Promise<boolean>,
  },
  schedules: {
    list:   () => ipcRenderer.invoke("schedules:list") as Promise<ScheduledTask[]>,
    create: (input: ScheduledTaskInput) => ipcRenderer.invoke("schedules:create", input) as Promise<ScheduledTask>,
    update: (id: string, patch: Partial<ScheduledTaskInput> & { enabled?: boolean }) =>
      ipcRenderer.invoke("schedules:update", id, patch) as Promise<ScheduledTask>,
    delete: (id: string) => ipcRenderer.invoke("schedules:delete", id) as Promise<void>,
    runNow: (id: string) => ipcRenderer.invoke("schedules:runNow", id) as Promise<void>,
    onChange: (cb: (tasks: ScheduledTask[]) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, tasks: ScheduledTask[]) => cb(tasks)
      ipcRenderer.on("schedules:list", listener)
      return () => ipcRenderer.removeListener("schedules:list", listener)
    },
    onFired: (cb: (info: { id: string; label: string; action: ScheduledTaskAction }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, info: { id: string; label: string; action: ScheduledTaskAction }) => cb(info)
      ipcRenderer.on("schedules:fired", listener)
      return () => ipcRenderer.removeListener("schedules:fired", listener)
    },
  },
  credentials: {
    pickAndPreview: () => ipcRenderer.invoke("credentials:pickAndPreview") as Promise<CredentialImportPreview | null>,
    importSelected: (selection: CredentialImportSelection) => ipcRenderer.invoke("credentials:importSelected", selection) as Promise<number>,
    list:           () => ipcRenderer.invoke("credentials:list") as Promise<SavedCredential[]>,
    listForOrigin:  (origin: string) => ipcRenderer.invoke("credentials:listForOrigin", origin) as Promise<SavedCredential[]>,
    remove:         (id: string) => ipcRenderer.invoke("credentials:remove", id) as Promise<void>,
    fillActive:     (id: string) => ipcRenderer.invoke("credentials:fillActive", id) as Promise<boolean>,
    onChange: (cb: (creds: SavedCredential[]) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, creds: SavedCredential[]) => cb(creds)
      ipcRenderer.on("credentials:change", listener)
      return () => ipcRenderer.removeListener("credentials:change", listener)
    },
  },
  defaultBrowser: {
    isDefault:  () => ipcRenderer.invoke("defaultBrowser:isDefault") as Promise<boolean>,
    setDefault: () => ipcRenderer.invoke("defaultBrowser:setDefault") as Promise<boolean>,
  },
  extensions: {
    list:       () => ipcRenderer.invoke("extensions:list") as Promise<ExtensionEntry[]>,
    pickAndAdd: () => ipcRenderer.invoke("extensions:pickAndAdd") as Promise<ExtensionEntry | null>,
    remove:     (id: string) => ipcRenderer.invoke("extensions:remove", id) as Promise<void>,
    reload:     (id: string) => ipcRenderer.invoke("extensions:reload", id) as Promise<ExtensionEntry>,
    onChange: (cb: (list: ExtensionEntry[]) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, list: ExtensionEntry[]) => cb(list)
      ipcRenderer.on("extensions:change", listener)
      return () => ipcRenderer.removeListener("extensions:change", listener)
    },
  },
  secondBrain: {
    pickAndInit: () => ipcRenderer.invoke("secondBrain:pickAndInit") as Promise<{ path: string; fileCount: number; totalBytes: number; initialised: boolean } | null>,
    reinit:      () => ipcRenderer.invoke("secondBrain:reinit") as Promise<{ path: string; fileCount: number; totalBytes: number; initialised: boolean } | null>,
    status:      () => ipcRenderer.invoke("secondBrain:status") as Promise<{ path: string; fileCount: number; totalBytes: number; initialised: boolean } | null>,
    defaultPath: () => ipcRenderer.invoke("secondBrain:defaultPath") as Promise<string>,
  },
}

contextBridge.exposeInMainWorld("api", api)
// Re-export for type narrowing where the preload bundle is consumed.
export type { BrowserApi }
// satisfy TS when TabId import isn't used at runtime
export type _TabId = TabId
