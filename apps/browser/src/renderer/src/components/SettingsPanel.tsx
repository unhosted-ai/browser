import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import type { CredentialImportPreview, ExtensionEntry, PrivacyReport, ProviderInfo, SavedCredential, ScheduledTask, ScheduledTaskAction, ScheduledTaskInput, ScheduledTaskTrigger, SystemCredentialEntry, SystemCredentialImportResult, UserSettings } from "@shared/types"
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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — fades. Click anywhere outside the panel to close. */}
          <motion.div
            key="settings-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40 no-drag"
          />
          {/* Panel — slides in from the right; same width as the AI
              sidebar but doesn't share its IPC. Lives over the
              WebContentsView. */}
          <motion.aside
            key="settings-panel"
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
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
        <NewTabSection settings={settings} />
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
        <DefaultProviderSection settings={settings} providers={providers} />
        <SecondBrainSection settings={settings} />
        <PersonalSlmSection settings={settings} />
        <AppLockSection settings={settings} />
        <AccountLockSection settings={settings} />
        <CredentialsSection />
        <DefaultBrowserSection />
        <ExtensionsSection />
        <ScheduledTasksSection />
        <SecurityHardeningSection settings={settings} />
        <UpdatesSection settings={settings} />
        <TabsSection settings={settings} />
        <AdBlockSection settings={settings} />
        <ExtendedTrackerListSection settings={settings} />
        <PrivacySection />
        <LegalPrivacySection />
        <PrivacyNote />
      </div>
    </div>
  )
}

// ── App lock (biometric / system password on launch) ────────────────
// Opt-in: when on, Delta prompts for Touch ID before the main window
// appears. Off by default — the app is no-account, this is for users
// who want a second layer at the device edge (shared laptop, family
// machine, etc.). The toggle stays writable on non-macOS platforms,
// but the main process logs a warning and fails open there until
// Windows Hello / polkit support lands.
function AppLockSection({ settings }: { settings: UserSettings }) {
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform)
  const set = (value: boolean) =>
    void window.api.settings.update({ kind: "requireBiometric", value })

  return (
    <section>
      <SectionHeader
        label="App lock"
        hint={isMac
          ? "Require Touch ID before Delta opens. Off by default."
          : "Require your OS biometric / password before Delta opens. macOS Touch ID only for now — toggle still saves on other platforms."}
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] text-chrome-text leading-snug">
            {settings.requireBiometric ? "Locked — Touch ID required on launch." : "Unlocked — opens straight to your tabs."}
          </p>
          <p className="text-[11px] text-chrome-text-3 mt-0.5">
            {isMac
              ? "Uses systemPreferences.promptTouchID. Cancels quit Delta."
              : "Touch ID prompt is macOS-only; this preference is harmless on your platform."}
          </p>
        </div>
        <Toggle
          checked={settings.requireBiometric}
          onChange={set}
          ariaLabel="Require biometric on launch"
        />
      </div>
    </section>
  )
}

// ── Connection-layer security hardening ─────────────────────────────
// Three orthogonal layers, each toggleable independently:
//   1. HTTPS-only — rewrite top-level http:// to https:// before the
//      request leaves the device. Per-host bypass for sites that don't
//      have valid TLS (legacy intranet, localhost is auto-skipped).
//   2. Strict referrer policy — strip path + query on cross-origin
//      Referer headers.
//   3. DNS-over-HTTPS — route all Chromium DNS through 1.1.1.1 / 9.9.9.9
//      / 8.8.8.8 instead of the OS resolver. Takes effect next launch.
function SecurityHardeningSection({ settings }: { settings: UserSettings }) {
  const [bypassDraft, setBypassDraft] = useState("")
  const setBool = <K extends "httpsOnly" | "strictReferrerPolicy" | "dnsOverHttps">(
    kind: K,
    value: boolean,
  ) => void window.api.settings.update({ kind, value } as never)
  const setDohProvider = (value: "cloudflare" | "quad9" | "google") =>
    void window.api.settings.update({ kind: "dohProvider", value })
  const addBypass = () => {
    const host = bypassDraft.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0]
    if (!host) return
    void window.api.settings.update({ kind: "httpsOnlyBypassAdd", host })
    setBypassDraft("")
  }
  const removeBypass = (host: string) =>
    void window.api.settings.update({ kind: "httpsOnlyBypassRemove", host })

  return (
    <section>
      <SectionHeader
        label="Security"
        hint="Connection-layer hardening. Each toggle is independent. DoH changes apply on next launch."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 space-y-3">
        {/* HTTPS-only */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12.5px] text-chrome-text font-medium leading-snug">HTTPS-only</p>
            <p className="text-[11px] text-chrome-text-3 mt-0.5">
              Rewrite plain http:// to https:// before it hits the network. localhost / private-IP ranges are always allowed http.
            </p>
          </div>
          <Toggle
            checked={settings.httpsOnly}
            onChange={(v) => setBool("httpsOnly", v)}
            ariaLabel="HTTPS-only"
          />
        </div>

        {/* HTTPS bypass list — only shown when the toggle is on */}
        {settings.httpsOnly && (
          <div className="pl-3 border-l-2 border-chrome-border ml-1 space-y-2">
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-chrome-text-3">
              Bypass for these hosts (allow http)
            </p>
            {settings.httpsOnlyBypass.length === 0 ? (
              <p className="text-[11px] text-chrome-text-3">No exceptions.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {settings.httpsOnlyBypass.map((h) => (
                  <li
                    key={h}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-chrome-border bg-chrome-bg font-mono text-[11px] text-chrome-text"
                  >
                    {h}
                    <button
                      type="button"
                      onClick={() => removeBypass(h)}
                      className="text-chrome-text-3 hover:text-chrome-text"
                      aria-label={`Remove ${h}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                value={bypassDraft}
                onChange={(e) => setBypassDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBypass() } }}
                placeholder="legacy.example.com"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className="flex-1 h-7 px-2 rounded-md bg-chrome-bg border border-chrome-border text-[11.5px] text-chrome-text font-mono placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/50"
              />
              <button
                type="button"
                onClick={addBypass}
                className="h-7 px-2.5 rounded-md border border-chrome-border bg-chrome-bg text-[11px] tracking-[0.06em] uppercase text-chrome-text-2 hover:text-signal hover:border-signal/50 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Strict referrer policy */}
        <div className="flex items-start justify-between gap-3 pt-2 border-t border-chrome-border">
          <div className="min-w-0">
            <p className="text-[12.5px] text-chrome-text font-medium leading-snug">Strict referrer policy</p>
            <p className="text-[11px] text-chrome-text-3 mt-0.5">
              Strip path + query from cross-origin Referer headers. Same defaults as Firefox / Brave.
            </p>
          </div>
          <Toggle
            checked={settings.strictReferrerPolicy}
            onChange={(v) => setBool("strictReferrerPolicy", v)}
            ariaLabel="Strict referrer policy"
          />
        </div>

        {/* DoH */}
        <div className="flex items-start justify-between gap-3 pt-2 border-t border-chrome-border">
          <div className="min-w-0">
            <p className="text-[12.5px] text-chrome-text font-medium leading-snug">DNS-over-HTTPS</p>
            <p className="text-[11px] text-chrome-text-3 mt-0.5">
              Encrypt DNS lookups end-to-end. Closes the last unencrypted leak on most home networks. Takes effect next launch.
            </p>
          </div>
          <Toggle
            checked={settings.dnsOverHttps}
            onChange={(v) => setBool("dnsOverHttps", v)}
            ariaLabel="DNS-over-HTTPS"
          />
        </div>
        {settings.dnsOverHttps && (
          <div className="pl-3 border-l-2 border-chrome-border ml-1">
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-chrome-text-3 mb-1.5">
              Provider
            </p>
            <div className="flex gap-2 flex-wrap">
              {([
                { id: "cloudflare", label: "Cloudflare 1.1.1.1" },
                { id: "quad9",      label: "Quad9 9.9.9.9" },
                { id: "google",     label: "Google 8.8.8.8" },
              ] as const).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDohProvider(p.id)}
                  className={[
                    "h-7 px-3 rounded-full border text-[11px] tracking-[0.02em] transition-colors",
                    settings.dohProvider === p.id
                      ? "bg-signal/15 border-signal/60 text-signal"
                      : "border-chrome-border text-chrome-text-2 hover:text-chrome-text hover:border-chrome-text-3",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Updates ─────────────────────────────────────────────────────────
// Auto-check is off by default while the project ships unsigned. When
// on, electron-updater hits GitHub Releases on app start; if there's a
// newer version, a banner appears at the top of the window and the
// user clicks through to download manually. Once signing is set up,
// this will switch to a full hands-off install path.
function UpdatesSection({ settings }: { settings: UserSettings }) {
  const set = (value: boolean) =>
    void window.api.settings.update({ kind: "autoUpdateCheck", value })
  const checkNow = () => void window.api.updater.check()

  return (
    <section>
      <SectionHeader
        label="Updates"
        hint="Auto-check uses electron-updater + GitHub Releases. Install is manual until signed builds ship."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] text-chrome-text leading-snug">
            {settings.autoUpdateCheck ? "Checking GitHub on launch." : "Not checking."}
          </p>
          <p className="text-[11px] text-chrome-text-3 mt-0.5">
            Manual install for now. Signed builds + hands-off install land with the Apple Developer ID cert.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {settings.autoUpdateCheck && (
            <button
              type="button"
              onClick={checkNow}
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
            >
              Check now
            </button>
          )}
          <Toggle
            checked={settings.autoUpdateCheck}
            onChange={set}
            ariaLabel="Check for updates on launch"
          />
        </div>
      </div>
    </section>
  )
}

// ── Ad blocking ─────────────────────────────────────────────────────
// Distinct from the tracker list — separate curated set of well-known
// ad networks (display, video, header-bidding, native, retargeting).
// Default on. Match logic in main/tracker-list.ts → matchBlocked();
// ad hits get the "ad" label so the privacy report can show them
// separately from analytics trackers.
// ── Tabs (memory + discard) ─────────────────────────────────────────
// The RAM pip in the tab strip shows the same data live. This section
// exposes the auto-discard threshold (default 30 min) and a one-click
// "discard idle tabs now" mirror of the pip's button.
function TabsSection({ settings }: { settings: UserSettings }) {
  const TIME_PRESETS: { label: string; minutes: number }[] = [
    { label: "Off", minutes: 0 },
    { label: "5 min", minutes: 5 },
    { label: "15 min", minutes: 15 },
    { label: "30 min", minutes: 30 },
    { label: "1 hr", minutes: 60 },
    { label: "4 hr", minutes: 240 },
  ]
  const CAP_PRESETS: { label: string; n: number }[] = [
    { label: "No cap", n: 0 },
    { label: "10", n: 10 },
    { label: "20", n: 20 },
    { label: "50", n: 50 },
    { label: "100", n: 100 },
  ]
  const minutes = settings.tabDiscardMinutes
  const cap = settings.maxLiveTabs
  return (
    <section>
      <SectionHeader
        label="Tabs &amp; memory"
        hint="Inactive tabs free their renderer process. The active tab is never discarded. Click a discarded tab to reload it."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 grid gap-3">
        <div>
          <p className="text-[11px] text-chrome-text-3 mb-1.5">Auto-discard inactive tabs after</p>
          <div className="flex flex-wrap gap-1.5">
            {TIME_PRESETS.map((p) => {
              const on = p.minutes === minutes
              return (
                <button
                  key={p.minutes}
                  type="button"
                  onClick={() => void window.api.settings.update({ kind: "tabDiscardMinutes", value: p.minutes })}
                  className={[
                    "h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors duration-150",
                    on
                      ? "bg-signal/15 text-signal"
                      : "bg-chrome-surface-2 text-chrome-text-2 hover:bg-chrome-border hover:text-chrome-text",
                  ].join(" ")}
                  aria-pressed={on}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <p className="text-[11px] text-chrome-text-3 mb-1.5">Max live tabs (soft cap; oldest gets discarded when exceeded)</p>
          <div className="flex flex-wrap gap-1.5">
            {CAP_PRESETS.map((p) => {
              const on = p.n === cap
              return (
                <button
                  key={p.n}
                  type="button"
                  onClick={() => void window.api.settings.update({ kind: "maxLiveTabs", value: p.n })}
                  className={[
                    "h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors duration-150",
                    on
                      ? "bg-signal/15 text-signal"
                      : "bg-chrome-surface-2 text-chrome-text-2 hover:bg-chrome-border hover:text-chrome-text",
                  ].join(" ")}
                  aria-pressed={on}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] leading-snug text-chrome-text-3">
            {minutes === 0 && cap === 0
              ? "No discard policy — tabs stay loaded until you close them. Watch the RAM pip in the tab strip."
              : [
                  minutes > 0 && `Idle ≥ ${minutes} min are discarded.`,
                  cap > 0 && `Oldest gets discarded past ${cap} live tabs.`,
                ].filter(Boolean).join(" ")}
          </p>
          <button
            type="button"
            onClick={() => void window.api.tabs.discardAllIdle()}
            className="h-7 px-2.5 rounded-md text-[12px] font-medium bg-chrome-surface-2 text-chrome-text-2 hover:bg-chrome-border hover:text-chrome-text transition-colors duration-150 shrink-0"
          >
            Discard idle now
          </button>
        </div>
      </div>
    </section>
  )
}

function AdBlockSection({ settings }: { settings: UserSettings }) {
  const set = (value: boolean) =>
    void window.api.settings.update({ kind: "useAdBlock", value })
  return (
    <section>
      <SectionHeader
        label="Ad blocking"
        hint="Curated list of well-known ad networks. Separate from the tracker list — toggle independently."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] text-chrome-text leading-snug">
            {settings.useAdBlock
              ? "On — display, video, header-bidding + native ad networks blocked."
              : "Off — ads will load (trackers may still be blocked, depending on the tracker list toggle)."}
          </p>
          <p className="text-[11px] text-chrome-text-3 mt-0.5">
            Bulk EasyList import is planned. Today's list focuses on the head
            of ad-tech: Criteo, Rubicon, OpenX, PubMatic, Index Exchange,
            Xandr, Outbrain, Taboola, the IDs (LiveRamp, ID5), and the video
            stack (SpotX, FreeWheel, IAS, DoubleVerify).
          </p>
        </div>
        <Toggle
          checked={settings.useAdBlock}
          onChange={set}
          ariaLabel="Block ads"
        />
      </div>
    </section>
  )
}

// ── Extended tracker list (EasyPrivacy) ─────────────────────────────
// Default on. The ~42k-entry community list is what makes the privacy
// report comparable with uBlock Origin's coverage. The toggle is here
// so the user can flip it off if the broad list ever catches a
// legitimate first-party request they need — the curated short list
// keeps blocking the high-traffic ones regardless.
function ExtendedTrackerListSection({ settings }: { settings: UserSettings }) {
  const set = (value: boolean) =>
    void window.api.settings.update({ kind: "useExtendedTrackerList", value })
  return (
    <section>
      <SectionHeader
        label="Extended tracker list"
        hint="Use the bundled EasyPrivacy list (~42k known trackers) on top of the curated short list. Recommended on."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] text-chrome-text leading-snug">
            {settings.useExtendedTrackerList
              ? "On — EasyPrivacy + curated list active."
              : "Off — only the curated short list (~150) blocks."}
          </p>
          <p className="text-[11px] text-chrome-text-3 mt-0.5">
            Updated by rerunning <code className="font-mono">apps/browser/scripts/build-tracker-list.mjs</code>.
            Source: <span className="text-chrome-text-2">easylist.to</span> · GPL-3.0 / CC-BY-SA-3.0.
          </p>
        </div>
        <Toggle
          checked={settings.useExtendedTrackerList}
          onChange={set}
          ariaLabel="Use extended tracker list"
        />
      </div>
    </section>
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
  // Paper mode is the cream / editorial register — same palette as the
  // GitHub Pages site. Sits between dark and light in the cycle.
  const themes: Array<{ id: "dark" | "light" | "paper"; label: string; hint: string }> = [
    { id: "dark",  label: "Dark",  hint: "the app default" },
    { id: "light", label: "Light", hint: "warm beige" },
    { id: "paper", label: "Paper", hint: "cream + ink, editorial" },
  ]
  return (
    <section>
      <SectionHeader label="Appearance" hint="Three registers. Also togglable from the address bar." />
      <div className="flex gap-2 flex-wrap">
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            title={t.hint}
            className={[
              "h-9 px-4 rounded-full border text-[12px] tracking-[0.02em] transition-colors duration-150",
              theme === t.id
                ? "bg-signal/15 border-signal/60 text-signal"
                : "border-chrome-border text-chrome-text-2 hover:text-chrome-text hover:border-chrome-text-3",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>
    </section>
  )
}

// ── New-tab background ───────────────────────────────────────
function NewTabSection({ settings }: { settings: UserSettings }) {
  const mode = settings.newtabBackground
  const folder = settings.newtabFolder
  const [busy, setBusy] = useState(false)

  const setMode = (v: "procedural" | "photographic") => {
    void window.api.settings.update({ kind: "newtabBackground", value: v })
  }
  const pickFolder = async () => {
    setBusy(true)
    try {
      const picked = await window.api.newtabBg.pickFolder()
      if (picked) {
        await window.api.settings.update({ kind: "newtabFolder", value: picked })
        // Auto-switch to photographic when the user picks a folder — the
        // most common path: "I picked a folder, I want to see those photos."
        await window.api.settings.update({ kind: "newtabBackground", value: "photographic" })
      }
    } finally { setBusy(false) }
  }
  const clearFolder = () => {
    void window.api.settings.update({ kind: "newtabFolder", value: null })
    void window.api.settings.update({ kind: "newtabBackground", value: "procedural" })
  }

  return (
    <section>
      <SectionHeader
        label="New tab"
        hint="The opening surface every time you ⌘T. Procedural is local & animated; photographic cycles through your own folder of images."
      />
      <div className="flex gap-2 mb-3">
        {(["procedural", "photographic"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={[
              "h-9 px-4 rounded-full border text-[12px] tracking-[0.02em] capitalize transition-colors duration-150",
              mode === m
                ? "bg-signal/15 border-signal/60 text-signal"
                : "border-chrome-border text-chrome-text-2 hover:text-chrome-text hover:border-chrome-text-3",
            ].join(" ")}
          >
            {m === "procedural" ? "Procedural sky" : "Your photos"}
          </button>
        ))}
      </div>
      {mode === "photographic" && (
        <div className="rounded-[12px] border border-chrome-border bg-chrome-surface px-3 py-2.5 space-y-2">
          {folder ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3">Folder</p>
                <p className="text-[12px] text-chrome-text truncate" title={folder}>{folder}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={pickFolder}
                  disabled={busy}
                  className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-2 hover:text-signal px-2 py-1 rounded"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={clearFolder}
                  className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text px-2 py-1 rounded"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={pickFolder}
              disabled={busy}
              className="w-full h-9 rounded-md border border-dashed border-chrome-border hover:border-signal/60 text-[12px] text-chrome-text-2 hover:text-signal transition-colors"
            >
              {busy ? "Opening picker…" : "Pick a folder of images…"}
            </button>
          )}
          <p className="text-[11px] text-chrome-text-3 leading-relaxed">
            JPG / PNG / WebP / AVIF / GIF. One image per new tab, picked
            at random. Your photos never leave this device.
          </p>
        </div>
      )}
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
                      title="An API key is stored for this endpoint (encrypted via your OS keychain)."
                      className="font-mono text-[9px] tracking-[0.12em] uppercase text-signal/80 shrink-0"
                    >key set</span>
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
// Two-level pick: provider radio + (when a specific provider is chosen
// and online) a model select. "Auto" leaves the model unset so the
// agent picks the first online local provider's first model.
function DefaultProviderSection({
  settings, providers,
}: {
  settings: UserSettings
  providers: ProviderInfo[]
}) {
  const setProvider = (id: "auto" | string) => {
    // Reset the model pin when the provider changes — the previous model
    // is unlikely to exist on the new provider.
    void window.api.settings.update({ kind: "defaultProvider", id, model: undefined })
  }
  const setModel = (id: "auto" | string, model: string | undefined) =>
    void window.api.settings.update({ kind: "defaultProvider", id, model })

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

  const selectedId = settings.defaultProvider.id
  const selectedProvider = providers.find((p) => p.id === selectedId) || null
  const selectedModels = selectedProvider?.models ?? []
  const currentModel = settings.defaultProvider.model

  return (
    <section>
      <SectionHeader label="Default provider" hint="Which provider — and which model — the agent uses for new messages." />
      <ul className="space-y-1">
        {opts.map((o) => (
          <li key={o.id}>
            <label className="flex items-center gap-2.5 text-[12px] text-chrome-text-2 cursor-pointer hover:text-chrome-text transition-colors">
              <input
                type="radio"
                name="defaultProvider"
                checked={selectedId === o.id}
                onChange={() => setProvider(o.id)}
                className="accent-signal"
              />
              <span>{o.label}</span>
            </label>
          </li>
        ))}
      </ul>

      {/* Model picker — only rendered when the user has pinned a specific
          provider (not "auto") AND that provider is online with at least
          one listed model. For "auto", model selection lives on the
          Assistant chip (per-conversation override). */}
      {selectedId !== "auto" && selectedProvider?.status === "online" && selectedModels.length > 0 && (
        <div className="mt-3 rounded-2xl border border-chrome-border bg-chrome-surface p-3">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-chrome-text-3 mb-1.5">
            Model · {selectedProvider.label}
          </p>
          <select
            value={currentModel && selectedModels.includes(currentModel) ? currentModel : ""}
            onChange={(e) => setModel(selectedId, e.target.value || undefined)}
            className="w-full bg-chrome-surface-2 border border-chrome-border rounded-lg px-2.5 py-1.5 text-[12px] text-chrome-text font-mono focus:outline-none focus:border-signal/50 transition-colors"
          >
            <option value="">First available ({selectedModels[0]})</option>
            {selectedModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-chrome-text-3 leading-relaxed">
            {selectedModels.length} model{selectedModels.length === 1 ? "" : "s"} available. The Assistant chip mirrors this choice and lets you switch on the fly.
          </p>
        </div>
      )}
      {selectedId !== "auto" && selectedProvider?.status !== "online" && (
        <p className="mt-2 text-[11px] text-chrome-text-3 leading-relaxed">
          Pinned provider is offline. Start it and click Refresh under Connection — then a model dropdown will appear here.
        </p>
      )}
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

// ── Legal & Privacy ──────────────────────────────────────────────────
// Surface the on-disk docs in-app so users don't have to know they exist
// on GitHub to find them. Each opens a NEW Delta tab — keeps the user
// in the app rather than punting them to their default browser.
function LegalPrivacySection() {
  const open = (url: string) => { void window.api.tabs.create(url); }
  const base = "https://github.com/Delta-Practice/Browser/blob/main"
  const items: Array<{ label: string; href: string; hint: string }> = [
    {
      label: "Privacy notice",
      href: `${base}/PRIVACY.md`,
      hint: "What data Delta processes, every outbound endpoint, jurisdiction addenda (GDPR, CCPA, PIPEDA, LGPD, DPDP, PIPL, APPI, others).",
    },
    {
      label: "Terms of use",
      href: `${base}/TERMS.md`,
      hint: "Warranty disclaimer, AI Act Art. 50 disclosure, acceptable use, governing law.",
    },
    {
      label: "MIT license",
      href: `${base}/LICENSE`,
      hint: "Code is MIT. Brand assets are not — see brand/guidelines.md.",
    },
    {
      label: "Security policy",
      href: `${base}/SECURITY.md`,
      hint: "Threat model + how to report a vulnerability privately.",
    },
  ]
  return (
    <section>
      <SectionHeader
        label="Legal & Privacy"
        hint="The full notices live in the repo; opening one creates a tab."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface divide-y divide-chrome-border">
        {items.map((it) => (
          <button
            key={it.href}
            type="button"
            onClick={() => open(it.href)}
            className="w-full text-left px-3 py-2.5 hover:bg-chrome-surface-2 transition-colors first:rounded-t-2xl last:rounded-b-2xl flex items-start gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-chrome-text leading-snug">{it.label}</p>
              <p className="text-[11px] text-chrome-text-3 mt-0.5 leading-relaxed">{it.hint}</p>
            </div>
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 shrink-0 mt-0.5">
              Open →
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-chrome-text-3 leading-relaxed">
        Delta runs no IP geolocation; the privacy notice is universal and
        satisfies the strictest applicable regime.
      </p>
    </section>
  )
}

// ── Second brain (OS Setup) ─────────────────────────────────────────
// Skill 1 from the AI-OS pattern. Creates a structured Markdown vault
// on disk with Claude.md navigation maps. The renderer only ever sees
// status; reads/writes go through the agent.
function SecondBrainSection({ settings }: { settings: UserSettings }) {
  const [status, setStatus] = useState<{ path: string; fileCount: number; totalBytes: number; initialised: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [okFlash, setOkFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void window.api.secondBrain.status().then(setStatus)
  }, [settings.secondBrainPath])

  const flashOk = (msg: string) => { setOkFlash(msg); setTimeout(() => setOkFlash(null), 1800) }

  const pickAndInit = async () => {
    setBusy(true); setError(null)
    try {
      const s = await window.api.secondBrain.pickAndInit()
      if (s) { setStatus(s); flashOk("Vault initialised.") }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally { setBusy(false) }
  }
  const reinit = async () => {
    setBusy(true); setError(null)
    try {
      const s = await window.api.secondBrain.reinit()
      if (s) { setStatus(s); flashOk("Re-initialised — any missing folders / Claude.md files were created.") }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally { setBusy(false) }
  }
  const disconnect = () => {
    void window.api.settings.update({ kind: "secondBrainPath", value: null })
    setStatus(null)
  }
  const fmtBytes = (n: number): string => {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <section>
      <SectionHeader
        label="Second brain"
        hint="A structured Markdown vault on disk. The agent can read + write it; open the same folder in Obsidian if you want the graph view."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 space-y-2.5">
        {!settings.secondBrainPath || !status ? (
          <>
            <p className="text-[12px] text-chrome-text-2 leading-relaxed">
              Pick a folder. Delta creates the structure
              (<code className="font-mono text-[11px]">context · daily · projects · intelligence · resources · skills</code>) +
              navigation maps. Existing files are left alone — re-init is safe.
            </p>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={pickAndInit}
                disabled={busy}
                className="h-8 px-3 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[11.5px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >{busy ? "Setting up…" : "Set up vault…"}</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12.5px] text-chrome-text leading-snug truncate">
                  {status.initialised ? "Vault ready." : "Folder exists but no Claude.md — click Re-init."}
                </p>
                <p className="font-mono text-[10.5px] text-chrome-text-3 truncate">{status.path}</p>
                <p className="text-[11px] text-chrome-text-3 mt-0.5">
                  {status.fileCount} file{status.fileCount === 1 ? "" : "s"} · {fmtBytes(status.totalBytes)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={reinit}
                  disabled={busy}
                  className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors disabled:opacity-40"
                >Re-init</button>
                <button
                  type="button"
                  onClick={disconnect}
                  className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-[hsl(0_70%_72%)] transition-colors"
                >Disconnect</button>
              </div>
            </div>
            <p className="text-[11px] text-chrome-text-3 leading-relaxed">
              Tell the agent things like
              <span className="font-mono text-chrome-text-2"> "Save this to my vault at projects/foo.md"</span>
              or <span className="font-mono text-chrome-text-2">"Scan my vault for context on X"</span>.
              The 12-section brain-dump wizard is on the roadmap; for now, dump into <code className="font-mono">context/about.md</code> by hand.
            </p>
          </>
        )}
        {error && <p role="alert" className="font-mono text-[11px] text-[hsl(0_70%_72%)]">{error}</p>}
        {okFlash && (
          <p role="status" className="font-mono text-[10.5px] tracking-[0.08em] uppercase text-signal">
            {okFlash}
          </p>
        )}
      </div>
    </section>
  )
}

// ── Personal SLM (preview) ───────────────────────────────────────────
// Honest framing: the toggle is real and is wired into settings; the
// training pipeline itself is a roadmap item (see docs/slm-design.md).
// Today, switching the toggle on tells the agent that the user wants
// the personalisation pass when it ships, and surfaces the setup
// docs so the user can follow along. We refuse to silently fake it.
function PersonalSlmSection({ settings }: { settings: UserSettings }) {
  const set = (value: boolean) =>
    void window.api.settings.update({ kind: "personalSlmEnabled", value })
  const enabled = settings.personalSlmEnabled
  return (
    <section>
      <SectionHeader
        label="Personal SLM"
        hint="Opt in to a small per-user model that learns from this device. Training pipeline is preview — see the design doc."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12.5px] text-chrome-text leading-snug">
              {enabled
                ? "Enabled — your agent will use a personalisation pass once training ships."
                : "Off. Your prompts go straight to whichever model is selected."}
            </p>
            <p className="text-[11px] text-chrome-text-3 mt-0.5 leading-relaxed">
              The SLM is trained from your conversations, bookmarks and browsing
              context locally — nothing is uploaded. Unlike a cloud assistant,
              this model is yours and only knows what you let it see.
            </p>
          </div>
          <Toggle
            checked={enabled}
            onChange={set}
            ariaLabel="Enable personal SLM"
          />
        </div>
        <div className="pl-3 border-l-2 border-chrome-border ml-1 space-y-1.5">
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-chrome-text-3">
            Status · preview
          </p>
          <ul className="text-[11px] text-chrome-text-2 leading-relaxed list-disc pl-4 space-y-1">
            <li>Today: the toggle persists your consent + reserves the agent slot.</li>
            <li>Phase A (planned): nightly LoRA fine-tune over local conversations into <code className="font-mono text-[10.5px]">userData/slm/</code>.</li>
            <li>Phase B (planned): per-query rewrite pass through the SLM before the main model sees it.</li>
            <li>Phase C (planned): in-app "what does my SLM know?" inspector + one-click reset.</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => void window.api.tabs.create("https://github.com/Delta-Practice/Browser/blob/main/apps/browser/docs/slm-design.md")}
          className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
        >
          Read the design doc →
        </button>
      </div>
    </section>
  )
}

// ── Account lock (PIN or password) ───────────────────────────────────
// Distinct from the macOS-only biometric AppLockSection above. This is
// a fully cross-platform, local-only secret stored as PBKDF2-SHA256 hash
// + salt in settings.json. The renderer never sees the hash; main does
// the comparison. Loss of the secret = delete settings.json (everything
// else stays). No remote reset, ever.
function AccountLockSection({ settings }: { settings: UserSettings }) {
  const configured = settings.accountLockConfigured
  const [mode, setMode] = useState<"idle" | "set" | "change" | "clear">("idle")
  const [kindDraft, setKindDraft] = useState<"pin" | "password">(
    settings.accountLockKind === "password" ? "password" : "pin",
  )
  const [secret, setSecret] = useState("")
  const [confirm, setConfirm] = useState("")
  const [currentSecret, setCurrentSecret] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okFlash, setOkFlash] = useState<string | null>(null)

  const reset = () => {
    setMode("idle")
    setSecret("")
    setConfirm("")
    setCurrentSecret("")
    setError(null)
  }

  const flashOk = (msg: string) => {
    setOkFlash(msg)
    setTimeout(() => setOkFlash(null), 1800)
  }

  const submitSet = async () => {
    if (busy) return
    setError(null)
    if (secret !== confirm) { setError("The two entries don't match."); return }
    setBusy(true)
    try {
      await window.api.settings.update({
        kind: "setAccountLock",
        lockKind: kindDraft,
        secret,
        ...(configured ? { currentSecret } : {}),
      })
      flashOk(configured ? "Lock changed." : "Lock set.")
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const submitClear = async () => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await window.api.settings.update({ kind: "clearAccountLock", currentSecret })
      flashOk("Lock removed.")
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <SectionHeader
        label="Account lock"
        hint="A local PIN or password gate. Works on any platform — no remote auth, no recovery."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12.5px] text-chrome-text leading-snug">
              {configured
                ? `${settings.accountLockKind === "pin" ? "PIN" : "Password"} required on launch.`
                : "No lock — opens straight to your tabs."}
            </p>
            <p className="text-[11px] text-chrome-text-3 mt-0.5 leading-relaxed">
              Stored as PBKDF2-SHA256 hash + salt in <code className="font-mono">settings.json</code>.
              The renderer never sees the hash; comparison happens in main.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {!configured && mode !== "set" && (
              <button
                type="button"
                onClick={() => { setMode("set"); setError(null) }}
                className="h-7 px-3 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[11.5px] font-medium hover:opacity-90 transition-opacity"
              >Set a lock</button>
            )}
            {configured && mode === "idle" && (
              <>
                <button
                  type="button"
                  onClick={() => { setMode("change"); setError(null) }}
                  className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
                >Change →</button>
                <button
                  type="button"
                  onClick={() => { setMode("clear"); setError(null) }}
                  className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-[hsl(0_70%_72%)] transition-colors"
                >Remove →</button>
              </>
            )}
          </div>
        </div>

        {(mode === "set" || mode === "change") && (
          <div className="pl-3 border-l-2 border-chrome-border ml-1 space-y-2.5">
            <div className="grid grid-cols-2 gap-1.5 rounded-full border border-chrome-border bg-chrome-surface-2 p-1">
              {(["pin", "password"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setKindDraft(k); setSecret(""); setConfirm("") }}
                  className={[
                    "h-7 rounded-full text-[11.5px] transition-colors",
                    kindDraft === k
                      ? "bg-chrome-bg text-chrome-text border border-chrome-border"
                      : "text-chrome-text-3 hover:text-chrome-text-2",
                  ].join(" ")}
                >{k === "pin" ? "PIN (4–12 digits)" : "Password (8+ chars)"}</button>
              ))}
            </div>
            {mode === "change" && (
              <input
                type={settings.accountLockKind === "pin" ? "tel" : "password"}
                inputMode={settings.accountLockKind === "pin" ? "numeric" : "text"}
                value={currentSecret}
                onChange={(e) => { setCurrentSecret(e.target.value); setError(null) }}
                placeholder={`Current ${settings.accountLockKind === "pin" ? "PIN" : "password"}`}
                className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text placeholder:text-chrome-text-3 font-mono focus:outline-none focus:border-signal/60 transition-colors"
              />
            )}
            <input
              type={kindDraft === "pin" ? "tel" : "password"}
              inputMode={kindDraft === "pin" ? "numeric" : "text"}
              pattern={kindDraft === "pin" ? "[0-9]*" : undefined}
              value={secret}
              onChange={(e) => { setSecret(e.target.value); setError(null) }}
              placeholder={kindDraft === "pin" ? "New PIN (4–12 digits)" : "New password (8+ chars)"}
              className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text placeholder:text-chrome-text-3 font-mono focus:outline-none focus:border-signal/60 transition-colors"
            />
            <input
              type={kindDraft === "pin" ? "tel" : "password"}
              inputMode={kindDraft === "pin" ? "numeric" : "text"}
              pattern={kindDraft === "pin" ? "[0-9]*" : undefined}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null) }}
              placeholder="Confirm"
              className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text placeholder:text-chrome-text-3 font-mono focus:outline-none focus:border-signal/60 transition-colors"
            />
            {error && <p role="alert" className="font-mono text-[11px] text-[hsl(0_70%_72%)]">{error}</p>}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={reset}
                className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text transition-colors"
              >Cancel</button>
              <button
                type="button"
                onClick={submitSet}
                disabled={busy || !secret || !confirm || (mode === "change" && !currentSecret)}
                className="h-8 px-4 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        )}

        {mode === "clear" && (
          <div className="pl-3 border-l-2 border-chrome-border ml-1 space-y-2">
            <p className="text-[11.5px] text-chrome-text-2 leading-relaxed">
              Removing the lock means anyone with this device can open Delta.
              Confirm your current {settings.accountLockKind === "pin" ? "PIN" : "password"}:
            </p>
            <input
              type={settings.accountLockKind === "pin" ? "tel" : "password"}
              inputMode={settings.accountLockKind === "pin" ? "numeric" : "text"}
              value={currentSecret}
              onChange={(e) => { setCurrentSecret(e.target.value); setError(null) }}
              placeholder={`Current ${settings.accountLockKind === "pin" ? "PIN" : "password"}`}
              className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text placeholder:text-chrome-text-3 font-mono focus:outline-none focus:border-signal/60 transition-colors"
            />
            {error && <p role="alert" className="font-mono text-[11px] text-[hsl(0_70%_72%)]">{error}</p>}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={reset}
                className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text transition-colors"
              >Cancel</button>
              <button
                type="button"
                onClick={submitClear}
                disabled={busy || !currentSecret}
                className="h-8 px-4 rounded-full bg-[hsl(0_70%_60%)] text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >{busy ? "Removing…" : "Remove lock"}</button>
            </div>
          </div>
        )}

        {okFlash && (
          <p role="status" className="font-mono text-[10.5px] tracking-[0.08em] uppercase text-signal">
            {okFlash}
          </p>
        )}
      </div>
    </section>
  )
}

// ── Per-site password import ────────────────────────────────────────
// Two-step flow: pick a CSV (Chrome/Brave/Edge/Firefox/Safari export
// format), preview the rows, toggle which to keep per-row, then commit.
// Stored encrypted via safeStorage in main; the renderer only ever sees
// {origin, username, hasPassword} for each saved credential. The Fill
// chip in the address bar (future) calls credentials.fillActive(id),
// which decrypts in main and injects the value into the active tab's
// focused form. The plaintext password never crosses the IPC boundary
// in either direction.
// Stable identity for a system-keychain row — used as the Set<string> key
// in the per-row checkbox state. `host\tusername` is safe because tabs
// don't appear in either field.
function sysKey(e: SystemCredentialEntry): string { return `${e.host}\t${e.username}` }

function CredentialsSection() {
  const [creds, setCreds] = useState<SavedCredential[] | null>(null)
  const [preview, setPreview] = useState<CredentialImportPreview | null>(null)
  const [keep, setKeep] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okFlash, setOkFlash] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  // System-keychain import (macOS today). `sysList` is null until the user
  // clicks the button. After listing, `sysKeep` tracks which entries the
  // user wants to actually fetch passwords for (each fetch fires the OS
  // access-prompt on first run).
  const [sysList, setSysList] = useState<SystemCredentialEntry[] | null>(null)
  const [sysKeep, setSysKeep] = useState<Set<string>>(new Set())
  const [sysBusy, setSysBusy] = useState(false)
  const [sysMessage, setSysMessage] = useState<string | null>(null)

  useEffect(() => {
    void window.api.credentials.list().then(setCreds)
    return window.api.credentials.onChange(setCreds)
  }, [])

  const flashOk = (msg: string) => {
    setOkFlash(msg)
    setTimeout(() => setOkFlash(null), 1800)
  }

  const pick = async () => {
    setError(null)
    try {
      const p = await window.api.credentials.pickAndPreview()
      if (!p) return
      setPreview(p)
      // Default: pre-select rows that don't already exist + aren't invalid.
      const initial = new Set(p.rows.filter((r) => !r.alreadyExists && !r.invalid).map((r) => r.index))
      setKeep(initial)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const toggleRow = (i: number) => {
    const next = new Set(keep)
    if (next.has(i)) next.delete(i); else next.add(i)
    setKeep(next)
  }

  const commit = async () => {
    if (!preview || busy) return
    setBusy(true)
    setError(null)
    try {
      const n = await window.api.credentials.importSelected({
        filePath: preview.filePath,
        keepIndices: [...keep],
      })
      setPreview(null)
      setKeep(new Set())
      flashOk(`Imported ${n} credential${n === 1 ? "" : "s"}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => { setPreview(null); setKeep(new Set()); setError(null) }
  const remove = (id: string) => void window.api.credentials.remove(id)

  const pickFromSystem = async () => {
    setSysMessage(null)
    setError(null)
    try {
      const list = await window.api.credentials.listSystemPasswords()
      if (list.length === 0) {
        setSysMessage("No entries surfaced from the system keychain. Today only macOS is supported — Windows + Linux land next.")
        return
      }
      setSysList(list)
      // Default: pre-select everything not already imported.
      setSysKeep(new Set(list.filter((e) => !e.alreadyImported).map(sysKey)))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }
  const toggleSysRow = (key: string) => {
    const next = new Set(sysKeep)
    if (next.has(key)) next.delete(key); else next.add(key)
    setSysKeep(next)
  }
  const commitSystem = async () => {
    if (!sysList || sysBusy) return
    setSysBusy(true)
    setError(null)
    setSysMessage(null)
    try {
      const picked = sysList.filter((e) => sysKeep.has(sysKey(e)))
      const result: SystemCredentialImportResult = await window.api.credentials.importFromSystemPasswords(picked)
      const denied = result.results.filter((r) => r.status === "denied").length
      const notFound = result.results.filter((r) => r.status === "not_found").length
      const skipped = result.results.filter((r) => r.status === "skipped" || r.status === "no_password" || r.status === "unsupported").length
      const parts: string[] = [`Imported ${result.imported}`]
      if (denied > 0) parts.push(`${denied} denied`)
      if (notFound > 0) parts.push(`${notFound} not found`)
      if (skipped > 0) parts.push(`${skipped} skipped`)
      flashOk(parts.join(" · "))
      setSysList(null)
      setSysKeep(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSysBusy(false)
    }
  }
  const cancelSystem = () => { setSysList(null); setSysKeep(new Set()); setSysMessage(null); setError(null) }

  const filtered = !creds ? [] : filter.trim()
    ? creds.filter((c) =>
        c.origin.toLowerCase().includes(filter.toLowerCase()) ||
        c.username.toLowerCase().includes(filter.toLowerCase()))
    : creds

  // Group stored creds by origin so the per-site model is visible at a glance.
  const grouped = new Map<string, SavedCredential[]>()
  for (const c of filtered) {
    const arr = grouped.get(c.origin) ?? []
    arr.push(c)
    grouped.set(c.origin, arr)
  }

  return (
    <section>
      <SectionHeader
        label="Passwords"
        hint="Import a CSV from your old browser, then pick per-site which entries to keep. Encrypted via your OS keychain."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 space-y-3">
        {sysList ? (
          <div className="space-y-2">
            <p className="text-[12px] text-chrome-text-2 leading-relaxed">
              {sysList.length} entr{sysList.length === 1 ? "y" : "ies"} found in your system keychain.
              Picking one and clicking Import will trigger the OS access-prompt the first time —
              click <span className="text-chrome-text">Always Allow</span> there to skip future prompts for that item.
            </p>
            <div className="max-h-[260px] overflow-y-auto -mx-1 px-1 space-y-1">
              {sysList.map((e) => {
                const key = sysKey(e)
                const checked = sysKeep.has(key)
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleSysRow(key)}
                    className={[
                      "w-full text-left rounded-xl border px-2.5 py-2 flex items-center gap-2.5 transition-colors",
                      checked
                        ? "bg-signal/10 border-signal/40"
                        : "bg-chrome-surface-2 border-chrome-border hover:border-chrome-text-3",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-3.5 w-3.5 rounded shrink-0 border flex items-center justify-center",
                        checked ? "bg-signal border-signal" : "border-chrome-border",
                      ].join(" ")}
                    >
                      {checked && <span className="text-[hsl(240_8%_8%)] text-[9px] leading-none">✓</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] text-chrome-text truncate">{e.username}</p>
                      <p className="font-mono text-[10.5px] text-chrome-text-3 truncate">{e.origin}</p>
                    </div>
                    {e.alreadyImported && (
                      <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-chrome-text-3 shrink-0">
                        replaces existing
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {error && <p role="alert" className="font-mono text-[11px] text-[hsl(0_70%_72%)]">{error}</p>}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={cancelSystem}
                className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text transition-colors"
              >Cancel</button>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] tracking-[0.08em] text-chrome-text-3">
                  {sysKeep.size} selected
                </span>
                <button
                  type="button"
                  onClick={commitSystem}
                  disabled={sysBusy || sysKeep.size === 0}
                  className="h-8 px-4 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >{sysBusy ? "Importing…" : `Import ${sysKeep.size}`}</button>
              </div>
            </div>
          </div>
        ) : preview ? (
          <div className="space-y-2">
            <p className="text-[12px] text-chrome-text-2 leading-relaxed">
              {preview.rows.length} row{preview.rows.length === 1 ? "" : "s"} parsed
              {preview.rejected > 0 ? `, ${preview.rejected} rejected (missing url or username)` : ""}.
              Toggle which to import — nothing is saved until you commit.
            </p>
            <div className="max-h-[260px] overflow-y-auto -mx-1 px-1 space-y-1">
              {preview.rows.map((r) => {
                const checked = keep.has(r.index)
                return (
                  <button
                    type="button"
                    key={r.index}
                    onClick={() => toggleRow(r.index)}
                    className={[
                      "w-full text-left rounded-xl border px-2.5 py-2 flex items-center gap-2.5 transition-colors",
                      checked
                        ? "bg-signal/10 border-signal/40"
                        : "bg-chrome-surface-2 border-chrome-border hover:border-chrome-text-3",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-3.5 w-3.5 rounded shrink-0 border flex items-center justify-center",
                        checked ? "bg-signal border-signal" : "border-chrome-border",
                      ].join(" ")}
                    >
                      {checked && <span className="text-[hsl(240_8%_8%)] text-[9px] leading-none">✓</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] text-chrome-text truncate">{r.username}</p>
                      <p className="font-mono text-[10.5px] text-chrome-text-3 truncate">
                        {r.origin} <span className="text-chrome-border">·</span> {r.passwordHint || "no password"}
                      </p>
                    </div>
                    {r.alreadyExists && (
                      <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-chrome-text-3 shrink-0">
                        replaces existing
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {error && <p role="alert" className="font-mono text-[11px] text-[hsl(0_70%_72%)]">{error}</p>}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={cancel}
                className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text transition-colors"
              >Cancel</button>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] tracking-[0.08em] text-chrome-text-3">
                  {keep.size} selected
                </span>
                <button
                  type="button"
                  onClick={commit}
                  disabled={busy || keep.size === 0}
                  className="h-8 px-4 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >{busy ? "Importing…" : `Import ${keep.size}`}</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-chrome-text-2 leading-relaxed min-w-0">
                {creds === null
                  ? "Loading…"
                  : creds.length === 0
                    ? "No saved credentials yet. Import a CSV from Chrome / Brave / Edge / Firefox / Safari, or pull from your macOS Keychain."
                    : `${creds.length} credential${creds.length === 1 ? "" : "s"} across ${grouped.size} site${grouped.size === 1 ? "" : "s"}.`}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={pickFromSystem}
                  className="h-8 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-chrome-text text-[11.5px] font-medium hover:border-signal/60 transition-colors"
                  title="Read web passwords from your system keychain (macOS today; Windows + Linux soon). OS prompts per-item the first time."
                >From system keychain</button>
                <button
                  type="button"
                  onClick={pick}
                  className="h-8 px-3 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[11.5px] font-medium hover:opacity-90 transition-opacity"
                >Import CSV…</button>
              </div>
            </div>
            {sysMessage && (
              <p role="status" className="font-mono text-[10.5px] tracking-[0.04em] text-chrome-text-3">
                {sysMessage}
              </p>
            )}

            {creds && creds.length > 0 && (
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by site or username"
                className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/60 transition-colors"
              />
            )}

            {creds && creds.length > 0 && (
              <div className="max-h-[260px] overflow-y-auto -mx-1 px-1 space-y-2">
                {[...grouped.entries()].map(([origin, group]) => (
                  <div key={origin} className="rounded-xl border border-chrome-border bg-chrome-surface-2 p-2.5">
                    <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 truncate mb-1.5">
                      {origin}
                    </p>
                    <ul className="space-y-1">
                      {group.map((c) => (
                        <li key={c.id} className="flex items-center gap-2">
                          <span className={["h-1.5 w-1.5 rounded-full shrink-0", c.hasPassword ? "bg-signal" : "bg-chrome-text-3"].join(" ")} />
                          <span className="text-[12px] text-chrome-text truncate flex-1">{c.username}</span>
                          {!c.hasPassword && (
                            <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-chrome-text-3">no password</span>
                          )}
                          <button
                            type="button"
                            onClick={() => remove(c.id)}
                            className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-[hsl(0_70%_72%)] transition-colors"
                          >Remove</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {error && <p role="alert" className="font-mono text-[11px] text-[hsl(0_70%_72%)]">{error}</p>}
            {okFlash && (
              <p role="status" className="font-mono text-[10.5px] tracking-[0.08em] uppercase text-signal">
                {okFlash}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

// ── Default browser ─────────────────────────────────────────────────
// macOS: app.setAsDefaultProtocolClient does the registration; the OS
// honours it as a candidate in System Settings → Desktop & Dock →
// Default web browser. Windows: there's no programmatic "make me
// default" since Win10 — we open the Settings → Default apps pane and
// the user finishes the swap there. Linux: best-effort link.
function DefaultBrowserSection() {
  const [isDefault, setIsDefault] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [okFlash, setOkFlash] = useState<string | null>(null)
  useEffect(() => {
    void window.api.defaultBrowser.isDefault().then(setIsDefault)
  }, [])
  const make = async () => {
    setBusy(true)
    try {
      const ok = await window.api.defaultBrowser.setDefault()
      setIsDefault(ok)
      if (ok) {
        setOkFlash("Registered with the OS. Confirm in your system settings.")
        setTimeout(() => setOkFlash(null), 4200)
      }
    } finally { setBusy(false) }
  }
  return (
    <section>
      <SectionHeader
        label="Default browser"
        hint="Register Delta as a handler for http + https links system-wide."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] text-chrome-text leading-snug">
            {isDefault === null ? "Checking…" : isDefault ? "Delta is the default." : "Delta is not the default."}
          </p>
          <p className="text-[11px] text-chrome-text-3 mt-0.5 leading-relaxed">
            macOS confirms in System Settings → Desktop &amp; Dock. Windows opens the
            Default apps pane — you finish the swap there. Linux is best-effort.
          </p>
          {okFlash && (
            <p role="status" className="mt-1.5 font-mono text-[10.5px] tracking-[0.08em] uppercase text-signal">
              {okFlash}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={make}
          disabled={busy || isDefault === true}
          className="h-8 px-3 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[11.5px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >{isDefault === true ? "✓ Default" : busy ? "Working…" : "Make default"}</button>
      </div>
    </section>
  )
}

// ── Unpacked Chrome extensions ──────────────────────────────────────
// Point at an unpacked extension folder; we hand it to
// session.loadExtension on boot. MV3 content scripts, themes, action
// popups, devtools panels work. Anything that calls chrome.identity /
// chrome.cookies / Chrome Sync won't — Electron doesn't ship those
// runtimes. The UI shows the manifest's name + version + load state
// + lastError, with reload and remove affordances.
function ExtensionsSection() {
  const [list, setList] = useState<ExtensionEntry[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void window.api.extensions.list().then(setList)
    return window.api.extensions.onChange(setList)
  }, [])
  const add = async () => {
    setBusy(true); setError(null)
    try {
      await window.api.extensions.pickAndAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally { setBusy(false) }
  }
  const reload = (id: string) => void window.api.extensions.reload(id)
  const remove = (id: string) => void window.api.extensions.remove(id)
  return (
    <section>
      <SectionHeader
        label="Extensions"
        hint="Point at an unpacked extension folder. MV3 content scripts, themes, action popups, devtools panels all work."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-chrome-text-2 leading-relaxed min-w-0">
            {list === null
              ? "Loading…"
              : list.length === 0
                ? "No extensions yet. Pick the folder that contains the extension's manifest.json."
                : `${list.length} extension${list.length === 1 ? "" : "s"} loaded for this session.`}
          </p>
          <button
            type="button"
            onClick={add}
            disabled={busy}
            className="h-8 px-3 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[11.5px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
          >{busy ? "Picking…" : "Add unpacked…"}</button>
        </div>
        {list && list.length > 0 && (
          <ul className="space-y-1.5">
            {list.map((e) => (
              <li key={e.id} className="rounded-xl border border-chrome-border bg-chrome-surface-2 p-2.5">
                <div className="flex items-start gap-3">
                  <span
                    title={e.loaded ? "Loaded" : "Not loaded"}
                    className={["h-1.5 w-1.5 rounded-full shrink-0 mt-1.5", e.loaded ? "bg-signal" : "bg-chrome-text-3"].join(" ")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] text-chrome-text leading-snug truncate">
                      {e.name ?? "(missing name)"} {e.version && <span className="text-chrome-text-3">· v{e.version}</span>}
                    </p>
                    <p className="font-mono text-[10.5px] text-chrome-text-3 truncate">{e.path}</p>
                    {e.lastError && (
                      <p className="font-mono text-[10.5px] text-[hsl(0_70%_72%)] mt-0.5">err: {e.lastError}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => reload(e.id)}
                      className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
                    >Reload</button>
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-[hsl(0_70%_72%)] transition-colors"
                    >Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && <p role="alert" className="font-mono text-[11px] text-[hsl(0_70%_72%)]">{error}</p>}
        <p className="text-[11px] text-chrome-text-3 leading-relaxed">
          Heads-up: Electron's chrome.* runtime is partial. Content scripts,
          themes, popups, devtools panels work. <code className="font-mono">chrome.identity</code>,
          <code className="font-mono"> chrome.cookies</code>, and Chrome Sync don't.
        </p>
      </div>
    </section>
  )
}

// ── Scheduled tasks (local cron-of-one) ─────────────────────────────
// Three action types ship today: reminder (native notification),
// openUrl (opens a tab at a URL — pairs with "be on this booking page
// at 9:00"), agent (kicks off an agent prompt; once click/type land
// this is "book it for me"). Triggers: oneShot at an ISO timestamp,
// or every-N-minutes. Persisted in userData/schedules.json; the main
// scheduler re-arms after every fire and survives long sleeps by
// recomputing the next slot ahead of `now`.
function ScheduledTasksSection() {
  const [tasks, setTasks] = useState<ScheduledTask[] | null>(null)
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    void window.api.schedules.list().then(setTasks)
    return window.api.schedules.onChange(setTasks)
  }, [])

  const del = (id: string) => void window.api.schedules.delete(id)
  const togglePause = (t: ScheduledTask) =>
    void window.api.schedules.update(t.id, { enabled: !t.enabled })
  const runNow = (id: string) => void window.api.schedules.runNow(id)

  return (
    <section>
      <SectionHeader
        label="Scheduled tasks"
        hint="Time-triggered reminders, page opens, or agent runs. Local-only — your machine's clock is the trigger."
      />
      <div className="rounded-2xl border border-chrome-border bg-chrome-surface p-3 space-y-3">
        {tasks === null ? (
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3">loading…</p>
        ) : tasks.length === 0 && !creating ? (
          <p className="text-[12px] text-chrome-text-2 leading-relaxed">
            Nothing scheduled. Add a reminder, queue a URL to open at a time,
            or set the agent to run a prompt on a schedule.
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks?.map((t) => (
              <ScheduledTaskRow
                key={t.id}
                task={t}
                onTogglePause={() => togglePause(t)}
                onDelete={() => del(t.id)}
                onRunNow={() => runNow(t.id)}
              />
            ))}
          </ul>
        )}
        {creating ? (
          <ScheduledTaskComposer
            onCancel={() => setCreating(false)}
            onCreated={() => setCreating(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
          >
            + Schedule something →
          </button>
        )}
      </div>
    </section>
  )
}

function ScheduledTaskRow({
  task, onTogglePause, onDelete, onRunNow,
}: {
  task: ScheduledTask
  onTogglePause: () => void
  onDelete: () => void
  onRunNow: () => void
}) {
  const next = task.nextRunAt ? new Date(task.nextRunAt) : null
  const triggerSummary =
    task.trigger.kind === "oneShot"
      ? `once · ${formatDateShort(new Date(task.trigger.at))}`
      : `every ${task.trigger.minutes}m`
  return (
    <li className="rounded-xl border border-chrome-border bg-chrome-surface-2 p-2.5">
      <div className="flex items-start gap-3">
        <span
          title={task.enabled ? "Enabled" : "Paused"}
          className={["h-1.5 w-1.5 rounded-full shrink-0 mt-1.5", task.enabled ? "bg-signal" : "bg-chrome-text-3"].join(" ")}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] text-chrome-text leading-snug truncate">{task.label}</p>
          <p className="text-[11px] text-chrome-text-3 mt-0.5 leading-relaxed">
            <span className="font-mono">{actionKindLabel(task.action)}</span>
            <span className="mx-1.5 text-chrome-border">·</span>
            <span className="font-mono">{triggerSummary}</span>
            {task.enabled && next && (
              <>
                <span className="mx-1.5 text-chrome-border">·</span>
                <span className="font-mono">next {formatDateShort(next)}</span>
              </>
            )}
            {task.lastError && (
              <>
                <span className="mx-1.5 text-chrome-border">·</span>
                <span className="text-[hsl(0_70%_72%)]">err: {task.lastError}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRunNow}
            title="Fire this task now without disturbing the schedule"
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-signal transition-colors"
          >Run</button>
          <button
            type="button"
            onClick={onTogglePause}
            title={task.enabled ? "Pause" : "Resume"}
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text transition-colors"
          >{task.enabled ? "Pause" : "Resume"}</button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete this task"
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-[hsl(0_70%_72%)] transition-colors"
          >Delete</button>
        </div>
      </div>
    </li>
  )
}

function ScheduledTaskComposer({
  onCancel, onCreated,
}: {
  onCancel: () => void
  onCreated: () => void
}) {
  const [actionKind, setActionKind] = useState<ScheduledTaskAction["kind"]>("reminder")
  const [triggerKind, setTriggerKind] = useState<ScheduledTaskTrigger["kind"]>("oneShot")
  const [label, setLabel] = useState("")
  // Action fields — only one set is used at a time, based on actionKind.
  const [reminderTitle, setReminderTitle] = useState("")
  const [reminderBody, setReminderBody] = useState("")
  const [url, setUrl] = useState("")
  const [prompt, setPrompt] = useState("")
  // Trigger fields.
  const [whenLocal, setWhenLocal] = useState(() => defaultLocalDatetime())
  const [everyMinutes, setEveryMinutes] = useState(30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const build = (): ScheduledTaskInput => {
    const trigger: ScheduledTaskTrigger =
      triggerKind === "oneShot"
        ? { kind: "oneShot", at: new Date(whenLocal).toISOString() }
        : { kind: "every", minutes: Math.max(1, Math.floor(everyMinutes)) }
    const action: ScheduledTaskAction =
      actionKind === "reminder"
        ? { kind: "reminder", title: reminderTitle.trim(), body: reminderBody.trim() || undefined }
        : actionKind === "openUrl"
        ? { kind: "openUrl", url: url.trim() }
        : { kind: "agent", prompt: prompt.trim() }
    return { label: label.trim(), trigger, action }
  }

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await window.api.schedules.create(build())
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pl-3 border-l-2 border-chrome-border ml-1 space-y-2.5">
      <div className="grid grid-cols-3 gap-1.5 rounded-full border border-chrome-border bg-chrome-surface-2 p-1">
        {([
          { k: "reminder", label: "Reminder" },
          { k: "openUrl",  label: "Open URL" },
          { k: "agent",    label: "Agent" },
        ] as const).map(({ k, label: l }) => (
          <button
            key={k}
            type="button"
            onClick={() => { setActionKind(k); setError(null) }}
            className={[
              "h-7 rounded-full text-[11.5px] transition-colors",
              actionKind === k
                ? "bg-chrome-bg text-chrome-text border border-chrome-border"
                : "text-chrome-text-3 hover:text-chrome-text-2",
            ].join(" ")}
          >{l}</button>
        ))}
      </div>

      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (optional)"
        className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text placeholder:text-chrome-text-3 font-mono focus:outline-none focus:border-signal/60 transition-colors"
      />

      {actionKind === "reminder" && (
        <>
          <input
            type="text"
            value={reminderTitle}
            onChange={(e) => setReminderTitle(e.target.value)}
            placeholder="Reminder title (e.g. Drink water)"
            className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/60 transition-colors"
          />
          <input
            type="text"
            value={reminderBody}
            onChange={(e) => setReminderBody(e.target.value)}
            placeholder="Body (optional)"
            className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/60 transition-colors"
          />
        </>
      )}
      {actionKind === "openUrl" && (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.opentable.com/booking/..."
          className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text placeholder:text-chrome-text-3 font-mono focus:outline-none focus:border-signal/60 transition-colors"
        />
      )}
      {actionKind === "agent" && (
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Agent prompt (e.g. 'Check today's news and summarise')"
          className="w-full px-3 py-2 rounded-2xl bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text placeholder:text-chrome-text-3 focus:outline-none focus:border-signal/60 transition-colors resize-none"
        />
      )}

      <div className="grid grid-cols-2 gap-1.5 rounded-full border border-chrome-border bg-chrome-surface-2 p-1">
        {([
          { k: "oneShot", label: "Once at…" },
          { k: "every",   label: "Every N min" },
        ] as const).map(({ k, label: l }) => (
          <button
            key={k}
            type="button"
            onClick={() => { setTriggerKind(k); setError(null) }}
            className={[
              "h-7 rounded-full text-[11.5px] transition-colors",
              triggerKind === k
                ? "bg-chrome-bg text-chrome-text border border-chrome-border"
                : "text-chrome-text-3 hover:text-chrome-text-2",
            ].join(" ")}
          >{l}</button>
        ))}
      </div>

      {triggerKind === "oneShot" ? (
        <input
          type="datetime-local"
          value={whenLocal}
          onChange={(e) => setWhenLocal(e.target.value)}
          className="w-full h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text font-mono focus:outline-none focus:border-signal/60 transition-colors"
        />
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] text-chrome-text-2">Every</span>
          <input
            type="number"
            min={1}
            value={everyMinutes}
            onChange={(e) => setEveryMinutes(Number(e.target.value) || 1)}
            className="w-20 h-9 px-3 rounded-full bg-chrome-surface-2 border border-chrome-border text-[12.5px] text-chrome-text font-mono text-center focus:outline-none focus:border-signal/60 transition-colors"
          />
          <span className="text-[11.5px] text-chrome-text-2">minutes</span>
        </div>
      )}

      {error && <p role="alert" className="font-mono text-[11px] text-[hsl(0_70%_72%)]">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-[10px] tracking-[0.12em] uppercase text-chrome-text-3 hover:text-chrome-text transition-colors"
        >Cancel</button>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="h-8 px-4 rounded-full bg-signal text-[hsl(240_8%_8%)] text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >{busy ? "Saving…" : "Schedule it"}</button>
      </div>
    </div>
  )
}

function actionKindLabel(a: ScheduledTaskAction): string {
  switch (a.kind) {
    case "reminder": return "reminder"
    case "openUrl":  return "open url"
    case "agent":    return "agent"
  }
}

function formatDateShort(d: Date): string {
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 86_400_000)
  const hhmm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (same(d, now)) return `today ${hhmm}`
  if (same(d, tomorrow)) return `tomorrow ${hhmm}`
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${hhmm}`
}

// HTML <input type="datetime-local"> wants `YYYY-MM-DDTHH:MM` in the
// user's local zone (no Z suffix). Default: 15 minutes from now, rounded
// down to the minute. Trims seconds + ms so the field looks tidy.
function defaultLocalDatetime(): string {
  const d = new Date(Date.now() + 15 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
