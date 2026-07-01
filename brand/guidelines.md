# Unhosted Browser — Brand Guidelines

These are working guidelines, not finished house style. The repo is public; if
you're using the mark for something we haven't anticipated, open an issue
rather than guessing.

**This brand is a member of the [Unhosted](https://github.com/unhosted-ai) family.**
The mark, colors, and type come from
[unhosted-core `BRAND.md`](https://github.com/unhosted-ai/unhosted-core/blob/main/BRAND.md) —
that file is the ultimate source of truth. When something here contradicts it,
it wins.

## Voice in one line

> A privacy-first AI browser. Local LLM by default, the agent reads and acts
> on the active page, nothing leaves your machine — part of Unhosted.

## Mark

The mark is the **canonical Unhosted mark, unchanged**: three concentric
circles — a filled center, a solid ring, a dashed ring. It maps to the product:

- **Filled center** — you. Devices you own. Total trust.
- **Solid ring** — your trusted circle. Friends, team, family.
- **Dashed ring** — the public swarm. Strangers, opt-in. Discontinuous on purpose.

Per Unhosted BRAND.md, **the mark is the architecture diagram and must not be
altered.** The *browser* product is distinguished by the wordmark — "browser"
set in the mute tone beside "unhosted" — never by modifying the rings.

| File | When to use |
| --- | --- |
| [`icon.svg`](icon.svg) | App icon. Three-ring mark on a cream squircle. Reads the same at 16px and 1024px. |
| [`logo.svg`](logo.svg) | The mark on a 100 grid, `currentColor`. Drop-in with the canonical Unhosted mark. |
| [`icon-mark.svg`](icon-mark.svg) | Unbounded inline mark (200 grid), `currentColor` — README headers, footer marks, avatars. |
| [`wordmark.svg`](wordmark.svg) | "unhosted browser" wordmark for dark backgrounds. |
| [`wordmark-cream.svg`](wordmark-cream.svg) | Same, near-black type on cream. GitHub Pages + cream-register marketing. |
| [`lockup.svg`](lockup.svg) | Mark + wordmark, horizontal. |
| [`favicon.svg`](favicon.svg) | Favicon — mark on a near-black rounded square. |
| [`og-image.svg`](og-image.svg) | 1200×630 social-share card. |

### Construction (from Unhosted BRAND.md — do not change)

- Outer ring: stroke 3, `stroke-dasharray="2 6"` (sparse — reads as "swarm")
- Middle ring: stroke 3, solid
- Inner: filled disc, no stroke
- Radii on a 100 grid: 44 / 28 / 12. Do not invent new ratios, add a fourth
  ring, or put text inside the rings.

### Don't

- Don't modify the three-ring mark. The browser distinction lives in the
  wordmark, not the rings.
- Don't fill the mark with the accent red — the mark is monochrome
  (`currentColor`) by default. Trust-tier colors only when the diagram is the
  explicit subject.
- Don't apply drop-shadows, bevels, or glows.
- Don't render the icon on a saturated coloured background. Keep the cream
  squircle, or invert to near-black for dark contexts.
- Don't set the wordmark in anything but the mono family below.

## Colors (Unhosted palette)

| Role | Hex | Notes |
| --- | --- | --- |
| Background | `#0A0A0A` | Near-black, never pure `#000000` |
| Foreground | `#F5F5F0` | Warm off-white, never pure `#FFFFFF` |
| Accent | `#FF3B30` | Signal red. Links on dark, "live" indicators. **Never** fills the mark. |
| Mute | `#737373` | Secondary text, dividers, the "browser" word in the wordmark, the dashed-ring hint |

The in-app UI additionally uses `chrome-surface*` / `chrome-text-*` tokens in
[`apps/browser/src/renderer/src/index.css`](../apps/browser/src/renderer/src/index.css)
under `:root.dark` / `:root.light`. Use those tokens — never hex literals — when
building UI.

## Typography

| Family | Where |
| --- | --- |
| **ui-monospace** (JetBrains Mono / SF Mono) | The "unhosted browser" wordmark — weight 700, letter-spacing −2 |
| **Geist Sans** | Default sans: tabs, buttons, body copy |
| **Geist Mono** | Numbers, hashes, status labels, the new-tab date stamp |
| **Instrument Serif** (italic) | Editorial accents / taglines only |

App fonts load via `@fontsource/*` (shipped with the app — no remote fetches).

## Naming

- The product is **Unhosted Browser**. In prose, "Unhosted Browser" on first
  use; "the browser" thereafter is fine within Unhosted contexts.
- The repository is [`unhosted-ai/browser`](https://github.com/unhosted-ai/browser).
- It's part of Unhosted — reference the parent when it adds context (e.g. "the
  browser front-end for your Unhosted cluster").

## Building the icon

The macOS `.icns` lives at [`apps/browser/build/icon.icns`](../apps/browser/build/icon.icns)
and is bundled by electron-builder. To regenerate from [`icon.svg`](icon.svg):

```bash
brand/scripts/build-icons.sh
```

Renders through `rsvg-convert` (preferred, alpha-preserving) or `qlmanage`
fallback, resamples with `sips`, packs the `.icns` with `iconutil`. Idempotent —
rerun any time `icon.svg` changes.

## Public-repo etiquette

The repo is public for feedback. Two asks for anyone re-using the brand:

1. Don't ship a fork that's also called "Unhosted" (or "Unhosted Browser") with
   the same three-ring mark — that mark is Unhosted's identifier. Give your fork
   its own name and mark.
2. These SVGs are free to use for discussion, screenshots, talks, write-ups, and
   "here's a thing I built on Unhosted" demos — but not as a commercial license
   to ship a product called Unhosted.

If in doubt, open an issue.
