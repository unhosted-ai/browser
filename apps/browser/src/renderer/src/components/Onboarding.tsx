import { useEffect } from "react"
import { DeltaLogo } from "./DeltaLogo"

const STORAGE_KEY = "delta:onboarded"

/** True on the very first launch, until the user dismisses the welcome card. */
export function useOnboardingState(): { open: boolean; dismiss: () => void } {
  const dismissed = (() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1" } catch { return true }
  })()
  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1") } catch {}
  }
  return { open: !dismissed, dismiss }
}

type Props = {
  onClose: () => void
  onOpenSettings: () => void
  onToggleAssistant: () => void
}

export function Onboarding({ onClose, onOpenSettings, onToggleAssistant }: Props) {
  // ESC dismisses — same gesture as everywhere else in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const goConnect = () => { onOpenSettings(); onClose() }
  const exploreAssistant = () => { onToggleAssistant(); onClose() }

  return (
    <div
      // fixed (not absolute) so the overlay covers the entire window —
      // chrome, left nav, content. Otherwise the address-bar cog and
      // LeftNav rows stay clickable underneath, which lands users in a
      // two-panels-overlapping state.
      className="fixed inset-0 z-[60] no-drag flex items-center justify-center px-6 py-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] rounded-3xl border border-chrome-border bg-chrome-bg shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Decorative top strip — mint sky echo of the new-tab hero */}
        <div className="h-1 w-full bg-gradient-to-r from-signal/0 via-signal/70 to-signal/0" />

        <div className="px-7 pt-7 pb-5">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-signal" style={{ transform: "translateY(2px)" }}>
              <DeltaLogo size={18} />
            </span>
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">
              welcome
            </span>
          </div>
          <h1 className="font-serif italic text-[36px] leading-[1.05] text-chrome-text mb-3">
            Delta is a privacy-first<br /> AI browser.
          </h1>
          <p className="text-[14px] leading-[1.55] text-chrome-text-2 max-w-[44ch]">
            The Assistant runs against a model on your machine — Ollama,
            LM Studio, llama.cpp, MLX. Nothing leaves your laptop unless
            you explicitly enable a cloud provider. There's no account.
          </p>
        </div>

        {/* Path cards */}
        <div className="px-5 pb-2 space-y-1.5">
          <PathRow
            primary
            title="Connect a local model"
            sub="Recommended. Open Settings → Connection."
            onClick={goConnect}
          />
          <PathRow
            title="I have a cloud key"
            sub="OpenAI or Anthropic. Encrypted in your OS keychain."
            onClick={goConnect}
          />
          <PathRow
            title="I'll explore first"
            sub="Skip for now. The Assistant will be empty until a model is connected."
            onClick={exploreAssistant}
          />
        </div>

        {/* Shortcut footnote */}
        <div className="px-7 py-4 border-t border-chrome-border flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10px] tracking-[0.08em] text-chrome-text-3">
          <ShortcutHint k="⌘J" what="Assistant" />
          <ShortcutHint k="⌘," what="Settings" />
          <ShortcutHint k="⌘T" what="New tab" />
          <ShortcutHint k="⌘L" what="URL bar" />
          <ShortcutHint k="⌘F" what="Find on page" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 h-7 w-7 grid place-items-center rounded-full text-chrome-text-3 hover:text-chrome-text hover:bg-chrome-surface transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2 2L9 9M9 2L2 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function PathRow({
  primary, title, sub, onClick,
}: {
  primary?: boolean
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl border px-4 py-3 transition-colors duration-150",
        primary
          ? "bg-signal/10 border-signal/40 hover:bg-signal/15 hover:border-signal/60"
          : "bg-chrome-surface border-chrome-border hover:bg-chrome-surface-2 hover:border-chrome-text-3",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={["text-[13px] font-medium", primary ? "text-signal" : "text-chrome-text"].join(" ")}>
          {title}
        </span>
        <span className={["text-[14px]", primary ? "text-signal" : "text-chrome-text-3"].join(" ")}>→</span>
      </div>
      <p className="text-[11.5px] text-chrome-text-3 mt-0.5">{sub}</p>
    </button>
  )
}

function ShortcutHint({ k, what }: { k: string; what: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="px-1.5 h-4 inline-flex items-center rounded bg-chrome-surface text-chrome-text-2 normal-case">
        {k}
      </span>
      <span>{what}</span>
    </span>
  )
}
