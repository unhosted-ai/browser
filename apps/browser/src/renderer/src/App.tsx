import { useEffect, useState } from "react"
import type { ProviderInfo, TabsState } from "@shared/types"
import { TabStrip } from "./components/TabStrip"
import { AddressBar } from "./components/AddressBar"
import { Sidebar } from "./components/Sidebar"
import { useTheme } from "./hooks/useTheme"

const SIDEBAR_WIDTH = 360

export function App() {
  const [state, setState] = useState<TabsState>({ tabs: [], activeId: null })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const { theme, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    void window.api.tabs.list().then(setState)
    const off = window.api.tabs.onUpdate(setState)
    void window.api.providers.list().then(setProviders)
    return off
  }, [])

  useEffect(() => {
    void window.api.layout.setSidebarOpen(sidebarOpen)
  }, [sidebarOpen])

  const active = state.tabs.find((t) => t.id === state.activeId) ?? null

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
          tab={active}
          onNavigate={(url) => active && window.api.tabs.navigate(active.id, url)}
          onBack={() => active && window.api.tabs.back(active.id)}
          onForward={() => active && window.api.tabs.forward(active.id)}
          onReload={() => active && window.api.tabs.reload(active.id)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          theme={theme}
          onToggleTheme={toggleTheme}
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
      </div>
    </div>
  )
}
