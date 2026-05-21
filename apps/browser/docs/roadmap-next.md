# Delta — next-step roadmap

_Generated 2026-05-20. Captures every ask from the conversation that
spun this doc up, so nothing falls off the floor. Each item lists the
honest scope, what's already done, and the smallest credible first PR
remaining._

## Just shipped (this session)

| Feature | Where | Status |
|---|---|---|
| Legal stack: `PRIVACY.md` (universal + 17-jurisdiction addenda), `TERMS.md`, `LICENSE` (MIT) | repo root | landed |
| `license: "MIT"` in both `package.json` files | repo root + `apps/browser` | landed |
| Settings → Legal & Privacy group (opens notices in-app) | [SettingsPanel.tsx](../src/renderer/src/components/SettingsPanel.tsx) | landed |
| Personal SLM opt-in toggle + design doc + Sidebar disclosure pip | [slm-design.md](./slm-design.md), [Sidebar.tsx](../src/renderer/src/components/Sidebar.tsx) | landed (toggle only; training pipeline still Phase A) |
| Local account lock — PIN or password, PBKDF2-SHA256 200k iters, `timingSafeEqual` in main, LockScreen overlay z-100 | [LockScreen.tsx](../src/renderer/src/components/LockScreen.tsx) + [settings.ts](../src/main/settings.ts) | landed |
| Onboarding live local-model probe + Ollama 3-line recipe + ⌘K added to shortcut footer | [Onboarding.tsx](../src/renderer/src/components/Onboarding.tsx) | landed |
| Cheap UX wins: `authed`→`key set`, ask-mode placeholder rewrite | [SettingsPanel.tsx](../src/renderer/src/components/SettingsPanel.tsx) + [AddressBar.tsx](../src/renderer/src/components/AddressBar.tsx) | landed |
| Scheduled tasks: `reminder` / `openUrl` / `agent` actions; `oneShot` + `every N min` triggers; persisted in `userData/schedules.json`; native `Notification` | [schedules.ts](../src/main/schedules.ts) + Settings UI | landed |
| Per-site password import: CSV parser (Chrome/Brave/Edge/Firefox/Safari format), preview-with-per-row keep, `safeStorage` encryption, fill-into-active-tab IPC; plaintext never crosses IPC | [credentials.ts](../src/main/credentials.ts) + Settings UI | landed |
| Set-as-default-browser registration via `app.setAsDefaultProtocolClient` + Windows Settings deeplink fallback | [main/index.ts](../src/main/index.ts) | landed |
| Fix: `TypeError: Object has been destroyed` race on window close | [tabs.ts](../src/main/tabs.ts) | landed |
| Data compression: conversations now write `.json.gz` (gzip via `node:zlib`); legacy `.json` reads transparently; one-time migration on first save | [conversations.ts](../src/main/conversations.ts) | landed |
| Second-brain (AI-OS Skill 1) vault setup: folder picker, `Claude.md` maps at every level, Settings UI | [second-brain.ts](../src/main/second-brain.ts) + Settings UI + [`apps/os/`](../../os/) | landed |
| Agent vault tools — `vault_list` / `vault_read` / `vault_write` / `vault_append` (read-tier, bounded to the configured vault, path-traversal-guarded, 256 KB/write cap). Makes scheduled-`agent` daily briefs possible. | [tools.ts](../src/main/tools.ts) | landed |
| RAM pip in the tab strip + Settings → Tabs section with auto-discard presets. Lives off `app.getAppMetrics` on a 5s broadcast; "Discard idle now" one-click. | [RamPip.tsx](../src/renderer/src/components/RamPip.tsx) + [tabs.ts](../src/main/tabs.ts) | landed |
| Soft live-tab cap (`maxLiveTabs`, 0 = unlimited). Enforced on create / revive / cap-tighten. Oldest non-active live tab gets discarded first. | [tabs.ts](../src/main/tabs.ts) + Settings UI | landed |
| macOS Keychain reader for credentials. `listSystemPasswords` enumerates web-password entries from `security dump-keychain` (metadata only, no OS prompts). `importFromSystemPasswords` fetches each selected entry via `security find-internet-password -w` — OS shows its access-prompt the first time, then encrypts via `safeStorage`. Windows + Linux land next. | [credentials.ts](../src/main/credentials.ts) + Settings UI | landed (macOS) |

## Stacked asks — honest first-PR scope

### 1. Make the assistant "intuitive — learns over time"

The Personal SLM scaffold is the structural answer. The toggle ships; the
training pipeline is Phase A. To make it credible:

- **First PR — sample extractor.** Walk `userData/conversations/`, emit
  `(instruction, response)` pairs into a `.jsonl` under
  `userData/slm/samples/`. Apply the filter (drop secrets-shaped tokens,
  sensitive-site origins, short turns). No training yet. Writes a
  `rejected.json` of what got filtered, so the user can see what's *not*
  going in.
- Second PR: nightly job (idle + on AC) that runs the LoRA fine-tune via
  `mlx-lm` (Apple Silicon) / `peft` (else) over the sample file. Eval
  guard refuses to swap the adapter if perplexity regresses.
- Third PR: per-turn rewrite pass through the adapter before the main
  model sees the prompt. Labeled `[SLM context]` in the conversation.

### 2. "Pondering when something user mentions"

Reading this as: when the user types something specific that matches a
known concept (a project name, a person, a recurring topic), the agent
should surface an inline disclosure — "I've seen you ask about X before
on Y." This is the SLM's job long-term, but a zero-ML stand-in is
useful now:

- **First PR — keyword index over conversations.** Build a tiny inverted
  index in main of (term → conversation_id, snippet, timestamp). Run a
  match pass on each new user turn; if a high-confidence match exists,
  inject a single-line "earlier you asked about X — open?" chip above
  the response stream. Cheap; obvious; no model needed.

### 3. Perplexity-Comet parity — "blocks ads AND tracking, something better"

Delta already blocks ~42k trackers (EasyPrivacy). Comet's headline
moves we *don't* yet match:

- **First PR — ad blocking on top of trackers.** Wire EasyList alongside
  EasyPrivacy in the same `TrackerBlocker` infrastructure ([privacy.ts](../src/main/privacy.ts)).
  New `useExtendedAdList` setting. Surface "ads blocked" alongside
  "trackers blocked" in the new-tab privacy chip + the address-bar shield.
- Second PR: summary-on-every-page ribbon (one-tap summary above the
  reader-mode content).
- Third PR: a "discover" starting page — local-only, derived from the
  user's bookmark + history clusters.

### 4. "Tasks for users" — agent does the work

`navigate` and `open_tab` act tools already live. The headline gap:
**click + type act tools**, plus form-fill via the credentials store.
This is what unlocks "book my OpenTable reservation."

- **First PR — `click` and `type` act tools.** Per [agent-design.md §3](./agent-design.md).
  Permission-gated per `(origin, tool)`; sensitive-site classifier
  blocks them on banking / gov / payment / wallet / healthcare. Reuses
  the existing PermissionCard UI.
- Second PR: pair with the credentials store so the agent can call a
  `fill_credential` tool that requires no plaintext crossing the model.
- Third PR: scheduled-task `agent` action graduates to "agent runs the
  click/type recipe on your behalf at the scheduled time."

### 5. Closer to Chromium — extensions work seamlessly

Delta already *is* Chromium (Electron 33 → Chromium 130) for rendering
and the web platform. The gap is the `chrome.*` extension runtime,
which Electron doesn't ship. Three increasing-cost paths:

- **Cheapest — unpacked-extensions loader.** Wire
  `session.defaultSession.loadExtension(path, { allowFileAccess: true })`
  + a Settings → Extensions section that lets the user point at an
  unpacked extension folder. Covers MV3 content scripts + most theme +
  some background workers; does NOT cover anything that calls
  `chrome.cookies` / `chrome.identity` / `chrome.tabs.*` etc.
- Mid-cost: add [electron-chrome-extensions](https://github.com/samuelmaddock/electron-chrome-extensions)
  as a dep. Adds polyfills for the `chrome.tabs`, `chrome.browserAction`,
  `chrome.contextMenus` APIs against our `TabManager`. Real work; the
  shim has rough edges.
- Highest-cost: build our own polyfills against our IPC surface. Months
  of work; only worth it if extensions become a product pillar.

### 6. Plug into the "unhosted" project (Chrome plugin bridge)

I don't know what "unhosted" you mean — there are a few projects named
"Unhosted" (the no-server-storage manifesto, the remotestorage spec,
etc.). When you confirm which, the integration shape is the same:

- **First PR — unpacked-extension loader (see §5).** Once that lands,
  Unhosted's plugin should drop in.
- If Unhosted is a server-style integration (e.g. remoteStorage):
  separate PR adding the protocol handler and Settings → Sync section.
  Off-by-default, per the no-account stance.

### 7. Intuitive (Framer Motion / Liquid Glass) polish — adaptive

Delta already uses `motion/react`. The asked-for direction is "Liquid
Glass / Framer Motion adaptive" — Apple's visionOS / Apple-Intelligence
look (translucent layers, depth, content-aware materials) animated
with Framer Motion spring physics. Concretely:

- **First PR — adaptive material layer.** A `<GlassSurface>` component
  that wraps panels (Sidebar, Settings, FindBar, ChromeMenu,
  LockScreen, Onboarding) with: backdrop-filter blur tuned to the
  page underneath, a 1px hairline border that picks its colour from
  the average luminance behind the surface, and a Framer-Motion
  spring-animated entry. Adaptive: the blur intensity and tint
  shift based on light/dark theme + scroll position.
- **Second PR — ⌘P command palette** with `LayoutGroup`
  morphing between commands. Raycast/Comet-style. Reuses GlassSurface.
- **Third PR — shared layout transitions** between Sidebar ↔ Settings
  ↔ History so they morph instead of slide.
- **Fourth PR — depth.** A subtle parallax on the new-tab background
  + a depth-tinted shadow under each panel so the surfaces feel like
  they're floating, not glued to the chrome.

The procedural new-tab background already does most of the
content-aware-material work for the *background*; this layer pulls
that energy into the chrome.

### 8. Manage RAM load

Each Electron `WebContentsView` is its own renderer process. Three
levers, in order of payoff:

- **First PR — discard inactive tabs.** Shipped. Mark a tab `discarded`
  after N minutes of inactivity; tear down its WebContentsView but keep
  the url+title+scroll position in the entry. On activate, recreate.
- **Second PR — RAM pip + Settings → Tabs.** Shipped. `N tabs · X MB`
  in the tab strip with a click-to-popover memory breakdown, a
  one-click "Discard idle tabs" button, and a presets row in Settings
  (Off / 5 / 15 / 30 / 60 / 240 min) wired to `tabDiscardMinutes`.
- **Third PR — soft live-tab cap.** Shipped. New `maxLiveTabs` setting
  (0 = unlimited, presets: 10 / 20 / 50 / 100). Enforced on create,
  on revive-by-click, and on settings change — oldest non-active live
  tab gets discarded until the count is within range. Lives in
  `TabManager.enforceTabCap` and a second preset row in Settings →
  Tabs & memory.

### 9. Updates — clearer + safer

The current updater is check-only (off by default) for unsigned builds.

- **First PR — explicit signing status in the update banner.** Show
  "unsigned build" prominently so the user knows the install they're
  about to do isn't notarised.
- Second PR: differential updates via electron-updater once signing is
  in place — only download the changed chunks, not the full bundle.
  Big win on slow connections.
- Third PR: rollback path if a launched update crashes on first run.
  Keep one prior version on disk; the launcher rolls back if the new
  one fails three boots.

### 10. Intuitive landing page

Today's [docs/index.html](../../../docs/index.html) is solid but text-heavy.

- **First PR — hero with a 6-second video loop** showing the agent
  reading a page + the permission card decision flow + the lock screen.
  Replaces the current static brand swatch.
- Second PR: a single "Try it" CTA that's actually a `delta://` deep
  link if Delta is installed, falls back to the GitHub Releases page if
  not.
- Third PR: a Comet/Arc-style scrollytelling sequence below the fold:
  "what makes this different" → three sections, each anchored on one
  privacy claim with the matching source file linked.

### 11. Developer-friendly

The single biggest pain point for contributors is "I want to add a
feature and don't know where the seams are."

- **First PR — `docs/extending.md`.** Step-by-step: add a new IPC
  surface, add a new Settings section, add a new act tool. Concrete
  examples copied from the recent SLM + LockScreen + Credentials work.
- Second PR: extract a `defineFeature({ ipc, settings, ui })` helper
  in `shared/` so new features wire up in one file instead of three.
- Third PR: TypeDoc + `pnpm docs:dev` for the public surface
  (`@shared/types`, `BrowserApi`, the main-side stores).

---

## Honest sequencing recommendation

If you only ship four PRs out of all of the above, in this order they
compound:

1. **EasyList ad-block** (§3 first PR) — visible, fast, finishes the
   "blocks ads + trackers" story.
2. **Click + type act tools** (§4 first PR) — unlocks every other
   agent feature, including booking and scheduled-agent runs.
3. **Unpacked extension loader** (§5 first PR) — credible Chromium
   parity in one move.
4. **Tab discard for inactive tabs** (§8 first PR) — the RAM ask, also
   the thing power users will notice immediately.

Then the SLM Phase A (§1), then polish (§7, §10), then everything else.

If a future round wants me to start one, name the section number — I'll
treat it as the next single PR's scope.
