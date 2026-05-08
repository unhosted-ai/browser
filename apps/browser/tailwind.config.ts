import type { Config } from "tailwindcss"

// Color tokens are sourced from CSS variables defined in renderer/src/index.css
// under :root.dark and :root.light — that's where the light/dark palettes live.
// We use the `<alpha-value>` placeholder so utilities like bg-chrome-border/60
// keep working under variable-driven colors.
const v = (name: string) => `hsl(var(--${name}) / <alpha-value>)`

const config: Config = {
  content: ["./src/renderer/**/*.{ts,tsx,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        chrome: {
          bg:          v("chrome-bg"),
          surface:     v("chrome-surface"),
          "surface-2": v("chrome-surface-2"),
          border:      v("chrome-border"),
          text:        v("chrome-text"),
          "text-2":    v("chrome-text-2"),
          "text-3":    v("chrome-text-3"),
        },
        // Delta brand — mint green from the org mark
        signal: {
          DEFAULT: v("signal"),
          dim:     v("signal-dim"),
          trace:   v("signal-trace"),
        },
      },
      fontFamily: {
        sans:  ['"Geist Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono:  ['"Geist Mono"', 'ui-monospace', 'Menlo', 'monospace'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
