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
        signal: {
          DEFAULT: "hsl(47 78% 60%)",
          dim:     "hsl(45 55% 27%)",
          trace:   "hsl(240 8% 13%)",
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
