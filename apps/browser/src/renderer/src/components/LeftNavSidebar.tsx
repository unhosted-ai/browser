import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import type { Identity } from "@shared/types"
import { DeltaLogo } from "./DeltaLogo"

type Props = {
  collapsed: boolean
  onToggleCollapsed: () => void
  onNewTab: () => void
  onOpenSettings: () => void
  onOpenHistory: () => void
  /** Re-open the welcome / sign-in card so the user can switch modes. */
  onOpenSignIn: () => void
}

// Two widths — full and rail. Both end up reserved by main/tabs.ts so the
// WebContentsView never paints under the sidebar.
//
// Why 88 for the rail? The macOS hidden-inset traffic lights occupy ~78px
// from the window's left edge. Anything narrower and the lights spill past
// the rail into the tab strip, where they look like they're "hanging out"
// over the first tab. 88 leaves a small margin without the rail feeling
// chunky.
export const LEFT_NAV_WIDTH_FULL = 232
export const LEFT_NAV_WIDTH_RAIL = 88

// macOS hidden-inset traffic-light reservation. The traffic lights render
// at the OS layer in the top-left corner of the window — the sidebar's
// first 32px stay empty so they don't sit on top of nav buttons.
const TRAFFIC_LIGHT_RESERVATION = 32

export function LeftNavSidebar({ collapsed, onToggleCollapsed, onNewTab, onOpenSettings, onOpenHistory, onOpenSignIn }: Props) {
  const width = collapsed ? LEFT_NAV_WIDTH_RAIL : LEFT_NAV_WIDTH_FULL

  return (
    <aside
      className="drag relative h-full bg-chrome-bg border-r border-chrome-border flex flex-col select-none transition-[width] duration-150"
      style={{ width }}
    >
      {/* Drag-area reservation for the traffic lights */}
      <div style={{ height: TRAFFIC_LIGHT_RESERVATION }} />

      {/* Brand row */}
      <div className="no-drag px-3 pb-3 flex items-center justify-between">
        <div className={["flex items-baseline gap-2 min-w-0", collapsed ? "justify-center w-full" : ""].join(" ")}>
          <span className="text-signal shrink-0" style={{ transform: "translateY(2px)" }}>
            <DeltaLogo size={14} />
          </span>
          {!collapsed && (
            <span className="font-serif italic text-[16px] leading-none text-chrome-text truncate">
              Delta
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            aria-label="Collapse sidebar"
            title="Collapse"
            onClick={onToggleCollapsed}
            className="h-6 w-6 grid place-items-center rounded-md text-chrome-text-3 hover:text-chrome-text hover:bg-chrome-surface transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7 3L4 6l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Primary action — New tab */}
      <div className="no-drag px-3 mb-3">
        <button
          type="button"
          onClick={onNewTab}
          title={collapsed ? "New tab  ⌘T" : undefined}
          className={[
            "h-9 rounded-full flex items-center transition-colors duration-150",
            "border border-chrome-border bg-chrome-surface hover:bg-chrome-surface-2 hover:border-chrome-text-3",
            collapsed ? "w-9 justify-center" : "w-full px-3 gap-2",
          ].join(" ")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-chrome-text-2">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {!collapsed && (
            <>
              <span className="text-[13px] text-chrome-text">New tab</span>
              <span className="ml-auto font-mono text-[10px] text-chrome-text-3">⌘T</span>
            </>
          )}
        </button>
      </div>

      {/* Nav rows */}
      <nav className="no-drag flex-1 overflow-y-auto px-2 space-y-0.5">
        <NavRow
          collapsed={collapsed}
          icon={<IconSpaces />}
          label="Spaces"
          hint="Workspaces with their own tabs and conversations. Coming."
          disabled
        />
        <NavRow
          collapsed={collapsed}
          icon={<IconHistory />}
          label="History"
          shortcut="⌘J"
          onClick={onOpenHistory}
        />
        <NavRow
          collapsed={collapsed}
          icon={<IconSettings />}
          label="Customize"
          shortcut="⌘,"
          onClick={onOpenSettings}
        />
      </nav>

      {/* Footer — profile chip (per docs/identity.md, this is a local profile) */}
      <ProfileChip collapsed={collapsed} onOpenSignIn={onOpenSignIn} />

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          type="button"
          aria-label="Expand sidebar"
          title="Expand"
          onClick={onToggleCollapsed}
          className="no-drag absolute bottom-2 right-1 h-6 w-6 grid place-items-center rounded-md text-chrome-text-3 hover:text-chrome-text hover:bg-chrome-surface transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </aside>
  )
}

function NavRow({
  collapsed, icon, label, hint, shortcut, disabled, onClick,
}: {
  collapsed: boolean
  icon: React.ReactNode
  label: string
  hint?: string
  shortcut?: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={collapsed ? label : (disabled ? hint : undefined)}
      className={[
        "w-full h-8 rounded-md flex items-center text-[12px] transition-colors duration-150",
        collapsed ? "justify-center" : "px-2.5 gap-2",
        disabled
          ? "text-chrome-text-3 cursor-default"
          : "text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface",
      ].join(" ")}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {shortcut && <span className="font-mono text-[10px] text-chrome-text-3">{shortcut}</span>}
          {disabled && hint && (
            <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-chrome-text-3">soon</span>
          )}
        </>
      )}
    </button>
  )
}

function ProfileChip({ collapsed, onOpenSignIn }: { collapsed: boolean; onOpenSignIn: () => void }) {
  // Two states, one chip:
  //   - default: anonymous, no remote account (the original docs/identity.md design)
  //   - signed-in: a public handle from GitHub or Google, stored as a
  //     plain-JSON file on this device. There is still no remote
  //     account; this is personalisation only. Click the chip to open a
  //     small menu with "Sign out" — the only writable action.
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOk, setAvatarOk] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void window.api.identity.get().then((id) => { setIdentity(id); setAvatarOk(true) })
    return window.api.identity.onChange((id) => { setIdentity(id); setAvatarOk(true) })
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false) }
    const t = setTimeout(() => window.addEventListener("mousedown", onDown), 0)
    window.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  const signedIn = !!identity
  const initials = signedIn ? initialsFor(identity!.displayName) : "D"
  const tooltip = signedIn
    ? `${identity!.displayName} (${identity!.handle})\nProvider: ${identity!.provider}\nStored locally · no remote account · no sync`
    : "Default profile · stored locally on this device.\n" +
      "Delta has no account — your settings and history live on this machine."

  return (
    <div ref={ref} className="no-drag p-3 border-t border-chrome-border relative">
      <button
        type="button"
        title={tooltip}
        onClick={() => setMenuOpen((v) => !v)}
        className={[
          "rounded-full flex items-center transition-colors duration-150 hover:bg-chrome-surface",
          collapsed ? "h-8 w-8 justify-center" : "w-full h-9 px-1.5 gap-2",
        ].join(" ")}
      >
        {signedIn && identity!.avatarUrl && avatarOk ? (
          <img
            src={identity!.avatarUrl}
            alt=""
            onError={() => setAvatarOk(false)}
            className="h-7 w-7 rounded-full object-cover shrink-0 bg-chrome-surface"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="h-7 w-7 grid place-items-center rounded-full bg-signal/15 text-signal font-mono text-[11px] tracking-wide shrink-0"
            aria-hidden
          >{initials}</span>
        )}
        {!collapsed && (
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[12px] text-chrome-text truncate leading-tight">
              {signedIn ? identity!.displayName : "Default profile"}
            </p>
            <p className="font-mono text-[10px] tracking-[0.08em] text-chrome-text-3 leading-tight truncate">
              {signedIn ? `${identity!.handle} · local` : "local · no account"}
            </p>
          </div>
        )}
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="profile-menu"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{    opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.32, 0.72, 0, 1] }}
            style={{ transformOrigin: collapsed ? "bottom left" : "bottom left" }}
            className="absolute left-3 right-3 bottom-[58px] z-40 rounded-xl border border-chrome-border bg-chrome-bg shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] py-1 overflow-hidden"
          >
            {signedIn ? (
              <>
                <MenuRow
                  label="Sign out"
                  hint="Wipes the local identity file. Cookies + history stay."
                  destructive
                  onClick={async () => { await window.api.identity.signOut(); setMenuOpen(false) }}
                />
                <MenuRow
                  label="Sign out + clear cache"
                  hint="Local identity wipe + drop HTTP / image cache."
                  destructive
                  onClick={async () => {
                    await window.api.data.clear({ identity: true, cache: true })
                    setMenuOpen(false)
                  }}
                />
              </>
            ) : (
              <MenuRow
                label="Sign in with GitHub or Gmail"
                hint="Personalise this local profile. Nothing leaves your device."
                onClick={() => { setMenuOpen(false); onOpenSignIn() }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuRow({
  label, hint, destructive, onClick,
}: {
  label: string
  hint?: string
  destructive?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2 hover:bg-chrome-surface transition-colors",
        destructive ? "text-[hsl(0_70%_75%)] hover:text-[hsl(0_70%_82%)]" : "text-chrome-text",
      ].join(" ")}
    >
      <p className="text-[12px] leading-snug">{label}</p>
      {hint && <p className="font-mono text-[10px] text-chrome-text-3 mt-0.5 leading-tight">{hint}</p>}
    </button>
  )
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

// ── Icons (kept inline so the sidebar is self-contained) ─────────────────
function IconSpaces() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-chrome-text-2">
      <rect x="2" y="2" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.5" y="2" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}
function IconHistory() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-chrome-text-2">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4v3l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
function IconSettings() {
  // Toothed gear — distinct from the address-bar theme toggle's sun shape.
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-chrome-text-2">
      <path
        d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.5 7.5 0 0 0-1.69-.98l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.61.25-1.17.58-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64L4.57 11c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.68.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65a.5.5 0 0 0 .5.42h4a.5.5 0 0 0 .5-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.25.12.54.02.68-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05"
      />
    </svg>
  )
}
