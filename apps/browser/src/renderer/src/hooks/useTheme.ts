// Three themes — reads/writes a single class on <html> and persists the
// user's choice in localStorage. The initial pick happens via an inline
// bootstrap script in index.html so we never paint a flash of the wrong
// palette; this hook just keeps state in sync after React mounts.
import { useCallback, useEffect, useState } from "react"

export type Theme = "dark" | "light" | "paper"

const STORAGE_KEY = "delta:theme"

function readInitial(): Theme {
  if (typeof document === "undefined") return "dark"
  // Trust whatever the bootstrap script put on <html>.
  const cl = document.documentElement.classList
  if (cl.contains("paper")) return "paper"
  if (cl.contains("light")) return "light"
  return "dark"
}

export function useTheme(): {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
} {
  const [theme, setThemeState] = useState<Theme>(readInitial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark",  theme === "dark")
    root.classList.toggle("light", theme === "light")
    root.classList.toggle("paper", theme === "paper")
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, [theme])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  // Cycle dark → light → paper → dark when the user taps a toggle.
  const toggle = useCallback(() => setThemeState(t =>
    t === "dark" ? "light" : t === "light" ? "paper" : "dark"
  ), [])
  return { theme, setTheme, toggle }
}
