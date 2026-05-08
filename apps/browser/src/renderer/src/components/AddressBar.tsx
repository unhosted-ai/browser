import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from "react"
import type { Tab } from "@shared/types"

type Props = {
  tab: Tab | null
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export type AddressBarHandle = {
  focus: () => void
  selectAll: () => void
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ""
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed)) return trimmed
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(trimmed)) return `https://${trimmed}`
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.host + (u.pathname === "/" ? "" : u.pathname) + u.search + u.hash
  } catch {
    return url
  }
}

// ── icons ────────────────────────────────────────────
const Icon = {
  back: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  forward: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  reload: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M11.5 6A4.5 4.5 0 1 0 12 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  lock: (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <rect x="2" y="5" width="7" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.5 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  search: (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <circle cx="4.5" cy="4.5" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 7l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  // Delta brand mark — equilateral triangle, mirrors components/DeltaLogo.tsx
  delta: (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1.5 L12.5 11.5 L1.5 11.5 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.18"
      />
    </svg>
  ),
}

export const AddressBar = forwardRef<AddressBarHandle, Props>(function AddressBar(
  { tab, onNavigate, onBack, onForward, onReload, sidebarOpen, onToggleSidebar },
  ref
) {
  const [value, setValue] = useState(tab?.url ?? "")
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focused) setValue(tab?.url ?? "")
  }, [tab?.url, tab?.id, focused])

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    selectAll: () => {
      inputRef.current?.focus()
      inputRef.current?.select()
    },
  }))

  const isHttps = tab?.url?.startsWith("https://") ?? false
  const isFile  = tab?.url?.startsWith("file://")  ?? false
  const showLock = isHttps && !focused && !!tab?.url
  const showSearch = !showLock && !isFile && !focused

  const buttonCls = (disabled = false) =>
    [
      "h-7 w-7 grid place-items-center rounded-md transition-colors duration-150",
      disabled
        ? "text-chrome-text-3 cursor-not-allowed"
        : "text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface",
    ].join(" ")

  return (
    <div className="relative h-10 flex items-center gap-1 px-3 no-drag">
      <button type="button" aria-label="Back"    disabled={!tab?.canGoBack}    onClick={onBack}    className={buttonCls(!tab?.canGoBack)}>{Icon.back}</button>
      <button type="button" aria-label="Forward" disabled={!tab?.canGoForward} onClick={onForward} className={buttonCls(!tab?.canGoForward)}>{Icon.forward}</button>
      <button type="button" aria-label="Reload"  onClick={onReload}            className={buttonCls(false)}>{Icon.reload}</button>

      <div
        className={[
          "flex-1 mx-1 h-7 flex items-center gap-2 px-3 rounded-md",
          "bg-chrome-surface border transition-colors duration-150",
          focused ? "border-signal/50" : "border-chrome-border",
        ].join(" ")}
      >
        <span className="text-chrome-text-3 shrink-0">
          {showLock ? Icon.lock : showSearch ? Icon.search : null}
        </span>
        <input
          ref={inputRef}
          value={focused ? value : (tab ? displayUrl(tab.url) : "")}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => {
            setFocused(true)
            setValue(tab?.url ?? "")
            e.currentTarget.select()
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const url = normalizeUrl(value)
              if (url) {
                onNavigate(url)
                inputRef.current?.blur()
              }
            } else if (e.key === "Escape") {
              setValue(tab?.url ?? "")
              inputRef.current?.blur()
            }
          }}
          placeholder="Search or enter address"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Address bar"
          className="flex-1 bg-transparent text-[13px] text-chrome-text placeholder:text-chrome-text-3 focus:outline-none"
        />
      </div>

      <button
        type="button"
        aria-label="Toggle Delta AI sidebar"
        title="Delta AI sidebar  ⌘J"
        onClick={onToggleSidebar}
        className={[
          "h-7 px-2.5 ml-1 rounded-md flex items-center gap-1.5",
          "text-[11px] tracking-[0.08em] uppercase font-mono",
          "border transition-colors duration-150",
          sidebarOpen
            ? "border-signal/60 text-signal bg-chrome-surface"
            : "border-chrome-border text-chrome-text-2 hover:text-chrome-text hover:border-chrome-border",
        ].join(" ")}
      >
        <span className={sidebarOpen ? "text-signal" : "text-chrome-text-2"}>
          {Icon.delta}
        </span>
        AI
      </button>

      {/* Loading progress bar — anchored at the bottom of the chrome */}
      {tab?.loading && (
        <div className="loading-bar absolute left-0 right-0 bottom-0 h-[2px] overflow-hidden" />
      )}
    </div>
  )
})
