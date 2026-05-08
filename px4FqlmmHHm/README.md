# AI Gateway Starter

A production-ready AI chatbot template built with Next.js 16, Vercel AI SDK 6, and the Vercel AI Gateway. Multi-model support, configurable agent settings, streaming chat UI, and a marketplace-ready landing page.

## Features

- **Vercel AI Gateway** -- Zero-config access to OpenAI, Anthropic, xAI, Google, and more. No API key management required.
- **Streaming Chat UI** -- Real-time streaming responses using `useChat`, `DefaultChatTransport`, and `streamText`.
- **Agent Settings** -- Configure model, temperature, system prompt, and max tokens from the UI via a settings modal.
- **Multi-Model Support** -- Switch between GPT-4o, Claude Sonnet 4, Grok 3 Mini, and others on the fly.
- **Mobile-First Design** -- Responsive layout with full-screen mobile navigation and touch-optimized chat.
- **Marketplace Landing Page** -- Hero carousel with live UI vignettes, feature cards, tech stack pills, and explore cards.
- **Thumbnail Vignettes** -- Self-contained marketing components renderable at `/thumbnail?v=N` for 1200x630 screenshots.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 16 | Framework (App Router) |
| AI SDK 6 | AI integration (`streamText`, `useChat`, `convertToModelMessages`) |
| Vercel AI Gateway | Multi-provider model access |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |

## Project Structure

```
app/
  page.tsx                    # Marketplace landing page
  chat/page.tsx               # Chat interface
  thumbnail/page.tsx          # Screenshot-ready vignettes (?v=1,2,3)
  api/chat/route.ts           # Streaming chat API route
components/
  header.tsx                  # App header with breadcrumb nav
  agent-settings-dialog.tsx   # Model/temperature/prompt settings modal
  marketing/
    hero-carousel.tsx         # Auto-advancing carousel with progress bar
    feature-cards.tsx         # Feature highlight grid
    tech-stack.tsx            # Tech stack pill badges
    explore-cards.tsx         # CTA cards (try, source, deploy)
    thumbnail-chat.tsx        # Chat vignette component
    thumbnail-models.tsx      # Model selector vignette component
    thumbnail-settings.tsx    # Settings vignette component
lib/
  agent-settings.ts           # Settings types, defaults, model list
```

## Getting Started

1. Deploy to Vercel -- the AI Gateway is provisioned automatically.
2. Open `/chat` to start a conversation.
3. Click the gear icon to configure the model, temperature, and system prompt.
4. Visit `/thumbnail?v=1` (or `?v=2`, `?v=3`) for screenshot-ready marketing vignettes.

## Customization

- **Add models** -- Edit `AVAILABLE_MODELS` in `lib/agent-settings.ts`.
- **Add tools** -- Extend the `streamText` call in `app/api/chat/route.ts` with AI SDK tool definitions.
- **Add persistence** -- Wire up a database in the `onFinish` callback of `toUIMessageStreamResponse`.
- **Change theme** -- Edit the CSS custom properties in `app/globals.css`.

## License

MIT
