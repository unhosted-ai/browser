# Contributing to Delta

The repo style prefers a real conversation over strict CONTRIBUTING
ceremony. This file is short on purpose. Read it once.

## How to file something useful

- **Bug** → use the [Bug report](https://github.com/Delta-Practice/Browser/issues/new?template=bug.yml) template.
- **Feature idea** → use the [Feature request](https://github.com/Delta-Practice/Browser/issues/new?template=feature.yml) template. Read [`apps/browser/docs/about.md`](apps/browser/docs/about.md) first — there are explicit non-goals (no account, no telemetry, no extension store, no v1 sync) and a feature that conflicts with one of them needs a thoughtful argument for why we'd change the non-goal.
- **Site doesn't work** → use the [Site](https://github.com/Delta-Practice/Browser/issues/new?template=site_didnt_work.yml) template. These reports drive tracker-blocklist, reader-mode, and OAuth-popup fixes.
- **Security vulnerability** → do *not* open a public issue. Use [GitHub's private vulnerability reporting](https://github.com/Delta-Practice/Browser/security/advisories/new). See [SECURITY.md](SECURITY.md).

## Sending a PR

Small PRs land fast. Big PRs land slow because they need conversation.

1. Open an issue first if the change is non-trivial — surfaces objections before the work goes in. Trivial fixes (typos, broken links, single-file refactors) can skip this.
2. Fork, branch, push. Branch name is up to you.
3. Open the PR against `main`. The PR description should answer: *what changed, why, and what I tested.*
4. Make sure `pnpm typecheck` passes. The CI rig is light — we run typecheck and a build. Failing tests block merge.
5. Reviews come from one person right now (Ankur). Pace expectation: a few days for a small PR, longer for an architectural change.

## Local development

```bash
git clone https://github.com/Delta-Practice/Browser.git
cd Browser
pnpm install
unset ELECTRON_RUN_AS_NODE     # if your shell sets this
pnpm delta:dev
```

To verify your changes:

```bash
cd apps/browser
pnpm typecheck   # tsc --noEmit on both node + web configs
pnpm build       # produces a runnable bundle in out/
```

For a packaged build (slower, requires icons + entitlements):

```bash
pnpm make
```

Architecture is documented in [`apps/browser/docs/agent-design.md`](apps/browser/docs/agent-design.md) — ~700 lines, the load-bearing decisions of the project. Read it before touching the agent loop, the permission gate, or the IPC contract.

## Code style

There isn't a strict style guide. The conventions in the existing code are:

- TypeScript everywhere. New files in `apps/browser/src/main/`, `preload/`, `renderer/src/`, or `shared/` per their respective process boundary.
- The IPC contract is defined in [`apps/browser/src/shared/types.ts`](apps/browser/src/shared/types.ts). Adding a new IPC channel means: type added in `shared/types.ts`, handler in `main/index.ts`, exposure in `preload/index.ts`, consumer in the renderer.
- The agent runtime, tool execution, and conversation state live in main. The renderer is a typed view over an event stream — it requests actions but never owns them. That separation is load-bearing for the privacy posture; don't push state across the IPC boundary "just because it's easier."
- Comments explain *why*, not *what*. Default to writing none. Add one when there's a hidden constraint, a workaround for a specific bug, or behavior that would surprise a future reader.

## What gets accepted

- Bug fixes, with reproductions in the issue.
- Tracker-list expansions (additions to `apps/browser/src/main/tracker-list.ts`) — be conservative: never add a domain that also serves first-party CDN content.
- Site-compat fixes (reader mode for site X, popup handling for OAuth provider Y).
- Performance work, especially around the agent loop, tab activation, and the WebContentsView resize.
- Documentation. Especially: improvements to `agent-design.md`, expanded `about.md` reasoning, contributor-facing notes here.

## What probably gets pushed back

- Anything that conflicts with a non-goal in `about.md` without an argument for changing the non-goal.
- New optional dependencies. The dep tree is intentionally tiny. Ask first.
- New cloud providers without a clear *why* — Delta speaks any OpenAI-compatible endpoint, so adding a hardcoded provider entry needs to add user-facing value beyond "I use this one."
- Large refactors of the IPC boundary. The shape is load-bearing; the audit doc is the place to argue for changes.

## Thanks

The project is run by one person right now. Slow + sustainable beats fast + abandoned. If you've made it this far, you're already the kind of contributor we want.
