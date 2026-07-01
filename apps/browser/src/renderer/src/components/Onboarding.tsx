import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import type { Identity, IdentityProvider, ProviderInfo } from "@shared/types"
import { UnhostedMark } from "./UnhostedMark"

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

type View = "choose" | "signin"

export function Onboarding({ onClose, onOpenSettings, onToggleAssistant }: Props) {
  const [view, setView] = useState<View>("choose")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (view === "signin") setView("choose")
      else onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, view])

  const continueAsDefault = () => {
    // Default profile = the existing no-account experience. Just dismiss
    // the welcome and drop the user into the Assistant so they can wire
    // up a model when ready.
    onToggleAssistant()
    onClose()
  }
  const onSignedIn = (_id: Identity) => {
    // Identity is now stored locally; LeftNavSidebar picks it up. Close
    // the welcome — connecting a model can happen later from Settings.
    onClose()
  }

  return (
    <motion.div
      // Backdrop fades in / out as a whole. The card inside has its own
      // scale-and-lift so the entry feels like a single coordinated move
      // rather than two layers ghosting in independently.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-[60] no-drag flex items-center justify-center px-6 py-6"
      onClick={onClose}
    >
      {/* Backdrop — softer blur so the page underneath fades in cleanly */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      <motion.div
        // Animate the card itself, not just the wrapper. The previous
        // version only opacity-faded the wrapper, which made the card
        // pop in abruptly. Scale + lift gives it a proper entry.
        // NOTE: no `key={view}` here — the inner AnimatePresence handles
        // the lateral slide between choose/signin. Keying the outer card
        // by view would re-mount it on every toggle and double up the
        // entry animation.
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.98, y: 6 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] rounded-3xl border border-chrome-border bg-chrome-bg shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-signal/0 via-signal/70 to-signal/0" />

        <AnimatePresence mode="wait" initial={false}>
          {view === "choose" ? (
            <ChooseView
              key="choose"
              onContinueDefault={continueAsDefault}
              onPickProvider={() => setView("signin")}
              onOpenSettings={() => { onOpenSettings(); onClose() }}
            />
          ) : (
            <SignInView
              key="signin"
              onBack={() => setView("choose")}
              onSignedIn={onSignedIn}
            />
          )}
        </AnimatePresence>

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
      </motion.div>
    </motion.div>
  )
}

// ── Step 1 — pick a mode ─────────────────────────────────────
function ChooseView({
  onContinueDefault, onPickProvider, onOpenSettings,
}: {
  onContinueDefault: () => void
  onPickProvider: () => void
  onOpenSettings: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{    opacity: 0, x: -12 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="px-7 pt-7 pb-5">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-signal" style={{ transform: "translateY(2px)" }}>
            <UnhostedMark size={18} />
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">
            welcome
          </span>
        </div>
        <h1 className="font-serif italic text-[34px] leading-[1.05] text-chrome-text mb-3">
          Unhosted Browser is a privacy-first<br /> AI browser.
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-chrome-text-2 max-w-[44ch]">
          The Assistant runs against a model on your machine. Nothing leaves
          your laptop unless you turn on a cloud provider yourself. Pick how
          you want to start — both options are equally private.
        </p>
      </div>

      <div className="px-5 pb-2 space-y-1.5">
        <ModeCard
          primary
          eyebrow="Default · no login"
          title="Continue without an account"
          sub="Recommended. Stays anonymous on this device."
          onClick={onContinueDefault}
        />
        <ModeCard
          eyebrow="Personalise · local-only"
          title="Sign in with GitHub or Gmail"
          sub="One public lookup. Name + avatar saved to this device. No token, no sync."
          onClick={onPickProvider}
        />
      </div>

      <LocalModelStatus onOpenSettings={onOpenSettings} />

      <ShortcutFootnote />
    </motion.div>
  )
}

// ── Step 2 — sign in (GitHub or Google) ──────────────────────
function SignInView({
  onBack, onSignedIn,
}: {
  onBack: () => void
  onSignedIn: (identity: Identity) => void
}) {
  const [provider, setProvider] = useState<IdentityProvider>("github")
  const [handle, setHandle] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const placeholder = provider === "github" ? "your-github-username" : "you@gmail.com"
  const helpText =
    provider === "github"
      ? "We fetch your public GitHub profile once for the name + avatar. No OAuth, no token stored."
      : "Used only as a local label. We compute a Gravatar URL locally — your email is never sent to Google."

  const submit = async () => {
    if (!handle.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const id = await window.api.identity.signIn({ provider, handle })
      onSignedIn(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{    opacity: 0, x: 12 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="px-7 pt-7 pb-3">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-signal" style={{ transform: "translateY(2px)" }}>
            <UnhostedMark size={18} />
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">
            personalise · local
          </span>
        </div>
        <h2 className="font-serif italic text-[26px] leading-[1.1] text-chrome-text mb-3">
          Tag this profile.
        </h2>
        <p className="text-[13px] leading-[1.55] text-chrome-text-2 max-w-[46ch]">
          {helpText}
        </p>
      </div>

      <div className="px-7 pb-2">
        <div className="grid grid-cols-2 gap-1.5 rounded-full border border-chrome-border bg-chrome-surface p-1 mb-3">
          <ProviderTab
            active={provider === "github"}
            label="GitHub"
            icon={<GithubMark />}
            onClick={() => { setProvider("github"); setError(null) }}
          />
          <ProviderTab
            active={provider === "google"}
            label="Gmail"
            icon={<GoogleMark />}
            onClick={() => { setProvider("google"); setError(null) }}
          />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void submit() }}
          className="space-y-2"
        >
          <input
            type="text"
            value={handle}
            onChange={(e) => { setHandle(e.target.value); setError(null) }}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoFocus
            disabled={busy}
            className="w-full h-10 px-3.5 rounded-full bg-chrome-surface-2 border border-chrome-border text-[13px] text-chrome-text placeholder:text-chrome-text-3 font-mono focus:outline-none focus:border-signal/60 transition-colors disabled:opacity-50"
          />
          {error && (
            <p className="font-mono text-[11px] text-[hsl(0_70%_72%)] px-1">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text px-2 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={busy || !handle.trim()}
              className="h-9 px-5 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[12.5px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {busy ? "Looking up…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>

      <div className="px-7 pt-2 pb-5 mt-2 border-t border-chrome-border">
        <p className="font-mono text-[10px] tracking-[0.08em] text-chrome-text-3 leading-[1.6]">
          What's stored: <span className="text-chrome-text-2">name · avatar URL · provider</span>.<br />
          What isn't: <span className="text-chrome-text-2">passwords, tokens, contacts, anything else</span>.
          You can sign out from the profile chip at any time — it wipes the
          file from your disk.
        </p>
      </div>
    </motion.div>
  )
}

// ── Bits ─────────────────────────────────────────────────────
function ModeCard({
  primary, eyebrow, title, sub, onClick,
}: {
  primary?: boolean
  eyebrow: string
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
        <span className={[
          "font-mono text-[9.5px] tracking-[0.14em] uppercase",
          primary ? "text-signal/80" : "text-chrome-text-3",
        ].join(" ")}>
          {eyebrow}
        </span>
        <span className={["text-[14px]", primary ? "text-signal" : "text-chrome-text-3"].join(" ")}>→</span>
      </div>
      <p className={[
        "text-[13.5px] font-medium mt-1",
        primary ? "text-signal" : "text-chrome-text",
      ].join(" ")}>
        {title}
      </p>
      <p className="text-[11.5px] text-chrome-text-3 mt-0.5">{sub}</p>
    </button>
  )
}

function ProviderTab({
  active, label, icon, onClick,
}: {
  active: boolean
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-8 rounded-full flex items-center justify-center gap-2 text-[12px] transition-colors",
        active
          ? "bg-chrome-bg text-chrome-text border border-chrome-border"
          : "text-chrome-text-3 hover:text-chrome-text-2",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  )
}

function GithubMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.5-1.08-1.77-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.55.74.55 1.5v2.22c0 .21.15.46.55.38A8 8 0 0 0 8 0z" />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 18 18" aria-hidden>
      <path fill="#EA4335" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" />
      <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#FBBC05" d="M3.88 10.78a5.4 5.4 0 0 1-.28-1.78c0-.62.1-1.22.27-1.78L.96 4.96A8.98 8.98 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.13-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z" />
    </svg>
  )
}

function ShortcutFootnote() {
  return (
    <div className="px-7 py-4 border-t border-chrome-border flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10px] tracking-[0.08em] text-chrome-text-3">
      <ShortcutHint k="⌘J" what="Assistant" />
      <ShortcutHint k="⌘," what="Settings" />
      <ShortcutHint k="⌘T" what="New tab" />
      <ShortcutHint k="⌘L" what="URL bar" />
      <ShortcutHint k="⌘K" what="Search bar" />
      <ShortcutHint k="⌘F" what="Find on page" />
    </div>
  )
}

// Probes the main process for a live local provider so the user knows,
// at the moment they pick a mode, whether the Assistant will actually
// answer. If nothing is online we surface the one-line Ollama recipe
// — same content as README quickstart, just rendered where the user
// will read it.
function LocalModelStatus({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [state, setState] = useState<"probing" | "online" | "offline">("probing")
  const [modelName, setModelName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const probe = async () => {
      try {
        const list: ProviderInfo[] = await window.api.providers.refresh()
        if (cancelled) return
        const live = list.find(
          (p) => p.status === "online" && !p.authed && p.endpoint.includes("127.0.0.1"),
        )
        if (live) {
          setState("online")
          setModelName(live.models[0] ?? live.label)
        } else {
          setState("offline")
        }
      } catch {
        if (!cancelled) setState("offline")
      }
    }
    void probe()
    return () => { cancelled = true }
  }, [])

  if (state === "probing") {
    return (
      <div className="px-7 pt-3 pb-4">
        <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-chrome-text-3">
          Checking for a local model…
        </p>
      </div>
    )
  }

  if (state === "online") {
    return (
      <div className="px-7 pt-3 pb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
        <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-chrome-text-2">
          Local model online{modelName ? ` · ${modelName}` : ""}
        </p>
      </div>
    )
  }

  // Offline — give the one-liner that gets to "online" fastest. Same
  // recipe as README quickstart so the surfaces don't drift.
  return (
    <div className="px-7 pt-3 pb-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-chrome-text-3" aria-hidden />
        <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-chrome-text-3">
          No local model yet · the Assistant needs one
        </p>
      </div>
      <pre className="font-mono text-[10.5px] leading-[1.55] text-chrome-text-2 bg-chrome-surface border border-chrome-border rounded-md px-3 py-2 overflow-x-auto">
{`brew install ollama
ollama serve &
ollama pull llama3.2`}
      </pre>
      <div className="flex items-center justify-between pt-0.5">
        <button
          type="button"
          onClick={onOpenSettings}
          className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
        >
          Connect a local model →
        </button>
        <span className="font-mono text-[9.5px] tracking-[0.1em] text-chrome-text-3">
          Or use cloud later in Settings
        </span>
      </div>
    </div>
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
