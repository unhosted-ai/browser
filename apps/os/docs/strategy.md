# Unhosted OS — strategy

_The "AI OS" / second-brain pattern, ported from Claude-desktop-host to Unhosted OS-host. The five-skill framing is Ben Ang's; the mapping onto Unhosted OS is ours._

## Vault structure

OS Setup creates this layout in the user-picked folder. The exact shape comes from Ben's walkthrough; the wording of the `Claude.md` files is paraphrased so each one fits Unhosted OS's voice.

```
<vault>/
├── Claude.md                  ← root navigation map
├── context/                   ← who you are, the persistent facts
│   ├── Claude.md
│   ├── about.md
│   ├── beliefs.md
│   └── working-style.md
├── daily/                     ← time-stamped journal + meeting notes
│   ├── Claude.md
│   └── 2026-05-20.md          (created on demand)
├── projects/                  ← in-flight work, one folder per project
│   ├── Claude.md
│   └── README.md
├── intelligence/              ← market, competitors, research
│   ├── Claude.md
│   ├── market.md
│   ├── competitors.md
│   └── ICP.md
├── resources/                 ← reference docs you've collected
│   ├── Claude.md
│   └── README.md
└── skills/                    ← the agent's own learnings + prompts
    ├── Claude.md
    └── README.md
```

The root `Claude.md` is the navigation map. Each subfolder's `Claude.md` describes what belongs there, when to add a file, and how to name it. This is what lets the agent route context efficiently with few tokens — instead of scanning the whole vault, it reads the top-level `Claude.md`, then the subfolder's, then the specific file.

We deliberately skip the business-only folders (`departments/`, `team/`, `onboarding/`) for the solo profile. They're cheap to add later when Team OS lands.

## Skill 1 — OS Setup

**What it does in Ben's flow:** runs the `/OS setup` skill in Claude desktop, asks where the vault lives, generates the folder structure and `Claude.md` maps, then walks the user through 12 sections of questions (you, company, market, ICP, etc.) and files those answers into the right folders.

**What it does in Unhosted OS:**

1. **Settings → Second brain → Set up vault.** Native folder picker. Default suggestion is `<userData>/second-brain/`, but the user can put it anywhere (iCloud Drive, Dropbox, Syncthing — all fine).
2. Unhosted OS creates the folder structure listed above + writes the `Claude.md` maps.
3. The path is persisted in `settings.json` so later launches know where the vault is.
4. **The 12-section brain dump** is a *separate* in-app wizard (next sub-PR). Today's PR ships the structure-creation step only.
5. The agent's system prompt is augmented (when a vault is configured) to mention the vault path and how to read/write it — so chat turns can use `Save this to <vault>/projects/foo.md` naturally.

**Why we split it this way:** Ben's wizard does setup + brain-dump in one go because Claude desktop has nothing else for the user to do meanwhile. Unhosted OS is a browser — the user is going to walk away mid-wizard. Persisting "I have a vault" separately from "I've answered the 12 sections" lets you come back and pick up later without restarting.

## Skill 2 — OS Operator (next PR)

**What it does in Ben's flow:** a Claude-desktop scheduled task pulls from Fireflies (meeting transcripts), Slack, email, analytics, etc., and writes a daily brief into `daily/`.

**What it does in Unhosted OS:** a Unhosted OS scheduled task (we already shipped the infra — [`apps/browser/src/main/schedules.ts`](../../browser/src/main/schedules.ts)) with `action: "agent"` and a system prompt that:

- Lists recent Unhosted OS conversations (`userData/conversations/*.json.gz`).
- Lists the day's bookmarks + browsing history.
- Optionally reads from external connectors *only if the user has wired them in via a custom OpenAI-compatible endpoint that proxies to Slack / Gmail / Fireflies.* (External MCP is the cleaner path long-term — Skill 5.)
- Writes the brief to `<vault>/daily/YYYY-MM-DD.md`.

A scheduled task with this prompt + a 24h `every` trigger is one click to set up in the existing Settings → Scheduled tasks UI. The first PR after OS Setup just bundles a "Run the Operator daily" preset that creates that task for the user.

## Skill 3 — OS Optimizer (PR after Operator)

**What it does in Ben's flow:** an audit skill goes through the vault, finds duplicate files, token bloat, dead wiki links, conflicting info, and reports a health-score dashboard. Best run weekly.

**What it does in Unhosted OS:** same shape — a scheduled task with `action: "agent"` and an audit-style prompt. First PR bundles the prompt + a weekly `every` schedule. A dedicated `audit_vault` agent tool is a future enhancement that returns structured findings rather than free-text.

## Skill 4 — Team OS (out of scope for solo)

**What it does in Ben's flow:** real-time sync of the Obsidian vault across teammates using a custom Relay plugin, with per-folder permissions (readable by team, editable only by owners).

**What it does in Unhosted OS:** out of scope while you're solo. When the team comes in, the path is: keep the vault folder under Obsidian Relay sync (Unhosted OS doesn't need to know about Relay — it just sees a folder), and we add a `permissions.yaml` per subfolder that Unhosted OS's agent honours when writing.

## Skill 5 — OS MCP (out of scope for solo, but informs design)

**What it does in Ben's flow:** the local vault is exposed as a remote MCP connector via a Relay server, letting Claude routines update the vault from the cloud even when the laptop is closed.

**What it does in Unhosted OS:** Unhosted OS's main process is well-positioned to expose an MCP server pointing at the vault. That's a real PR — needs an MCP transport, auth, and a public endpoint story. We can fork the design when you're ready.

For now the design implication is: keep the vault on disk with no Unhosted OS-specific format. Markdown + frontmatter only. That way an MCP server (Unhosted OS-built or external) can read it without translation.

## How this fits Unhosted OS's existing architecture

Already in place and reused:

- **`safeStorage` for any secrets.** The vault path is non-sensitive (just a path string); persisted in `settings.json` directly.
- **`SettingsStore` for the toggle + path.** Same shape as `accountLockKind` / `personalSlmEnabled`.
- **`SchedulesStore` for Operator + Optimizer.** Already supports `agent` actions. Both Operator and Optimizer are scheduled-agent tasks.
- **Native folder picker via `dialog.showOpenDialog`** — same as the credentials CSV picker and the new-tab background folder picker.
- **`safeStorage`-encrypted credentials** for any external connector the user wires up (Slack token, Gmail OAuth refresh token, etc.). Stored in the existing credentials store.
- **The agent's system prompt** is the natural place to surface "you have a vault at `<path>`, here are the conventions." Modifying it conditionally on `vaultPath` being set is a 5-line change.

New code added:

- `apps/browser/src/main/second-brain.ts` — the `SecondBrainStore` that creates the vault, writes the `Claude.md` maps, and exposes IPC. Shape mirrors `CredentialsStore` and `SchedulesStore`.

## Open questions for solo v1

1. **Where should the default vault live?** Three sane options:
   - `<userData>/second-brain/` — owned by Unhosted OS. Wiping Unhosted OS wipes the vault. Worst for backup.
   - `~/Documents/Unhosted OS Second Brain/` — visible to the user. Better for backup, but conflicts with their existing Documents layout.
   - User picks at setup time, no default. Most honest; one extra click.
   Picked: **let the user pick**, but pre-fill `<userData>/second-brain/` in the dialog.

2. **Does the agent need a "save this" tool?** Right now the agent has `navigate`, `open_tab`, `click`, `type`, and the read tools. It doesn't have `write_vault_file`. For the solo OS Setup PR we punt — the user explicitly types "save this to my vault at projects/foo.md" and the agent does it via `executeJavaScript`/filesystem-write through a planned `vault.write` tool. Adding that tool is the natural next sub-PR after OS Setup ships.

3. **Should the brain-dump wizard live in the Settings panel or the Sidebar?** Sidebar is the conversation surface — better for "talk at length" mode (per Ben's voice-to-text suggestion). Picked: **Sidebar**, with a small "OS Setup wizard" mode that takes over the composer for 12 sections.
