# About Delta Practice

> *A privacy-first AI browser, built in the open.*

This document is the why. The other design docs in this folder cover the how
([agent-design.md](agent-design.md), [identity.md](identity.md),
[distribution.md](distribution.md)). Read this first if you're trying to
decide whether Delta is the right project to spend your evening with —
either using it, or contributing to it.

---

## The name

**Delta** carries three meanings, all intentional:

1. **Δ — the Greek letter.** The mathematical symbol for *change* or
   *difference*. The agent in this browser exists to manage the *delta*
   between what you already know and what's on the page in front of you.
   That's the work — not "search," not "summarise," not "chat." The space
   between you and the open web.

2. **A river delta.** The place where a fast-moving thing (a river) meets
   something larger (the sea), branches into many paths, and quietly
   deposits what it was carrying. A privacy-respecting browser is the same
   shape: your activity is the river, the open web is the sea, and the
   delta is where attention lands. It's where the work happens — and it's
   where data should *stay,* not be carried out to sea.

3. **Time delta.** Between *then* and *now*. Between what the model knew
   at training and what your tab is showing today. Between the way browsers
   were built (assume good faith; serve the page; trust the network) and
   the way they need to be built now (assume hostile pages; isolate the
   agent; never assume the network).

**Practice** is the second word, and the deliberate one. Three layers:

1. **Practice as in *the act of doing*.** Software in practice, not in
   theory. We're not writing a paper about an AI browser; we're shipping
   one.

2. **Practice as in *a discipline*.** Like a medical practice, a legal
   practice, an architectural practice. A long, slow craft that values
   getting the mundane things right: the keyboard shortcuts, the address
   bar, the way windows manage focus. An AI browser that treats those as
   incidental ends up being a chat panel with tabs.

3. **Practice as in *we're still figuring it out*.** The honest reading.
   Nobody knows what an AI browser is supposed to be yet — Comet, Arc,
   Brave, and a dozen others are running their own experiments. Delta is
   ours. The repo is public on day one because the practice happens in
   the open, not behind a release.

Together: **Delta Practice** — the discipline of building change at the
edge between you and the web.

---

## The thesis

> *The next browser is not a Chrome with a chat button. It's a browser
> that runs the model on your machine, reads pages with permission,
> acts on your behalf with consent, and forgets when you tell it to.*

That sentence sounds simple. The four clauses are each load-bearing.

**Runs the model on your machine.** Every other AI browser on the market
ships your queries — and frequently the contents of the page you're on —
to a cloud LLM. Delta defaults to a local LLM (Ollama, LM Studio,
llama.cpp, MLX) so the model sees the page on the device that already
sees the page. Cloud providers (OpenAI, Anthropic) work too, but only
when you explicitly enable them. Off by default. The privacy promise is
not a setting; it's the architecture.

**Reads pages with permission.** "Read" tools (`list_tabs`,
`read_active_page`, `read_tab`) auto-run because they're cheap and
reversible. The model gets your page text wrapped in `<page_content>`
tags and is system-prompted to treat anything inside as untrusted data
— so a page that says *"ignore previous instructions"* doesn't hijack
the agent.

**Acts on your behalf with consent.** "Act" tools (`navigate`, `open_tab`,
eventually `click` and `type`) route through a per-`(origin, tool)`
permission gate that lives in the runtime, not the prompt. The model
cannot bypass it no matter what a malicious page tells it to do.
Sensitive sites — banking, government, payment, wallet — auto-block
*all* act tools. The agent never sees that those tools exist for those
tabs.

**Forgets when you tell it to.** Conversations persist locally by
default — quit Delta and reopen, your chats are still there. Click ×
on a thread to delete it from disk. There is no remote conversation
log because there is no remote.

Each of those clauses is the answer to a question that came up while
designing the product: *how do we make this private? how do we
demonstrate that the page didn't poison the agent? how do we tell users
what's about to happen? how do we let them undo a session?*

---

## What we're building, in concrete terms

A short list of the actual product surface. None of these is hand-wavy;
each one corresponds to shipped code in this repo or the next 1–2
sessions of work.

| Surface | What it does |
| --- | --- |
| **Tabs + URL bar** | Standard browser baseline. ⌘T, ⌘W, ⌘L, ⌘R, ⌘F, ⌘⇧T, ⌘1..⌘9 — the muscle memory works. |
| **Δ Assistant** | Right-side sidebar that reads the active tab and chats. Calls tools autonomously. Conversations persist per-thread. |
| **Capability badges** | Read · Act · Tasks. Tells you at a glance what the agent can do *now*, not just what was advertised. |
| **Permission cards** | Render inline in the conversation when an act tool needs consent. Allow / Always-allow / Block. |
| **Settings → Connection** | One home for "where does the model come from": Ollama / LM Studio / llama.cpp / MLX, OpenAI, Anthropic, custom OpenAI-compatible endpoints. Keys encrypted in OS keychain. |
| **Safety badges** | Address bar shows GOV / EDU / ORG / WEB / BLOCK so you can tell a `usa.gov` from a `usa-gov.tk` at a glance. |
| **delta://newtab** | Daily-rotating procedural landing page. Editorial register. No tracker. |
| **Profiles (planned)** | Local profile picker on launch. No remote account, ever. See [identity.md](identity.md). |

The roadmap is not a moonshot. It's a series of small, individually-
shippable improvements that each leave the app working end-to-end.

---

## What we're explicitly *not* building

Stating these is half the design. They keep us honest.

- **A Delta account.** There is no email/password, ever. The device is
  the identity. (See [identity.md](identity.md).)
- **Telemetry.** None. Not even crash reporting until we figure out a
  privacy-respecting way to do it.
- **Sync — for v1.** Conversations and settings stay on this device.
  Cross-device sync would be an opt-in, end-to-end-encrypted feature
  where the encryption key never reaches a server. Bitwarden / Signal
  / Standard Notes ship variants of this; it's a separate problem.
- **A hardened-security browser.** Tor Browser, Brave with Shields-
  strict, and Firefox-with-arkenfox cover that ground better than we
  could. Delta is a *default-good* browser — fewer tracking surfaces
  enabled, fewer assumptions about what the user agreed to.
- **A Chrome extension store integration.** Manifest V3 is a moving
  target and Electron's MV2 support is partial. We'd rather ship the
  three or four functions extensions provide (ad-blocking, password
  fill, dark-reader-style overrides) as built-ins than reinvent the
  extension layer.
- **A mobile app.** Electron is desktop-only. iOS/Android is a separate
  product, separate codebase, separate problem. Documented in the
  audit as "park for now."

---

## Open source — and why

Delta is MIT-spirited (license file pending; the practical posture is
"do whatever you want, don't ship a fork named Delta"). The repo is
public from day one. Three reasons:

1. **Privacy claims need verification.** "Local-first, no telemetry,
   keys in keychain" is a line on a landing page until someone can
   read the code and confirm. Closing the source on a privacy-first
   browser is a contradiction. The code is the proof.

2. **Architecture is the moat, not the binary.** The thoughtful parts
   of this project are the design docs and the discipline of staying
   true to them — not any clever 200-line trick. A team that wants to
   fork and ship a competitor will take far more time understanding
   the design than copying the code; if they do that work, they'll
   probably ship something different anyway.

3. **Contributors over velocity.** A solo project moves fast for two
   weeks and stops. A small community moves slower per week and
   doesn't stop. The repo is structured to be readable: everything is
   under `apps/browser/src/` with one folder per process, the
   IPC contract is in one shared types file, the design docs explain
   *why* before any code goes in. New contributors should be productive
   in under a day.

What we ask in return — see [`brand/guidelines.md`](../../../brand/guidelines.md):

- Don't ship a fork called "Delta" with the same Δ-with-spark mark.
  Pick your own name and your own brand.
- Don't pretend a fork is the original. Always link upstream.
- The brand assets are free for discussion, screenshots, talks, and
  "see this thing I'm building on top of Delta" demos. They are not
  a commercial license.

If in doubt, [open an issue](https://github.com/Delta-Practice/Browser/issues).

---

## The constraints we accept

Things that aren't bugs, they're choices:

- **You bring your own keys.** No bundled API key, no free-tier
  smoke-and-mirrors. If you want cloud, you sign up with the cloud
  provider. We'd rather ship a browser that fails closed than one that
  papers over costs with someone else's credentials.

- **Local models are weaker than frontier cloud.** A 7B model on your
  laptop won't beat Claude 4.7 at reasoning. We accept that — the
  trade is privacy, latency, offline-ness, and the pace of local-model
  improvement (which has been ~2× per year on per-watt benchmarks).
  By 2027 the gap closes.

- **Tool use breaks on weak models.** Some local models hallucinate
  tool calls or output them as plain text. Documented in
  [agent-design.md](agent-design.md) §2.3; we surface a warning when
  detected. Solution: run a stronger model or use cloud.

- **Some things won't work yet.** OAuth popups that depend on the
  `window.opener` postMessage bridge sometimes break when we route
  popups into tabs. Documented; will revisit per-site if it bites a
  real flow.

- **Releases are not signed yet.** You can build a `.dmg` from this
  repo today; macOS will warn it's "unidentified developer." Real
  notarization needs an Apple Developer ID — see
  [distribution.md](distribution.md). One config flip away when it's
  time.

- **The repo is run by one person right now.** That's the practice
  posture: the doc is honest about who's behind it. Contributors
  welcome; sustainable velocity beats heroic velocity.

---

## What success looks like

I don't think Delta needs to be the most popular browser to be a
successful project. Success looks like:

- A few hundred people running it daily because they value the privacy
  posture and the agent works on their hardware.
- Three or four engineers who didn't write the original code feel
  comfortable shipping changes to it.
- The architecture in [agent-design.md](agent-design.md) survives
  contact with reality — the IPC boundary, the permission gate, the
  tool registry don't get rewritten in a panic when Phase 4 lands.
- "Use Delta" being a reasonable answer when somebody asks "is there
  an open browser that doesn't ship my data?"

That's the bar. Anything more is a bonus.

---

## Where to go next

- **Use it.** [Quickstart in the README](../../../README.md#quickstart).
- **Read the architecture.** [agent-design.md](agent-design.md) — 700
  lines, the load-bearing decisions of the project.
- **Read the privacy posture.** [identity.md](identity.md) — the
  "device is the account" model, written before any code went in.
- **Contribute.** Open an issue, or just open a PR. The repo style
  prefers a real conversation over a strict CONTRIBUTING.md
  ceremony — say what you're trying to change and why.

The agent in your sidebar is a small thing. The discipline of getting
that small thing right is the practice.
