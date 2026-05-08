# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js 16 + Turbopack)
npm run build        # Production build — use to verify zero errors
npm run lint         # ESLint
```

No test framework is configured.

## Architecture

This is an AI chatbot starter kit built on the **Vercel AI Gateway** — a zero-config proxy that routes to multiple AI providers (Anthropic, OpenAI, xAI, Google) without managing API keys directly. Deployed on Vercel, the OIDC token in `.env.local` is provisioned automatically.

### Data Flow

1. Client (`app/chat/page.tsx`) holds `AgentSettings` state (model, temperature, maxTokens, systemPrompt)
2. `useChat` from `@ai-sdk/react` with `DefaultChatTransport` sends messages + settings to `/api/chat`
3. Server route (`app/api/chat/route.ts`) calls `streamText()` with the gateway model ID (e.g. `anthropic/claude-opus-4.6`) and returns `toUIMessageStreamResponse()`
4. No database — all state is client-side

### Key Conventions

- **Dark-only theme**: `<html className="dark">` is hardcoded in `app/layout.tsx`. All design uses the dark CSS variables from `globals.css` (background: 0 0% 4%, foreground: 0 0% 96%, card: 0 0% 7%). Pure monochrome — no colors.
- **Fonts**: Inter (sans) + JetBrains Mono (mono), loaded via `next/font/google` in layout.tsx
- **CSS variables for colors**: Tailwind is configured to use HSL CSS custom properties (`bg-background`, `text-foreground`, `bg-card`, `border-border`, etc.) defined in `globals.css` and mapped in `tailwind.config.ts`
- **shadcn/ui**: Full component library in `components/ui/`. Standard shadcn/ui patterns — do not modify these files unless necessary.
- **`cn()` utility**: `lib/utils.ts` exports `cn()` (clsx + tailwind-merge) for conditional class merging
- **Model IDs**: Gateway format `provider/model-name` (e.g. `anthropic/claude-opus-4.6`). All models defined in `AVAILABLE_MODELS` in `lib/agent-settings.ts`.

### Component Organization

- `components/ui/` — shadcn/ui primitives (Button, Dialog, Select, Slider, etc.)
- `components/header.tsx` — Shared header with optional `breadcrumb` prop, desktop + full-screen mobile nav
- `components/agent-settings-dialog.tsx` — Modal for configuring model/temperature/prompt
- `components/marketing/` — Landing page sections and marketing assets:
  - `hero-carousel.tsx` — Auto-advancing carousel with interactive vignette slides
  - `feature-cards.tsx`, `tech-stack.tsx`, `explore-cards.tsx` — Homepage content sections
  - `feature-ticker.tsx` — Scrolling ticker strip with miniature UI preview cards
  - `thumbnail-chat.tsx`, `thumbnail-models.tsx`, `thumbnail-settings.tsx` — Interactive vignettes (shown in carousel)
  - `thumbnail-variant.tsx`, `thumbnail-v-{a,b,c,d}.tsx` — Big-word marketing thumbnails (1200x630, for screenshots)
  - `og-image.tsx`, `apple-touch-icon.tsx`, `favicon-icon.tsx` — Brand asset components
  - `brand-assets-strip.tsx` — Homepage chip row linking to /brand-assets

### Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Static | Marketplace landing page (ticker, hero carousel, features, tech stack, brand assets, explore) |
| `/chat` | Static | Chat interface with model switcher + settings |
| `/api/chat` | Dynamic | Streaming chat API (POST) |
| `/thumbnail?v=1\|2\|3` | Static | Vignette screenshots (1200x630) |
| `/thumbnail?v=a\|b\|c\|d` | Static | Big-word marketing thumbnails (1200x630) |
| `/brand-assets` | Static | Brand asset gallery |
| `/og-preview` | Static | Full-size OG image for screenshotting |

### Vignettes vs Thumbnails

These are distinct concepts:
- **Vignettes** (`thumbnail-chat.tsx`, `thumbnail-models.tsx`, `thumbnail-settings.tsx`) — Interactive mini-UI previews shown in the homepage carousel. Keys `1`, `2`, `3`.
- **Thumbnails** (`thumbnail-v-{a,b,c,d}.tsx`) — Screenshot-ready marketing images with big typography + floating UI elements. Keys `a`, `b`, `c`, `d`. Built on `thumbnail-variant.tsx` base component.

### App Icon SVG

The layers icon used throughout (header, footer, favicons, thumbnails):
```
M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5
```
