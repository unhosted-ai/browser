# Browser Agent — Design

Status: **draft**, pre-implementation. Locks the load-bearing decisions
(tool-call protocol, permission model, runtime topology) so we don't
have to redo them when each phase is built.

## 0. Goals & non-goals

**Goals**

- Comet-equivalent agent UX: read the active page, act on the page,
  synthesize across tabs, run multi-step tasks, address-bar AI.
- Provider parity: the agent must work end-to-end on **Ollama** (local,
  free, day-one) and on **Anthropic / OpenAI** (cloud) without per-phase
  rework.
- Strong default safety: the agent can't silently take destructive
  action; user sees what's about to happen and can stop it.

**Non-goals (v1)**

- Voice input.
- Per-site memory / long-term recall.
- Browser extensions ecosystem (Manifest V3 compat).
- Sync / multi-device.
- Anything that requires a server.

## 1. Topology — where each thing lives

```
┌──────────────────────────────── Electron main process ────────────────────────────────┐
│                                                                                       │
│  TabManager (existing)              AgentRuntime (new)                                │
│   ├ WebContentsView per tab          ├ Conversation state                             │
│   ├ navigation, focus                ├ Active task graph                              │
│   └ DOM access via                   ├ Tool registry  ───┐                            │
│      executeJavaScript               └ Provider client   │                            │
│                                                          ▼                            │
│                                              ┌─────────────────────┐                  │
│                                              │ Tool implementations │                 │
│                                              │  (read & act tools)  │                 │
│                                              └─────────────────────┘                  │
│                                                          │                            │
│                              ┌───────── ipc events ──────┴───────┐                    │
└──────────────────────────────┼───────────────────────────────────┼────────────────────┘
                               ▼                                   ▼
┌──────────────── React renderer (chrome) ────────────────┐   ┌───── WebContentsView ─────┐
│  TabStrip · AddressBar · Sidebar (chat + tasks)         │   │  the page being browsed   │
└──────────────────────────────────────────────────────────┘   └───────────────────────────┘
```

Hard rule: **the agent runtime never runs in the renderer.** All LLM
calls, tool execution, and conversation state live in main. The
renderer is a typed view over an event stream — it can request actions
but never owns them. This keeps secrets (API keys), keeps tool
authority centralized, and makes the renderer cheap to redesign.

**IPC boundary** — three new channels on top of what's already in
`shared/types.ts`:

```ts
agent.send(taskId, message)            → fire-and-forget, ack only
agent.cancel(taskId)                   → cancel an in-flight task
agent.onEvent(cb: (e: AgentEvent) => void)
```

Everything else (tokens, tool calls, tool results, status changes,
permission requests) flows through `AgentEvent`. Single ordered stream,
multiplexed by `taskId`.

## 2. Tool-call protocol

The hardest decision in the system. Three providers ahead of us
(Ollama, Anthropic, OpenAI) with three different tool-calling shapes.
We need **one in-app shape** and per-provider adapters.

### 2.1 In-app shape

```ts
// shared/agent.ts
export interface ToolDef {
  name: string                    // snake_case, stable
  description: string             // shown to the model
  schema: JsonSchema              // params, JSON-Schema draft 7
  side: "read" | "act"            // permission tier (see §3)
  scope: ToolScope                // see §3
}

export interface ToolCall {
  id: string                      // provider-issued, opaque
  name: string
  args: unknown                   // unparsed; validated against schema before run
}

export interface ToolResult {
  id: string
  ok: boolean
  data?: unknown                  // serializable
  error?: { code: string; message: string }
}
```

Tools are defined once in main and registered with a `ToolRegistry`.
Each tool has an `execute(args, ctx)` that returns a `ToolResult`.

### 2.2 Provider adapters

Each adapter implements:

```ts
export interface Provider {
  id: ProviderId
  capabilities: { tools: boolean; vision: boolean; streaming: boolean }
  chat(req: ChatRequest): AsyncIterable<ProviderEvent>
}
```

Where `ChatRequest` carries our internal message shape and our
in-app `ToolDef[]`. The adapter translates **on the way in** to the
provider's wire format and **on the way out** back to our
`ProviderEvent` union.

Wire-format translation, by provider:

| Provider | Tool format | Notes |
|---|---|---|
| Anthropic | `tools: [{ name, description, input_schema }]` + `tool_use` / `tool_result` content blocks | best fidelity; vision native; streaming SSE |
| OpenAI / LM Studio / Ollama | `tools: [{ type: "function", function: { name, description, parameters } }]` + `tool_calls[]` on assistant messages | OpenAI-compatible providers all share this |
| Ollama (native API) | same as OpenAI-compatible when using `/v1/chat/completions` | use `/v1` not `/api/chat`; better tool fidelity |
| llama.cpp | OpenAI-compatible if using server's `/v1` | tool-calling only as good as the model; many GGUFs can't do it |
| MLX (mlx-lm.server) | OpenAI-compatible | recent versions support tools; check at runtime |

**Decision:** make the OpenAI-compatible path the canonical one and
write the Anthropic adapter as a translation. Most local providers are
OpenAI-shape; we'll have one adapter that covers Ollama / LM Studio /
llama.cpp / MLX with a different `baseURL` per provider.

### 2.3 Per-provider capability fallback

Some local models can't tool-call reliably. Capability detection at
boot:

1. Probe `/v1/models` (or provider-equivalent) and pick the first model
   the user selected.
2. Issue a tiny canary chat request with one trivial tool. If the
   response is a tool call, mark `tools: true`. If it's a hallucinated
   `<tool>...</tool>` blob in plaintext, mark `tools: "fake"`.
3. If `tools: false` or `"fake"`, the agent runtime falls back to a
   **prompted-tool mode**: tools described in the system prompt as a
   protocol the model emits as fenced JSON. Hacky but lets us run
   non-tool-calling models without crashing. Surfaces a "tool calls
   may be unreliable" badge in the sidebar.

### 2.4 Streaming events from provider

```ts
type ProviderEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; id: string; name: string; argsDelta?: string; argsFinal?: unknown }
  | { type: "stop"; reason: "end" | "tool" | "length" | "error" }
  | { type: "error"; error: Error }
  | { type: "usage"; in: number; out: number }   // token count
```

Tool args may stream as JSON deltas (Anthropic) or arrive whole
(OpenAI). The adapter is responsible for accumulating until it can
emit a `tool_call` with `argsFinal` set.

## 3. Permission model

The piece that makes this safe enough to ship.

### 3.1 Two tiers

- **Read tools** (`side: "read"`) — `get_page_text`, `screenshot_page`,
  `list_tabs`, `read_tab`. Auto-approved unless the active tab is
  flagged as **sensitive** (see §3.3). No UI gate.
- **Act tools** (`side: "act"`) — `navigate`, `click`, `type`, `scroll`,
  `open_tab`, `close_tab`, `go_back`. Default policy: **prompt**.

### 3.2 Prompt UI

When the runtime is about to execute an `act` tool:

1. Render a permission card in the sidebar: tool name, args, the page
   it'll touch, two buttons (`Allow` / `Block`) and an `Always for this
   site` toggle.
2. Block holds the agent until user responds. (Cancel is allowed at
   any moment.)
3. The decision goes into a per-origin allowlist persisted in
   electron-store. The allowlist is keyed by `(origin, tool.name)`,
   not just origin — `click` allowed doesn't imply `type` allowed.

### 3.3 Sensitive sites

Anything matching one of these patterns auto-blocks both tiers and
surfaces a "agent disabled here" banner:

- `*.bank.*`, `*.banking.*`, paypal, stripe billing, etc. — heuristic
  list shipped in code, user-editable.
- Any URL containing `password`, `account`, `wallet` in the path.
- Pages with detected payment forms (`<input type="password">` adjacent
  to credit-card fields).

The check runs in main against the active tab's URL before any tool
is offered to the model. The model never sees that a sensitive site is
loaded; we just don't include those tools in `ToolDef[]` for that
turn.

### 3.4 Auto-mode

A single toggle in the sidebar — `Auto-execute on this site`. When on,
act-tool calls bypass the prompt gate **for this origin only** until
the tab's origin changes. Survives across page reloads, doesn't
survive cross-origin navigation.

This is the only escape valve; no global "always auto" switch. (Comet
has one; we don't.)

### 3.5 What the model is told

The system prompt explicitly tells the model:

> Some tools may be blocked by the user. If a tool result is a
> `permission_denied`, do not retry the same call; explain to the user
> what you would have done and ask for confirmation in plain language.

This stops loops where the model keeps re-issuing the same blocked
call.

## 4. Agent runtime

A small state machine in main, one instance per **task**. Tasks are
addressable (`taskId: string`) and the renderer can show many at once.

### 4.1 Task states

```
idle → planning → calling_provider → streaming → tool_pending
                                                      │
                              ┌───── permission ──────┤
                              ▼                       │
                          waiting_user                 │
                              │                       │
                       allow/block/cancel              │
                              ▼                       │
                       executing_tool ←────────────────┘
                              │
                              ▼
                          continuing  →  back to calling_provider
                              │
                          stop / error
                              ▼
                            done
```

`continuing` — after a tool returns a result, we re-call the provider
with the result attached and let it produce more text or more tool
calls. Loop bounded by `maxToolCalls` (default 12; configurable).

### 4.2 Conversation memory

Per-task conversation buffer. Two important behaviors:

- **Tool results are summarized into the buffer** if their raw size
  exceeds a threshold (default 4kB). Full result kept for the
  immediate next turn, then collapsed to a summary. Prevents context
  bloat from long DOM dumps.
- **Cross-tab synthesis** explicitly carries summaries of each tab's
  text in the user message, not via tool calls — fewer roundtrips,
  more reliable on weak local models.

### 4.3 Cancellation

`agent.cancel(taskId)` sets a flag the runtime checks at every yield
point: between provider events, after a tool returns, before issuing
permission prompts. Cancellation is idempotent and tells the provider
adapter to abort its in-flight stream (Anthropic SSE, OpenAI SSE, or
Ollama HTTP).

### 4.4 Persistence

Tasks live in memory by default. Optional persistence (electron-store)
for `done` tasks the user wants to keep — that's how you'd build a
"history" view in the sidebar. Out of scope for v1.

## 5. Phase 1 — Chat works

Smallest interesting agent. **No tools** — just streaming text with the
active tab's content baked into the user message.

- Sidebar composer becomes interactive when at least one provider is
  online.
- Settings drawer (new): provider picker, model picker, max-tokens,
  temperature, system prompt override.
- Provider client: one shared OpenAI-compatible adapter pointed at the
  selected provider's `baseURL`.
- On send: `userText + "\n\nActive page:\n" + getActiveTabText().slice(0, 32_000)` →
  provider → stream tokens to the renderer via `agent.event` channel.

**What's settled by end of phase 1:** provider adapter pattern,
streaming wire format, capability detection, settings persistence.
None of phase 2-5 should require touching these.

## 6. Phase 2 — Agent reads

Add the read-tier tools. Page DOM access is the load-bearing one;
everything else hangs off it.

### 6.1 DOM access

Two implementations behind one tool:

- **Cheap path** (default): `WebContentsView.webContents.executeJavaScript("document.body.innerText")`.
  Returns rendered text. Works on most sites. ~10ms.
- **Structured path** (when the model needs structure): a content-script
  injected at `did-finish-load` that produces a normalized DOM tree
  (Readability-style) on demand via IPC. Used for "read this article"
  and any tool that needs a selector.

### 6.2 Tools registered in this phase

- `get_page_text(maxChars)` → string
- `get_page_html(selector?)` → string (cleaned, no scripts/styles)
- `screenshot_page(fullPage?)` → base64 PNG (model must have `vision: true`)
- `list_tabs()` → `[{ id, title, url }]`
- `read_tab(tabId, maxChars)` → string

### 6.3 Wired to the model

Tools are sent in `ToolDef[]` only when the active tab isn't
sensitive (§3.3). System prompt names the tools and gives a one-liner
on when each is appropriate.

## 7. Phase 3 — Agent acts

The risky phase. Don't ship until §3 (permission model) is rock solid.

### 7.1 Tools

- `navigate(url)` — load a URL in the active tab
- `open_tab(url, activate?)` — new tab
- `close_tab(tabId)`
- `click(selector)` — uses content-script
- `type(selector, text, submit?)` — content-script
- `scroll(direction, amount?)` — content-script
- `wait_for(selector, timeoutMs)` — for dynamic pages

### 7.2 Selector resilience

Selectors generated by an LLM are fragile. Two mitigations:

- **Visible-text selectors first.** Tool accepts `{ text: "Sign in" }`
  in addition to CSS selectors. Content-script implements a
  text-contains-with-disambiguation lookup (XPath under the hood).
- **Confirmation echo.** When the agent says it'll click "Sign in",
  the permission card shows the matched element's bounding-box screenshot
  (cheap; we already render the page) so the user can sanity-check
  before approving.

### 7.3 Failure cases

- Element not found → tool returns `error.code: "not_found"`. Model can
  retry with a different selector.
- Cross-origin frame → out of scope for v1; tool returns
  `error.code: "cross_origin_frame"`.
- Page navigated mid-action → tool returns `error.code: "stale"`. Model
  must re-acquire context.

## 8. Phase 4 — Address-bar AI

Two modes for the address bar:

- **Default** (current): URL or fallback to Google search.
- **Ask** (new): typed input is sent to the agent as a one-shot task
  with current page in context.

UX:

- `Cmd+L` focuses the bar.
- `Cmd+L` again toggles to Ask mode (visual: the input switches to italic
  and gets a small `?` indicator on the left).
- Typing `?` as the first char in the URL bar in default mode also
  switches to Ask.
- `Enter` runs as URL or as Ask depending on mode.
- Ask results render *into the sidebar* (auto-opens) so they're
  preserved if the user dismisses the inline preview.

## 9. Phase 5 — Task threads

The sidebar gains a top section showing all active and recent tasks.
Each task row:

```
● running    Researching flights LAX→NRT          12s · 3 tools
○ blocked    Filling form on united.com           waiting on you ▸
✓ done       Summarised newsletter                23 KB · 1m ago
```

Click a task to open its full conversation. Click `▸` on a blocked
task to see the permission prompt. Cancel via `×`.

Implementation: tasks are first-class in the runtime; the renderer
subscribes to `agent.onTasks(cb)` and re-renders. State is the same
state machine in §4.1.

## 10. Open decisions to make in implementation

These are deliberately **not** decided here; flagging so we don't
forget:

1. **Default model per provider.** Ollama: `llama3.2` is reliable but
   weak; `qwen2.5:14b` better at tools but heavier. Need a recommended
   list with a "doesn't fit in 16GB" warning.
2. **API-key storage.** Electron's `safeStorage` (encrypted with macOS
   Keychain / Windows DPAPI / libsecret) vs plaintext in
   electron-store. `safeStorage` is right but adds complexity. Default:
   safeStorage with a plaintext fallback that surfaces a warning if
   encryption is unavailable.
3. **Telemetry.** Anything? Default: nothing. If we later add anything
   it's opt-in and uses local-only logs.
4. **Conversation export.** Markdown / JSON. Easy; defer.
5. **Streaming over IPC.** Send tokens one at a time (chatty) or in
   ~50ms batches. Default: 50ms batched.
6. **What to do when no provider is online.** Disable composer (current
   behaviour) vs offer a "Install Ollama" link with detection. Default:
   detect Ollama installer presence and offer one-click run if found.
7. **Sandboxing.** Currently `sandbox: false` for the main BrowserWindow
   to keep `executeJavaScript` simple. Tighten later — content script
   doesn't need full Node.

## 11. Implementation order

Recommended order, given the goals:

1. Phase 1, Ollama only.
2. §2.2 OpenAI-compatible adapter for LM Studio + llama.cpp + MLX
   (one code path, four `baseURL`s).
3. Phase 2 (read tools).
4. §3 permission UI.
5. Phase 3 (act tools).
6. Anthropic adapter — proves the abstraction holds for non-OpenAI
   shape.
7. Phase 4 (address-bar AI).
8. Phase 5 (task threads).

Each step ends in a state where the app still works end-to-end. No
"build for two weeks then integrate."
