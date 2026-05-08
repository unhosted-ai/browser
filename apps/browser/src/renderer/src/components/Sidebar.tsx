import { useState } from "react"
import type { ProviderInfo } from "@shared/types"

type Props = {
  providers: ProviderInfo[]
  activeUrl: string | null
  onRefresh: () => void
}

export function Sidebar({ providers, activeUrl, onRefresh }: Props) {
  const [draft, setDraft] = useState("")
  const onlineCount = providers.filter((p) => p.status === "online").length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-chrome-border">
        <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-chrome-text-3">
          AI · Sidebar
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="font-mono text-[11px] tracking-[0.12em] uppercase text-chrome-text-2 hover:text-signal"
        >
          Refresh
        </button>
      </div>

      {/* Providers panel */}
      <div className="px-4 py-3 border-b border-chrome-border">
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3 mb-2">
          Providers · {onlineCount}/{providers.length} online
        </p>
        <ul className="space-y-1.5">
          {providers.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 text-[12px] text-chrome-text-2"
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  p.status === "online"
                    ? "bg-signal"
                    : p.status === "offline"
                      ? "bg-chrome-text-3"
                      : "bg-signal-dim",
                ].join(" ")}
                title={p.status}
              />
              <span className="flex-1 text-chrome-text">{p.label}</span>
              <span className="font-mono text-[10px] text-chrome-text-3 truncate max-w-[140px]">
                {p.endpoint.replace(/^https?:\/\//, "")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Context strip */}
      <div className="px-4 py-3 border-b border-chrome-border">
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3 mb-1">
          Context
        </p>
        <p className="text-[12px] text-chrome-text-2 truncate">
          {activeUrl || "no active tab"}
        </p>
      </div>

      {/* Chat surface — stub, no LLM wired yet */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-[13px] leading-[1.6] text-chrome-text-3 italic">
          Chat with the active page. Ask, summarise, extract — once a provider
          is online, this surface will stream responses from it.
        </p>
      </div>

      {/* Composer */}
      <div className="px-4 py-3 border-t border-chrome-border">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Type. Enter to send."
          className="w-full bg-chrome-surface-2 border border-chrome-border rounded-md text-[13px] text-chrome-text placeholder:text-chrome-text-3 px-3 py-2 resize-none focus:outline-none focus:border-signal/60"
          disabled={onlineCount === 0}
        />
        <div className="mt-2 flex justify-between font-mono text-[10px] tracking-[0.12em] uppercase">
          <span className="text-chrome-text-3">
            {onlineCount === 0 ? "no providers online" : `draft · ${draft.length}`}
          </span>
          <button
            type="button"
            disabled={onlineCount === 0 || !draft.trim()}
            className="text-chrome-text-2 hover:text-signal disabled:opacity-40 disabled:hover:text-chrome-text-2"
          >
            ↵ Send
          </button>
        </div>
      </div>
    </div>
  )
}
