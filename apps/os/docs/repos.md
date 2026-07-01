# Repos plan

_Every repo that would plausibly exist if we pursue the AI-OS direction, plus a `gh repo create` command for each. **Nothing has been created yet** — pasting these into your shell is the action; I held off on doing it for you because creating GitHub state in your org is visible and hard to reverse._

## Repos that make sense to create now

These are pieces where having a separate repo lowers friction for *other* people to use them (Claude-desktop users adopting Ben's pattern, Cursor users, etc.) and don't carry a sync cost back into the monorepo.

### 1. `delta-os-vault-template`

A starter second-brain vault — just the folder skeleton + `Claude.md` files that Unhosted OS's `SecondBrainStore.initialise()` writes, but as a standalone repo people can clone or `degit`. Useful for anyone who wants the Ben-style vault without running Unhosted OS.

```bash
gh repo create unhosted-ai/delta-os-vault-template \
  --public \
  --description "Starter second-brain vault — folder structure + Claude.md navigation maps. Clone, point Claude/Cursor/Unhosted OS at it, start dumping." \
  --homepage "https://github.com/unhosted-ai/browser/tree/main/apps/os"
```

After creation, populate from the templates inside [`apps/browser/src/main/second-brain.ts`](../../browser/src/main/second-brain.ts). One-shot init script:

```bash
# from the new repo's working dir:
mkdir -p context daily projects intelligence resources skills
# Then copy the Claude.md text from second-brain.ts's rootClaudeMd() + folderClaudeMd() into the right files.
```

### 2. `delta-skills`

A standalone catalogue of prompts + system prompts + tool recipes that work against the vault. The "skill" abstraction Ben uses in his plugin — each skill is a Markdown file with a system prompt and a description. Unhosted OS would read these the same way Claude desktop reads Ben's. Useful for sharing recipes between Unhosted OS users without forcing them to clone the whole browser repo.

```bash
gh repo create unhosted-ai/delta-skills \
  --public \
  --description "Prompts + tool recipes for the AI-OS second-brain pattern. Drop into your vault's skills/ folder." \
  --homepage "https://github.com/unhosted-ai/browser/tree/main/apps/os"
```

Inside: one Markdown file per skill — `os-operator.md`, `os-optimizer.md`, etc. Each is a system prompt + a description of when to use it. No code.

## Repos to create later, not now

These either need code to exist first or have meaningful sync overhead. Listed so the names are reserved in your head.

### 3. `delta-obsidian-plugin`

An Obsidian community plugin that knows about Unhosted OS's vault conventions — surfaces the per-folder `Claude.md` as a sidebar, shows a "what would the agent do here" affordance per file. Decision point: do we want Unhosted OS users to also use Obsidian, or is the vault the only contract?

```bash
gh repo create unhosted-ai/delta-obsidian-plugin \
  --private \
  --description "Obsidian plugin for the Unhosted OS second-brain vault. (Not yet built.)"
```

### 4. `delta-mcp-server`

When Skill 5 (OS MCP) lands. A small MCP server that exposes a vault directory as MCP-readable resources, so cloud-hosted Claude routines can read/write it. Equivalent of Ben's Relay-MCP setup.

```bash
gh repo create unhosted-ai/delta-mcp-server \
  --public \
  --description "MCP server that exposes a vault directory to cloud-hosted agents. (Not yet built.)"
```

### 5. `delta-os-image`

A bootable image for a target device — Pi 5 / Chromebook reflash / x86 mini-PC — that boots straight into Unhosted OS. The Option-C from the earlier draft of the strategy doc (since superseded by the AI-OS framing, but still a real direction for kiosk / appliance use). Holds nothing today.

```bash
gh repo create unhosted-ai/delta-os-image \
  --private \
  --description "Bootable image — Linux + Unhosted OS as the only session. Kiosk / appliance use. (Not yet built.)"
```

## Repos NOT to create

Naming them so the impulse doesn't reappear later:

- `delta-os` (too generic; conflicts with the existing `apps/os/` workspace inside the monorepo).
- `delta-agent` (the agent lives inside `apps/browser/` and depends on the rest of the runtime; splitting it would create import-graph pain).
- `delta-tracker-list` / `delta-ad-list` (the lists are best built at CI time from EasyPrivacy / EasyList sources, not maintained as a hand-edited repo).
- `delta-extensions` (these are 3rd-party extensions; we don't own them).
- `delta-portfolio` (it's already `apps/portfolio/` in the monorepo; splitting adds no value).

## How to actually use this

Run the first command. Run the second command. Skim the others when you reach those phases. None of this is urgent.
