import { useEffect, useMemo, useRef, useState } from "react"
import type { AgentEvent, AgentMessage, AgentStatus, ProviderInfo } from "@shared/types"
import { DeltaLogo } from "./DeltaLogo"

type Props = {
  providers: ProviderInfo[]
  activeUrl: string | null
  activeTitle: string | null
  onRefresh: () => void
}

const SUGGESTIONS = [
  "Summarise this page",
  "Pull out the action items",
  "What does this page miss?",
] as const

export function Sidebar({ providers, activeUrl, activeTitle, onRefresh }: Props) {
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [status, setStatus] = useState<AgentStatus>("idle")
  const [taskId, setTaskId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const localProviders = useMemo(() => providers.filter(p => p.id !== "api"), [providers])
  const onlineLocal = localProviders.filter(p => p.status === "online" && p.models.length > 0)
  const onlineCount = onlineLocal.length
  const activeProvider = onlineLocal[0] ?? null
  const hasContext = !!activeUrl

  // Subscribe to agent events from main.
  useEffect(() => {
    return window.api.agent.onEvent((e: AgentEvent) => {
      if (e.type === "task_start") {
        setStatus("streaming")
      } else if (e.type === "text_delta") {
        setMessages(prev => prev.map(m =>
          m.id === e.assistantId ? { ...m, text: m.text + e.delta } : m
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

  // Auto-scroll on new tokens.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || onlineCount === 0 || status === "streaming" || status === "submitting") return
    setStatus("submitting")
    setDraft("")
    const userMsg: AgentMessage = { id: crypto.randomUUID(), role: "user", text }
    setMessages(prev => [...prev, userMsg])
    try {
      const { taskId: tid, assistantId } = await window.api.agent.send({
        text,
        attachActivePage: hasContext,
      })
      setTaskId(tid)
      // Insert empty assistant placeholder; deltas will fill it.
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

  const composerDisabled = onlineCount === 0
  const sendDisabled = composerDisabled || !draft.trim() || status === "streaming" || status === "submitting"
  const isStreaming = status === "streaming" || status === "submitting"

  return (
    <div className="h-full flex flex-col">
      {/* Header — Instrument Serif italic, editorial register */}
      <div className="h-12 px-4 flex items-baseline justify-between border-b border-chrome-border">
        <div className="flex items-baseline gap-2">
          <span className="text-signal" style={{ transform: "translateY(2px)" }}>
            <DeltaLogo size={13} />
          </span>
          <span className="font-serif italic text-[18px] leading-none text-chrome-text">
            Delta
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">
            ai
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          {/* Local · Private — visible whenever we'd actually use a local provider */}
          <span
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3"
            title="Chat runs against a locally-installed LLM. Nothing leaves your machine."
          >
            Local <span className="text-chrome-text-2">·</span> Private
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors duration-150"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Providers panel */}
      <div className="px-4 py-3 border-b border-chrome-border">
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3 mb-2.5 flex items-baseline gap-2">
          <span>Providers</span>
          <span className="text-chrome-text-2 tabular-nums">
            {onlineCount}/{localProviders.length}
          </span>
          <span className="text-chrome-text-3">online</span>
        </p>
        <ul className="space-y-1.5">
          {providers.map((p) => {
            const isActive = activeProvider?.id === p.id
            const usingModel = isActive ? activeProvider.models[0] : undefined
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 text-[12px] text-chrome-text-2"
                title={`${p.label} — ${p.status} — ${p.endpoint}${usingModel ? ` · ${usingModel}` : ""}`}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full shrink-0 transition-colors duration-150",
                    p.status === "online"
                      ? "bg-signal"
                      : p.status === "offline"
                        ? "bg-chrome-text-3"
                        : "bg-signal-dim",
                  ].join(" ")}
                />
                <span className="flex-1 text-chrome-text">
                  {p.label}
                  {isActive && (
                    <span className="ml-1.5 font-mono text-[10px] tracking-[0.08em] uppercase text-signal">
                      active
                    </span>
                  )}
                </span>
                <span className="font-mono text-[10px] text-chrome-text-3 truncate max-w-[140px]">
                  {usingModel ?? p.endpoint.replace(/^https?:\/\//, "")}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Context strip */}
      <div className="px-4 py-3 border-b border-chrome-border">
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3 mb-1.5">
          Context
        </p>
        {hasContext ? (
          <>
            <p className="text-[13px] text-chrome-text leading-snug truncate">
              {activeTitle || "Untitled"}
            </p>
            <p className="font-mono text-[11px] text-chrome-text-3 truncate">
              {activeUrl}
            </p>
          </>
        ) : (
          <p className="text-[12px] italic text-chrome-text-3">no active tab</p>
        )}
      </div>

      {/* Chat surface */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="px-4 py-8 flex flex-col items-start gap-5">
            <p className="font-serif italic text-[22px] leading-[1.3] text-chrome-text max-w-[28ch]">
              Ask the page.
            </p>
            <p className="text-[13px] leading-[1.65] text-chrome-text-2 max-w-[34ch]">
              {onlineCount === 0
                ? "Bring an LLM online — Ollama, LM Studio, llama.cpp, or MLX — and the agent will read the active tab and reply."
                : "Type below, or pick a starter:"}
            </p>

            {onlineCount > 0 && (
              <ul className="flex flex-col gap-1.5 w-full">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setDraft(s)}
                      className="w-full text-left px-4 py-2 rounded-full border border-chrome-border text-[12px] text-chrome-text-2 hover:text-chrome-text hover:border-chrome-text-3 hover:bg-chrome-surface transition-colors duration-150"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <ol className="px-4 py-4 flex flex-col gap-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
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
              ? "No local provider online"
              : hasContext
                ? "Ask about this page…"
                : "Ask anything…"
          }
          className="w-full bg-chrome-surface-2 border border-chrome-border rounded-2xl text-[13px] text-chrome-text placeholder:text-chrome-text-3 px-4 py-2.5 resize-none focus:outline-none focus:border-signal/50 transition-colors duration-150 disabled:opacity-50"
          disabled={composerDisabled}
        />
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-[0.12em] uppercase">
          <span className="text-chrome-text-3">
            {composerDisabled ? (
              "offline"
            ) : isStreaming ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
                streaming
              </span>
            ) : draft ? (
              <>draft · <span className="text-chrome-text-2 tabular-nums">{draft.length}</span> chars</>
            ) : (
              "ready"
            )}
          </span>
          {isStreaming ? (
            <button
              type="button"
              onClick={cancel}
              className="text-chrome-text-2 hover:text-signal flex items-center gap-1.5"
            >
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

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user"
  return (
    <li
      className={[
        "max-w-[90%] text-[13px] leading-[1.6] whitespace-pre-wrap",
        "px-3 py-2 rounded-lg",
        isUser
          ? "self-end bg-chrome-surface-2 text-chrome-text rounded-tr-sm"
          : "self-start bg-chrome-surface text-chrome-text-2 rounded-tl-sm",
      ].join(" ")}
    >
      {message.error ? (
        <span className="text-chrome-text-3 italic">error: {message.error}</span>
      ) : message.text ? (
        message.text
      ) : message.streaming ? (
        <span className="flex items-center gap-1.5 text-chrome-text-3">
          <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
          thinking…
        </span>
      ) : null}
    </li>
  )
}
