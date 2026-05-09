import { useEffect, useRef, useState } from "react"

type Props = {
  open: boolean
  onClose: () => void
}

export function FindBar({ open, onClose }: Props) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else {
      void window.api.find.stop()
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="absolute top-3 right-3 z-50 no-drag flex items-center gap-1.5 h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border shadow-lg"
      style={{ width: 320 }}
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-chrome-text-3 shrink-0">
        <circle cx="4.5" cy="4.5" r="3" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 7l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        value={query}
        placeholder="Find on page"
        spellCheck={false}
        onChange={(e) => {
          setQuery(e.target.value)
          if (e.target.value) void window.api.find.start(e.target.value)
          else void window.api.find.stop()
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            if (query) void window.api.find.start(query, { forward: !e.shiftKey, findNext: true })
          }
        }}
        className="flex-1 bg-transparent text-[12px] text-chrome-text placeholder:text-chrome-text-3 focus:outline-none"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close find"
        className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
      >
        esc
      </button>
    </div>
  )
}
