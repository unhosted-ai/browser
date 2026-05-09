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
// Built-in IDs cover the auto-discovered local providers + the canonical
// cloud entry. User-added endpoints get a string id of shape "custom:<uuid>"
// — handled as the same shape on the wire, just not enumerated here.
export type ProviderId = "ollama" | "lmstudio" | "llamacpp" | "mlx" | "openai" | string

export type ProviderStatus = "online" | "offline" | "unknown" | "needs-key"

export type ProviderInfo = {
  id: ProviderId
  label: string
  endpoint: string
  status: ProviderStatus
  models: string[]
  /** True when this provider requires an Authorization header (cloud / authed custom). */
  authed?: boolean
  /** True when the user added it manually via settings; lets the renderer offer a "remove" affordance. */
  custom?: boolean
}

// ── User settings (persisted in main; secrets encrypted via safeStorage) ─
export type CustomEndpoint = {
  id: string         // "custom:<uuid>"
  label: string      // user-supplied display name
  endpoint: string   // base URL, e.g. https://api.together.xyz
  hasApiKey: boolean // whether an encrypted key is stored — never the key itself
}

export type UserSettings = {
  /** Whether OpenAI cloud is enabled (requires key). False keeps the agent local-only. */
  openaiEnabled: boolean
  /** Whether an OpenAI key is configured. Never returns the key value to the renderer. */
  openaiHasKey: boolean
  /** User-added custom OpenAI-compatible endpoints. */
  customEndpoints: CustomEndpoint[]
  /**
   * Which provider the agent should prefer:
   * - "auto"   — first online local; falls through to cloud if user enabled it
   * - other    — pin to a specific provider id (and optionally a model)
   */
  defaultProvider: { id: "auto" | ProviderId; model?: string }
}

// What the renderer can write. Sensitive fields (api keys) come in as
// plaintext over IPC and are encrypted in main before being persisted.
export type SettingsUpdate =
  | { kind: "openaiEnabled"; value: boolean }
  | { kind: "openaiKey"; value: string | null }   // null clears
  | { kind: "addCustomEndpoint"; label: string; endpoint: string; apiKey?: string }
  | { kind: "removeCustomEndpoint"; id: string }
  | { kind: "defaultProvider"; id: "auto" | ProviderId; model?: string }

// ── Agent (Phase 1: chat) ───────────────────────────────
export type AgentRole = "user" | "assistant" | "system"

export type AgentMessage = {
  id: string
  role: AgentRole
  text: string
  // When true, this message is still streaming (assistant only).
  streaming?: boolean
  error?: string
}

export type AgentStatus = "idle" | "submitting" | "streaming" | "error"

// Event stream from main → renderer for an in-flight chat task.
export type AgentEvent =
  | { type: "task_start"; taskId: string; assistantId: string }
  | { type: "text_delta"; taskId: string; assistantId: string; delta: string }
  | { type: "task_done";  taskId: string; assistantId: string; reason: "end" | "cancelled" }
  | { type: "task_error"; taskId: string; assistantId: string; error: string }

export type AgentSendInput = {
  text: string
  // Local-first: the renderer asks main to attach the active tab's text as
  // context. Main reads it; the renderer never touches webContents directly.
  attachActivePage?: boolean
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
    /** Pixel width reserved on the left for the navigation rail. 0 = hidden. */
    setLeftNavWidth: (px: number) => Promise<void>
  }
  providers: {
    list: () => Promise<ProviderInfo[]>
    refresh: () => Promise<ProviderInfo[]>
  }
  agent: {
    send: (input: AgentSendInput) => Promise<{ taskId: string; assistantId: string }>
    cancel: (taskId: string) => Promise<void>
    onEvent: (cb: (e: AgentEvent) => void) => () => void
  }
  settings: {
    get: () => Promise<UserSettings>
    update: (u: SettingsUpdate) => Promise<UserSettings>
    onChange: (cb: (s: UserSettings) => void) => () => void
  }
}

declare global {
  interface Window {
    api: BrowserApi
  }
}
