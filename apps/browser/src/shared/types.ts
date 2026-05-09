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
  /** Trackers blocked since the last top-level navigation on this tab. */
  trackersBlocked: number
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
  /**
   * Per-(origin, tool) "Always allow" entries. Set when the user clicks the
   * "Always allow on this site" button on a permission card. Cleared when
   * the user removes the entry from this list (Settings UI: future).
   * Origin is the active tab's host at the moment of the request.
   */
  permissionGrants: Array<{ origin: string; tool: string }>
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
  | { kind: "grantPermission"; origin: string; tool: string }
  | { kind: "revokePermission"; origin: string; tool: string }

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
  /** "read" tools auto-run; "act" tools route through the permission gate. */
  side?: "read" | "act"
  /** When the agent's call was blocked or auto-blocked, the reason. */
  blocked?: "user_block" | "sensitive_site"
}

// Permission request that an act-tool has triggered. The renderer renders
// a card with Allow / Block / Always-allow buttons; the user's decision
// flows back through window.api.agent.respondToPermission.
export type PermissionRequest = {
  permissionId: string
  callId: string         // matches ToolCallView.id once the tool runs
  taskId: string
  assistantId: string
  toolName: string
  args: unknown
  /** Origin (host) of the active tab when the call was issued. */
  origin: string | null
  /** Human summary of what's about to happen — we render this as the prompt. */
  summary: string
}

export type PermissionDecision = "allow" | "block" | "always_allow"

export type AgentMessage = {
  id: string
  role: AgentRole
  text: string
  // When true, this message is still streaming (assistant only).
  streaming?: boolean
  error?: string
  // Tool calls that this assistant message issued. Cards render in-line.
  toolCalls?: ToolCallView[]
  // Pending permission requests for act-tools waiting on user approval.
  // Once the user decides, the entry is dropped from this list and the
  // resulting tool call appears in toolCalls.
  pendingPermissions?: PermissionRequest[]
}

export type AgentStatus = "idle" | "submitting" | "streaming" | "error"

// Event stream from main → renderer for an in-flight chat task.
export type AgentEvent =
  | { type: "task_start"; taskId: string; assistantId: string }
  | { type: "text_delta"; taskId: string; assistantId: string; delta: string }
  | { type: "tool_call";  taskId: string; assistantId: string; call: ToolCallView }
  | { type: "permission_request";  taskId: string; assistantId: string; request: PermissionRequest }
  | { type: "permission_resolved"; taskId: string; assistantId: string; permissionId: string; decision: PermissionDecision }
  | { type: "task_done";  taskId: string; assistantId: string; reason: "end" | "cancelled" | "max_tools" }
  | { type: "task_error"; taskId: string; assistantId: string; error: string }

export type AgentSendInput = {
  text: string
  // Local-first: the renderer asks main to attach the active tab's text as
  // context. Main reads it; the renderer never touches webContents directly.
  attachActivePage?: boolean
}

// ── Bookmarks (local file, no sync) ───────────────────────────
export type Bookmark = {
  id: string
  url: string
  title: string
  addedAt: number
}

// ── History (local file, capped FIFO) ─────────────────────────
export type HistoryEntry = {
  id: string
  url: string
  title: string
  visitedAt: number
}

// ── Downloads ─────────────────────────────────────────────────
export type DownloadState = "in-progress" | "paused" | "completed" | "cancelled" | "interrupted"
export type DownloadEntry = {
  id: string
  filename: string
  url: string
  savePath: string
  totalBytes: number
  receivedBytes: number
  state: DownloadState
  startedAt: number
  completedAt?: number
  mimeType?: string
}

// ── Clear browsing data ───────────────────────────────────────
export type ClearScope = {
  cookies?: boolean
  cache?: boolean
  history?: boolean
  downloads?: boolean
}

// ── Privacy report (last 30 days, in-memory aggregate) ─────────
export type PrivacyReport = {
  totalBlocked: number
  sitesVisited: number
  sitesWithTrackers: number
  percentWithTrackers: number
  topTracker: { domain: string; owner: string; count: number; sites: number } | null
  topTrackers: Array<{ domain: string; owner: string; count: number; sites: number }>
  dailyCounts: Array<{ date: string; count: number }>
  generatedAt: string
  blockingEnabled: boolean
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
    onAction: (cb: (kind: "focusAddressBar" | "openSettings" | "openPrivacySettings" | "toggleAssistant" | "openFind") => void) => () => void
  }
  providers: {
    list: () => Promise<ProviderInfo[]>
    refresh: () => Promise<ProviderInfo[]>
  }
  agent: {
    send: (input: AgentSendInput) => Promise<{ taskId: string; assistantId: string }>
    cancel: (taskId: string) => Promise<void>
    onEvent: (cb: (e: AgentEvent) => void) => () => void
    /** Resolve a pending act-tool permission request. */
    respondToPermission: (permissionId: string, decision: PermissionDecision) => Promise<void>
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
  privacy: {
    /** Report aggregated over the last 30 days. Cheap (in-memory). */
    getReport: () => Promise<PrivacyReport>
    /** Wipe stored stats. Does not affect blocking — that runs from a static list. */
    reset: () => Promise<void>
  }
  bookmarks: {
    list:   () => Promise<Bookmark[]>
    add:    (url: string, title: string) => Promise<Bookmark>
    remove: (url: string) => Promise<boolean>
    has:    (url: string) => Promise<boolean>
  }
  reader: {
    /** Toggle on the active tab. Returns the new state. */
    toggle: (tabId: TabId) => Promise<boolean>
    /** Whether the given tab currently has reader mode applied. */
    isActive: (tabId: TabId) => Promise<boolean>
  }
  tts: {
    /** Begin reading the visible text. Returns true on success. */
    start:  (tabId: TabId) => Promise<boolean>
    /** Cancel any in-flight utterances. */
    stop:   (tabId: TabId) => Promise<void>
    /** Whether the given tab is currently speaking. */
    isSpeaking: (tabId: TabId) => Promise<boolean>
  }
  history: {
    list:      (query?: string, limit?: number) => Promise<HistoryEntry[]>
    removeOne: (id: string) => Promise<void>
    clear:     () => Promise<void>
  }
  downloads: {
    list:      () => Promise<DownloadEntry[]>
    cancel:    (id: string) => Promise<void>
    pause:     (id: string) => Promise<void>
    resume:    (id: string) => Promise<void>
    removeOne: (id: string) => Promise<void>
    clear:     () => Promise<void>
    onChange:  (cb: (entries: DownloadEntry[]) => void) => () => void
  }
  data: {
    clear: (scope: ClearScope) => Promise<void>
  }
}

declare global {
  interface Window {
    api: BrowserApi
  }
}
