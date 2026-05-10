# Security policy

Delta is a browser, and browsers have a real attack surface — pages
that try to escape the sandbox, prompt-injection text aimed at the
agent, fake update prompts, supply-chain trickery in dependencies. We
take that seriously.

## Reporting a vulnerability

**Do not open a public issue for security bugs.** Use GitHub's private
vulnerability reporting:

1. Go to https://github.com/Delta-Practice/Browser/security/advisories/new
2. Describe what you found, with as much detail as you can share
   (proof-of-concept, affected commits, attack scenario).

Reports come straight to the maintainer's inbox. Acknowledgement within
a week is the bar; an actual fix depends on severity.

## Scope

In scope:

- Anything that lets a malicious page execute code outside the
  WebContentsView sandbox.
- Anything that lets a page bypass the per-`(origin, tool)` permission
  gate, or trick the user into approving a dangerous action.
- Anything that exfiltrates user data — bookmarks, history, conversation
  log, API keys — to an unintended destination.
- Prompt-injection attacks against the agent that *also* cross the
  permission boundary (e.g., the agent runs an act tool because page
  text told it to). Pure prompt-injection that just produces wrong
  *text* is interesting but lower-priority.
- Local-LLM endpoints that aren't on `127.0.0.1` being auto-discovered
  or contacted without consent.
- Any regression in the OS-keychain handling — keys appearing in logs,
  the renderer process, or unencrypted on disk.

Out of scope:

- Bugs in third-party LLM providers (OpenAI, Anthropic, Ollama, LM
  Studio). Report those upstream.
- Self-XSS (a user pasting hostile JS into the dev console).
- Issues that require a compromised local machine to exploit (if an
  attacker is already running code as you, the threat model is
  different).
- Bugs in pages Delta loads, unless Delta could plausibly defend against
  them.

## Disclosure

We aim to publish a Security Advisory on the GitHub repo within 30 days
of a fix landing on `main`. If you reported the issue and want
attribution (or anonymity), say so in the report.

## Defensive posture in code

For context, these are the load-bearing security boundaries documented
in [`apps/browser/docs/agent-design.md`](apps/browser/docs/agent-design.md):

- The agent runtime, tool execution, and conversation state live in
  the Electron main process. The renderer is a typed view; it never
  owns secrets or runs LLM calls directly.
- API keys are encrypted via Electron `safeStorage` (OS keychain on
  macOS / DPAPI on Windows / libsecret on Linux). The renderer is told
  whether a key is *configured*; the value never crosses the IPC
  boundary.
- Page text passed to the model is wrapped in `<page_content>` tags;
  the system prompt frames anything inside as untrusted data.
- Every act-tool call routes through a per-`(origin, tool)` permission
  gate. Sensitive sites (banking, government, payment, wallet,
  healthcare) auto-block all act tools.
- The default session has a tracker blocker bound at app boot — see
  `apps/browser/src/main/privacy.ts`.

If you find a way to bypass any of these, that's the report we want.
