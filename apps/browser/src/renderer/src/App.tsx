import { useEffect, useRef, useState } from "react"
import type { ProviderInfo, TabsState } from "@shared/types"
import { TabStrip } from "./components/TabStrip"
import { AddressBar, type AddressBarHandle } from "./components/AddressBar"
import { Sidebar } from "./components/Sidebar"
import { SettingsPanel } from "./components/SettingsPanel"
import { useTheme } from "./hooks/useTheme"

const SIDEBAR_WIDTH = 360

export function App() {
  const [state, setState] = useState<TabsState>({ tabs: [], activeId: null })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const { theme, toggle: toggleTheme } = useTheme()
  const addressBarRef = useRef<AddressBarHandle>(null)

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

  useEffect(() => {
    void window.api.layout.setSidebarOpen(sidebarOpen)
  }, [sidebarOpen])

  const active = state.tabs.find((t) => t.id === state.activeId) ?? null

  // Keyboard shortcuts — kept in the renderer (DOM listener) for v1 to avoid
  // round-tripping through the OS menu bar; can move to Electron Menu later
  // if we want them to also appear under macOS menus.
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
        setSidebarOpen((v) => !v)
      } else if (e.key === ",") {
        e.preventDefault()
        setSettingsOpen(true)
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
    <div className="h-full w-full flex flex-col bg-chrome-bg text-chrome-text font-sans">
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
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </header>

      {/* The space below the chrome is owned by the WebContentsView (page content)
          and the React sidebar. The page content is positioned absolutely by main;
          we only render the sidebar here so it composites above the WebContentsView. */}
      <div className="relative flex-1">
        {sidebarOpen && (
          <aside
            className="absolute right-0 top-0 bottom-0 border-l border-chrome-border bg-chrome-surface no-drag"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <Sidebar
              providers={providers}
              onRefresh={refreshProviders}
              activeUrl={active?.url ?? null}
              activeTitle={active?.title ?? null}
            />
          </aside>
        )}
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </div>
  )
}
