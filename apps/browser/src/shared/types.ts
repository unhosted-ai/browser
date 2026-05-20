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
  /** True when the WebContentsView was discarded to free memory. The
   *  tab strip should render these with a dimmed treatment; clicking
   *  the tab silently re-creates the view and reloads `url`. */
  discarded?: boolean
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
  /**
   * New-tab background style. `procedural` is the animated sky (default).
   * `photographic` cycles through user-picked images in `newtabFolder`.
   * Falls back to procedural when the folder is missing or empty.
   */
  newtabBackground: "procedural" | "photographic"
  /** Absolute path to a folder of images for photographic mode. */
  newtabFolder: string | null
  /**
   * Opt-in app lock: require the OS biometric / system password before
   * the main window appears. macOS uses Touch ID; on platforms where
   * the prompt isn't available the setting has no effect (the toggle is
   * disabled in the renderer). Off by default — Delta is a no-account
   * app, this is for users who want a second layer at the device edge.
   */
  requireBiometric: boolean
  /**
   * Block well-known ad networks (display, video, header-bidding,
   * native, retargeting). Separate from the tracker list so the user
   * can flip them independently. On by default. ~70 entries today;
   * future EasyList bulk import will tier this the same way the
   * extended tracker list works.
   */
  useAdBlock: boolean
  /**
   * Use the bundled EasyPrivacy host list (~42k known trackers) on top
   * of the curated short list. On by default — this is what makes the
   * tracker blocker comparable with uBlock Origin's coverage. Flip OFF
   * if the broad list ever catches a legitimate first-party request you
   * need; the curated short list keeps blocking the high-traffic ones.
   */
  useExtendedTrackerList: boolean
  /**
   * HTTPS-only: rewrite outgoing http:// top-level navigations to
   * https:// before they leave the device. On by default. The user can
   * still navigate to plain http via the per-host bypass set when a
   * site genuinely can't do TLS.
   */
  httpsOnly: boolean
  /** Hosts the user has explicitly allowed in http (e.g. localhost,
   *  legacy intranet boxes). Suffix-matched the same way trackers are. */
  httpsOnlyBypass: string[]
  /**
   * Strip Referer headers on cross-origin requests. Sets a strict
   * `strict-origin-when-cross-origin` policy at the request layer so
   * the URL + query never leak to third parties. On by default.
   */
  strictReferrerPolicy: boolean
  /**
   * Route all Chromium DNS lookups through DNS-over-HTTPS. Closes the
   * last unencrypted privacy leak on most home networks. Off by default
   * — flipping it on requires a re-launch to fully apply.
   */
  dnsOverHttps: boolean
  /** Which DoH provider to use. cloudflare = 1.1.1.1, quad9 = 9.9.9.9. */
  dohProvider: "cloudflare" | "quad9" | "google"
  /**
   * Check for new versions on launch via GitHub Releases. We show a
   * non-blocking toast when a newer release exists; install is manual
   * until the macOS Developer ID + Windows code-signing certs are in
   * place (see STATUS.md). Off by default until signed builds ship.
   */
  autoUpdateCheck: boolean
  /**
   * Second-brain vault path. Set by Settings → Second brain → Set up
   * vault. When non-null, the agent's system prompt is augmented with
   * the vault path + conventions so chat turns can read/write it
   * naturally. See apps/browser/src/main/second-brain.ts and the
   * apps/os/ docs for the structure.
   */
  secondBrainPath: string | null
  /**
   * Personal SLM (Small Language Model) — opt-in preview. When on, the
   * agent rewrites/augments queries through a small per-user model that
   * learns from your local conversations + bookmarks + browsing context
   * (with your consent). Training pipeline is roadmap; the toggle today
   * gates UI affordances and the future build path. See docs/slm-design.md.
   */
  personalSlmEnabled: boolean
  /**
   * Local account lock (no remote auth). When set to "pin" or "password"
   * the launcher requires verifying the local secret before the main
   * window unlocks. Stored as PBKDF2-SHA256 hash + salt in settings.json.
   * "none" disables the lock.
   */
  accountLockKind: "none" | "pin" | "password"
  /** True when accountLockKind is set AND a hash is on disk. Renderer-only flag. */
  accountLockConfigured: boolean
  /**
   * Auto-discard inactive tabs after this many minutes. Discarded tabs
   * keep their strip entry; clicking one rebuilds and reloads.
   * 0 disables auto-discard. Default 30. The active tab is never
   * discarded regardless of this setting. See main/tabs.ts.
   */
  tabDiscardMinutes: number
  /**
   * Soft cap on the number of *live* (non-discarded) tabs. When the cap
   * is exceeded — after a new tab opens, after a discarded tab is
   * revived, or after the user tightens the cap — the oldest non-active
   * live tabs are discarded to bring the count back within range. The
   * active tab is always preserved. 0 disables the cap. Default 0.
   */
  maxLiveTabs: number
}

/** Snapshot of process memory across the main process + every WebContentsView.
 *  Built by TabManager.sampleMemory; pushed to the renderer on a 5s tick so
 *  the chrome RAM pip stays roughly live without polling. */
export type MemorySample = {
  sampledAt: number
  /** Total across the main process + all renderers. */
  totalBytes: number
  /** Main process only. */
  mainBytes: number
  /** Sum across all live (non-discarded) tab renderers. */
  tabsBytes: number
  /** All entries in the tab strip, including discarded. */
  tabCount: number
  /** How many of `tabCount` are currently discarded. */
  discardedCount: number
  perTab: Array<{
    id: TabId
    title: string
    url: string
    /** 0 if the tab is discarded. */
    bytes: number
    discarded: boolean
  }>
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
  | { kind: "newtabBackground"; value: "procedural" | "photographic" }
  | { kind: "newtabFolder"; value: string | null }
  | { kind: "requireBiometric"; value: boolean }
  | { kind: "useExtendedTrackerList"; value: boolean }
  | { kind: "useAdBlock"; value: boolean }
  | { kind: "httpsOnly"; value: boolean }
  | { kind: "httpsOnlyBypassAdd"; host: string }
  | { kind: "httpsOnlyBypassRemove"; host: string }
  | { kind: "strictReferrerPolicy"; value: boolean }
  | { kind: "dnsOverHttps"; value: boolean }
  | { kind: "dohProvider"; value: "cloudflare" | "quad9" | "google" }
  | { kind: "autoUpdateCheck"; value: boolean }
  | { kind: "personalSlmEnabled"; value: boolean }
  | { kind: "secondBrainPath"; value: string | null }
  | { kind: "tabDiscardMinutes"; value: number }
  | { kind: "maxLiveTabs"; value: number }
  | {
      kind: "setAccountLock"
      lockKind: "pin" | "password"
      /** Plaintext secret — hashed and discarded in main. */
      secret: string
      /** Required when a lock already exists, to authorise the change. */
      currentSecret?: string
    }
  | {
      kind: "clearAccountLock"
      /** Required when a lock exists, to authorise removal. */
      currentSecret: string
    }

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
  /** Wipe the locally-imported identity (handle, name, avatar). */
  identity?: boolean
}

// ── Local identity (personalisation only, never leaves the device) ─
//
// Delta has no remote account — see docs/identity.md. The user can
// optionally tag their local profile with a public handle from GitHub
// or an email from Google/Gmail, purely to personalise the chip in
// the left nav. No OAuth, no tokens, no sync; we make a single
// public-profile lookup at sign-in time and discard everything else.
export type IdentityProvider = "github" | "google"

export type Identity = {
  provider: IdentityProvider
  /** "@handle" for GitHub, email for Google. Display only. */
  handle: string
  /** Public display name. Falls back to handle. */
  displayName: string
  /** Public avatar URL — github avatar_url or gravatar. */
  avatarUrl: string | null
  /** Unix ms — when the import happened. Nothing else is recorded. */
  importedAt: number
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
    /** One-shot memory snapshot across main + every tab's renderer. */
    sampleMemory: () => Promise<MemorySample>
    /** Discard every non-active, non-already-discarded tab. Returns the count. */
    discardAllIdle: () => Promise<number>
    /** Subscribe to the 5s memory broadcast that drives the chrome RAM pip. */
    onMemorySample: (cb: (sample: MemorySample) => void) => () => void
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
    /**
     * One-shot ephemeral ask, used by the address-bar `?` mode. Same wire
     * shape as send(), but the agent's conversation history is a fresh
     * empty array for this call — the result doesn't pollute the
     * sidebar's running conversation. The renderer filters events by
     * assistantId to route the stream to the address-bar's AskPanel.
     */
    ask: (input: AgentSendInput) => Promise<{ taskId: string; assistantId: string }>
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
  identity: {
    /** Currently-signed-in identity, or null in default mode. */
    get: () => Promise<Identity | null>
    /**
     * Import a public profile from GitHub or Google. Performs one HTTPS
     * request to the provider's public endpoint (api.github.com for
     * GitHub, gravatar for Google) and stores name + avatar locally.
     * Throws on unknown handle / network error so the renderer can
     * show inline feedback.
     */
    signIn: (input: { provider: IdentityProvider; handle: string }) => Promise<Identity>
    /** Wipe the locally-stored identity. Returns to "Default profile". */
    signOut: () => Promise<void>
    /** Subscribe to changes (sign in / sign out from any surface). */
    onChange: (cb: (identity: Identity | null) => void) => () => void
  }
  newtabBg: {
    /** Open the native folder-picker. Returns the chosen path, or null on cancel. */
    pickFolder: () => Promise<string | null>
  }
  updater: {
    /** Trigger a check now. Honours the autoUpdateCheck setting. */
    check: () => Promise<void>
    /** Open the release notes / download page in the user's default browser. */
    openRelease: (url: string) => Promise<void>
    /** Subscribe to "an update is available" events from main. */
    onAvailable: (cb: (info: { version: string; releaseDate?: string; releaseUrl: string }) => void) => () => void
  }
  /**
   * Local account lock — no remote auth. The hashed secret lives in
   * settings.json (PBKDF2-SHA256). Verification happens in main; the
   * renderer only ever passes plaintext over IPC and gets a boolean back.
   */
  accountLock: {
    /** Whether a lock is configured AND not yet verified for this session. */
    requiresUnlock: () => Promise<boolean>
    /** Verify the local secret. Returns true on success. */
    verify: (secret: string) => Promise<boolean>
  }
  /**
   * Local cron-of-one. Time-triggered actions that fire from the main
   * process: reminders, opening a URL at a set time, kicking off an
   * agent task. Persisted in userData/schedules.json. The scheduler
   * itself runs from app start and re-arms each next fire on its own;
   * the renderer is just a CRUD surface + a live "fired" event stream.
   */
  schedules: {
    list:   () => Promise<ScheduledTask[]>
    create: (input: ScheduledTaskInput) => Promise<ScheduledTask>
    update: (id: string, input: Partial<ScheduledTaskInput> & { enabled?: boolean }) => Promise<ScheduledTask>
    delete: (id: string) => Promise<void>
    /** Run a task right now, off-schedule. Useful as a "test" affordance in the UI. */
    runNow: (id: string) => Promise<void>
    onChange: (cb: (tasks: ScheduledTask[]) => void) => () => void
    /** A task just fired — renderer surfaces a toast and (for agent tasks) routes to the sidebar. */
    onFired:  (cb: (info: { id: string; label: string; action: ScheduledTaskAction }) => void) => () => void
  }
  /**
   * Per-site password import. The renderer never sees a plaintext
   * password — preview() returns hints, importSelected() persists with
   * safeStorage encryption, list/listForOrigin return wire-shape only.
   * fillActive() asks main to inject username + password into the
   * focused form fields on the active tab; nothing returns to the
   * renderer.
   */
  credentials: {
    /** Open a native file dialog and parse the chosen CSV. Returns a preview. */
    pickAndPreview: () => Promise<CredentialImportPreview | null>
    /** Persist only the rows the user kept. Returns the new count. */
    importSelected: (selection: CredentialImportSelection) => Promise<number>
    list: () => Promise<SavedCredential[]>
    listForOrigin: (origin: string) => Promise<SavedCredential[]>
    remove: (id: string) => Promise<void>
    /** Inject the credential into the focused form on the active tab. No-op if no focus. */
    fillActive: (id: string) => Promise<boolean>
    onChange: (cb: (creds: SavedCredential[]) => void) => () => void
  }
  /**
   * Default-browser registration. macOS exposes a proper "set as default";
   * Windows opens the Settings → Default apps pane; Linux delegates to xdg.
   */
  defaultBrowser: {
    isDefault: () => Promise<boolean>
    setDefault: () => Promise<boolean>
  }
  /**
   * Unpacked Chrome-extension loader. The user picks a folder; we
   * `session.defaultSession.loadExtension(path)` and persist the path
   * so it loads on every boot. Removing an entry unloads it and stops
   * loading it next time.
   */
  extensions: {
    list:   () => Promise<ExtensionEntry[]>
    /** Open a native folder picker and add the chosen extension. */
    pickAndAdd: () => Promise<ExtensionEntry | null>
    remove: (id: string) => Promise<void>
    /** Unload + reload the extension (useful while developing one). */
    reload: (id: string) => Promise<ExtensionEntry>
    onChange: (cb: (list: ExtensionEntry[]) => void) => () => void
  }
  /**
   * Second-brain vault — Skill 1 (OS Setup) from the AI-OS pattern.
   * The vault is plain Markdown on disk; the renderer only sees
   * status, never the contents. Reads/writes go through the agent.
   */
  secondBrain: {
    /** Pick a folder + initialise the vault structure. Returns status. */
    pickAndInit: () => Promise<{ path: string; fileCount: number; totalBytes: number; initialised: boolean } | null>
    /** Idempotent re-init at the currently-configured path. */
    reinit: () => Promise<{ path: string; fileCount: number; totalBytes: number; initialised: boolean } | null>
    /** Status of the currently-configured vault. */
    status: () => Promise<{ path: string; fileCount: number; totalBytes: number; initialised: boolean } | null>
    /** Suggested default path for the picker. */
    defaultPath: () => Promise<string>
  }
}

export type UpdateAvailable = { version: string; releaseDate?: string; releaseUrl: string }

// ── Scheduled tasks (local cron-of-one) ──────────────────────────────
// Time-triggered actions that fire from the main process. Stored as
// JSON in userData/schedules.json. No remote service, no calendar
// integration — the device's clock is the trigger. Three action types
// cover the common cases:
//   - reminder: native notification at a time (clocked reminder)
//   - openUrl : create a new tab at a URL (e.g. open opentable.com at
//               09:00 so the booking page is ready)
//   - agent   : kick off an agent task with a prompt — once click/type
//               act tools land, this is the "book the table for me"
//               path. Today the agent will navigate + report.
//
// Triggers are intentionally narrow for v1:
//   - oneShot: an absolute ISO timestamp; fires once
//   - every  : repeat every N minutes from createdAt; fires N times
//              until the user pauses/deletes it
// Cron expressions are a planned upgrade — for v1, "every 30 minutes"
// and "tomorrow at 09:00" cover ~90% of the asks.
export type ScheduledTaskTrigger =
  | { kind: "oneShot"; at: string }          // ISO timestamp, e.g. "2026-05-20T09:00:00Z"
  | { kind: "every"; minutes: number }       // every N minutes, N >= 1

export type ScheduledTaskAction =
  | { kind: "reminder"; title: string; body?: string }
  | { kind: "openUrl"; url: string; title?: string }
  | { kind: "agent"; prompt: string; title?: string }

export type ScheduledTask = {
  id: string                       // "task:<uuid>"
  label: string                    // user-supplied display name
  trigger: ScheduledTaskTrigger
  action: ScheduledTaskAction
  enabled: boolean                 // paused tasks are kept but don't fire
  createdAt: number                // unix ms
  nextRunAt: number | null         // unix ms, null if computed-as-past for a oneShot
  lastRunAt: number | null         // unix ms of last successful fire
  lastError: string | null         // last failure message, if any
  fireCount: number                // total successful fires
}

export type ScheduledTaskInput = {
  label: string
  trigger: ScheduledTaskTrigger
  action: ScheduledTaskAction
}

// ── Saved credentials (per-site password import) ─────────────────────
//
// Wire shape — the renderer NEVER sees the plaintext password. The
// password is encrypted by safeStorage (OS keychain) in main and
// returned only to the active-tab content-script when the user clicks
// "Fill password" on the address bar pill. The renderer learns:
//   - that there is/isn't a credential for the current origin
//   - the username (so the UI can show "Fill as foo@example.com")
//   - the count, the import timestamp
// — but never the password itself.
export type SavedCredential = {
  id: string                  // "cred:<uuid>"
  origin: string              // normalised scheme+host, e.g. "https://example.com"
  username: string
  /** Whether a password ciphertext is stored. (Renderer never sees the value.) */
  hasPassword: boolean
  importedAt: number
  lastUsedAt: number | null
}

// One row of a CSV password export, as the user sees it in the import
// preview. The renderer shows these and the user toggles `keep` per
// row; only kept rows are persisted.
export type CredentialImportRow = {
  /** Stable index inside the parsed file, used as the key in the preview. */
  index: number
  /** Normalised origin we derived from the row's url column. */
  origin: string
  username: string
  /** Truncated password preview ("••••" + last two chars) — never the full value. */
  passwordHint: string
  /** Pre-flagged: a credential for (origin, username) already exists. */
  alreadyExists: boolean
  /** Pre-flagged: the row didn't have a parseable origin and we can't store it. */
  invalid: boolean
}

export type CredentialImportPreview = {
  /** Absolute path the user picked. We don't keep the file open beyond the preview call. */
  filePath: string
  rows: CredentialImportRow[]
  /** How many rows we couldn't parse (no url column, etc). */
  rejected: number
}

export type CredentialImportSelection = {
  filePath: string
  /** Indices from the preview the user chose to keep. */
  keepIndices: number[]
}

// ── Unpacked Chrome-extension loading ────────────────────────────────
//
// Electron's `session.loadExtension(path)` supports MV3 content scripts +
// theme + a subset of the chrome.* APIs. We expose this as a per-user
// list of folder paths — each one is loaded on app boot and on
// hot-reload. NOT a Chrome Web Store integration; the user supplies a
// folder containing an unpacked extension's `manifest.json`.
//
// What works seamlessly: content scripts, themes, action popups,
// devtools-extension panels, web-accessible resources, the `chrome.tabs`
// query/get APIs.
// What doesn't yet: chrome.identity, chrome.cookies (privacy boundary),
// the full chrome.runtime.connect remote-port surface, and most things
// that rely on Chrome Sync.
export type ExtensionEntry = {
  /** "ext:<uuid>" — stable id we generate when the path is added. */
  id: string
  /** Absolute path to the unpacked extension folder. */
  path: string
  /** From the extension's manifest.json. Best-effort; null if parse fails. */
  name: string | null
  version: string | null
  description: string | null
  /** True once Electron's session has loaded it for this process. */
  loaded: boolean
  /** Last load attempt's error, if any. */
  lastError: string | null
  addedAt: number
}

declare global {
  interface Window {
    api: BrowserApi
  }
}
