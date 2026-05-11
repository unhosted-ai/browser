# Delta — Brand Guidelines

These are working guidelines, not finished house style. The repo is public; if
you're using the mark for something we haven't anticipated, open an issue
rather than guessing.

## Voice in one line

> A privacy-first AI browser. Local LLM by default, the agent reads and acts
> on the active page, nothing leaves your machine.

## Mark

The Delta mark is an equilateral triangle with a small spark dot above the
apex. One shape, two registers: black on cream, or cream on black. Use the
SVGs in this folder as the source of truth — never recreate from screenshots.

| File | When to use |
| --- | --- |
| [`icon.svg`](icon.svg) | App icon. Pure line-art Δ + spark on a cream squircle. Reads the same at 16px and 1024px. |
| [`icon-mark.svg`](icon-mark.svg) | Unbounded line-art mark for inline use — README headers, footer marks, monogram avatars. Uses `currentColor` so it tints to its container. |
| [`wordmark.svg`](wordmark.svg) | "Delta" + glyph for dark backgrounds (cream type). |
| [`wordmark-cream.svg`](wordmark-cream.svg) | Same composition, black type on cream. Use for the GitHub Pages site and cream-register marketing. |

### Clearspace

Reserve at least 1× the height of the Δ on every side around the mark — in
practice, that means leaving the full vertical space of the triangle clear of
other graphics. Don't crop the squircle in the app icon.

### Don't

- Don't fill the Δ. The mark is a single-stroke line-art glyph; adding a fill
  (or a gradient inside) changes its visual register.
- Don't change the stroke weight away from the source SVGs. Heavier or lighter
  strokes break the visual family across sizes.
- Don't apply drop-shadows, bevels, or glows to the wordmark.
- Don't typeset "Delta" in anything other than Instrument Serif italic. If
  the font is unavailable, fall back to a system serif italic — never sans.
- Don't render the icon on a saturated coloured background. The squircle is
  cream for a reason — keep the cream, or invert to a near-black squircle
  for dark-only contexts. No orange, pink, blue, etc. squircles.
- Don't write the product as DELTA in all-caps. It's "Delta" — capital D,
  lowercase rest.

## Colors

The brand reads black-on-cream by default; for dark contexts, cream-on-black.
A muted mint accent shows up in UI for selection states and active controls,
but it isn't part of the mark itself.

| Token | HSL | Hex | Where it shows up |
| --- | --- | --- | --- |
| Paper (web) | `60 19% 95%` | `#f5f5f0` | GitHub Pages canvas, icon squircle, og-image background |
| Ink | `0 0% 4%` | `#0a0a0a` | The mark, body text on cream, dark-mode canvas |
| Canvas (app, dark) | `240 4% 5%` | `#0c0c0e` | Browser app canvas in dark mode |
| Canvas (app, light) | `40 10% 90%` | `#e8e6e1` | Browser app canvas in light mode (warm beige) |
| Signal mint (UI, dark) | `135 55% 66%` | `#85d693` | AI button when active, loading bar, hover states — **inside the app only**, never the mark |
| Signal mint (UI, light) | `135 48% 36%` | `#308a4a` | Same role, deeper for cream contrast |

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

This renders the SVG through `rsvg-convert` (preferred, alpha-preserving)
or `qlmanage` as a fallback, resamples the iconset with `sips`, and packs
the `.icns` with `iconutil`. The script is idempotent — rerun it any time
`icon.svg` changes.

## Public-repo etiquette

The repo is public for feedback. A couple of asks for anyone re-using the
brand:

1. Don't ship a fork that's also called "Delta" with the same Δ + spark
   mark — that mark is the project's identifier. If you fork to experiment,
   give your fork its own name and mark.
2. The guidelines and SVGs in this folder are MIT-spirited: free to use for
   discussion, screenshots, talks, write-ups, and "see this thing I'm
   building on top of Delta" demos. They are *not* a commercial license to
   ship a product called Delta.

If in doubt, open an issue.
