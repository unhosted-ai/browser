import { forwardRef, useEffect, useMemo, useRef, useState, useImperativeHandle } from "react"
import type { Tab } from "@shared/types"
import { classifyUrl } from "../lib/safety"
import { SafetyBadge } from "./SafetyBadge"

type Props = {
  tab: Tab | null
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  theme: "dark" | "light"
  onToggleTheme: () => void
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
  // Internal pages (delta://newtab, etc.) read as empty so the placeholder
  // ("Search or enter address") shows — matches the new-tab feel of Chrome.
  if (url.startsWith("delta:")) return ""
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
  sun: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.3" />
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M7 1.5v1.4" /><path d="M7 11.1v1.4" />
        <path d="M1.5 7h1.4" /><path d="M11.1 7h1.4" />
        <path d="M3 3l1 1" /><path d="M10 10l1 1" />
        <path d="M11 3l-1 1" /><path d="M4 10l-1 1" />
      </g>
    </svg>
  ),
  moon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 8.6A4.6 4.6 0 1 1 5.4 2.5 3.8 3.8 0 0 0 11.5 8.6Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.12"
      />
    </svg>
  ),
}

export const AddressBar = forwardRef<AddressBarHandle, Props>(function AddressBar(
  { tab, onNavigate, onBack, onForward, onReload, sidebarOpen, onToggleSidebar, theme, onToggleTheme },
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
  const isInternal = tab?.url?.startsWith("delta:") ?? false
  const showLock = isHttps && !focused && !!tab?.url
  const showSearch = !showLock && !isFile && !isInternal && !focused
  const safety = useMemo(() => classifyUrl(tab?.url), [tab?.url])
  // Hide the badge when the input is focused (gives the URL room to breathe)
  // and on plain `file://` paths where category isn't meaningful.
  const showBadge = !focused && !!tab?.url && !isFile

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
          "flex-1 mx-1 h-8 flex items-center gap-2 px-4 rounded-full",
          "bg-chrome-surface border transition-colors duration-150",
          focused ? "border-signal/50" : "border-chrome-border",
        ].join(" ")}
      >
        <span className="text-chrome-text-3 shrink-0">
          {showLock ? Icon.lock : showSearch ? Icon.search : null}
        </span>
        {showBadge && <SafetyBadge safety={safety} />}
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

      {/* Theme toggle — sun in light mode, moon in dark mode */}
      <button
        type="button"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
        onClick={onToggleTheme}
        className={buttonCls(false)}
      >
        {theme === "dark" ? Icon.sun : Icon.moon}
      </button>

      <button
        type="button"
        aria-label="Toggle Delta AI sidebar"
        title="Delta AI sidebar  ⌘J"
        onClick={onToggleSidebar}
        className={[
          "h-8 px-3 ml-1 rounded-full flex items-center gap-1.5",
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
