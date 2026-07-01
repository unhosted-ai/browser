# Personal SLM — design doc

_Status: **preview**. The opt-in toggle ships today (`personalSlmEnabled`
in `UserSettings`). The training pipeline, the rewrite pass, and the
inspector are roadmap. Nothing about a user's data is silently uploaded
or processed before they flip the toggle._

## Why

Cloud assistants like Gemini, ChatGPT and Claude know everyone's
average. They don't know **you** — your projects, the shape of the way
you ask questions, the vocabulary of your codebase, the half-dozen
people you keep looking up, the recurring research thread you've been
running for a year. To "personalise" they fall back on profile fields,
opaque RAG over uploaded files, or per-session memory snippets — none of
which is ownable, portable, or auditable.

Unhosted Browser is a desktop app that already holds the right ground truth: every
conversation you've had with the agent, every page you've read with the
agent attached, the bookmarks you keep, the queries you actually run.
That data already stays on your machine
(see [`PRIVACY.md`](../../../PRIVACY.md)). The natural step is to fine-tune
a small model on it — for you, only on your hardware — and let the agent
consult that model as a *personalisation pass* before the main answer.

## Non-goals

- **Sharing.** The SLM lives in `userData/slm/` and never leaves it. No
  upload, no peer-to-peer, no anonymised aggregation.
- **A second account.** The SLM is a property of the device profile.
  There is no separate "SLM account."
- **Replacing the main model.** The SLM does context-shaping, not
  reasoning. Outputs you read still come from the model you selected in
  Settings (local or cloud).
- **A black box.** Phase C ships an inspector ("what does my SLM know?")
  + a one-click reset. If we can't show you what's in it, we don't ship.

## Architecture

```
┌─ Local data sources (already on disk) ────────────────┐
│                                                       │
│  userData/conversations/*.json   userData/bookmarks   │
│  userData/history.json           userData/privacy     │
│                                                       │
└──────────────────────┬────────────────────────────────┘
                       │  (read-only, opt-in only)
                       ▼
┌─ Nightly job (only when on AC + idle) ─────────────────┐
│                                                        │
│  1. extract: turn each conversation into supervised    │
│     (instruction, response) pairs                      │
│  2. filter: drop secrets-shaped text, drop pages from  │
│     sensitive-site classifier hits, drop short turns   │
│  3. fine-tune: LoRA adapter over a 1–3B base           │
│     (Qwen2.5-1.5B / Llama-3.2-3B / Phi-3.5)            │
│  4. eval: run a held-out slice, refuse to ship the     │
│     adapter if perplexity regressed                    │
│                                                        │
└──────────────────────┬─────────────────────────────────┘
                       │  writes to:
                       ▼
                userData/slm/
                  base-model/           (downloaded once)
                  adapters/<date>.safetensors
                  current → adapters/<date>.safetensors
                  index.json            (provenance, eval scores)
                  rejected.json         (what filter dropped, why)
```

At inference time:

```
user prompt ──► SLM rewrite pass ──► augmented prompt ──► main model
                       │
                       └─► attaches: "you've worked on X
                          before; the user prefers terse code
                          answers; the project they mean by
                          'the dashboard' is /Users/.../foo"
```

The rewrite pass is bounded — it adds at most N tokens of preamble, is
labeled in the conversation as `[SLM context]`, and is opt-out per turn.

## Training pipeline (Phase A — planned)

Local-only LoRA fine-tune using
[`mlx-lm`](https://github.com/ml-explore/mlx-examples/tree/main/llms) on
Apple Silicon, [`unsloth`](https://github.com/unslothai/unsloth) /
HuggingFace `peft` on CUDA/CPU. Base models considered:

| Base | Params | Why |
|---|---|---|
| Qwen2.5-1.5B-Instruct | 1.5B | Best instruction-following per parameter today; runs on 8GB RAM. |
| Llama-3.2-3B-Instruct | 3B | Better tool-use prior; needs 16GB. |
| Phi-3.5-mini-instruct | 3.8B | Reasoning headroom; needs 16GB. |

Training trigger: on AC power, idle ≥30 minutes, at least 50 new
conversations or 7 days since last fit. User can force-run from
Settings. Refusal conditions: low memory, no recent data, repeated eval
regression.

## Filter (the most important step)

The supervised pairs go through a deterministic filter **before** any
gradient step:

1. **Drop secrets-shaped text** — tokens that look like API keys,
   JWTs, OAuth codes, private keys, AWS access IDs, credit-card and
   IBAN patterns. We do not learn from secrets even by accident.
2. **Drop sensitive-site context** — any conversation whose attached
   page-text came from a host the sensitive-site classifier flagged
   (banking, government, payment, wallet, healthcare). Same list that
   blocks act tools today.
3. **Drop short / generic turns** — < 24 tokens, "thanks", "yes"
   — noise.
4. **Drop the last N days configurable** — escape hatch for "the
   last week I was researching something I don't want this model to
   know."

The reject reasons are written to `userData/slm/rejected.json` so the
user can see what didn't go in.

## Permission model

- **One toggle to enable** (`personalSlmEnabled`). Off = the pipeline
  never runs, the rewrite pass never runs, and `userData/slm/` is never
  touched.
- **Granular opt-outs** at conversation level (a "✕ exclude from SLM"
  affordance) and at page-attachment level.
- **Inspector** (Phase C): shows the latest adapter's training summary,
  what got into it, what got filtered out, last eval scores. Plus a
  red-button "Forget everything" that wipes `userData/slm/` and disables
  the toggle.

## How this is different from Gemini / ChatGPT memory

| | Cloud "memory" | Personal SLM |
|---|---|---|
| Storage | Provider's database | `userData/slm/` on your laptop |
| Visibility | Provider sees inputs + outputs | Provider sees only the final prompt |
| Portability | Locked to the account | Copy a folder; clone an OS user |
| Reset | UI button → trust they actually delete | `rm -rf userData/slm/` |
| Drift on you over time | Yes, opaque | Yes, but the adapter file has a date |
| Sharing across services | Yes, by design | Never |

## Roadmap

- **Today (toggle ships):** `personalSlmEnabled` persisted. Settings UI
  card. Sidebar disclosure shows when it's on. Pipeline is not yet
  implemented.
- **Phase A — training pipeline.** mlx-lm + peft adapter trainer wired
  to a nightly job. Sample-pair extractor + filter pass. Adapter
  persisted under `userData/slm/adapters/`.
- **Phase B — rewrite pass.** Agent prefixes each user turn with an
  SLM-generated context preamble, labeled and bounded.
- **Phase C — inspector + reset.** Settings UI shows training history,
  filter rejections, eval scores. One-click forget.

## Open questions (input wanted)

- Adapter size vs RAM ceiling — should we cap at a base model that fits
  on 8GB by default, with an opt-in 16GB tier?
- Should the rewrite pass be optional *per turn* via a sidebar toggle,
  or always-on once enabled?
- How aggressive should the secret-shape filter be? False positives are
  ok; false negatives are not.
