# Delta

> A privacy-first AI browser. Local LLM by default, the agent reads and acts on the active page, and nothing leaves your machine.

Delta is an Electron browser with a built-in agent. It speaks to local LLMs
(Ollama, LM Studio, llama.cpp, MLX) over the OpenAI-compatible HTTP API, so
your conversations and the pages they reference stay on your machine.

The product north star, in one line: **Comet-quality agent UX without the
cloud dependency.**

## Status

Early. Foundations laid:

- Electron 33 + React 19 + Vite + Tailwind shell with multi-tab and the AI sidebar
- Tab management via `WebContentsView` (per-tab process isolation)
- Local provider probing — endpoints + model lists for Ollama / LM Studio / llama.cpp / MLX
- **Phase 1 chat** (this work): streaming chat against a local LLM, with the active page attached as untrusted context

Roadmap (see [`apps/browser/docs/agent-design.md`](apps/browser/docs/agent-design.md) for the full plan):

| Phase | What |
| --- | --- |
| 1. Chat | Stream against a local provider; active-page text as context. **Done.** |
| 2. Read tools | `get_page_text`, `screenshot_page`, `list_tabs`, `read_tab` — agent reads the browser. |
| 3. Act tools | `click`, `type`, `navigate`, `open_tab` — agent acts on the user's behalf, gated by per-(origin, tool) permissions. |
| 4. Address-bar AI | `Cmd+L` `?` switches to Ask mode; result lands in the sidebar. |
| 5. Task threads | Multiple concurrent tasks visible in the sidebar. |

## Privacy posture

- **Local by default.** The agent only auto-discovers and calls local
  endpoints (`127.0.0.1`). Cloud APIs (Anthropic / OpenAI) are off until
  you opt in via settings.
- **No telemetry.** None.
- **No sync.** Conversation state is in-memory; persistence is opt-in.
- **Untrusted-content framing.** Page text the agent reads is wrapped in
  `<page_content>…</page_content>` and the system prompt instructs the
  model to treat it as data, never as instructions — defense against
  prompt-injection from the open web.
- **Permission gates live in the runtime, not in the prompt.** When act
  tools land (Phase 3), every action passes through a per-`(origin, tool)`
  approval gate that the model cannot bypass, no matter what a page tells
  it to do. See `agent-design.md` §3 and §13 for the threat model.

## Repository layout

```
apps/
  browser/        # the Delta Electron app
    docs/         # design docs (agent-design.md is load-bearing)
    src/
      main/       # Electron main process — TabManager, Agent runtime, providers
      preload/    # contextBridge — typed window.api for the renderer
      renderer/   # React UI: TabStrip, AddressBar, Sidebar, DeltaLogo
      shared/     # types crossing the IPC boundary
  portfolio/      # the marketing/portfolio site (separate)
```

## Run it

```bash
pnpm install
pnpm delta:dev
```

The first time, you'll see five providers listed but none online. Bring
one up:

```bash
# easiest path: Ollama
brew install ollama
ollama serve &
ollama pull llama3.2
# then click Refresh in the Delta sidebar; status flips to online
```

Open the AI sidebar (Δ button in the address bar), type a question, hit
Enter. The active tab's text is attached automatically as context.

> If `pnpm delta:dev` fails with `Cannot read properties of undefined
> (reading 'isPackaged')`, you have `ELECTRON_RUN_AS_NODE=1` exported in
> your shell. Run `unset ELECTRON_RUN_AS_NODE` and try again.

## Tech

- Electron 33 / Chromium 130
- React 19, Vite 5, Tailwind 3
- TypeScript 5.7
- pnpm workspaces

## License

TBD.
