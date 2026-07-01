# Status

> *What's actually shipped, what's planned, and what we're not going to
> build. Updated when reality changes — not a marketing surface.*

Generated 2026-05-20. Treat as definitive over the README's roadmap
table when the two disagree.

## ✅ Shipped — works today

### The browser
- Tabs, address bar, find-in-page, native menu, ⌘T / ⌘W / ⌘L / ⌘R / ⌘F / ⌘⇧T / ⌘1..⌘9
- Safety badges in the address bar (GOV / EDU / ORG / WEB / BLOCK)
- Tracker blocker active from app boot — ~42k known tracker domains (curated short list + EasyPrivacy, toggleable in Settings)
- **Ad blocker** active from app boot — curated set of ~70 well-known ad networks (Criteo, Rubicon, OpenX, PubMatic, Index Exchange, Outbrain, Taboola, LiveRamp / ID5, SpotX / FreeWheel / IAS / DoubleVerify, etc), Settings → Ad blocking toggle. Counted separately from trackers.
- **Tab discard** — inactive tabs (default 30 minutes) free their WebContentsView. Tab strip keeps the entry; clicking the tab silently rebuilds and reloads `url`. The active tab is never discarded.
- **RAM pip** in the tab strip — live `N tabs · X MB` readout (5s broadcast off `app.getAppMetrics`). Click for a memory breakdown (main / renderers / discarded count) + one-click "Discard idle tabs". Tone shifts amber > 2 GB, red > 4 GB.
- **Settings → Tabs & memory** — choose auto-discard threshold (Off / 5 / 15 / 30 / 60 / 240 min) and the live-tab soft cap (No cap / 10 / 20 / 50 / 100). Persists as `tabDiscardMinutes` + `maxLiveTabs`. Cap enforces on tab create, on revive-by-click, and when the user tightens it — oldest non-active tab gets discarded first.
- **Unpacked Chrome-extension loader** — Settings → Extensions. Point at a manifest.json folder; we hand it to `session.loadExtension`. MV3 content scripts, themes, action popups, devtools panels work. `chrome.identity`, `chrome.cookies`, Chrome Sync don't.
- 30-day privacy report (Settings → Privacy + new-tab chip)
- Bookmarks (local JSON, no sync), history (5,000-entry cap, search), downloads (live progress, pause/resume/cancel)
- Reader mode (Mozilla Readability injected into the active tab)
- Listen / TTS (Web Speech API, sentence-chunked)
- Copy link, hamburger menu, "Clear browsing data" (cookies / cache / history / downloads)
- **Account lock** — opt-in PIN or password gate at app launch; PBKDF2-SHA256 200k iters, hash + salt only on disk, `timingSafeEqual` in main, 3-failure 4s cooldown on the lock screen
- **Scheduled tasks** — local cron-of-one (`reminder` / `openUrl` / `agent` actions; `oneShot` ISO or `every N min`). Native `Notification` API for reminders; agent prompts spawn a fresh conversation
- **Per-site password import** — CSV preview (Chrome / Brave / Edge / Firefox / Safari export format) with per-row keep, OR **direct from the macOS Keychain** via `security` (lists metadata without prompts; OS prompts per-item on import). Passwords encrypted via OS keychain (`safeStorage`); plaintext never crosses IPC; fill-into-active-tab IPC ready. Windows + Linux system-keychain readers land next.
- **Set as default browser** — registers Unhosted Browser for http+https via `app.setAsDefaultProtocolClient`; Windows deeplinks to the Settings → Default apps pane
- **Conversation compression** — `userData/conversations/<id>.json.gz` (gzip via `node:zlib`), 4-6× smaller; legacy `.json` reads transparently, migrate on next save

### The agent
- Streaming chat against any OpenAI-compatible local LLM (Ollama, LM Studio, llama.cpp, MLX) and against OpenAI / Anthropic when explicitly enabled
- Custom OpenAI-compatible endpoints (with optional auth)
- Read tools: `list_tabs`, `read_active_page`, `read_tab`, **`vault_list`**, **`vault_read`**, **`vault_write`**, **`vault_append`** — auto-run. Vault tools are bounded to the configured second-brain folder (Settings → Second brain) with a path-traversal guard and a per-write byte cap; they return `no_vault` if the user hasn't set one up.
- Act tools: `navigate`, `open_tab`, **`click`**, **`type`**, `get_interactive_elements` — gated per-`(origin, tool)` with Allow / Block / Always-allow. `type` refuses password fields and file inputs unconditionally.
- Sensitive-site classifier auto-blocks all act tools on banking / government / payment / wallet / healthcare hosts
- Conversation persistence — one `.json.gz` per conversation in `userData/conversations/`
- Page text wrapped in `<page_content>` tags; system prompt frames it as untrusted data
- The agent runtime, tool execution, and conversation state all live in the Electron main process — the renderer is a typed view over an event stream
- **Personal SLM (preview)** — opt-in toggle persists; Sidebar shows the "SLM · preview" capability pip; training pipeline is roadmap (see `apps/browser/docs/slm-design.md`)

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
- **Legal stack** — [`PRIVACY.md`](PRIVACY.md) (universal notice + 17-jurisdiction addenda: EEA + Swiss + UK + CA + the US state CDPAs + COPPA + PIPEDA + Quebec Law 25 + LGPD + PIPL + DPDP + Australia + APPI + PIPA + PDPA + POPIA + UAE + Russia + Türkiye), [`TERMS.md`](TERMS.md), MIT [`LICENSE`](LICENSE)
- **Roadmap** — [`apps/browser/docs/roadmap-next.md`](apps/browser/docs/roadmap-next.md) tracks the next 11 named PRs with honest scope per item

## 🛠️ Planned — known gaps, intent to ship

| Feature | Status | Notes |
| --- | --- | --- |
| Phase 3.1: `click` + `type` act tools | Shipped — gated, sensitive-site auto-blocked, password+file inputs refused | The matcher accepts `{ index }` (from `get_interactive_elements`), `{ text }`, or `{ selector }`. |
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

- **A Unhosted Browser account / login.** The device is the identity. There is no email/password, ever.
- **Cross-device sync as a built-in feature.** A future opt-in, end-to-end-encrypted sync where the key never reaches a server is plausible (v2). Built-in cloud sync is not.
- **Telemetry / analytics.** None. Not even crash reporting until we figure out a privacy-respecting way to do it.
- **A Chrome extension store integration.** We'd rather ship the three or four functions extensions provide as built-ins than reinvent the extension layer.
- **A mobile app.** Electron is desktop-only. iOS/Android is a separate product, separate codebase.
- **A hardened-security browser.** Tor, Brave with Shields-strict, and arkenfox-Firefox cover that better than we could. Unhosted Browser is *default-good*, not maximally hardened.

## How to help

- **Bug, feature idea, site that didn't work** → use the [issue templates](https://github.com/unhosted-ai/browser/issues/new/choose).
- **Security vulnerability** → [private vulnerability reporting](https://github.com/unhosted-ai/browser/security/advisories/new).
- **Pull request** → see [`CONTRIBUTING.md`](CONTRIBUTING.md). Small ones land fast; big ones want an issue first.
- **Just want to talk about it?** → open an issue with the *feature* template; the conversation register is fine.
