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
  onOpenSettings: () => void
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
  // Delta brand mark — Δ with a guiding spark; mirrors components/DeltaLogo.tsx
  delta: (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="2.4" r="1.1" fill="currentColor" />
      <path
        d="M8 5 L13 13.5 L3 13.5 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.18"
      />
    </svg>
  ),
  // Toothed gear — visually distinct from any "sun"-like radial shape.
  settings: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.5 7.5 0 0 0-1.69-.98l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.61.25-1.17.58-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64L4.57 11c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.68.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65a.5.5 0 0 0 .5.42h4a.5.5 0 0 0 .5-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.25.12.54.02.68-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05"
      />
    </svg>
  ),
}

export const AddressBar = forwardRef<AddressBarHandle, Props>(function AddressBar(
  { tab, onNavigate, onBack, onForward, onReload, sidebarOpen, onToggleSidebar, onOpenSettings },
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
      <button type="button" aria-label="Back"    title="Back  ⌘["    disabled={!tab?.canGoBack}    onClick={onBack}    className={buttonCls(!tab?.canGoBack)}>{Icon.back}</button>
      <button type="button" aria-label="Forward" title="Forward  ⌘]" disabled={!tab?.canGoForward} onClick={onForward} className={buttonCls(!tab?.canGoForward)}>{Icon.forward}</button>
      <button type="button" aria-label="Reload"  title="Reload  ⌘R"  onClick={onReload}            className={buttonCls(false)}>{Icon.reload}</button>

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

      {/* Settings — also where theme lives. Removed the duplicate sun/moon
          toggle from here; one home for appearance is less confusing. */}
      <button
        type="button"
        aria-label="Open settings"
        title="Settings  ⌘,"
        onClick={onOpenSettings}
        className={buttonCls(false)}
      >
        {Icon.settings}
      </button>

      <button
        type="button"
        aria-label="Toggle Assistant"
        title="Assistant  ⌘J"
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
