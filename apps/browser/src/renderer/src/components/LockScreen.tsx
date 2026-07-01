import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { UnhostedMark } from "./UnhostedMark"

type Props = {
  /** "pin" or "password" — drives the input mode and the on-screen label. */
  kind: "pin" | "password"
  /** Called once the local PBKDF2 verify in main returns true. */
  onUnlocked: () => void
}

/**
 * Topmost app overlay shown when a local account lock is configured AND
 * the current process has not yet been verified. The secret never leaves
 * the renderer/main IPC boundary: plaintext goes into window.api.accountLock.verify,
 * the comparison happens in main against PBKDF2 hash + salt persisted in
 * settings.json, and the renderer only gets a boolean back. After three
 * failed attempts we add a 4-second lockout to slow brute force.
 *
 * There is no "forgot PIN" recovery flow on purpose — the secret only
 * ever existed on this device, and recovery would mean either an
 * accountless escape hatch (defeats the purpose) or a server-side reset
 * (Unhosted Browser has no server). If you lose the secret, deleting the app's
 * settings.json wipes the lock; everything else is intact.
 */
export function LockScreen({ kind, onUnlocked }: Props) {
  const [secret, setSecret] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const cooldownMs = Math.max(0, cooldownUntil - Date.now())

  // Tick the cooldown display once a second so the user sees it count down.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (cooldownMs <= 0) return
    const id = setInterval(() => setTick((t) => t + 1), 250)
    return () => clearInterval(id)
  }, [cooldownMs])

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (busy || cooldownMs > 0) return
    if (!secret) return
    setBusy(true)
    setError(null)
    try {
      const ok = await window.api.accountLock.verify(secret)
      if (ok) {
        onUnlocked()
        return
      }
      const next = attempts + 1
      setAttempts(next)
      setSecret("")
      setError(kind === "pin" ? "Wrong PIN." : "Wrong password.")
      if (next >= 3) {
        // 4-second lockout after every 3rd failure — slows brute force
        // without locking out a genuine fat-finger.
        setCooldownUntil(Date.now() + 4000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const label = kind === "pin" ? "Enter your PIN" : "Enter your password"

  return (
    <motion.div
      // No backdrop blur trick — this is a hard gate, the chrome behind
      // shouldn't be inferable from the lock screen.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[100] no-drag flex items-center justify-center bg-[hsl(240_8%_6%)]"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] rounded-3xl border border-chrome-border bg-chrome-bg px-7 py-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-signal" style={{ transform: "translateY(2px)" }}>
            <UnhostedMark size={18} />
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">
            locked
          </span>
        </div>
        <h1 className="font-serif italic text-[26px] leading-[1.1] text-chrome-text mb-2">
          Unhosted Browser is locked.
        </h1>
        <p className="text-[13px] leading-[1.55] text-chrome-text-2 mb-5">
          {label}. Nothing leaves your machine; this check runs against a
          hash stored in your local <code className="font-mono">settings.json</code>.
        </p>

        <form onSubmit={submit} className="space-y-2">
          <input
            ref={inputRef}
            type={kind === "pin" ? "tel" : "password"}
            inputMode={kind === "pin" ? "numeric" : "text"}
            pattern={kind === "pin" ? "[0-9]*" : undefined}
            autoComplete="off"
            spellCheck={false}
            value={secret}
            onChange={(e) => { setSecret(e.target.value); setError(null) }}
            disabled={busy || cooldownMs > 0}
            placeholder={kind === "pin" ? "••••" : "your password"}
            className="w-full h-11 px-3.5 rounded-full bg-chrome-surface-2 border border-chrome-border text-[14px] text-chrome-text placeholder:text-chrome-text-3 font-mono tracking-[0.1em] text-center focus:outline-none focus:border-signal/60 transition-colors disabled:opacity-50"
          />
          {error && (
            <p role="alert" className="font-mono text-[11px] text-[hsl(0_70%_72%)] px-1">
              {error}{attempts >= 3 && cooldownMs > 0 ? ` Try again in ${Math.ceil(cooldownMs / 1000)}s.` : ""}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || cooldownMs > 0 || !secret}
            className="w-full h-10 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>

        <p className="mt-5 pt-4 border-t border-chrome-border font-mono text-[10px] tracking-[0.08em] text-chrome-text-3 leading-[1.6]">
          No recovery, no remote reset — Unhosted Browser has no server.
          If you've lost the {kind === "pin" ? "PIN" : "password"}, delete
          <code className="text-chrome-text-2 px-1">settings.json</code>
          in Unhosted Browser's data folder to remove the lock. Everything else stays.
        </p>
      </motion.div>
    </motion.div>
  )
}
