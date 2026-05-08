import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/renderer/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        chrome: {
          bg:        "hsl(240 4% 5%)",
          surface:   "hsl(240 6% 9%)",
          "surface-2": "hsl(240 7% 11%)",
          border:    "hsl(240 6% 16%)",
          text:      "hsl(240 4% 93%)",
          "text-2":  "hsl(240 4% 57%)",
          "text-3":  "hsl(240 4% 38%)",
        },
        // Delta brand — mint green from the org mark
        signal: {
          DEFAULT: "hsl(135 55% 66%)",
          dim:     "hsl(135 30% 28%)",
          trace:   "hsl(240 8% 13%)",
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
