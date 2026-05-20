// Second-brain vault — Skill 1 (OS Setup) from the AI-OS pattern.
//
// What this owns:
//   - Creating the vault folder structure (context / daily / projects /
//     intelligence / resources / skills) at a user-picked path.
//   - Writing the root + per-folder `Claude.md` navigation maps that
//     tell any AI agent (Delta's own, or Claude desktop, or anyone
//     pointing at the same folder) where to read and write.
//   - Listing what's there, with cheap metadata (file count + size).
//
// What this DOESN'T own:
//   - The 12-section brain dump wizard. That's a renderer-side
//     conversation flow — the data lands here via the agent's
//     vault-write tool (planned, see roadmap).
//   - Real-time updates ("Operator"). That's a scheduled agent task —
//     `apps/browser/src/main/schedules.ts` already supports it; we
//     just bundle a preset prompt and a daily trigger.
//   - Cleanup ("Optimizer"). Same shape as Operator.
//   - Cloud / MCP exposure. Future PR.
//
// Storage model: the vault is plain Markdown on disk. No Delta-specific
// format, no database. You can open the same folder in Obsidian or any
// other Markdown editor and it Just Works. The path is persisted in
// settings.json under `secondBrainPath`.

import { app, BrowserWindow, dialog } from "electron"
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export type VaultStatus = {
  path: string
  fileCount: number
  totalBytes: number
  /** True iff the path exists AND has a Claude.md at the root. */
  initialised: boolean
}

/** Subfolders we create at vault init. Order matters for the root index. */
const VAULT_FOLDERS = [
  "context",
  "daily",
  "projects",
  "intelligence",
  "resources",
  "skills",
] as const

export class SecondBrainStore {
  /** Open the native folder picker. Returns the chosen path or null on cancel. */
  async pickPath(parent: BrowserWindow | null, defaultPath: string): Promise<string | null> {
    const opts: Electron.OpenDialogOptions = {
      title: "Pick or create the second-brain folder",
      properties: ["openDirectory", "createDirectory"],
      defaultPath,
      message:
        "Pick an empty folder (or one with existing notes). Delta will create the second-brain structure inside it.",
    }
    const result = parent
      ? await dialog.showOpenDialog(parent, opts)
      : await dialog.showOpenDialog(opts)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]!
  }

  /**
   * Create the vault structure at `path`. Safe to call on an existing
   * vault — folders and Claude.md files that already exist are left
   * alone; only missing pieces are filled in.
   *
   * Returns the resulting status. Throws if `path` itself can't be
   * created.
   */
  initialise(path: string): VaultStatus {
    if (!existsSync(path)) mkdirSync(path, { recursive: true })

    // Top-level Claude.md is the entry point any agent reads first.
    const rootClaude = join(path, "Claude.md")
    if (!existsSync(rootClaude)) writeFileSync(rootClaude, rootClaudeMd(), "utf8")

    for (const folder of VAULT_FOLDERS) {
      const dirPath = join(path, folder)
      if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })
      const claudeMd = join(dirPath, "Claude.md")
      if (!existsSync(claudeMd)) writeFileSync(claudeMd, folderClaudeMd(folder), "utf8")
    }

    // A starter context file so the user has somewhere obvious to begin.
    const startFile = join(path, "context", "about.md")
    if (!existsSync(startFile)) writeFileSync(startFile, contextAboutMd(), "utf8")

    return this.status(path)
  }

  status(path: string): VaultStatus {
    if (!path || !existsSync(path)) {
      return { path, fileCount: 0, totalBytes: 0, initialised: false }
    }
    const claudeAt = join(path, "Claude.md")
    let fileCount = 0
    let totalBytes = 0
    walk(path, (full) => {
      try {
        const s = statSync(full)
        if (s.isFile()) {
          fileCount += 1
          totalBytes += s.size
        }
      } catch { /* skip */ }
    })
    return { path, fileCount, totalBytes, initialised: existsSync(claudeAt) }
  }

  /** Default path suggestion for the picker — Delta's userData folder. */
  defaultPath(): string {
    return join(app.getPath("userData"), "second-brain")
  }
}

// ── Walking helper ──────────────────────────────────────────
function walk(start: string, visit: (full: string) => void): void {
  let entries: string[]
  try { entries = readdirSync(start) } catch { return }
  for (const name of entries) {
    if (name.startsWith(".")) continue
    const full = join(start, name)
    try {
      const s = statSync(full)
      if (s.isDirectory()) walk(full, visit)
      else visit(full)
    } catch { /* ignore unreadable entries */ }
  }
}

// ── Markdown templates ──────────────────────────────────────
// Voice is deliberately neutral so this works as well for an agent
// pointed at the vault from another tool (Claude desktop, Cursor, an
// MCP client) as it does for Delta's own agent. We don't say "Delta"
// in here — the vault is yours, not the browser's.

function rootClaudeMd(): string {
  return `# Vault map

This is your second-brain vault. The folders below have a known shape;
the per-folder \`Claude.md\` files describe what goes in each.

Read the per-folder \`Claude.md\` before adding a file — the right
location keeps the vault routable with few tokens.

## Folders

- [\`context/\`](context/Claude.md) — who you are. Persistent facts about
  you, your work, your style. Read at the start of every session.
- [\`daily/\`](daily/Claude.md) — time-stamped notes. One file per day in
  the form \`YYYY-MM-DD.md\`. Meeting notes, day-end recaps, ad-hoc
  brain dumps.
- [\`projects/\`](projects/Claude.md) — in-flight work. One subfolder per
  project, with a \`README.md\` describing scope + status + decisions.
- [\`intelligence/\`](intelligence/Claude.md) — research about the
  outside world. Market, competitors, ICP, useful sources.
- [\`resources/\`](resources/Claude.md) — reference material you've
  collected. Articles, transcripts, templates.
- [\`skills/\`](skills/Claude.md) — the agent's own learnings + prompts.
  Reusable system prompts, tool recipes, "remember this" notes.

## Conventions

- Files are Markdown only. Use frontmatter (\`---\`) for metadata
  when it helps (\`type:\`, \`tags:\`, \`updated:\`).
- Cross-link with \`[[wiki-style]]\` links — they survive renames.
- Don't try to design the perfect structure on day one. Start sparse;
  the vault grows naturally.

## When in doubt

If a fact is about *you*, it goes in \`context/\`.
If it's *today's note*, it goes in \`daily/\`.
If it has a name and an owner, it's a *project* in \`projects/\`.
If it's the *world outside*, it's *intelligence*.
If it's a *quoted source*, it's a *resource*.
If it's a *reusable prompt or process*, it's a *skill*.
`
}

function folderClaudeMd(folder: string): string {
  const blurbs: Record<string, string> = {
    context: `Persistent facts about you. Read first in every session so the
agent doesn't ask the same questions twice.

Suggested files:
- \`about.md\` — who you are, what you do, where you live.
- \`beliefs.md\` — values, taste, what you optimise for.
- \`working-style.md\` — how you like to communicate; pet peeves; preferred formats.
- \`goals.md\` — current quarter/year goals.

Add files when a fact is durable (months, not days). For temporary
context, prefer \`../daily/\`.`,
    daily: `One file per day. Format: \`YYYY-MM-DD.md\`.

Typical sections inside a daily file:
- Today's priorities
- Meeting notes
- Decisions made
- End-of-day recap

If a daily note contains a decision worth keeping, mirror it into
\`../context/\` or the relevant \`../projects/\` README so it survives
beyond today.`,
    projects: `In-flight work, one subfolder per project.

Each project subfolder should have:
- \`README.md\` — scope, status, current question
- (optional) \`decisions.md\` — log of decisions + their rationale
- (optional) \`open-questions.md\`

When a project is done, archive its folder into
\`../resources/archives/<project>\` rather than deleting.`,
    intelligence: `What you've learned about the world outside.

Suggested files:
- \`market.md\` — your market, sized, trended.
- \`competitors.md\` — who's competing for the same outcome.
- \`ICP.md\` — ideal customer profile.
- \`signals.md\` — recurring patterns worth watching.`,
    resources: `Reference material — articles, transcripts, templates,
quoted sources. Anything you didn't write but want to re-read.

Cite the source in frontmatter:
\`\`\`yaml
---
source: https://...
date_added: 2026-05-20
---
\`\`\`
`,
    skills: `Reusable prompts, tool recipes, and "remember this for
next time" notes. The agent's own toolbox.

When the agent learns a useful pattern (a system prompt that works
well, a tool-use recipe, a process that paid off), write it here.`,
  }
  const blurb = blurbs[folder] ?? ""
  return `# ${folder}/\n\n${blurb}\n`
}

function contextAboutMd(): string {
  return `# About me\n\n_Replace this stub with a brain-dump about you: who you are,\nwhat you do, where you live, what you're working on this quarter._\n`
}
