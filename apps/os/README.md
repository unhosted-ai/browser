# Delta OS — the "AI OS" / second brain

_Status: **Skill 1 (OS Setup) implemented inside Delta**. Skills 2-5 (Operator, Optimizer, Team OS, MCP) are roadmap — see [`docs/strategy.md`](docs/strategy.md). The implementation lives in [`../browser/src/main/second-brain.ts`](../browser/src/main/second-brain.ts) and the Settings UI._

## What this is

A structured, on-disk "second brain" that Delta's agent (and any other AI tool you point at it — Claude desktop, Obsidian, your own scripts) can read and write. The pattern is Ben Ang's "AI OS" / 5-skills layout, adapted so that Delta — not Claude desktop — is the host application.

The vault is a folder on your disk with a known structure (`context/`, `daily/`, `projects/`, `intelligence/`, `resources/`, `skills/`) and a `Claude.md` at every level acting as a navigation map. You can open the same folder in Obsidian for the graph view; nothing about the data is Delta-specific.

## Why this is different from Ben's setup

| Aspect | Ben's setup | Delta's |
|---|---|---|
| Host app | Claude desktop | Delta browser (already has the agent + tools + schedules + lock) |
| Vault home | User-picked folder, often iCloud / Dropbox / OneDrive | User-picked folder; default `~/Library/Application Support/Delta/second-brain/` (macOS) |
| Real-time updates ("Operator") | Claude desktop scheduled tasks pulling from Fireflies/Slack/email | Delta's existing [scheduled tasks](../browser/src/main/schedules.ts) with `action: "agent"` |
| Optimization ("Optimizer") | Run audit skill periodically | A scheduled `agent` task with the audit prompt; future: a Delta tool that emits the audit report |
| Team sharing ("Team OS") | Obsidian Relay plugin + permissions | Out of scope for solo. Future: hooks the same Relay folder so a Delta + an Obsidian vault stay aligned |
| Cloud access ("MCP") | Relay server → MCP endpoint → Claude routines | Future: same MCP shape exposed by Delta's main process |

## The 5 skills, today's status in Delta

| Skill | What it does | Status in Delta |
|---|---|---|
| **OS Setup** | Create the vault folder + structure + `Claude.md` maps; walk through the 12-section brain dump | **Shipped.** Settings → Second brain → Set up. See [`docs/strategy.md`](docs/strategy.md) for the structure. |
| **OS Operator** | Scheduled, real-time updates into the vault | **Partial — infra + vault tools shipped.** Delta's scheduled-task system can run an `agent` action against the vault on a cron, and the agent now has `vault_list` / `vault_read` / `vault_write` / `vault_append` tools (bounded to the configured vault, path-traversal-guarded). The Operator preset prompt + a "Set up daily brief" button + external connectors (Fireflies / Slack / Gmail) are the next PRs. |
| **OS Optimizer** | Audit + clean the vault — dedupe, fix links, compress | **Roadmap.** Cheapest first PR: a `delta-optimize` scheduled-agent prompt that runs weekly. |
| **Team OS** | Multi-user sync with per-folder permissions via Obsidian Relay | **Out of scope for solo.** Keep until validated solo for 2+ months. |
| **OS MCP** | Expose vault as a remote MCP connector for cloud routines | **Roadmap.** Delta could expose its own MCP server pointed at the vault. |

## You're solo

Per your message: solo, no team for now. Skills 4 + 5 (Team OS, MCP) are not on the critical path. The order is:

1. **OS Setup** (shipped). Set up the vault. Do the brain dump over a few sessions; don't try to do all 12 sections at once.
2. **OS Operator** (next PR). Schedule a daily `agent` task that reads recent conversations + the day's bookmarks + browsing history, drops a `daily/YYYY-MM-DD.md` brief into the vault. No external connectors to start — your day inside Delta is enough signal.
3. **OS Optimizer** (PR after that). Weekly cleanup pass.

## Quickstart (once you've launched Delta with the new build)

1. Open **Settings → Second brain**.
2. Click "Set up vault". A native folder picker opens — pick where you want it. (Default suggestion: a folder inside iCloud Drive / Dropbox / Syncthing if you want it on multiple machines; otherwise anywhere on disk.)
3. Delta creates the vault structure and writes the `Claude.md` maps.
4. The vault is now visible in the same Settings panel. You can optionally open the folder in Obsidian — it's just Markdown on disk.

## Source

The 5-skill framing comes from Ben Ang's YouTube walkthrough at <https://youtu.be/zElKhlFkqU4>. His original toolchain is Claude desktop + Obsidian Relay; Delta replaces Claude desktop and keeps Obsidian as the optional graph-view UI over the same folder.
