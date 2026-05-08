"use client"

import { useState } from "react"

type Status = "idle" | "sending" | "sent"

export default function DeltaContact() {
  const [body, setBody] = useState("")
  const [status, setStatus] = useState<Status>("idle")

  const charCount = body.length
  const handleSend = () => {
    if (!body.trim()) return
    setStatus("sending")
    setTimeout(() => setStatus("sent"), 600)
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const sentAt = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })

  return (
    <div className="mx-auto max-w-[1280px] px-6 lg:px-12 pt-32 md:pt-48 pb-32 min-h-[80vh]">
      <div className="grid grid-cols-4 md:grid-cols-12 gap-x-6">
        <div className="col-span-4 md:col-span-2">
          <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-delta-text-3">
            Contact
          </p>
        </div>
        <div className="col-span-4 md:col-span-8">
          <h1 className="font-serif italic text-[44px] md:text-[64px] leading-[1.05] tracking-[-0.015em] text-delta-text mb-10 max-w-[20ch]">
            What are you working on?
          </h1>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKey}
            disabled={status !== "idle"}
            rows={6}
            placeholder="Type. Shift+Enter for new line. Enter to send."
            className="
              w-full bg-transparent border-0 border-b border-delta-border
              focus:border-signal focus:outline-none
              font-serif italic text-[24px] md:text-[28px] leading-[1.5]
              text-delta-text placeholder:text-delta-text-3
              resize-none pb-3 transition-colors duration-150 ease-delta-snap
              disabled:opacity-50
            "
            aria-label="Message"
          />

          <div className="mt-5 flex items-center justify-between font-mono text-[11px] tracking-[0.12em] uppercase">
            <span className="text-delta-text-3">
              {status === "idle" && (
                <>
                  Draft ·{" "}
                  <span className="text-delta-text-2 tabular-nums">
                    {charCount}
                  </span>{" "}
                  chars
                </>
              )}
              {status === "sending" && (
                <span className="text-delta-text-2">Sending…</span>
              )}
              {status === "sent" && (
                <span className="text-signal">
                  Sent ·{" "}
                  <span className="tabular-nums">{sentAt}</span> GMT
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={handleSend}
              disabled={status !== "idle" || !body.trim()}
              className="
                text-delta-text-2 hover:text-signal
                disabled:opacity-40 disabled:hover:text-delta-text-2
                transition-colors duration-150 ease-delta-snap
              "
            >
              ↵ Send
            </button>
          </div>

          <p className="mt-16 max-w-[58ch] text-[14px] leading-[1.7] text-delta-text-3">
            One field. No subject line. If you want a reply, an email address
            in the body of the message is the most reliable way to get one.
          </p>
        </div>
      </div>
    </div>
  )
}
