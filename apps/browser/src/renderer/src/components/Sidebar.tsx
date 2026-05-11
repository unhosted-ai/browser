import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import type {
  AgentEvent,
  AgentMessage,
  AgentStatus,
  ConversationSummary,
  PermissionDecision,
  PermissionRequest,
  ProviderInfo,
  ToolCallView,
  UserSettings,
} from "@shared/types"
import { DeltaLogo } from "./DeltaLogo"

type Props = {
  providers: ProviderInfo[]
  activeUrl: string | null
  activeTitle: string | null
  onRefresh: () => void
  onOpenSettings: () => void
  /** Optional controlled-mode for the inline history view. When the LeftNav
   *  History row triggers it, App opens the sidebar AND sets this true. */
  historyOpen?: boolean
  onHistoryOpenChange?: (open: boolean) => void
  /**
   * A seed prompt to prefill the composer with. Used by the address-bar
   * `?` ask mode: when the user hits ⌘↩ ("continue in Assistant"), App
   * sets this to the ask text and the sidebar opens with the draft
   * ready to send. The token changes per send so the same text can be
   * seeded again — the seedKey makes the effect re-fire.
   */
  seedDraft?: { text: string; key: string } | null
}

// What the Assistant *can do*. Read tools auto-run; act tools route through
// per-(origin, tool) permission cards rendered inline in the conversation.
const CAPABILITIES = [
  { label: "Read", hint: "Calls list_tabs, read_active_page, read_tab — sees pages across your tabs as untrusted context.", live: true },
  { label: "Act",  hint: "navigate, open_tab — gated by per-(origin, tool) permission. Sensitive sites (banking, gov) are blocked.", live: true },
  { label: "Tasks",hint: "Multi-step background tasks visible here. Coming.", live: false },
] as const

const SUGGESTIONS = [
  "Summarise this page",
  "Pull out the action items",
  "What does this page miss?",
] as const

export function Sidebar({ providers, activeUrl, activeTitle, onRefresh, onOpenSettings, historyOpen: historyOpenProp, onHistoryOpenChange, seedDraft }: Props) {
  const [draft, setDraft] = useState("")
  // Prefill the composer when App hands us a seed (address-bar `?` →
  // ⌘↩). Keyed so the same text can be re-seeded; only fires when the
  // key changes so user typing isn't clobbered.
  useEffect(() => {
    if (seedDraft?.text) setDraft(seedDraft.text)
  }, [seedDraft?.key])
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [status, setStatus] = useState<AgentStatus>("idle")
  const [taskId, setTaskId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  // Internal fallback when the parent doesn't control history mode. When
  // App passes historyOpenProp + onHistoryOpenChange, we use those instead.
  const [historyOpenLocal, setHistoryOpenLocal] = useState(false)
  const historyOpen = historyOpenProp ?? historyOpenLocal
  const setHistoryOpen = (v: boolean) => {
    setHistoryOpenLocal(v)
    onHistoryOpenChange?.(v)
  }
  const scrollRef = useRef<HTMLDivElement>(null)

  // The agent picks the first usable online provider. We surface that one as
  // a small chip — connection state belongs to Settings, but model selection
  // within the resolved provider is a per-conversation concern that the user
  // should be able to flip from here without leaving the chat.
  const usable = useMemo(
    () => providers.find((p) => p.status === "online" && p.models.length > 0),
    [providers],
  )
  const online = !!usable

  // Settings — the model chip needs to mirror & write defaultProvider.model.
  // Subscribed (not just one-shot) so the chip stays in sync when changed
  // from Settings → Default provider, and vice versa.
  const [settings, setSettings] = useState<UserSettings | null>(null)
  useEffect(() => {
    void window.api.settings.get().then(setSettings)
    return window.api.settings.onChange(setSettings)
  }, [])

  // The model the agent will actually use right now. If the user pinned one
  // in settings *and* it's still in the resolved provider's list, that wins;
  // otherwise we fall back to the provider's first listed model — same
  // resolution main/providers.ts → pickDefaultProvider uses.
  const activeModel = useMemo(() => {
    if (!usable) return null
    const pinned = settings?.defaultProvider.model
    return pinned && usable.models.includes(pinned) ? pinned : (usable.models[0] ?? null)
  }, [usable, settings])

  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const modelPickerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!modelPickerOpen) return
    const onDown = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setModelPickerOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModelPickerOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [modelPickerOpen])

  const pickModel = (model: string | undefined) => {
    if (!usable || !settings) return
    // Pin to this provider so the user's explicit choice survives the next
    // provider re-probe. The previous id may have been "auto" — we promote
    // it to the resolved provider so the chip remains stable.
    const id = settings.defaultProvider.id === "auto" ? usable.id : settings.defaultProvider.id
    void window.api.settings.update({ kind: "defaultProvider", id, model })
    setModelPickerOpen(false)
  }

  useEffect(() => {
    return window.api.agent.onEvent((e: AgentEvent) => {
      if (e.type === "task_start") {
        setStatus("streaming")
      } else if (e.type === "text_delta") {
        setMessages(prev => prev.map(m =>
          m.id === e.assistantId ? { ...m, text: m.text + e.delta } : m
        ))
      } else if (e.type === "tool_call") {
        // A tool call landed — append to the assistant message's toolCalls
        // array, replacing if a previous in-flight entry with the same id
        // already exists (defensive; we only emit once per call today).
        setMessages(prev => prev.map(m => {
          if (m.id !== e.assistantId) return m
          const existing = m.toolCalls ?? []
          const idx = existing.findIndex(c => c.id === e.call.id)
          const next = idx >= 0
            ? [...existing.slice(0, idx), e.call, ...existing.slice(idx + 1)]
            : [...existing, e.call]
          return { ...m, toolCalls: next }
        }))
      } else if (e.type === "permission_request") {
        // Park the request on the assistant message; the card renders inline
        // until the user clicks Allow / Block / Always allow.
        setMessages(prev => prev.map(m =>
          m.id === e.assistantId
            ? { ...m, pendingPermissions: [...(m.pendingPermissions ?? []), e.request] }
            : m
        ))
      } else if (e.type === "permission_resolved") {
        // Drop the resolved request from the pending list.
        setMessages(prev => prev.map(m =>
          m.id === e.assistantId
            ? { ...m, pendingPermissions: (m.pendingPermissions ?? []).filter(p => p.permissionId !== e.permissionId) }
            : m
        ))
      } else if (e.type === "task_done") {
        setStatus("idle")
        setTaskId(null)
        setMessages(prev => prev.map(m =>
          m.id === e.assistantId ? { ...m, streaming: false } : m
        ))
      } else if (e.type === "task_error") {
        setStatus("error")
        setTaskId(null)
        setMessages(prev => prev.map(m =>
          m.id === e.assistantId
            ? { ...m, streaming: false, error: e.error }
            : m
        ))
      }
    })
  }, [])

  // Quietly poll for providers while we're waiting for one — the Assistant
  // doesn't need a Refresh button anymore; that's a Settings concern.
  useEffect(() => {
    if (online) return
    const id = setInterval(onRefresh, 4000)
    return () => clearInterval(id)
  }, [online, onRefresh])

  // Persist on idle — once a turn finishes, snapshot the messages to disk.
  // This is the cheapest correct save schedule: the chat survives a quit,
  // we don't burn IPC every token, and the file ends up consistent.
  useEffect(() => {
    if (status !== "idle" || !conversationId || messages.length === 0) return
    void window.api.conversations.save(conversationId, messages)
  }, [status, conversationId, messages])

  const newConversation = () => {
    setMessages([])
    setConversationId(null)
    setStatus("idle")
    setTaskId(null)
  }

  const openConversation = async (id: string) => {
    const rec = await window.api.conversations.load(id)
    if (!rec) return
    setMessages(rec.messages)
    setConversationId(rec.id)
    setStatus("idle")
    setTaskId(null)
    setHistoryOpen(false)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || !online || status === "streaming" || status === "submitting") return
    setStatus("submitting")
    setDraft("")
    // First user message of a thread → mint a conversation id.
    if (!conversationId) setConversationId(crypto.randomUUID())
    const userMsg: AgentMessage = { id: crypto.randomUUID(), role: "user", text }
    setMessages(prev => [...prev, userMsg])
    try {
      const { taskId: tid, assistantId } = await window.api.agent.send({
        text,
        attachActivePage: !!activeUrl,
      })
      setTaskId(tid)
      setMessages(prev => [
        ...prev,
        { id: assistantId, role: "assistant", text: "", streaming: true },
      ])
    } catch (err) {
      setStatus("error")
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "",
          error: err instanceof Error ? err.message : String(err),
        },
      ])
    }
  }

  const cancel = () => {
    if (taskId) void window.api.agent.cancel(taskId)
  }

  const composerDisabled = !online
  const sendDisabled = composerDisabled || !draft.trim() || status === "streaming" || status === "submitting"
  const isStreaming = status === "streaming" || status === "submitting"

  return (
    <div className="h-full flex flex-col">
      {/* Header — Assistant identity + capability badges + thread controls */}
      <div className="px-4 pt-4 pb-3 border-b border-chrome-border">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-signal" style={{ transform: "translateY(2px)" }}>
              <DeltaLogo size={13} />
            </span>
            <span className="font-serif italic text-[18px] leading-none text-chrome-text">Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={newConversation}
              title="New conversation"
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors px-1.5 py-0.5"
            >
              + new
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              title="Conversation history"
              className={[
                "font-mono text-[10px] tracking-[0.12em] uppercase transition-colors px-1.5 py-0.5",
                historyOpen ? "text-signal" : "text-chrome-text-3 hover:text-signal",
              ].join(" ")}
            >
              history
            </button>
          </div>
        </div>
        <ul className="mt-2.5 flex gap-1.5 flex-wrap">
          {CAPABILITIES.map((c) => (
            <li
              key={c.label}
              title={c.hint}
              className={[
                "px-2 h-5 rounded-full inline-flex items-center gap-1.5",
                "font-mono text-[10px] tracking-[0.08em] uppercase",
                "border",
                c.live
                  ? "text-signal border-signal/40 bg-signal/8"
                  : "text-chrome-text-3 border-chrome-border",
              ].join(" ")}
            >
              <span className={c.live ? "h-1 w-1 rounded-full bg-signal" : "h-1 w-1 rounded-full bg-chrome-text-3"} />
              {c.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Context strip */}
      {activeUrl && (
        <div className="px-4 py-3 border-b border-chrome-border">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3 mb-1.5">
            On this page
          </p>
          <p className="text-[13px] text-chrome-text leading-snug truncate">
            {activeTitle || "Untitled"}
          </p>
          <p className="font-mono text-[11px] text-chrome-text-3 truncate">{activeUrl}</p>
        </div>
      )}

      {/* Conversation OR history list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {historyOpen ? (
          <HistoryList
            currentId={conversationId}
            onPick={openConversation}
            onClose={() => setHistoryOpen(false)}
          />
        ) : messages.length === 0 ? (
          <EmptyState online={online} hasContext={!!activeUrl} onPick={setDraft} onOpenSettings={onOpenSettings} />
        ) : (
          <ol className="px-4 py-4 flex flex-col gap-4">
            {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
          </ol>
        )}
      </div>

      {/* Composer */}
      <div className="px-4 py-3 border-t border-chrome-border">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          rows={3}
          placeholder={
            composerDisabled
              ? "Connect a model in Settings"
              : activeUrl
                ? "Ask about this page…"
                : "Ask anything…"
          }
          className="w-full bg-chrome-surface-2 border border-chrome-border rounded-2xl text-[13px] text-chrome-text placeholder:text-chrome-text-3 px-4 py-2.5 resize-none focus:outline-none focus:border-signal/50 transition-colors duration-150 disabled:opacity-50"
          disabled={composerDisabled}
        />
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-[0.12em] uppercase">
          {/* Chip: who's answering. Click to switch model on the fly without
              leaving the chat — popover lists every model the resolved
              provider has loaded. Settings → Default provider is the same
              setting; this is just a faster path. */}
          {online ? (
            <div className="relative" ref={modelPickerRef}>
              <button
                type="button"
                onClick={() => setModelPickerOpen((v) => !v)}
                title={`${usable!.label} · ${activeModel} — click to switch model`}
                className={[
                  "flex items-center gap-1.5 transition-colors",
                  modelPickerOpen ? "text-chrome-text" : "text-chrome-text-3 hover:text-chrome-text-2",
                ].join(" ")}
              >
                {isStreaming ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                )}
                <span className="text-chrome-text-2 truncate max-w-[180px]">
                  {usable!.label}
                  <span className="text-chrome-text-3 normal-case mx-1">·</span>
                  {activeModel}
                </span>
                <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-60" aria-hidden="true">
                  <path d="M1 3 L4 6 L7 3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {modelPickerOpen && (
                <div
                  className="absolute bottom-full mb-2 left-0 min-w-[220px] max-w-[300px] rounded-xl border border-chrome-border bg-chrome-bg shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)] py-1.5 z-30"
                  role="menu"
                >
                  <p className="px-3 pt-1 pb-1.5 font-mono text-[9px] tracking-[0.18em] uppercase text-chrome-text-3">
                    Model · {usable!.label}
                  </p>
                  <ul className="max-h-[240px] overflow-y-auto">
                    {usable!.models.map((m) => {
                      const isActive = m === activeModel
                      return (
                        <li key={m}>
                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={isActive}
                            onClick={() => pickModel(m)}
                            className={[
                              "w-full text-left px-3 py-1.5 font-mono text-[11px] normal-case flex items-center gap-2",
                              isActive ? "text-signal" : "text-chrome-text-2 hover:bg-chrome-surface hover:text-chrome-text",
                            ].join(" ")}
                          >
                            <span className={[
                              "h-1.5 w-1.5 rounded-full shrink-0",
                              isActive ? "bg-signal" : "bg-transparent border border-chrome-border",
                            ].join(" ")} />
                            <span className="truncate">{m}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="border-t border-chrome-border mt-1 pt-1 px-3 pb-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => pickModel(undefined)}
                      className="text-[9px] tracking-[0.14em] uppercase text-chrome-text-3 hover:text-chrome-text-2 transition-colors"
                      title="Let the provider's first listed model decide"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModelPickerOpen(false); onOpenSettings() }}
                      className="text-[9px] tracking-[0.14em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
                    >
                      Settings →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 text-chrome-text-3 hover:text-chrome-text-2 transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-chrome-text-3 animate-pulse" />
              <span>No model · settings</span>
            </button>
          )}
          {isStreaming ? (
            <button type="button" onClick={cancel} className="text-chrome-text-2 hover:text-signal flex items-center gap-1.5">
              <span>Stop</span>
              <span className="text-chrome-text-3 normal-case">esc</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={sendDisabled}
              className="text-chrome-text-2 hover:text-signal disabled:opacity-40 disabled:hover:text-chrome-text-2 flex items-center gap-1.5"
            >
              <span>Send</span>
              <span className="text-chrome-text-3 normal-case">↵</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────
// When online: capabilities + starter prompts (chat-only).
// When offline: short headline + ONE button → Settings. No setup
// instructions here — those live in Settings → Connection. This is the
// IA fix: the Assistant is a conversation surface, not a setup wizard.
function EmptyState({ online, hasContext, onPick, onOpenSettings }: {
  online: boolean
  hasContext: boolean
  onPick: (s: string) => void
  onOpenSettings: () => void
}) {
  if (!online) {
    return (
      <div className="px-4 py-10 flex flex-col items-start gap-4">
        <p className="font-serif italic text-[22px] leading-[1.3] text-chrome-text max-w-[28ch]">
          Connect a model.
        </p>
        <p className="text-[13px] leading-[1.6] text-chrome-text-2 max-w-[34ch]">
          The Assistant runs against a model on your machine.
          Settings has the setup options — Ollama is the fastest path.
        </p>
        <button
          type="button"
          onClick={onOpenSettings}
          className="h-9 px-4 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[12px] font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          Open Settings
          <span className="font-mono text-[10px] opacity-70">⌘,</span>
        </button>
      </div>
    )
  }
  return (
    <div className="px-4 py-8 flex flex-col items-start gap-5">
      <p className="font-serif italic text-[22px] leading-[1.3] text-chrome-text max-w-[28ch]">
        {hasContext ? "Ask the page." : "Ask anything."}
      </p>
      <ul className="flex flex-col gap-1.5 w-full">
        {SUGGESTIONS.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="w-full text-left px-4 py-2 rounded-full border border-chrome-border text-[12px] text-chrome-text-2 hover:text-chrome-text hover:border-chrome-text-3 hover:bg-chrome-surface transition-colors duration-150"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── History list ───────────────────────────────────────────────────────
// Inline view inside the Assistant; replaces the conversation area when
// "history" is toggled. Reads from main on open and on every delete.
function HistoryList({
  currentId, onPick, onClose,
}: {
  currentId: string | null
  onPick: (id: string) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<ConversationSummary[] | null>(null)

  const refresh = async () => {
    setItems(await window.api.conversations.list())
  }
  useEffect(() => { void refresh() }, [])

  const remove = async (id: string) => {
    await window.api.conversations.delete(id)
    if (id === currentId) onClose()
    void refresh()
  }

  if (items === null) {
    return (
      <div className="px-4 py-8 text-chrome-text-3 font-mono text-[11px] tracking-[0.12em] uppercase">
        loading…
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="px-4 py-10 flex flex-col items-start gap-3">
        <p className="font-serif italic text-[20px] leading-[1.3] text-chrome-text">
          No conversations yet.
        </p>
        <p className="text-[12px] text-chrome-text-3 leading-relaxed max-w-[34ch]">
          Once you start chatting, every thread is saved to your machine.
          Conversations stay local — never synced anywhere.
        </p>
      </div>
    )
  }
  return (
    <ol className="px-2 py-2 flex flex-col gap-0.5">
      {items.map((it) => (
        <li key={it.id}>
          <div
            className={[
              "group rounded-lg flex items-start gap-2 px-2.5 py-2 transition-colors",
              it.id === currentId
                ? "bg-signal/10"
                : "hover:bg-chrome-surface",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => onPick(it.id)}
              className="flex-1 min-w-0 text-left"
            >
              <p className={[
                "text-[13px] leading-snug truncate",
                it.id === currentId ? "text-signal" : "text-chrome-text",
              ].join(" ")}>
                {it.title}
              </p>
              <p className="font-mono text-[10px] text-chrome-text-3 mt-0.5">
                {relativeTime(it.updatedAt)} · {it.messageCount} msg
              </p>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void remove(it.id) }}
              aria-label="Delete conversation"
              className="opacity-0 group-hover:opacity-100 font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-[hsl(0_70%_70%)] transition-opacity"
            >
              ×
            </button>
          </div>
        </li>
      ))}
    </ol>
  )
}

function relativeTime(ts: number): string {
  const d = Date.now() - ts
  const mins = Math.floor(d / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const date = new Date(ts)
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user"
  const hasTools = (message.toolCalls?.length ?? 0) > 0
  const hasPending = (message.pendingPermissions?.length ?? 0) > 0
  const showThinking = message.streaming && !message.text && !hasTools && !hasPending

  // Both user + assistant bubbles fade-and-slide-up on entry. The
  // transition is gentle (160ms) so a streaming response of many tokens
  // doesn't feel jumpy — only the wrapper animates, not each token.
  const enter = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.16, ease: [0.32, 0.72, 0, 1] as const },
  }

  if (isUser) {
    return (
      <motion.li
        {...enter}
        className="self-end max-w-[90%] text-[13px] leading-[1.6] whitespace-pre-wrap px-3 py-2 rounded-lg bg-chrome-surface-2 text-chrome-text rounded-tr-sm"
      >
        {message.text}
      </motion.li>
    )
  }

  return (
    <motion.li
      {...enter}
      className="self-start max-w-[95%] flex flex-col gap-2"
    >
      {hasTools && (
        <ul className="flex flex-col gap-1.5">
          {message.toolCalls!.map((c) => <ToolCallCard key={c.id} call={c} />)}
        </ul>
      )}
      {hasPending && (
        <ul className="flex flex-col gap-1.5">
          {message.pendingPermissions!.map((p) => <PermissionCard key={p.permissionId} request={p} />)}
        </ul>
      )}
      {(message.text || showThinking || message.error) && (
        <div className="text-[13px] leading-[1.6] whitespace-pre-wrap px-3 py-2 rounded-lg bg-chrome-surface text-chrome-text-2 rounded-tl-sm max-w-[90%]">
          {message.error ? (
            <span className="text-chrome-text-3 italic">error: {message.error}</span>
          ) : message.text ? (
            message.text
          ) : (
            <span className="flex items-center gap-1.5 text-chrome-text-3">
              <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
              thinking…
            </span>
          )}
        </div>
      )}
    </motion.li>
  )
}

// Inline card asking the user to approve an act-tool call. Three buttons:
// Allow (one-shot), Always allow on this site (persists in settings),
// Block. The card stays visible until the user picks one — no auto-dismiss.
function PermissionCard({ request }: { request: PermissionRequest }) {
  const [decided, setDecided] = useState<PermissionDecision | null>(null)
  const decide = async (decision: PermissionDecision) => {
    setDecided(decision)
    await window.api.agent.respondToPermission(request.permissionId, decision)
  }

  return (
    <li className="rounded-lg border border-signal/40 bg-signal/8 px-3 py-2.5">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-signal shrink-0">
          permission · act
        </span>
        <span className="font-mono text-chrome-text text-[12px] truncate">{request.toolName}</span>
      </div>
      <p className="text-[13px] text-chrome-text leading-snug mb-1">{request.summary}</p>
      {request.origin && (
        <p className="font-mono text-[11px] text-chrome-text-3 mb-2.5">
          on <span className="text-chrome-text-2">{request.origin}</span>
        </p>
      )}
      {decided ? (
        <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-chrome-text-3">
          {decided === "block" ? "blocked" : decided === "always_allow" ? "allowed · saved for this site" : "allowed once"}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void decide("allow")}
            className="h-7 px-3 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[12px] font-medium hover:opacity-90 transition-opacity"
          >Allow</button>
          {request.origin && (
            <button
              type="button"
              onClick={() => void decide("always_allow")}
              className="h-7 px-3 rounded-full border border-signal/50 text-signal text-[12px] hover:bg-signal/10 transition-colors"
            >Always on {request.origin}</button>
          )}
          <button
            type="button"
            onClick={() => void decide("block")}
            className="h-7 px-3 rounded-full border border-chrome-border text-chrome-text-2 text-[12px] hover:text-[hsl(0_70%_70%)] hover:border-[hsl(0_70%_60%/0.4)] transition-colors"
          >Block</button>
        </div>
      )}
    </li>
  )
}

// Tool-call card: shows the tool name, a short args summary, and a
// collapsed result. Click to expand the full result. Errors render in red.
function ToolCallCard({ call }: { call: ToolCallView }) {
  const [expanded, setExpanded] = useState(false)
  const isError = !!call.error
  const argsSummary = summariseArgs(call.args)
  const resultSummary = isError ? call.error! : summariseResult(call.result)

  return (
    <li
      className={[
        "rounded-lg border bg-chrome-surface/60 px-3 py-2 text-[12px]",
        isError ? "border-[hsl(0_70%_55%/0.35)]" : "border-chrome-border",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 text-left"
      >
        <span className={["font-mono text-[10px] tracking-[0.08em] uppercase shrink-0",
          isError ? "text-[hsl(0_70%_70%)]" : "text-signal"].join(" ")}>
          {isError ? "tool · error" : "tool · ran"}
        </span>
        <span className="font-mono text-chrome-text truncate">{call.name}</span>
        {argsSummary && (
          <span className="font-mono text-chrome-text-3 truncate">({argsSummary})</span>
        )}
        {typeof call.durationMs === "number" && (
          <span className="ml-auto font-mono text-[10px] text-chrome-text-3 tabular-nums shrink-0">
            {call.durationMs}ms
          </span>
        )}
      </button>
      {expanded && (
        <pre className="mt-2 font-mono text-[11px] leading-[1.55] text-chrome-text-2 whitespace-pre-wrap break-words max-h-64 overflow-y-auto bg-chrome-surface-2 rounded-md px-2.5 py-2">
{resultSummary}
        </pre>
      )}
    </li>
  )
}

function summariseArgs(args: unknown): string {
  if (!args || typeof args !== "object") return ""
  const obj = args as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length === 0) return ""
  return keys
    .map((k) => {
      const v = obj[k]
      const s =
        typeof v === "string" ? `"${v.length > 24 ? v.slice(0, 24) + "…" : v}"`
        : typeof v === "number" ? String(v)
        : typeof v === "boolean" ? String(v)
        : "…"
      return `${k}: ${s}`
    })
    .join(", ")
}

function summariseResult(result: unknown): string {
  if (result === undefined || result === null) return "(empty)"
  if (typeof result === "string") return result.length > 4000 ? result.slice(0, 4000) + "\n…(truncated)" : result
  try {
    const s = JSON.stringify(result, null, 2)
    return s.length > 4000 ? s.slice(0, 4000) + "\n…(truncated)" : s
  } catch {
    return String(result)
  }
}
