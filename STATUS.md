# Status

> *What's actually shipped, what's planned, and what we're not going to
> build. Updated when reality changes — not a marketing surface.*

Generated 2026-05-10. Treat as definitive over the README's roadmap
table when the two disagree.

## ✅ Shipped — works today

### The browser
- Tabs, address bar, find-in-page, native menu, ⌘T / ⌘W / ⌘L / ⌘R / ⌘F / ⌘⇧T / ⌘1..⌘9
- Safety badges in the address bar (GOV / EDU / ORG / WEB / BLOCK)
- Tracker blocker active from app boot — ~42k known tracker domains (curated short list + EasyPrivacy, toggleable in Settings)
- 30-day privacy report (Settings → Privacy + new-tab chip)
- Bookmarks (local JSON, no sync), history (5,000-entry cap, search), downloads (live progress, pause/resume/cancel)
- Reader mode (Mozilla Readability injected into the active tab)
- Listen / TTS (Web Speech API, sentence-chunked)
- Copy link, hamburger menu, "Clear browsing data" (cookies / cache / history / downloads)

### The agent
- Streaming chat against any OpenAI-compatible local LLM (Ollama, LM Studio, llama.cpp, MLX) and against OpenAI / Anthropic when explicitly enabled
- Custom OpenAI-compatible endpoints (with optional auth)
- Read tools: `list_tabs`, `read_active_page`, `read_tab` — auto-run
- Act tools: `navigate`, `open_tab` — gated per-`(origin, tool)` with Allow / Block / Always-allow
- Sensitive-site classifier auto-blocks all act tools on banking / government / payment / wallet / healthcare hosts
- Conversation persistence (one JSON per conversation in `userData/conversations/`)
- Page text wrapped in `<page_content>` tags; system prompt frames it as untrusted data
- The agent runtime, tool execution, and conversation state all live in the Electron main process — the renderer is a typed view over an event stream

### Privacy posture
- Local-LLM by default; auto-discovery limited to `127.0.0.1`
- API keys encrypted via Electron `safeStorage` (OS keychain on macOS, DPAPI on Windows, libsecret on Linux). The renderer is told whether a key is *configured*; the value never crosses the IPC boundary.
- No telemetry. No analytics. No remote profile.
- New-tab page is fully local (no Unsplash, no remote calls)

### New-tab page
- 11-palette animated procedural sky (re-rolls per tab open) with parallax blob clouds, sun god-rays, atmospheric haze
- Stars + city lights + occasional shooting star on dark palettes; aurora wisps on the aurora palette; a bird crosses occasionally
- "Your photos" mode — point at a folder of images, cycles through them with a slow Ken-Burns zoom (Settings → New tab)

### Public surfaces
- GitHub Pages site (in `docs/`) and brand assets (in `brand/`)
- Hugging Face model card at [`sinhaankur/delta-agent-prompt`](https://huggingface.co/sinhaankur/delta-agent-prompt) — mirrors the system prompt + tool schemas
- Issue templates (bug / feature / site-broke), CONTRIBUTING.md, SECURITY.md
- Multi-arch packaging configured (macOS dmg+zip arm64+x64, Windows nsis, Linux deb+AppImage)

## 🛠️ Planned — known gaps, intent to ship

| Feature | Status | Notes |
| --- | --- | --- |
| Phase 3.1: `click` + `type` act tools | Designed in `agent-design.md` | Needs content-script injection; bigger blast radius than navigate, so the design needs a dedicated pass. |
| Address-bar AI (`⌘L ?` → Ask mode) | Roadmap (Phase 4) | Lets you ask a question without opening the sidebar. |
| Concurrent task threads | Roadmap (Phase 5) | Multiple agents in the sidebar, each with its own conversation. |
| Local profiles (no remote account) | Designed in [`identity.md`](apps/browser/docs/identity.md) | Profile picker on launch, multiple isolated `userData` directories. |
| TTS voice picker | Small | Currently uses the system default; macOS Premium voices need to be selectable. |
| Reader-mode failure toast | Small | Silent failure today on pages Readability can't parse. |
| "Send feedback" in the ☰ menu | Small | Pre-filled GitHub issue link. |
| Tracker-list growth | Shipped 2026-05-11 — ~42k via EasyPrivacy, plus the curated short list | Refresh via `apps/browser/scripts/build-tracker-list.mjs`. DDG Tracker Radar import for richer owner attribution is the next bump. |
| macOS notarization | Blocked on Apple Developer cert | The `.dmg` builds today; signing is one config flip away once the cert is in place. |
| BYO-sync docs (iCloud Drive / Syncthing on `userData/`) | Two-paragraph docs change | The "no sync" answer for users who want cross-device. |

## ❌ Not going to be built

These are explicit non-goals — listing them as honestly as the goals.
Full reasoning in [`apps/browser/docs/about.md`](apps/browser/docs/about.md).

- **A Delta account / login.** The device is the identity. There is no email/password, ever.
- **Cross-device sync as a built-in feature.** A future opt-in, end-to-end-encrypted sync where the key never reaches a server is plausible (v2). Built-in cloud sync is not.
- **Telemetry / analytics.** None. Not even crash reporting until we figure out a privacy-respecting way to do it.
- **A Chrome extension store integration.** We'd rather ship the three or four functions extensions provide as built-ins than reinvent the extension layer.
- **A mobile app.** Electron is desktop-only. iOS/Android is a separate product, separate codebase.
- **A hardened-security browser.** Tor, Brave with Shields-strict, and arkenfox-Firefox cover that better than we could. Delta is *default-good*, not maximally hardened.

## How to help

- **Bug, feature idea, site that didn't work** → use the [issue templates](https://github.com/Delta-Practice/Browser/issues/new/choose).
- **Security vulnerability** → [private vulnerability reporting](https://github.com/Delta-Practice/Browser/security/advisories/new).
- **Pull request** → see [`CONTRIBUTING.md`](CONTRIBUTING.md). Small ones land fast; big ones want an issue first.
- **Just want to talk about it?** → open an issue with the *feature* template; the conversation register is fine.
