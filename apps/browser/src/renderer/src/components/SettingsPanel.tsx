import { useEffect, useState } from "react"
import type { PrivacyReport, ProviderInfo, UserSettings } from "@shared/types"
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
  // Lifted state — Connection's "Add a custom endpoint" button needs to
  // open the inline adder over in CustomEndpointsSection AND scroll it
  // into view, even though those are sibling sections. Lifted control
  // beats event-emitter coordination here.
  const [adderOpen, setAdderOpen] = useState(false)
  const openAdderAndScroll = () => {
    setAdderOpen(true)
    requestAnimationFrame(() => {
      document.getElementById("custom-endpoints-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }
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
        <ConnectionSection
          providers={providers}
          onRefresh={onRefreshProviders}
          onAddCustomEndpoint={openAdderAndScroll}
        />
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
        <CustomEndpointsSection
          settings={settings}
          providers={providers}
          adderOpen={adderOpen}
          onAdderOpen={() => setAdderOpen(true)}
          onAdderClose={() => setAdderOpen(false)}
          onRefresh={onRefreshProviders}
        />
        <DefaultProviderSection settings={settings} />
        <PrivacySection />
        <PrivacyNote />
      </div>
    </div>
  )
}

// ── Privacy report (last 30 days) ───────────────────────────────────
function PrivacySection() {
  const [report, setReport] = useState<PrivacyReport | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () => {
      void window.api.privacy.getReport().then((r) => { if (alive) setReport(r) })
    }
    load()
    // Refresh every few seconds while open — counts move as the user
    // browses other tabs in the background.
    const t = setInterval(load, 4000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const onReset = async () => {
    if (!confirm("Wipe the last 30 days of privacy stats? Blocking stays on.")) return
    await window.api.privacy.reset()
    const r = await window.api.privacy.getReport()
    setReport(r)
  }

  return (
    <section id="privacy-section" className="scroll-mt-4">
      <SectionHeader
        label="Privacy report"
        hint="Trackers that tried to profile you, blocked at the network layer. Last 30 days. Stays on this device."
      />
      {!report ? (
        <p className="text-[12px] text-chrome-text-3 font-mono tracking-[0.04em]">loading…</p>
      ) : (
        <PrivacyBody report={report} showAll={showAll} setShowAll={setShowAll} onReset={onReset} />
      )}
    </section>
  )
}

function PrivacyBody({
  report, showAll, setShowAll, onReset,
}: {
  report: PrivacyReport
  showAll: boolean
  setShowAll: (v: boolean) => void
  onReset: () => void
}) {
  // Empty-state copy is honest: blocking is on, but nothing has been seen
  // yet. Don't fake numbers, don't hide the section.
  const empty = report.totalBlocked === 0 && report.sitesVisited === 0
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Trackers blocked" value={report.totalBlocked.toLocaleString()} />
        <Stat
          label="Sites that tracked"
          value={report.sitesVisited === 0 ? "—" : `${report.percentWithTrackers}%`}
          sub={report.sitesVisited === 0 ? "no sites visited yet" : `${report.sitesWithTrackers} of ${report.sitesVisited}`}
        />
      </div>

      {report.topTracker && (
        <div className="rounded-[12px] border border-chrome-border bg-chrome-surface px-3 py-2.5">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3 mb-1">
            Most contacted tracker
          </p>
          <p className="text-[13px] text-chrome-text leading-snug">
            <span className="font-mono text-signal">{report.topTracker.domain}</span>
            <span className="text-chrome-text-2"> was prevented from profiling you across </span>
            <span className="text-chrome-text">{report.topTracker.sites}</span>
            <span className="text-chrome-text-2"> {report.topTracker.sites === 1 ? "site" : "sites"}.</span>
          </p>
          {report.topTracker.owner && report.topTracker.owner !== report.topTracker.domain && (
            <p className="text-[11px] text-chrome-text-3 mt-1">
              Owner: <span className="text-chrome-text-2">{report.topTracker.owner}</span>
            </p>
          )}
        </div>
      )}

      {report.topTrackers.length > 1 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="font-mono text-[11px] tracking-[0.06em] text-chrome-text-2 hover:text-signal transition-colors"
        >
          {showAll ? "Hide breakdown" : `Show all ${report.topTrackers.length} →`}
        </button>
      )}

      {showAll && (
        <div className="rounded-[12px] border border-chrome-border bg-chrome-surface divide-y divide-chrome-border">
          {report.topTrackers.map((t) => (
            <div key={t.domain} className="px-3 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[12px] text-chrome-text truncate">{t.domain}</p>
                <p className="text-[10px] text-chrome-text-3">
                  {t.owner} · {t.sites} {t.sites === 1 ? "site" : "sites"}
                </p>
              </div>
              <span className="font-mono text-[12px] text-signal tabular-nums">{t.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px] text-chrome-text-3 leading-relaxed">
          {empty
            ? "Blocking is on. Counts will appear as you browse."
            : `Blocking is ${report.blockingEnabled ? "on" : "off"}. ${report.dailyCounts.length}-day window.`}
        </p>
        {!empty && (
          <button
            type="button"
            onClick={onReset}
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[12px] border border-chrome-border bg-chrome-surface px-3 py-2.5">
      <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">{label}</p>
      <p className="text-[22px] leading-tight text-chrome-text font-medium tabular-nums mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-chrome-text-3 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Connection (was previously split between Sidebar + Settings) ────
// One home for "where is the model coming from": current status,
// install instructions when nothing's online, and a Refresh affordance.
function ConnectionSection({
  providers, onRefresh, onAddCustomEndpoint,
}: {
  providers: ProviderInfo[]
  onRefresh: () => void
  onAddCustomEndpoint: () => void
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
          <p className="text-[11px] text-chrome-text-3 leading-relaxed mb-3">
            Already running LM Studio / llama.cpp / MLX? Start their local
            server — Delta auto-detects within a few seconds.
          </p>
          {/* Prominent CTA so users on a non-default IP/port don't have to
              hunt for the Custom endpoints section below. */}
          <button
            type="button"
            onClick={onAddCustomEndpoint}
            className="w-full h-9 rounded-full border border-chrome-border bg-chrome-surface-2 hover:border-chrome-text-3 hover:bg-chrome-surface text-[12px] text-chrome-text flex items-center justify-center gap-2 transition-colors"
          >
            <span className="text-signal">+</span>
            <span>Add a custom endpoint</span>
            <span className="font-mono text-[10px] text-chrome-text-3">homelab · Together · Groq · …</span>
          </button>
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
function CustomEndpointsSection({
  settings, providers, adderOpen, onAdderOpen, onAdderClose, onRefresh,
}: {
  settings: UserSettings
  providers: ProviderInfo[]
  adderOpen: boolean
  onAdderOpen: () => void
  onAdderClose: () => void
  onRefresh: () => void
}) {
  const [label, setLabel] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Per-endpoint live status, looked up from the providers list main pushes.
  // "online" — green; "offline" — muted with a "Test" affordance that just
  // re-probes everything; "needs-key" — amber.
  const statusOf = (id: string): { color: string; label: string } => {
    const p = providers.find((x) => x.id === id)
    if (!p) return { color: "bg-chrome-text-3", label: "unknown" }
    switch (p.status) {
      case "online":    return { color: "bg-signal", label: `online · ${p.models.length} model${p.models.length === 1 ? "" : "s"}` }
      case "needs-key": return { color: "bg-[hsl(45_85%_55%)]", label: "needs key" }
      case "offline":   return { color: "bg-[hsl(0_60%_55%)]", label: "offline · check the URL is reachable" }
      default:          return { color: "bg-chrome-text-3", label: "unknown" }
    }
  }

  const add = async () => {
    setErr(null)
    let url: URL
    try { url = new URL(endpoint) } catch {
      setErr("Endpoint must be a valid URL (e.g. https://api.together.xyz or http://192.168.1.50:1234).")
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
      onAdderClose()
    } finally { setBusy(false) }
  }

  const remove = async (id: string) => {
    await window.api.settings.update({ kind: "removeCustomEndpoint", id })
  }

  return (
    <section id="custom-endpoints-section" className="scroll-mt-4">
      <SectionHeader
        label="Custom endpoints"
        hint="Any OpenAI-compatible URL — local homelab Ollama, Together, Groq, vLLM, LM Studio on a non-default IP."
      />

      {settings.customEndpoints.length > 0 && (
        <ul className="space-y-2 mb-2">
          {settings.customEndpoints.map((e) => {
            const s = statusOf(e.id)
            return (
              <li
                key={e.id}
                className="rounded-2xl border border-chrome-border bg-chrome-surface p-3"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    title={s.label}
                    className={["h-1.5 w-1.5 rounded-full shrink-0", s.color].join(" ")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-chrome-text truncate">{e.label}</p>
                    <CopyableUrl url={e.endpoint} />
                  </div>
                  {e.hasApiKey && (
                    <span
                      title="API key configured"
                      className="font-mono text-[9px] tracking-[0.12em] uppercase text-signal/80 shrink-0"
                    >authed</span>
                  )}
                  <button
                    type="button"
                    onClick={onRefresh}
                    title="Re-probe this endpoint"
                    className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors shrink-0"
                  >Test</button>
                  <button
                    type="button"
                    onClick={() => remove(e.id)}
                    aria-label="Remove endpoint"
                    className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-[hsl(0_70%_60%)] transition-colors shrink-0"
                  >Remove</button>
                </div>
                <p className="mt-1.5 ml-4 font-mono text-[10px] text-chrome-text-3">{s.label}</p>
              </li>
            )
          })}
        </ul>
      )}

      {adderOpen ? (
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
              onClick={() => { onAdderClose(); setErr(null) }}
              className="h-8 px-4 rounded-full border border-chrome-border text-[12px] text-chrome-text-2 hover:text-chrome-text transition-colors"
            >Cancel</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAdderOpen}
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

// Click to copy. Tiny visual feedback ("copied · …") for ~1.4s, then revert.
// Used on saved custom-endpoint URLs so the user can yank one back into a
// terminal or another tool without highlighting + ⌘C.
function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch { /* permission denied — silent */ }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title="Click to copy"
      className="block w-full text-left font-mono text-[11px] text-chrome-text-3 hover:text-chrome-text-2 truncate transition-colors"
    >
      {copied ? <span className="text-signal">copied · {url}</span> : url}
    </button>
  )
}
