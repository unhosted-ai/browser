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
  /**
   * Wire-format dialect. "openai" covers OpenAI itself plus all OpenAI-
   * compatible providers (Ollama /v1, LM Studio, llama.cpp, MLX, custom
   * endpoints). "anthropic" uses /v1/messages with content-block tool
   * shapes — see main/adapters/anthropic.ts.
   */
  kind?: "openai" | "anthropic"
}

// ── User settings (persisted in main; secrets encrypted via safeStorage) ─
export type CustomEndpoint = {
  id: string         // "custom:<uuid>"
  label: string      // user-supplied display name
  endpoint: string   // base URL, e.g. https://api.together.xyz
  hasApiKey: boolean // whether an encrypted key is stored — never the key itself
}

export type UserSettings = {
  /** OpenAI cloud — off by default, requires both a key and the toggle. */
  openaiEnabled: boolean
  openaiHasKey: boolean
  /** Anthropic cloud — same shape; uses the /v1/messages adapter. */
  anthropicEnabled: boolean
  anthropicHasKey: boolean
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
  | { kind: "openaiKey"; value: string | null }
  | { kind: "anthropicEnabled"; value: boolean }
  | { kind: "anthropicKey"; value: string | null }
  | { kind: "addCustomEndpoint"; label: string; endpoint: string; apiKey?: string }
  | { kind: "removeCustomEndpoint"; id: string }
  | { kind: "defaultProvider"; id: "auto" | ProviderId; model?: string }

// ── Persisted conversation history (one JSON file per conversation) ──
export type ConversationSummary = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export type ConversationRecord = {
  id: string
  createdAt: number
  updatedAt: number
  messages: AgentMessage[]
}

// ── Agent (Phase 1: chat + Phase 2: read tools) ─────────
export type AgentRole = "user" | "assistant" | "system"

// One tool the model can be told it has access to. Schema is JSON-Schema
// draft-7 style; enough for what the OpenAI / Ollama / LM Studio /
// llama.cpp / MLX wire format expects.
export type ToolDef = {
  name: string
  description: string
  schema: { type: "object"; properties?: Record<string, unknown>; required?: string[] }
  /** Permission tier — see docs/agent-design.md §3. v1 ships only `read`. */
  side: "read" | "act"
}

// One observed tool call inside the conversation. Renderer renders a card
// per call; main is the only side that ever runs the handler.
export type ToolCallView = {
  id: string         // provider-issued
  name: string
  args: unknown      // parsed JSON, may be {} when the model omitted args
  result?: unknown   // serialised; truncated for display
  error?: string
  durationMs?: number
}

export type AgentMessage = {
  id: string
  role: AgentRole
  text: string
  // When true, this message is still streaming (assistant only).
  streaming?: boolean
  error?: string
  // Tool calls that this assistant message issued. Cards render in-line.
  toolCalls?: ToolCallView[]
}

export type AgentStatus = "idle" | "submitting" | "streaming" | "error"

// Event stream from main → renderer for an in-flight chat task.
export type AgentEvent =
  | { type: "task_start"; taskId: string; assistantId: string }
  | { type: "text_delta"; taskId: string; assistantId: string; delta: string }
  | { type: "tool_call";  taskId: string; assistantId: string; call: ToolCallView }
  | { type: "task_done";  taskId: string; assistantId: string; reason: "end" | "cancelled" | "max_tools" }
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
    /**
     * Pixel width reserved on the right of the WebContentsView for the AI
     * sidebar, the settings panel, or anything else that overlays at right:0.
     * The renderer passes the *union* (max of all open right-side panels)
     * so the page never paints under whichever panel is widest.
     */
    setRightReservation: (px: number) => Promise<void>
    /** Pixel width reserved on the left for the navigation rail. 0 = hidden. */
    setLeftNavWidth: (px: number) => Promise<void>
  }
  find: {
    start: (query: string, opts?: { forward?: boolean; findNext?: boolean }) => Promise<void>
    stop:  () => Promise<void>
  }
  /** Native menu → renderer callbacks (focus address bar, open settings, etc). */
  menu: {
    onAction: (cb: (kind: "focusAddressBar" | "openSettings" | "toggleAssistant" | "openFind") => void) => () => void
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
  conversations: {
    list:   () => Promise<ConversationSummary[]>
    load:   (id: string) => Promise<ConversationRecord | null>
    save:   (id: string, messages: AgentMessage[]) => Promise<void>
    delete: (id: string) => Promise<void>
  }
}

declare global {
  interface Window {
    api: BrowserApi
  }
}
