import { useEffect, useState } from "react"
import type { ProviderInfo, UserSettings } from "@shared/types"
import { useTheme } from "../hooks/useTheme"

type Props = {
  open: boolean
  onClose: () => void
  providers: ProviderInfo[]
  onRefreshProviders: () => void
}

export function SettingsPanel({ open, onClose, providers, onRefreshProviders }: Props) {
  const [settings, setSettings] = useState<UserSettings | null>(null)

  useEffect(() => {
    if (!open) return
    void window.api.settings.get().then(setSettings)
    return window.api.settings.onChange(setSettings)
  }, [open])

  // Esc closes — only when panel is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40 no-drag"
      />
      {/* Panel — slides in from the right; same width as the AI sidebar but
          doesn't share its IPC. Lives over the WebContentsView. */}
      <aside
        className="absolute right-0 top-0 bottom-0 w-[420px] bg-chrome-bg border-l border-chrome-border z-50 no-drag overflow-y-auto"
      >
        {settings
          ? <SettingsBody
              settings={settings}
              onClose={onClose}
              providers={providers}
              onRefreshProviders={onRefreshProviders}
            />
          : <Loading />}
      </aside>
    </>
  )
}

function Loading() {
  return (
    <div className="h-full grid place-items-center text-chrome-text-3 font-mono text-[11px] tracking-[0.12em] uppercase">
      loading…
    </div>
  )
}

function SettingsBody({
  settings, onClose, providers, onRefreshProviders,
}: {
  settings: UserSettings
  onClose: () => void
  providers: ProviderInfo[]
  onRefreshProviders: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 px-4 flex items-baseline justify-between border-b border-chrome-border">
        <div className="flex items-baseline gap-2">
          <span className="font-serif italic text-[18px] leading-none text-chrome-text">Settings</span>
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">delta</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors duration-150"
        >
          Close · esc
        </button>
      </div>

      {/* Sections — Connection comes first; it owns setup. The Assistant
          sidebar no longer carries setup instructions. */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <ConnectionSection providers={providers} onRefresh={onRefreshProviders} />
        <AppearanceSection />
        <CloudKeySection
          label="OpenAI cloud"
          hint="Used only when explicitly enabled. Off by default."
          placeholder="sk-…"
          enabled={settings.openaiEnabled}
          hasKey={settings.openaiHasKey}
          onSaveKey={(v) => window.api.settings.update({ kind: "openaiKey", value: v })}
          onClearKey={() => window.api.settings.update({ kind: "openaiKey", value: null })}
          onSetEnabled={(v) => window.api.settings.update({ kind: "openaiEnabled", value: v })}
        />
        <CloudKeySection
          label="Anthropic cloud"
          hint="Claude (Opus / Sonnet / Haiku). Used only when explicitly enabled."
          placeholder="sk-ant-…"
          enabled={settings.anthropicEnabled}
          hasKey={settings.anthropicHasKey}
          onSaveKey={(v) => window.api.settings.update({ kind: "anthropicKey", value: v })}
          onClearKey={() => window.api.settings.update({ kind: "anthropicKey", value: null })}
          onSetEnabled={(v) => window.api.settings.update({ kind: "anthropicEnabled", value: v })}
        />
        <CustomEndpointsSection settings={settings} />
        <DefaultProviderSection settings={settings} />
        <PrivacyNote />
      </div>
    </div>
  )
}

// ── Connection (was previously split between Sidebar + Settings) ────
// One home for "where is the model coming from": current status,
// install instructions when nothing's online, and a Refresh affordance.
function ConnectionSection({
  providers, onRefresh,
}: {
  providers: ProviderInfo[]
  onRefresh: () => void
}) {
  const usable = providers.find((p) => p.status === "online" && p.models.length > 0)
  return (
    <section>
      <SectionHeader label="Connection" hint="Where the Assistant gets its answers." />

      {usable ? (
        <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="h-1.5 w-1.5 rounded-full bg-signal shrink-0" />
            <span className="text-chrome-text">{usable.label}</span>
            <span className="text-chrome-text-3">·</span>
            <span className="font-mono text-[11px] text-chrome-text-2 truncate">{usable.models[0]}</span>
            <button
              type="button"
              onClick={onRefresh}
              className="ml-auto font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
            >
              Refresh
            </button>
          </div>
          <p className="mt-2 text-[11px] text-chrome-text-3 leading-relaxed">
            Pin a different provider in <span className="text-chrome-text-2">Default provider</span> below.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="h-1.5 w-1.5 rounded-full bg-chrome-text-3 animate-pulse shrink-0" />
              <span className="text-chrome-text">No model online</span>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
            >
              Refresh
            </button>
          </div>
          <p className="text-[12px] text-chrome-text-2 leading-relaxed mb-3">
            Fastest path — Ollama:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-[12px] text-chrome-text-2 mb-3">
            <li>
              Install from <code className="font-mono text-chrome-text">ollama.com</code>
            </li>
            <li>
              Run <code className="font-mono text-chrome-text">ollama serve</code> in a terminal
            </li>
            <li>
              Pull a model:{" "}
              <code className="font-mono text-chrome-text">ollama pull llama3.2</code>
            </li>
          </ol>
          <p className="text-[11px] text-chrome-text-3 leading-relaxed">
            Already running LM Studio / llama.cpp / MLX? Make sure their local
            server is started — Delta auto-detects within a few seconds.
            Or add a Custom endpoint below.
          </p>
        </div>
      )}
    </section>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  return (
    <section>
      <SectionHeader label="Appearance" hint="Light or dark — also togglable from the address bar." />
      <div className="flex gap-2">
        {(["dark", "light"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={[
              "h-9 px-4 rounded-full border text-[12px] tracking-[0.02em] capitalize transition-colors duration-150",
              theme === t
                ? "bg-signal/15 border-signal/60 text-signal"
                : "border-chrome-border text-chrome-text-2 hover:text-chrome-text hover:border-chrome-text-3",
            ].join(" ")}
          >
            {t} mode
          </button>
        ))}
      </div>
    </section>
  )
}

// ── Generic cloud key section (OpenAI / Anthropic / future) ─────────
function CloudKeySection({
  label, hint, placeholder, enabled, hasKey,
  onSaveKey, onClearKey, onSetEnabled,
}: {
  label: string
  hint: string
  placeholder: string
  enabled: boolean
  hasKey: boolean
  onSaveKey: (v: string) => Promise<unknown>
  onClearKey: () => Promise<unknown>
  onSetEnabled: (v: boolean) => Promise<unknown>
}) {
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!draft.trim()) return
    setBusy(true)
    try {
      await onSaveKey(draft.trim())
      await onSetEnabled(true)
      setDraft("")
    } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true)
    try { await onClearKey() } finally { setBusy(false) }
  }
  const keyHint = placeholder.replace(/…+$/, "•••••••")

  return (
    <section>
      <SectionHeader label={label} hint={hint} />
      {hasKey ? (
        <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12px]">
              <span className={[
                "h-1.5 w-1.5 rounded-full shrink-0",
                enabled ? "bg-signal" : "bg-chrome-text-3",
              ].join(" ")} />
              <span className="text-chrome-text">Key configured</span>
              <span className="font-mono text-[10px] text-chrome-text-3">{keyHint}</span>
            </div>
            <Toggle checked={enabled} onChange={(v) => void onSetEnabled(v)} ariaLabel={`Enable ${label}`} />
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="mt-3 font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-[hsl(0_70%_60%)] transition-colors disabled:opacity-50"
          >
            Remove key
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="h-10 px-4 rounded-full bg-chrome-surface border border-chrome-border text-[13px] font-mono text-chrome-text placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/50"
          />
          <button
            type="button"
            onClick={save}
            disabled={busy || !draft.trim()}
            className="self-start h-9 px-4 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[12px] font-medium tracking-[0.02em] hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Save key (encrypted)
          </button>
        </div>
      )}
    </section>
  )
}

// ── Custom endpoints ────────────────────────────────────────────────
function CustomEndpointsSection({ settings }: { settings: UserSettings }) {
  const [showAdder, setShowAdder] = useState(false)
  const [label, setLabel] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const add = async () => {
    setErr(null)
    let url: URL
    try { url = new URL(endpoint) } catch {
      setErr("Endpoint must be a valid URL (e.g. https://api.together.xyz).")
      return
    }
    if (!/^https?:$/.test(url.protocol)) {
      setErr("Endpoint must use http or https.")
      return
    }
    setBusy(true)
    try {
      await window.api.settings.update({
        kind: "addCustomEndpoint",
        label: label.trim() || url.host,
        endpoint: endpoint.trim(),
        apiKey: apiKey.trim() || undefined,
      })
      setLabel(""); setEndpoint(""); setApiKey("")
      setShowAdder(false)
    } finally { setBusy(false) }
  }

  const remove = async (id: string) => {
    await window.api.settings.update({ kind: "removeCustomEndpoint", id })
  }

  return (
    <section>
      <SectionHeader
        label="Custom endpoints"
        hint="Any OpenAI-compatible URL — local homelab Ollama, Together, Groq, vLLM, etc."
      />

      {settings.customEndpoints.length > 0 && (
        <ul className="space-y-2 mb-2">
          {settings.customEndpoints.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-chrome-text truncate">{e.label}</p>
                <p className="font-mono text-[11px] text-chrome-text-3 truncate">{e.endpoint}</p>
              </div>
              {e.hasApiKey && (
                <span
                  title="API key configured"
                  className="font-mono text-[9px] tracking-[0.12em] uppercase text-signal/80"
                >authed</span>
              )}
              <button
                type="button"
                onClick={() => remove(e.id)}
                aria-label="Remove endpoint"
                className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-[hsl(0_70%_60%)] transition-colors"
              >Remove</button>
            </li>
          ))}
        </ul>
      )}

      {showAdder ? (
        <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 space-y-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Together, Homelab Ollama)"
            className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12px] text-chrome-text placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/50"
          />
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://api.example.com"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12px] font-mono text-chrome-text placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/50"
          />
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API key (optional, encrypted)"
            spellCheck={false}
            className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12px] font-mono text-chrome-text placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/50"
          />
          {err && <p className="text-[11px] text-[hsl(0_70%_70%)]">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={add}
              disabled={busy || !endpoint.trim()}
              className="h-8 px-4 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >Add</button>
            <button
              type="button"
              onClick={() => { setShowAdder(false); setErr(null) }}
              className="h-8 px-4 rounded-full border border-chrome-border text-[12px] text-chrome-text-2 hover:text-chrome-text transition-colors"
            >Cancel</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdder(true)}
          className="h-9 px-4 rounded-full border border-chrome-border text-[12px] text-chrome-text-2 hover:text-chrome-text hover:border-chrome-text-3 transition-colors"
        >
          + Add endpoint
        </button>
      )}
    </section>
  )
}

// ── Default-provider picker ─────────────────────────────────────────
function DefaultProviderSection({ settings }: { settings: UserSettings }) {
  const set = (id: "auto" | string) =>
    window.api.settings.update({ kind: "defaultProvider", id, model: undefined })

  const opts: Array<{ id: "auto" | string; label: string }> = [
    { id: "auto",     label: "Auto — local first, cloud if enabled" },
    { id: "ollama",   label: "Ollama (local)" },
    { id: "lmstudio", label: "LM Studio (local)" },
    { id: "llamacpp", label: "llama.cpp (local)" },
    { id: "mlx",      label: "MLX (local)" },
  ]
  if (settings.openaiHasKey)    opts.push({ id: "openai",    label: "OpenAI (cloud)" })
  if (settings.anthropicHasKey) opts.push({ id: "anthropic", label: "Anthropic (cloud)" })
  for (const e of settings.customEndpoints) {
    opts.push({ id: e.id, label: `${e.label} (custom)` })
  }

  return (
    <section>
      <SectionHeader label="Default provider" hint="Which provider the agent uses for new messages." />
      <ul className="space-y-1">
        {opts.map((o) => (
          <li key={o.id}>
            <label className="flex items-center gap-2.5 text-[12px] text-chrome-text-2 cursor-pointer hover:text-chrome-text transition-colors">
              <input
                type="radio"
                name="defaultProvider"
                checked={settings.defaultProvider.id === o.id}
                onChange={() => void set(o.id)}
                className="accent-signal"
              />
              <span>{o.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────
function SectionHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-2">
      <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">{label}</p>
      {hint && <p className="text-[11px] text-chrome-text-3 leading-relaxed">{hint}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={[
        "relative h-5 w-9 rounded-full transition-colors duration-150",
        checked ? "bg-signal" : "bg-chrome-border",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-4 w-4 rounded-full bg-chrome-bg transition-transform duration-150",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  )
}

function PrivacyNote() {
  return (
    <section className="pt-4 border-t border-chrome-border">
      <p className="text-[11px] text-chrome-text-3 leading-relaxed">
        Delta has no account. Keys you add live in your OS keychain via
        Electron <code className="font-mono">safeStorage</code> and only
        the main process ever decrypts them. Removing a key here removes
        it from disk.
      </p>
    </section>
  )
}
