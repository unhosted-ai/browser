<div align="center">

# Delta

**A privacy-first AI browser.**

_Local LLM by default. The agent reads and acts on the active page. Nothing leaves your machine._

[Website](https://delta-practice.github.io/Browser/) ·
[Agent design](apps/browser/docs/agent-design.md) ·
[Identity model](apps/browser/docs/identity.md) ·
[Brand](brand/guidelines.md)

</div>

---

Delta is an Electron browser with a built-in agent. It speaks to local LLMs
(Ollama, LM Studio, llama.cpp, MLX) over the OpenAI-compatible HTTP API, so
your conversations and the pages they reference stay on your machine. Cloud
providers exist as opt-in only — keys live encrypted in your OS keychain via
Electron `safeStorage`, and the renderer never sees them.

There is no Delta account. There is no Delta server. The device is the
identity.

## Quickstart

```bash
git clone https://github.com/Delta-Practice/Browser.git
cd Browser
pnpm install
pnpm delta:dev
```

Bring up a local model — fastest path is Ollama:

```bash
brew install ollama
ollama serve &
ollama pull llama3.2
# Delta auto-detects it within a few seconds
```

Open the AI sidebar (the Δ button in the address bar, or `⌘J`), type a
question, hit Enter. The active tab's text is attached as untrusted
context, wrapped in `<page_content>` tags that the system prompt tells the
model to treat as data — not instructions.

> If `pnpm delta:dev` fails with `Cannot read properties of undefined
> (reading 'isPackaged')`, your shell has `ELECTRON_RUN_AS_NODE=1` set.
> Run `unset ELECTRON_RUN_AS_NODE` and retry.

## Roadmap

| Phase | What | Status |
| --- | --- | --- |
| 1 | Streaming chat against local LLM with active-page context | **shipped** |
| 2 | Read tools: `get_page_text`, `screenshot_page`, `list_tabs`, `read_tab` | next |
| 3 | Act tools: `click`, `type`, `navigate`, `open_tab` — gated per `(origin, tool)` | after Phase 2 |
| 4 | Address-bar AI (`⌘L ?` switches to Ask mode) | |
| 5 | Task threads in sidebar (multiple concurrent agents) | |

Full plan: [`apps/browser/docs/agent-design.md`](apps/browser/docs/agent-design.md).

## Privacy posture

- **Local by default.** The agent only auto-discovers and calls
  `127.0.0.1` endpoints. Cloud (OpenAI &amp; OpenAI-compatible) is off
  until you explicitly enable it.
- **No telemetry, no analytics, no profile.**
- **API keys** live in your OS keychain via `safeStorage`. The
  renderer only ever learns whether a key is *configured*; it cannot
  read the value.
- **Untrusted-content framing.** Page text passed to the model is
  wrapped in `<page_content>…</page_content>` tags, and the system
  prompt instructs the model to treat anything inside those tags as
  data — never as instructions. This is defense against prompt
  injection from the open web.
- **Permission gates live in the runtime, not the prompt.** When act
  tools land (Phase 3), every action passes through a per-`(origin,
  tool)` approval gate that the model cannot bypass.

Threat model and audit-incident references: see
[`apps/browser/docs/agent-design.md`](apps/browser/docs/agent-design.md)
§13.

## Architecture, in one rule

> The agent never runs in the renderer.

All LLM calls, tool execution, and conversation state live in the main
process. The renderer is a typed view over an event stream — it can
request actions but never owns them. That keeps secrets out of the
page-loading process and centralises tool authority where the
permission gate enforces it.

```
┌─ Electron main ─────────────────────────────────────────┐
│                                                         │
│  TabManager      Agent runtime      SettingsStore       │
│   ├ WebContentsView  ├ task state      ├ user settings  │
│   ├ navigation       ├ provider client  ├ safeStorage    │
│   └ executeJavaScript└ tool registry    └ (OS keychain) │
│                                                         │
└──────────────────── ipc events ─────────────────────────┘
              │
   ┌──────────────── React renderer ────────────────┐
   │  TabStrip · AddressBar · Sidebar · Settings   │
   └────────────────────────────────────────────────┘
```

## Repository layout

```
apps/
  browser/                     # the Delta Electron app
    docs/
      agent-design.md          # multi-phase plan + threat model
      identity.md              # local profiles + auto-update + sync
    src/
      main/                    # Electron main: TabManager, Agent, Settings, providers
      preload/                 # contextBridge — typed window.api
      renderer/                # React UI: chrome, sidebar, settings, new-tab
      shared/                  # types crossing the IPC boundary
    build/                     # icons (.icns, .png) for electron-builder
brand/
  icon.svg                     # 1024 master — Δ + spark on a dark squircle
  wordmark.svg                 # Δ + Delta lockup
  guidelines.md                # do/don't, colors, typography
  scripts/build-icons.sh       # rasterise the iconset (rsvg-convert + sips + iconutil)
docs/                          # GitHub Pages source — public landing page
```

## Tech

- Electron 33 / Chromium 130
- React 19, Vite 5, Tailwind 3
- TypeScript 5.7
- pnpm workspaces

## Patterns we're tracking from neighbouring projects

- **[browser-use](https://github.com/browser-use/browser-use)** —
  open-source Python framework for AI browser automation. The agent
  loop, accessibility-tree state representation, and CLI sub-command
  surface (`open / state / click / type / screenshot`) are reference
  shapes for Delta's Phase 2/3 act-tools — though Delta's runtime is
  Electron + main-process tools, not Playwright + Python.
- **[onkernel/kernel-images](https://github.com/onkernel/kernel-images)** —
  sandboxed browser-as-a-service. Different product (server-side
  browsers for agents) but a fellow-traveller in the "agent +
  browser" design space; the dev-tool register of their site informs
  Delta's public face under [`docs/`](docs/).

## License

TBD — likely MIT once the codebase stabilises. Brand assets in
[`brand/`](brand/) follow the rules in
[`brand/guidelines.md`](brand/guidelines.md).
