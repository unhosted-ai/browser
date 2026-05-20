<div align="center">

# Delta

**A privacy-first AI browser.**

_Local LLM by default. The agent reads and acts on the active page. Nothing leaves your machine._

[Website](https://delta-practice.github.io/Browser/) ·
[About](apps/browser/docs/about.md) ·
[Agent design](apps/browser/docs/agent-design.md) ·
[Identity model](apps/browser/docs/identity.md) ·
[Brand](brand/guidelines.md) ·
[Privacy](PRIVACY.md) ·
[Terms](TERMS.md) ·
[License](LICENSE)

</div>

---

Delta is an Electron browser with a built-in agent. It speaks to local LLMs
(Ollama, LM Studio, llama.cpp, MLX) over the OpenAI-compatible HTTP API, so
your conversations and the pages they reference stay on your machine. Cloud
providers exist as opt-in only — keys live encrypted in your OS keychain via
Electron `safeStorage`, and the renderer never sees them.

There is no Delta account. There is no Delta server. The device is the
identity.

> **Why "Delta Practice"?** Δ is the Greek letter for *change* — and the
> shape a river makes where it meets the sea. The agent in this browser
> exists to manage the delta between what you already know and what's on
> the page. *Practice* is the discipline of getting the mundane things
> right (the keyboard shortcuts, the address bar, the way windows manage
> focus) plus the honest read that we're still figuring it out — which is
> why the repo is public from day one. Full reasoning in
> [`apps/browser/docs/about.md`](apps/browser/docs/about.md).

## Quickstart

Requirements:

- Node 20+ (recommended; Node 18 LTS works)
- pnpm 10 (the workspace pins this in `packageManager`)
- macOS, Windows 10+, or a Linux desktop with libsecret installed (Keychain / DPAPI / libsecret backs `safeStorage`)
- Optional: [Ollama](https://ollama.com/) (or LM Studio / llama.cpp / MLX) for a local model

```bash
git clone https://github.com/Delta-Practice/Browser.git
cd Browser
pnpm install
pnpm delta:dev
```

Bring up a local model — fastest path is Ollama:

```bash
brew install ollama        # or: curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
ollama pull llama3.2
# Delta auto-detects it within a few seconds.
# The Onboarding card on first launch shows a live "Local model online" pip.
```

Open the AI sidebar (the Δ button in the address bar, or `⌘J`), type a
question, hit Enter. The active tab's text is attached as untrusted
context, wrapped in `<page_content>` tags that the system prompt tells the
model to treat as data — not instructions.

**Build a standalone app** (instead of running the dev server):

```bash
pnpm --filter delta make   # macOS: .dmg + .zip (arm64 + x64). Win: .nsis. Linux: AppImage + .deb.
# Output lands in apps/browser/release/.
```

> Builds are currently **unsigned** — macOS Gatekeeper will warn the
> first time you open the .dmg. Right-click → Open to confirm. The
> notarization flip happens once the Apple Developer cert is in place
> (see [`STATUS.md`](STATUS.md)).

### Troubleshooting

- **`Cannot read properties of undefined (reading 'isPackaged')`** when
  starting the dev server → your shell has `ELECTRON_RUN_AS_NODE=1`
  set. Run `unset ELECTRON_RUN_AS_NODE` and retry.
- **Linux: `safeStorage` warnings + API keys won't save** → install
  `libsecret-1-0` (Debian/Ubuntu) or `libsecret` (Arch/Fedora). Delta
  refuses to persist keys without OS-keychain encryption rather than
  fall back to plaintext on disk.
- **Lockfile mismatch on `pnpm install`** → `pnpm install --frozen-lockfile=false`
  once, then commit the result.

### What's inside (key features)

- **Local-first agent** with read tools (`list_tabs`, `read_active_page`, `read_tab`) and act tools (`navigate`, `open_tab`) gated per-`(origin, tool)`. Sensitive-site classifier blocks act tools on banking / gov / payment / wallet / healthcare.
- **Tracker blocker** with ~42k EasyPrivacy domains + a curated short list, bound at app boot. 30-day rolling privacy report.
- **Personal SLM (preview)** — opt-in toggle for a per-user model that learns from your local data. See [`apps/browser/docs/slm-design.md`](apps/browser/docs/slm-design.md).
- **Account lock** — set a PIN or password (Settings → Account lock). PBKDF2-SHA256 200k iters, hash + salt only in `settings.json`. No remote recovery.
- **Scheduled tasks** — local cron-of-one: reminders (native notifications), opening a URL at a set time, or kicking off an agent prompt. Settings → Scheduled tasks.
- **Per-site password import** — bring a CSV from Chrome / Brave / Edge / Firefox / Safari. Preview-with-per-row keep, encrypted via OS keychain. Settings → Passwords.
- **Set as default browser** — registers Delta for http+https system-wide.
- **Connection-layer hardening** — HTTPS-only, strict referrer policy, optional DNS-over-HTTPS (Cloudflare / Quad9 / Google).

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
  icon.svg                     # 1024 master — Δ + spark on a cream squircle
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

## Legal

- [`LICENSE`](LICENSE) — MIT for code. Brand assets in [`brand/`](brand/)
  are not covered; see [`brand/guidelines.md`](brand/guidelines.md).
- [`PRIVACY.md`](PRIVACY.md) — full data-flow notice with jurisdiction
  addenda (GDPR / UK GDPR / CCPA + US state CDPAs / PIPEDA / Quebec
  Law 25 / LGPD / PIPL / DPDP / APPI / PIPA / PDPA / POPIA / revFADP).
  Delta runs no IP-geolocation; the notice is universal.
- [`TERMS.md`](TERMS.md) — terms of use, AI Act disclosure, acceptable
  use, governing law.
- [`SECURITY.md`](SECURITY.md) — threat model + how to report a vuln.
