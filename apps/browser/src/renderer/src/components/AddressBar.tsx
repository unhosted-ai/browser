import { forwardRef, useEffect, useMemo, useRef, useState, useImperativeHandle } from "react"
import type { AgentEvent, Tab } from "@shared/types"
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
  settingsOpen: boolean
  onOpenSettings: () => void
  /** Open Settings → Privacy report (deep-link). */
  onOpenPrivacy: () => void
  /** Toggle the chrome hamburger menu. */
  menuOpen: boolean
  onToggleMenu: () => void
  /**
   * The "continue in Assistant" path from `?` ask mode: forward the
   * question to the sidebar (composer seeded, panel opens). The actual
   * provider call already streamed inline — this is for follow-ups.
   */
  onContinueInAssistant: (text: string) => void
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
        strokeLinecap="round"
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
  // Shield with check — privacy/tracker-blocker indicator.
  shield: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5l5.5 2v4.2c0 3.6-2.4 6.6-5.5 7.3-3.1-.7-5.5-3.7-5.5-7.3V3.5L8 1.5z"
            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
      <path d="M5.5 8l1.8 1.8L11 6.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  // Star — outline + fill variants used for bookmark toggle.
  star: (filled: boolean) => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.8l1.85 4.05 4.4.43-3.32 2.95.99 4.32L8 11.4l-3.92 2.15.99-4.32-3.32-2.95 4.4-.43L8 1.8z"
            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
            fill={filled ? "currentColor" : "none"} />
    </svg>
  ),
  // Link / chain — copy-link affordance.
  link: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 9.5L9.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M6.5 11.5l-1 1a2.83 2.83 0 1 1-4-4l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9.5 4.5l1-1a2.83 2.83 0 1 1 4 4l-1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  // Checkmark used after copy.
  check: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  // Reader mode — three-line page-of-text glyph.
  reader: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 6h6M5 8.5h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  // Listen — speaker + waves (matches the Comet waveform mental model).
  listen: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 6h2L8.5 3v10L5.5 10h-2V6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="currentColor" fillOpacity="0.18"/>
      <path d="M11 6c.6.6 1 1.4 1 2s-.4 1.4-1 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M12.7 4.5c1 1 1.6 2.3 1.6 3.5s-.6 2.5-1.6 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  // Stop square — used while TTS is speaking.
  stop: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="2" width="8" height="8" rx="1.4"/>
    </svg>
  ),
  // Hamburger — opens the chrome menu (bookmarks/history/downloads).
  menu: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 5h10M3 8h10M3 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
}

export const AddressBar = forwardRef<AddressBarHandle, Props>(function AddressBar(
  { tab, onNavigate, onBack, onForward, onReload, sidebarOpen, onToggleSidebar, settingsOpen, onOpenSettings, onOpenPrivacy, menuOpen, onToggleMenu, onContinueInAssistant },
  ref
) {
  const [value, setValue] = useState(tab?.url ?? "")
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Ask mode ────────────────────────────────────────────
  // Triggered when the address bar value starts with `?`. Hitting Enter
  // routes the (post-?) text to window.api.agent.ask, which streams a
  // one-shot answer with a fresh ephemeral history. The response renders
  // inline below the URL pill — no sidebar needed. ⌘↩ forwards the
  // question to the Assistant; Esc closes.
  const askMode = value.startsWith("?")
  const askQuery = askMode ? value.slice(1).trimStart() : ""
  const [askActive, setAskActive] = useState(false)
  const [askText, setAskText] = useState("")
  const [askError, setAskError] = useState<string | null>(null)
  const [askStreaming, setAskStreaming] = useState(false)
  const askAssistantIdRef = useRef<string | null>(null)
  const askLastQueryRef = useRef<string>("")
  const askPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return window.api.agent.onEvent((e: AgentEvent) => {
      // Only react to events for the assistantId WE started — the sidebar
      // listens to the same stream for its own conversation.
      if (e.assistantId !== askAssistantIdRef.current) return
      if (e.type === "text_delta") {
        setAskText((prev) => prev + e.delta)
      } else if (e.type === "task_done") {
        setAskStreaming(false)
      } else if (e.type === "task_error") {
        setAskStreaming(false)
        setAskError(e.error)
      }
    })
  }, [])

  const submitAsk = async () => {
    const text = askQuery.trim()
    if (!text || askStreaming) return
    setAskActive(true)
    setAskText("")
    setAskError(null)
    setAskStreaming(true)
    askLastQueryRef.current = text
    try {
      const { assistantId } = await window.api.agent.ask({
        text,
        attachActivePage: !!tab?.url && !tab.url.startsWith("delta:"),
      })
      askAssistantIdRef.current = assistantId
    } catch (err) {
      setAskStreaming(false)
      setAskError(err instanceof Error ? err.message : String(err))
    }
  }

  const closeAsk = () => {
    setAskActive(false)
    setAskText("")
    setAskError(null)
    setAskStreaming(false)
    askAssistantIdRef.current = null
  }

  const continueInAssistant = () => {
    const text = askLastQueryRef.current
    if (!text) return
    closeAsk()
    setValue(tab?.url ?? "")
    inputRef.current?.blur()
    onContinueInAssistant(text)
  }

  // Click-outside the panel closes it. Esc inside the input handler also
  // closes (covered there) — this is for when focus has left the bar.
  useEffect(() => {
    if (!askActive) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (askPanelRef.current?.contains(target)) return
      if (inputRef.current?.contains(target)) return
      closeAsk()
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [askActive])

  // ── Page-tools state ────────────────────────────────────
  // Bookmark + reader + speaking are all per-tab. We refresh on tab change
  // and on URL change (the URL change captures bookmark add/remove from
  // any other surface — the menu bookmark list, for example).
  const [bookmarked, setBookmarked] = useState(false)
  const [copied, setCopied] = useState(false)
  const [readerOn, setReaderOn] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (!focused) setValue(tab?.url ?? "")
  }, [tab?.url, tab?.id, focused])

  // Sync bookmark + reader + speaking state when the active tab/URL changes.
  useEffect(() => {
    let alive = true
    if (!tab) {
      setBookmarked(false); setReaderOn(false); setSpeaking(false)
      return
    }
    void window.api.bookmarks.has(tab.url).then((b) => { if (alive) setBookmarked(b) })
    void window.api.reader.isActive(tab.id).then((r) => { if (alive) setReaderOn(r) })
    void window.api.tts.isSpeaking(tab.id).then((s) => { if (alive) setSpeaking(s) })
    return () => { alive = false }
  }, [tab?.id, tab?.url])

  const isBookmarkable = !!tab?.url && !tab.url.startsWith("delta:")

  const onToggleBookmark = async () => {
    if (!tab || !isBookmarkable) return
    if (bookmarked) {
      await window.api.bookmarks.remove(tab.url)
      setBookmarked(false)
    } else {
      await window.api.bookmarks.add(tab.url, tab.title)
      setBookmarked(true)
    }
  }

  const onCopyLink = async () => {
    if (!tab?.url) return
    try {
      await navigator.clipboard.writeText(tab.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch { /* clipboard denied — silent */ }
  }

  const onToggleReader = async () => {
    if (!tab) return
    const next = await window.api.reader.toggle(tab.id)
    setReaderOn(next)
  }

  const onToggleListen = async () => {
    if (!tab) return
    if (speaking) {
      await window.api.tts.stop(tab.id)
      setSpeaking(false)
    } else {
      const ok = await window.api.tts.start(tab.id)
      setSpeaking(ok)
    }
  }

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
      {/* Group A: navigation */}
      <div className="flex items-center gap-0.5">
        <button type="button" aria-label="Back"    title="Back  ⌘["    disabled={!tab?.canGoBack}    onClick={onBack}    className={buttonCls(!tab?.canGoBack)}>{Icon.back}</button>
        <button type="button" aria-label="Forward" title="Forward  ⌘]" disabled={!tab?.canGoForward} onClick={onForward} className={buttonCls(!tab?.canGoForward)}>{Icon.forward}</button>
        <button type="button" aria-label="Reload"  title="Reload  ⌘R"  onClick={onReload}            className={buttonCls(false)}>{Icon.reload}</button>
      </div>

      {/* Group B: URL pill (primary surface). Wrapped in a relative
          container so the ask-mode AskPanel can absolute-position itself
          flush against the bottom edge of the pill at the same width. */}
      <div className="flex-1 mx-2 relative">
        <div
          className={[
            "h-8 flex items-center gap-2 px-4 rounded-full",
            "bg-chrome-surface border transition-colors duration-150",
            focused
              ? (askMode ? "border-signal" : "border-signal/50")
              : "border-chrome-border",
          ].join(" ")}
        >
          <span className={["shrink-0", askMode ? "text-signal" : "text-chrome-text-3"].join(" ")}>
            {askMode ? Icon.delta : (showLock ? Icon.lock : showSearch ? Icon.search : null)}
          </span>
          {showBadge && !askMode && <SafetyBadge safety={safety} />}
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
                if (askMode) {
                  e.preventDefault()
                  if (askActive && (e.metaKey || e.ctrlKey)) {
                    // ⌘↩ while a response is showing → continue in Assistant.
                    continueInAssistant()
                  } else {
                    void submitAsk()
                  }
                } else {
                  const url = normalizeUrl(value)
                  if (url) {
                    onNavigate(url)
                    inputRef.current?.blur()
                  }
                }
              } else if (e.key === "Escape") {
                if (askActive) {
                  closeAsk()
                } else {
                  setValue(tab?.url ?? "")
                  inputRef.current?.blur()
                }
              }
            }}
            placeholder={askMode ? "Ask Delta…  ⌘↩ continue in Assistant" : "Search or enter address"}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Address bar"
            className={[
              "flex-1 bg-transparent text-[13px] focus:outline-none",
              askMode ? "text-chrome-text placeholder:text-chrome-text-3" : "text-chrome-text placeholder:text-chrome-text-3",
            ].join(" ")}
          />
          {/* Tiny "Ask" label on the right when in ask mode — confirms the
              user is in the AI register without taking up much room. */}
          {askMode && (
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-signal shrink-0">Ask</span>
          )}
          {/* Privacy shield lives inside the URL pill — it's a status
              indicator (like the lock + safety badge), not an action toolbar
              item. Only renders when there's a count to show, so the pill
              stays clean on internal pages and fresh tabs. */}
          {!focused && !askMode && (tab?.trackersBlocked ?? 0) > 0 && (
            <button
              type="button"
              onClick={onOpenPrivacy}
              title={`${tab!.trackersBlocked} ${tab!.trackersBlocked === 1 ? "tracker" : "trackers"} blocked on this page`}
              aria-label="Open privacy report"
              className="shrink-0 flex items-center gap-1 h-6 px-2 rounded-full text-signal hover:bg-signal/10 transition-colors duration-150"
            >
              {Icon.shield}
              <span className="font-mono text-[10px] tabular-nums">{tab!.trackersBlocked}</span>
            </button>
          )}
        </div>

        {/* AskPanel — streaming response from the ?-mode ask. Absolute so
            it floats over the WebContentsView area. Same width as the
            URL pill (the relative parent), shifted just below the pill
            with a small gap. */}
        {askActive && (
          <div
            ref={askPanelRef}
            className="absolute left-0 right-0 top-full mt-2 z-30 rounded-xl border border-chrome-border bg-chrome-bg shadow-[0_18px_48px_-12px_rgba(0,0,0,0.45)] overflow-hidden"
          >
            <div className="px-4 pt-3 pb-1.5 flex items-center justify-between border-b border-chrome-border">
              <div className="flex items-center gap-2">
                <span className="text-signal"><span style={{ display: "inline-block", transform: "translateY(1px)" }}>{Icon.delta}</span></span>
                <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">
                  Ask · {askStreaming ? "thinking…" : (askError ? "error" : "answered")}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.12em] uppercase">
                {!askStreaming && !askError && (
                  <button
                    type="button"
                    onClick={continueInAssistant}
                    className="text-chrome-text-2 hover:text-signal transition-colors"
                    title="Continue this conversation in the Assistant sidebar"
                  >
                    Continue in Assistant <span className="text-chrome-text-3 normal-case ml-1">⌘↩</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeAsk}
                  className="text-chrome-text-3 hover:text-chrome-text transition-colors"
                  title="Close"
                >
                  Close <span className="normal-case ml-1">esc</span>
                </button>
              </div>
            </div>
            <div className="px-4 py-3 max-h-[320px] overflow-y-auto">
              {askError ? (
                <p className="text-[13px] leading-relaxed text-chrome-text-2">
                  <span className="text-signal font-mono text-[11px] tracking-[0.06em] uppercase mr-2">error</span>
                  {askError}
                </p>
              ) : (
                <p className="text-[13.5px] leading-[1.6] text-chrome-text whitespace-pre-wrap">
                  {askText || (askStreaming ? <span className="text-chrome-text-3">…reading the page</span> : "")}
                  {askStreaming && askText && (
                    <span className="inline-block ml-1 w-[6px] h-[12px] align-middle bg-signal animate-pulse" aria-hidden />
                  )}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Group B: page-tools cluster — bookmark, copy link, reader, listen.
          Between URL pill and the trailing divider. Hidden on internal
          pages (delta://newtab) where they make no sense. */}
      {tab && !tab.url.startsWith("delta:") && (
        <div className="flex items-center gap-0.5 mr-1">
          <button
            type="button"
            aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
            aria-pressed={bookmarked}
            title={bookmarked ? "Bookmarked" : "Bookmark this page"}
            disabled={!isBookmarkable}
            onClick={onToggleBookmark}
            className={[
              "h-7 w-7 grid place-items-center rounded-md transition-colors duration-150",
              bookmarked
                ? "text-signal hover:bg-signal/10"
                : "text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface",
              !isBookmarkable && "opacity-40 cursor-not-allowed",
            ].filter(Boolean).join(" ")}
          >
            {Icon.star(bookmarked)}
          </button>

          <button
            type="button"
            aria-label="Copy link"
            title={copied ? "Copied" : "Copy link"}
            onClick={onCopyLink}
            className={[
              "h-7 w-7 grid place-items-center rounded-md transition-colors duration-150",
              copied
                ? "text-signal"
                : "text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface",
            ].join(" ")}
          >
            {copied ? Icon.check : Icon.link}
          </button>

          <button
            type="button"
            aria-label={readerOn ? "Exit reader mode" : "Enter reader mode"}
            aria-pressed={readerOn}
            title={readerOn ? "Exit reader" : "Reader mode"}
            onClick={onToggleReader}
            className={[
              "h-7 w-7 grid place-items-center rounded-md transition-colors duration-150",
              readerOn
                ? "text-signal bg-signal/10"
                : "text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface",
            ].join(" ")}
          >
            {Icon.reader}
          </button>

          <button
            type="button"
            aria-label={speaking ? "Stop listening" : "Listen to page"}
            aria-pressed={speaking}
            title={speaking ? "Stop reading" : "Listen to page"}
            onClick={onToggleListen}
            className={[
              "h-7 w-7 grid place-items-center rounded-md transition-colors duration-150",
              speaking
                ? "text-signal bg-signal/10"
                : "text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface",
            ].join(" ")}
          >
            {speaking ? Icon.stop : Icon.listen}
          </button>
        </div>
      )}

      {/* Hairline divider — visually separates the URL pill (primary
          surface) from the trailing tools cluster (secondary actions). */}
      <span aria-hidden className="w-px h-5 bg-chrome-border mx-1 shrink-0" />

      {/* Group C: tools cluster (menu + settings + Assistant). Tight gap so
          they read as one unit, not three unrelated buttons. */}
      <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-pressed={menuOpen}
        title="Menu"
        onClick={onToggleMenu}
        className={[
          "h-7 w-7 grid place-items-center rounded-md transition-colors duration-150",
          menuOpen
            ? "text-signal bg-signal/10"
            : "text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface",
        ].join(" ")}
      >
        {Icon.menu}
      </button>
      <button
        type="button"
        aria-label={settingsOpen ? "Close settings" : "Open settings"}
        title="Settings  ⌘,"
        aria-pressed={settingsOpen}
        onClick={onOpenSettings}
        className={[
          "h-7 w-7 grid place-items-center rounded-md transition-colors duration-150",
          settingsOpen
            ? "text-signal bg-signal/10"
            : "text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface",
        ].join(" ")}
      >
        {Icon.settings}
      </button>

      <button
        type="button"
        aria-label="Toggle Assistant"
        title="Assistant  ⌘J"
        aria-pressed={sidebarOpen}
        onClick={onToggleSidebar}
        className={[
          "h-8 px-3 rounded-full flex items-center gap-1.5",
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
      </div>{/* /Group C */}

      {/* Loading progress bar — anchored at the bottom of the chrome */}
      {tab?.loading && (
        <div className="loading-bar absolute left-0 right-0 bottom-0 h-[2px] overflow-hidden" />
      )}
    </div>
  )
})
