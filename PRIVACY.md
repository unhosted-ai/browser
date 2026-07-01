# Privacy Notice

_Last updated: 2026-05-19. Plain-language summary first; the jurisdiction-specific addenda at the bottom satisfy GDPR Art. 13/14, UK GDPR, CCPA/CPRA + the US state CDPAs, PIPEDA, Quebec Law 25, LGPD, PIPL, DPDP Act 2023, APPI, PIPA, PDPA, POPIA and revFADP. If the body of this notice and an addendum disagree, the addendum wins for users in that jurisdiction._

Unhosted Browser is a desktop browser. It runs on your machine. Treat this notice as the complete account of every byte of personal data Unhosted Browser itself causes to leave your device.

## TL;DR

- **No account.** There is no Unhosted Browser server, no Unhosted Browser login, no Unhosted Browser-controlled identifier for you.
- **No telemetry, no analytics, no crash reporting, no advertising.** Zero third-party SDKs of those kinds are bundled.
- **All browsing data — history, bookmarks, downloads, conversations, tracker-block statistics, settings — stays on your machine** under `~/Library/Application Support/Unhosted Browser` (macOS), `%APPDATA%\Unhosted Browser` (Windows), or `~/.config/Unhosted Browser` (Linux).
- **API keys** for opt-in cloud providers are encrypted at rest using your operating system's keychain (macOS Keychain / Windows DPAPI / libsecret on Linux) via Electron `safeStorage`. The browser's renderer process never sees the key value.
- **The agent runs against a local LLM by default** (Ollama, LM Studio, llama.cpp, MLX, anything OpenAI-compatible on `127.0.0.1`). Cloud LLM providers (OpenAI, Anthropic, custom endpoints) are **off until you turn them on**.
- **We do not collect or process your IP address.** Unhosted Browser makes no IP-geolocation request and runs no region-detection. Your IP is visible to whichever destination *you* navigate to or *you* enable — see the endpoint table below.

## Data Unhosted Browser itself processes

| Category | What | Where it lives | Retention | Who can see it |
|---|---|---|---|---|
| Browsing history | URL, page title, timestamp | local `history.json` | last 5,000 entries (~weeks to months depending on use); clear any time from Settings → Clear Browsing Data | you |
| Bookmarks | URL, title, added-at | local `bookmarks.json` | until you delete | you |
| Downloads | filename, source URL, save path, byte progress | local `downloads.json`, last 200 items | until you delete | you |
| Agent conversations | messages, tool calls, page-text excerpts the agent saw | local `conversations/<id>.json`, one file per conversation | until you delete | you (+ whatever LLM provider you sent each message to — see below) |
| Tracker-block statistics | tracker domain, top-frame origin, count, timestamps | local `privacy.json` | 30 days rolling, auto-pruned | you |
| Settings | provider enable flags, default model, permission grants, UI prefs | local `settings.json` | until changed | you |
| API keys (if you added any) | OpenAI / Anthropic / custom-endpoint keys | OS keychain via `safeStorage` (ciphertext only in `settings.json`) | until you delete | only the main process at decrypt time; never the renderer, never disk in plaintext |
| Local identity (if you opted in) | provider (`github` or `google`), public handle, display name, avatar URL | local `identity.json` (plain JSON — nothing sensitive) | until you sign out / delete | you |

There is no aggregation, no upload, no derived profile. Files are owned by the OS user account that runs Unhosted Browser.

## Network destinations Unhosted Browser is responsible for

Unhosted Browser only originates network traffic to the destinations listed below. Each row is **off** by default unless marked otherwise; each is described as it appears in `apps/browser/src/main/`.

| Destination | Purpose | When | Default | What the destination sees |
|---|---|---|---|---|
| `http://127.0.0.1:11434`, `:1234`, `:8080`, etc. | Local LLM auto-discovery and chat (Ollama, LM Studio, llama.cpp, MLX) | App start + on every chat turn | **on** (local only) | the prompt, the active page text the agent attached, the model name. Loopback — does not leave your machine. |
| `https://api.openai.com` | OpenAI chat completions, model probe | You enable OpenAI in Settings, then chat | off | your IP, your prompt, your page-text context, your API key |
| `https://api.anthropic.com` | Anthropic messages, model probe | You enable Anthropic in Settings, then chat | off | your IP, your prompt, your page-text context, your API key |
| Your custom OpenAI-compatible endpoint | Same as above | You added it in Settings → Custom endpoints | off | whatever you sent — Unhosted Browser does not inspect it |
| `https://api.github.com/users/<handle>` | Public-profile lookup to populate name + avatar at sign-in | You picked "Sign in with GitHub" on the onboarding screen | off until you sign in | your IP, the handle you typed |
| `https://www.gravatar.com/avatar/<md5>` | Avatar fetch keyed by md5(email) | You picked "Sign in with Gmail" on the onboarding screen | off until you sign in | your IP, an md5 hash of the email you typed |
| `https://cloudflare-dns.com` / `dns.quad9.net` / `dns.google` | DNS-over-HTTPS resolver | You enabled DoH in Settings → Security | off | your IP + every hostname you visit |
| `https://github.com/unhosted-ai/browser/releases/...` | Update check via electron-updater | You enabled `autoUpdateCheck` in Settings | off | your IP, your installed version |

Page loads in your tabs and any sub-resources those pages fetch are **your direct browsing**, the same way they would be in Chrome or Firefox. Unhosted Browser's tracker blocker drops requests that match the bundled lists (curated short list + EasyPrivacy, ~42k domains, refreshable). Unhosted Browser does not see, log, or upload the contents of your browsing.

## The agent and your data

When you send a chat message, Unhosted Browser sends the model:

1. The system prompt (public — mirrored at <https://huggingface.co/sinhaankur/delta-agent-prompt>).
2. The conversation so far.
3. If the active tab opted in, the page's plain text wrapped in `<page_content>…</page_content>` tags. The system prompt instructs the model to treat anything inside those tags as untrusted data, not instructions.

If the model is local (default), nothing leaves your machine. If the model is cloud (OpenAI / Anthropic / custom), that provider sees the above payload and is the data controller for it. Their privacy policies apply to that data. Unhosted Browser does not retain a separate copy beyond the conversation file already on your disk.

The agent's *act* tools (`navigate`, `open_tab`, and any future `click` / `type`) require explicit per-`(origin, tool)` approval before they run. Sensitive sites (banking, government, payment, wallet, healthcare) auto-block all act tools.

**EU AI Act Art. 50 disclosure:** you are interacting with an AI system. The model and tool outputs may be wrong. Verify before acting on anything safety-, legal-, medical- or finance-critical.

## Cookies, fingerprinting, advertising

Unhosted Browser does not set first-party cookies for its own purposes. Cookies set by pages you visit live in Chromium's per-origin cookie store, scoped exactly as Chromium scopes them, and you can clear them from Settings → Clear Browsing Data. Unhosted Browser does no fingerprinting. Unhosted Browser serves no ads.

## Children

Unhosted Browser is a general-purpose browser intended for adults. It is not directed at children under 13 (US COPPA) and not designed for users under 16 without parental consent (GDPR Art. 8). We do not knowingly collect data from children — and because we collect no data from anyone, there is nothing to collect.

## Security

See [`SECURITY.md`](SECURITY.md) for the threat model and how to report a vulnerability. Briefly: agent runtime lives in the Electron main process; API keys never cross the IPC boundary; per-origin permission gating governs every act-tool call.

## Changes to this notice

Material changes will be announced in the GitHub repo's Releases. The "Last updated" date at the top of this file is canonical.

## Contact

Maintainer: **Ankur Sinha** — `h99311@gmail.com` — <https://github.com/unhosted-ai/browser/issues>. For security disclosures use [private vulnerability reporting](https://github.com/unhosted-ai/browser/security/advisories/new).

---

## Jurisdiction-specific addenda

Unhosted Browser does not detect your region (that would be telemetry). The single notice above is written to satisfy the strictest applicable regime. The addenda below clarify how that notice maps to your local law.

### European Economic Area & Switzerland — GDPR / revFADP

- **Controller:** Ankur Sinha (sole maintainer), `h99311@gmail.com`. Unhosted Browser is desktop software that processes data on your device. For local-only operation, you are the sole controller of your data; the maintainer is not a processor because nothing is sent. If you opt in to cloud LLMs, the cloud provider becomes the controller for the prompt/response payload sent to it.
- **Legal bases (Art. 6):** local processing is *necessary for the performance of a contract* (use of the software you installed). Opt-in cloud calls are *consent* — toggled per-provider in Settings.
- **Rights (Arts. 15–22):** because we hold no copy of your data, requests for access / rectification / erasure / restriction / portability / objection are satisfied by you operating on your local data directory and the relevant cloud provider's tooling.
- **Right to lodge a complaint** with your national supervisory authority — see <https://edpb.europa.eu/about-edpb/about-edpb/members_en>.
- **No automated decision-making with legal or similarly significant effects** is performed by Unhosted Browser on you (Art. 22). The agent may suggest actions and may execute approved act tools on your instruction; it does not make decisions *about* you.
- **AI Act Art. 50** transparency disclosure is in the body above.
- **EU representative:** none required because we do not target the EU market in a commercial sense and process no personal data (Art. 27(2)(a)). If usage characteristics change we will appoint one.

### United Kingdom — UK GDPR + DPA 2018

As EEA above, substituting the ICO as supervisory authority — <https://ico.org.uk/make-a-complaint/>. The Online Safety Act 2023 does not apply: Unhosted Browser is not a user-to-user service or search service.

### United States — California (CCPA / CPRA) and other state CDPAs (VA, CO, CT, UT, OR, TX, FL, MT, DE, NJ, NH, MN, RI, IN, IA, TN, MD, KY, and others as enacted)

- **Notice at Collection:** Unhosted Browser collects **no** categories of personal information on its servers because it has no servers. Local processing on your own machine is not "collection" by the developer.
- **Sale / share / cross-context behavioral advertising:** none. Unhosted Browser does not sell or share personal information. A "Do Not Sell or Share My Personal Information" link is therefore not required, and we say so here in lieu of one.
- **Sensitive personal information:** Unhosted Browser does not collect or process SPI for inferred-characteristics purposes.
- **Rights:** know, delete, correct, opt out of sale/share, limit use of SPI, non-discrimination. Because we hold no copy of your data, exercising these rights consists of you operating on your local data directory.

### Federal — children (COPPA)

Unhosted Browser is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child is using Unhosted Browser, you can delete the installation and its data directory at any time.

### Canada — PIPEDA + Quebec Law 25

- **Accountability / Privacy Officer:** Ankur Sinha, `h99311@gmail.com`.
- **Automated decision-making (Law 25 §12.1):** the agent's act tools execute approved actions on your behalf. They do not make decisions about you. You are informed (this notice) and may refuse by not approving the permission card.
- Complaint to OPC: <https://www.priv.gc.ca/en/report-a-concern/>; to CAI Québec: <https://www.cai.gouv.qc.ca/>.

### Brazil — LGPD

- **Controller / DPO:** Ankur Sinha, `h99311@gmail.com`.
- **Legal basis:** consent (Art. 7 I) for opt-in cloud, contract performance (Art. 7 V) for local operation.
- **Cross-border transfer (Arts. 33–36):** triggered only when you opt in to OpenAI, Anthropic or a custom non-Brazilian endpoint. Disclosed above; consent given by enabling the provider.
- **ANPD complaint:** <https://www.gov.br/anpd/>.

### China (mainland) — PIPL + CSL + DSL

If you are in mainland China, opting in to OpenAI, Anthropic or another non-China cloud endpoint constitutes a **cross-border transfer of personal information** under PIPL Arts. 38–43, which generally requires a separate consent, a Standard Contract, security assessment or certification depending on volume and category. Unhosted Browser does not provide that compliance scaffolding. **Keep cloud providers off** unless you have independently arranged compliance, or use only a local LLM.

### India — DPDP Act 2023

Local processing is "personal data processed by a Data Principal for any personal or domestic purpose" and falls within the §17(2) exemption. Opt-in cloud calls require notice + consent — provided by this notice and the act of enabling a provider.

### Australia — Privacy Act 1988 + APPs

Maintainer turnover is below the AUD 3M small-business threshold, so the Privacy Act technically does not apply; we follow the APPs anyway. APP 1.3 privacy policy is this notice. OAIC complaint route: <https://www.oaic.gov.au/privacy/privacy-complaints>.

### Japan — APPI

Cross-border transfer to "third party in foreign country" (Art. 28) is triggered by opt-in OpenAI/Anthropic (US). Disclosed above; covered by your consent when enabling the provider. PPC: <https://www.ppc.go.jp/en/>.

### South Korea — PIPA

Same cross-border-transfer treatment as APPI. PIPC: <https://www.pipc.go.kr/eng/>.

### Singapore — PDPA

DPO: Ankur Sinha, `h99311@gmail.com`. PDPC: <https://www.pdpc.gov.sg/>.

### South Africa — POPIA

Information Officer: Ankur Sinha, `h99311@gmail.com`. Information Regulator: <https://inforegulator.org.za/>.

### United Arab Emirates — Federal Decree-Law 45 of 2021

Same controller model. UAE Data Office: <https://u.ae/>.

### Russia — 152-FZ data localization

Local-only operation is compliant. Opt-in cloud (OpenAI, Anthropic, foreign custom endpoints) may not be compliant from Russia depending on data category — assess before enabling.

### Türkiye — KVKK

Veri Sorumlusu: Ankur Sinha, `h99311@gmail.com`. KVKK Kurumu: <https://www.kvkk.gov.tr/>.

---

If your jurisdiction is not listed and you believe the body of this notice fails to satisfy a local requirement, open an issue at <https://github.com/unhosted-ai/browser/issues/new/choose> and we will add the addendum.
