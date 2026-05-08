// ───────────────────────────────────────────────────────────
// Shared types between main, preload, and renderer.
// ───────────────────────────────────────────────────────────

export type TabId = string

export type Tab = {
  id: TabId
  title: string
  url: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
}

export type TabsState = {
  tabs: Tab[]
  activeId: TabId | null
}

// ── LLM provider abstraction ────────────────────────────
export type ProviderId = "ollama" | "lmstudio" | "llamacpp" | "mlx" | "api"

export type ProviderStatus = "online" | "offline" | "unknown"

export type ProviderInfo = {
  id: ProviderId
  label: string
  endpoint: string
  status: ProviderStatus
  models: string[]
}

// ── Renderer ↔ Main IPC contract ────────────────────────
export type BrowserApi = {
  tabs: {
    list: () => Promise<TabsState>
    create: (url?: string) => Promise<Tab>
    close: (id: TabId) => Promise<void>
    activate: (id: TabId) => Promise<void>
    navigate: (id: TabId, url: string) => Promise<void>
    back: (id: TabId) => Promise<void>
    forward: (id: TabId) => Promise<void>
    reload: (id: TabId) => Promise<void>
    onUpdate: (cb: (state: TabsState) => void) => () => void
  }
  layout: {
    setSidebarOpen: (open: boolean) => Promise<void>
  }
  providers: {
    list: () => Promise<ProviderInfo[]>
    refresh: () => Promise<ProviderInfo[]>
  }
}

declare global {
  interface Window {
    api: BrowserApi
  }
}
