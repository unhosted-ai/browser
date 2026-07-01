# Uploading the model card to Hugging Face

The folder `delta-agent-prompt/` is a complete model-card repo. It lives
on HF at <https://huggingface.co/sinhaankur/delta-agent-prompt>.

This file is the runbook for **future updates** — the initial upload
was done via the web drag-and-drop. The CLI path below is faster for
repeats.

## One-time setup

HF renamed the CLI from `huggingface-cli` to `hf` in late 2025. Install
the new one:

```bash
brew install hf
hf auth login   # paste a write-scope token from huggingface.co/settings/tokens
```

## Refreshing the card

When the prompt or tools change in the Unhosted Browser source:

1. Re-copy from the source files into the mirror:
   - `apps/browser/src/main/agent.ts` → `huggingface/delta-agent-prompt/system_prompt.md`
   - `apps/browser/src/main/tools.ts` → `huggingface/delta-agent-prompt/tools.json`
2. Commit the change in the Unhosted Browser repo (so the source-of-truth + the
   mirror move together).
3. Push the mirror to HF. Run from the Unhosted Browser repo root:

   ```bash
   hf upload sinhaankur/delta-agent-prompt huggingface/delta-agent-prompt . \
     --commit-message "sync: prompt + tools updated"
   ```

   It's idempotent — only changed files are uploaded.

## Web fallback

If the CLI is broken or you don't have a token handy, drag-and-drop
also works: <https://huggingface.co/sinhaankur/delta-agent-prompt> →
**Files and versions** → **Add file** → **Upload files**.

## Why we don't auto-sync

The mirror is hand-pulled rather than wired into CI. The prompt is a
load-bearing artifact — every update should be a deliberate review, not
a commit-trigger. Two artifacts diverging for a few days is fine; a
silent propagation of a bad prompt is not.
