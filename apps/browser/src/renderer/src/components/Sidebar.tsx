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

  // The agent picks the first usable online provider. We surface that one
  // (and only that one) so the user has a single status line to look at,
  // not a 5-row debug list.
  const usable = useMemo(
    () => providers.find((p) => p.status === "online" && p.models.length > 0),
    [providers],
  )
  const online = !!usable

  // Subscribe to agent events.
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

  // Auto-poll while offline so the moment a local LLM comes up, Delta
  // notices without making the user click Refresh. Stops polling once
  // anything is online.
  useEffect(() => {
    if (online) return
    const id = setInterval(onRefresh, 4000)
    return () => clearInterval(id)
  }, [online, onRefresh])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || !online || status === "streaming" || status === "submitting") return
    setStatus("submitting")
    setDraft("")
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
      {/* Header */}
      <div className="h-12 px-4 flex items-baseline justify-between border-b border-chrome-border">
        <div className="flex items-baseline gap-2">
          <span className="text-signal" style={{ transform: "translateY(2px)" }}>
            <DeltaLogo size={13} />
          </span>
          <span className="font-serif italic text-[18px] leading-none text-chrome-text">Delta</span>
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">ai</span>
        </div>
      </div>

      {/* Single status line — replaces the old 5-row provider list */}
      <ConnectionLine usable={usable} onRefresh={onRefresh} />

      {/* Context strip */}
      {activeUrl && (
        <div className="px-4 py-3 border-b border-chrome-border">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3 mb-1.5">
            Context
          </p>
          <p className="text-[13px] text-chrome-text leading-snug truncate">
            {activeTitle || "Untitled"}
          </p>
          <p className="font-mono text-[11px] text-chrome-text-3 truncate">{activeUrl}</p>
        </div>
      )}

      {/* Chat surface */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState online={online} hasContext={!!activeUrl} onPick={setDraft} />
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
              ? "Start a local LLM to chat"
              : activeUrl
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

// ── Single status line ─────────────────────────────────────────────────
// On: green dot + "<provider> · <model>"
// Off: muted "No model online" + Refresh, with a hint that auto-poll is on.
function ConnectionLine({ usable, onRefresh }: { usable: ProviderInfo | undefined; onRefresh: () => void }) {
  const online = !!usable
  return (
    <div className="px-4 py-2.5 border-b border-chrome-border flex items-center gap-2">
      <span
        className={[
          "h-1.5 w-1.5 rounded-full shrink-0",
          online ? "bg-signal" : "bg-chrome-text-3 animate-pulse",
        ].join(" ")}
        aria-hidden
      />
      {online ? (
        <p className="text-[12px] text-chrome-text-2 truncate flex-1">
          <span className="text-chrome-text">{usable!.label}</span>
          <span className="text-chrome-text-3"> · </span>
          <span className="font-mono text-[11px] text-chrome-text-2 truncate">{usable!.models[0]}</span>
        </p>
      ) : (
        <p className="text-[12px] text-chrome-text-2 flex-1">
          <span className="text-chrome-text">No model online.</span>{" "}
          <span className="text-chrome-text-3">Watching for one…</span>
        </p>
      )}
      <button
        type="button"
        onClick={onRefresh}
        title="Refresh providers"
        className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
      >
        Refresh
      </button>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────
function EmptyState({ online, hasContext, onPick }: { online: boolean; hasContext: boolean; onPick: (s: string) => void }) {
  return (
    <div className="px-4 py-8 flex flex-col items-start gap-5">
      <p className="font-serif italic text-[22px] leading-[1.3] text-chrome-text max-w-[28ch]">
        {online ? (hasContext ? "Ask the page." : "Ask anything.") : "Connect a model."}
      </p>
      {online ? (
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
      ) : (
        <div className="text-[13px] leading-[1.65] text-chrome-text-2 max-w-[34ch] space-y-3">
          <p>The fastest path:</p>
          <ol className="list-decimal pl-5 space-y-1.5 text-chrome-text-2">
            <li>
              Install <span className="font-mono text-chrome-text">Ollama</span> from{" "}
              <code className="font-mono text-chrome-text">ollama.com</code>
            </li>
            <li>
              Run <code className="font-mono text-chrome-text">ollama pull llama3.2</code> once
            </li>
            <li>Delta will auto-detect it within a few seconds</li>
          </ol>
          <p className="text-chrome-text-3 text-[12px]">
            Already running LM Studio or llama.cpp? Make sure their local server is started — Delta will pick it up.
          </p>
        </div>
      )}
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
