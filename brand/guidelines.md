# Delta — Brand Guidelines

These are working guidelines, not finished house style. The repo is public; if
you're using the mark for something we haven't anticipated, open an issue
rather than guessing.

## Voice in one line

> A privacy-first AI browser. Local LLM by default, the agent reads and acts
> on the active page, nothing leaves your machine.

## Mark

The Delta mark is an equilateral triangle. Use the SVGs in this folder as the
source of truth — never recreate from screenshots.

| File | When to use |
| --- | --- |
| [`icon.svg`](icon.svg) | App icon. Δ on a dark squircle, mint gradient. The dark background is part of the mark — don't strip it. |
| [`wordmark.svg`](wordmark.svg) | Anywhere "Delta" appears next to the mark. |

### Clearspace

Reserve at least 1× the height of the Δ on every side around the mark — in
practice, that means leaving the full vertical space of the triangle clear of
other graphics. Don't crop the squircle in the app icon.

### Don't

- Don't recolour the Δ. The mint gradient (see Colors) is fixed.
- Don't outline the Δ in a different colour or stroke weight.
- Don't apply drop-shadows or bevels to the wordmark.
- Don't typeset "Delta" in anything other than Instrument Serif italic. If
  the font is unavailable, fall back to a system serif italic — never sans.
- Don't render the icon on a coloured background other than the dark
  squircle that ships with it. The mint Δ on saturated colours becomes
  illegible.

## Colors

The brand has one accent (mint) and one canvas (a near-black or warm cream,
depending on theme). Everything else is neutral.

| Token | HSL | Hex | Where it shows up |
| --- | --- | --- | --- |
| Signal mint (dark mode) | `135 55% 66%` | `#85d693` | Δ mark, AI button when active, loading bar, hover states |
| Signal mint (light mode) | `135 48% 36%` | `#308a4a` | Same — deeper for AA-ish contrast on cream |
| Chrome bg (dark) | `240 4% 5%` | `#0c0c0e` | App canvas |
| Chrome bg (light) | `40 10% 90%` | `#e8e6e1` | App canvas (warm beige) |
| Chrome text (dark) | `240 4% 93%` | `#ededee` | Primary text |
| Chrome text (light) | `240 8% 12%` | `#1d1d20` | Primary text |

Two more token families (`chrome-surface*`, `chrome-text-{2,3}`) live in
[`apps/browser/src/renderer/src/index.css`](../apps/browser/src/renderer/src/index.css)
under `:root.dark` / `:root.light`. Use those tokens — never hex literals —
when building UI.

## Typography

| Family | Weights | Where |
| --- | --- | --- |
| **Instrument Serif** | 400, 400 italic | The "Delta" wordmark, hero titles, editorial accents in the sidebar |
| **Geist Sans** | 400, 500, 600 | Default sans for everything: tabs, buttons, body copy |
| **Geist Mono** | 400, 500 | Numbers, hashes, status labels, the date stamp on the new tab page |

All three are loaded via `@fontsource/*` packages — they're shipped with the
app, so the rendered UI doesn't depend on remote font fetches.

## Naming

- The product is **Delta** (capital D, no accent on the "e").
- Don't write it as ∆, △, or DELTA in long-form copy. Use the Δ glyph only
  as a logomark, not inline in sentences.
- The repository is currently `Browser` under the `Delta-Practice` org —
  this is not the canonical brand name. Renaming the repo to `delta` is a
  one-line change on github.com that the user can do whenever they want.

## Building the icon

The macOS `.icns` lives at [`apps/browser/build/icon.icns`](../apps/browser/build/icon.icns)
and is bundled by electron-builder for packaged releases. To regenerate from
[`icon.svg`](icon.svg), run:

```bash
brand/scripts/build-icons.sh
```

This renders the SVG through `qlmanage`, resamples the iconset with `sips`,
and packs the `.icns` with `iconutil` — all macOS built-ins, no external
deps. The script is idempotent.

## Public-repo etiquette

The repo is public for feedback. A couple of asks for anyone re-using the
brand:

1. Don't ship a fork that's also called "Delta" with the same Δ mark — the
   mint Δ is the project's identifier. If you fork to experiment, give your
   fork its own name and mark.
2. The guidelines and SVGs in this folder are MIT-spirited: free to use for
   discussion, screenshots, talks, write-ups, and "see this thing I'm
   building on top of Delta" demos. They are *not* a commercial license to
   ship a product called Delta.

If in doubt, open an issue.
