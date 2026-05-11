import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import type { ProviderInfo, TabsState } from "@shared/types"
import { TabStrip } from "./components/TabStrip"
import { AddressBar, type AddressBarHandle } from "./components/AddressBar"
import { Sidebar } from "./components/Sidebar"
import { SettingsPanel } from "./components/SettingsPanel"
import { FindBar } from "./components/FindBar"
import { ChromeMenu } from "./components/ChromeMenu"
import { Onboarding, useOnboardingState } from "./components/Onboarding"
import {
  LeftNavSidebar,
  LEFT_NAV_WIDTH_FULL,
  LEFT_NAV_WIDTH_RAIL,
} from "./components/LeftNavSidebar"

const SIDEBAR_WIDTH  = 360
const SETTINGS_WIDTH = 420

export function App() {
  const [state, setState] = useState<TabsState>({ tabs: [], activeId: null })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarHistoryOpen, setSidebarHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  // Seed for the Sidebar composer when the address-bar `?` ask mode
  // forwards a question (⌘↩ "continue in Assistant"). The key bumps each
  // time so re-seeding the same text still works.
  const [assistantSeed, setAssistantSeed] = useState<{ text: string; key: string } | null>(null)
  const [leftNavCollapsed, setLeftNavCollapsed] = useState(() => {
    try { return localStorage.getItem("delta:leftNavCollapsed") === "1" } catch { return false }
  })
  const addressBarRef = useRef<AddressBarHandle>(null)
  const leftNavWidth = leftNavCollapsed ? LEFT_NAV_WIDTH_RAIL : LEFT_NAV_WIDTH_FULL
  // First-launch welcome card. Reads localStorage synchronously on mount —
  // we want zero flash before the card paints.
  const onboarding = useOnboardingState()
  const [showOnboarding, setShowOnboarding] = useState(onboarding.open)
  const dismissOnboarding = () => { onboarding.dismiss(); setShowOnboarding(false) }

  useEffect(() => {
    void window.api.tabs.list().then(setState)
    const off = window.api.tabs.onUpdate(setState)
    void window.api.providers.list().then(setProviders)
    // Re-probe providers whenever settings change — a new key or endpoint
    // can flip a provider from offline → online.
    const offSettings = window.api.settings.onChange(() => {
      void window.api.providers.refresh().then(setProviders)
    })
    return () => { off(); offSettings() }
  }, [])

  // Right-side reservation = max width of any open right-overlay panel, so
  // the WebContentsView never paints under the AI sidebar OR the settings
  // panel. (Without this, settings was drawn behind the page content.)
  useEffect(() => {
    const right = Math.max(
      sidebarOpen  ? SIDEBAR_WIDTH  : 0,
      settingsOpen ? SETTINGS_WIDTH : 0,
    )
    void window.api.layout.setRightReservation(right)
  }, [sidebarOpen, settingsOpen])

  // While Settings is open, poll providers every 4s so newly-started local
  // LLMs (Ollama, LM Studio, llama.cpp, MLX) appear without the user having
  // to click Refresh. Mirrors the Sidebar's poll, but on a different surface.
  useEffect(() => {
    if (!settingsOpen) return
    const id = setInterval(() => { void window.api.providers.refresh().then(setProviders) }, 4000)
    return () => clearInterval(id)
  }, [settingsOpen])

  // Settings + Assistant sidebar are mutually exclusive — they both anchor
  // right:0 and would otherwise stack invisibly. Opening one closes the
  // other. ("Chat didn't open when I clicked AI" was this.)
  const openSettings = () => { setSidebarOpen(false);  setSettingsOpen(true) }
  const openAssistant = () => { setSettingsOpen(false); setSidebarOpen(true) }
  // Same path as openSettings, plus a deferred scroll to the Privacy
  // section. Used by the address-bar shield and the newtab chip.
  const openPrivacySettings = () => {
    openSettings()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("privacy-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    })
  }
  const openHistory = () => {
    setSettingsOpen(false)
    setSidebarOpen(true)
    setSidebarHistoryOpen(true)
  }
  const toggleAssistant = () => {
    if (sidebarOpen) { setSidebarOpen(false); return }
    setSettingsOpen(false); setSidebarOpen(true)
  }
  // Cog and Customize toggle (click again to close). Users expect this from
  // every other app's settings affordance.
  const toggleSettings = () => {
    if (settingsOpen) { setSettingsOpen(false); return }
    setSidebarOpen(false); setSettingsOpen(true)
  }

  // Reserve the left-nav width in the WebContentsView layout, and persist
  // the collapsed state so it survives reloads.
  useEffect(() => {
    void window.api.layout.setLeftNavWidth(leftNavWidth)
    try { localStorage.setItem("delta:leftNavCollapsed", leftNavCollapsed ? "1" : "0") } catch {}
  }, [leftNavWidth, leftNavCollapsed])

  const active = state.tabs.find((t) => t.id === state.activeId) ?? null

  // Native menu actions — fire even when focus is inside a WebContentsView
  // (which the renderer-side keydown handler can't see).
  useEffect(() => {
    return window.api.menu.onAction((kind) => {
      switch (kind) {
        case "focusAddressBar":  addressBarRef.current?.selectAll(); break
        case "openSettings":     openSettings();                     break
        case "openPrivacySettings": openPrivacySettings();          break
        case "toggleAssistant":  toggleAssistant();                  break
        case "openFind":         setFindOpen(true);                  break
      }
    })
  }, [])

  // Renderer-side keyboard shortcuts. The menu owns the same accelerators
  // for parity, but these handle the DOM-only state changes that would
  // otherwise need a round-trip through main.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key === "t" && !e.shiftKey) {
        e.preventDefault()
        void window.api.tabs.create()
      } else if (e.key === "w" && !e.shiftKey) {
        if (state.activeId) {
          e.preventDefault()
          void window.api.tabs.close(state.activeId)
        }
      } else if (e.key === "l" || (e.key === "k" && e.shiftKey === false)) {
        e.preventDefault()
        addressBarRef.current?.selectAll()
      } else if (e.key === "r" && !e.shiftKey) {
        if (state.activeId) {
          e.preventDefault()
          void window.api.tabs.reload(state.activeId)
        }
      } else if (e.key === "j") {
        e.preventDefault()
        toggleAssistant()
      } else if (e.key === ",") {
        e.preventDefault()
        openSettings()
      } else if (e.key === "[" && state.activeId) {
        e.preventDefault()
        void window.api.tabs.back(state.activeId)
      } else if (e.key === "]" && state.activeId) {
        e.preventDefault()
        void window.api.tabs.forward(state.activeId)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [state.activeId])

  const refreshProviders = async () => {
    setProviders(await window.api.providers.refresh())
  }

  return (
    <div className="h-full w-full flex flex-row bg-chrome-bg text-chrome-text font-sans">
      <LeftNavSidebar
        collapsed={leftNavCollapsed}
        onToggleCollapsed={() => setLeftNavCollapsed((v) => !v)}
        onNewTab={() => window.api.tabs.create()}
        onOpenSettings={toggleSettings}
        onOpenHistory={openHistory}
      />

      {/* Main column — chrome + content area. Sits to the right of the
          left nav; main/tabs.ts subtracts the same width when positioning
          the active WebContentsView. */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Chrome strip — 80px tall, matches CHROME_TOP in main/tabs.ts */}
        <header className="drag h-[80px] flex flex-col border-b border-chrome-border">
          <TabStrip
            tabs={state.tabs}
            activeId={state.activeId}
            onActivate={(id) => window.api.tabs.activate(id)}
            onClose={(id) => window.api.tabs.close(id)}
            onCreate={() => window.api.tabs.create()}
          />
          <AddressBar
            ref={addressBarRef}
            tab={active}
            onNavigate={(url) => active && window.api.tabs.navigate(active.id, url)}
            onBack={() => active && window.api.tabs.back(active.id)}
            onForward={() => active && window.api.tabs.forward(active.id)}
            onReload={() => active && window.api.tabs.reload(active.id)}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleAssistant}
            settingsOpen={settingsOpen}
            onOpenSettings={toggleSettings}
            onOpenPrivacy={openPrivacySettings}
            menuOpen={menuOpen}
            onToggleMenu={() => setMenuOpen((v) => !v)}
            onContinueInAssistant={(text) => {
              setAssistantSeed({ text, key: crypto.randomUUID() })
              openAssistant()
            }}
          />
        </header>

        {/* The space below the chrome is owned by the WebContentsView (page content)
            and the React sidebar. The page content is positioned absolutely by main;
            we only render the sidebar here so it composites above the WebContentsView. */}
        <div className="relative flex-1">
          {/* Sidebar — slides in from the right with a gentle decelerate
              curve. AnimatePresence keeps the unmount visible for the exit
              transition. */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.aside
                key="sidebar"
                initial={{ x: SIDEBAR_WIDTH, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: SIDEBAR_WIDTH, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                className="absolute right-0 top-0 bottom-0 border-l border-chrome-border bg-chrome-surface no-drag"
                style={{ width: SIDEBAR_WIDTH }}
              >
                <Sidebar
                  providers={providers}
                  onRefresh={refreshProviders}
                  activeUrl={active?.url ?? null}
                  activeTitle={active?.title ?? null}
                  onOpenSettings={openSettings}
                  historyOpen={sidebarHistoryOpen}
                  onHistoryOpenChange={setSidebarHistoryOpen}
                  seedDraft={assistantSeed}
                />
              </motion.aside>
            )}
          </AnimatePresence>
          <SettingsPanel
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            providers={providers}
            onRefreshProviders={refreshProviders}
          />
          <FindBar open={findOpen} onClose={() => setFindOpen(false)} />
        </div>
      </div>

      {/* Chrome menu (☰) — anchored top-right at the chrome strip. Lives
          at the App root so it overlays the left nav and the WebContentsView. */}
      <ChromeMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenUrl={(url) => { void window.api.tabs.create(url); setMenuOpen(false) }}
        onOpenSettings={() => { setMenuOpen(false); openSettings() }}
      />

      {/* Onboarding is a TRUE app-level overlay: rendered last in the tree
          so it's at the top of stacking order, and uses fixed inset-0 so it
          covers the chrome and the left nav (not just the content area).
          Earlier rendering inside `relative flex-1` only blocked the page
          area, which let users click the address-bar cog or LeftNav rows
          *behind* the welcome card and end up with two overlapping panels. */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-[60] no-drag"
          >
            <Onboarding
              onClose={dismissOnboarding}
              onOpenSettings={() => { openSettings(); dismissOnboarding() }}
              onToggleAssistant={() => { openAssistant(); dismissOnboarding() }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
