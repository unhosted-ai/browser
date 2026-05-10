# brand/exports

Pre-rendered PNG and JPG of every Delta brand asset. Committed so
consumers (the GitHub Pages site, READMEs, social cards, third-party
write-ups) don't need `rsvg-convert` installed.

Source-of-truth lives one folder up — these files are *outputs* of
`brand/scripts/build-exports.sh`. Edit the SVGs, rerun the script.

## What's here

### App icon — `icon-{16,32,48,64,128,256,512,1024}.{png,jpg}`

The full Δ-with-spark icon — gradient mint Δ on a dark squircle, with a
mint spark above the apex. This is the asset that ends up in the macOS
dock, the Windows taskbar, and `apple-touch-icon` slots. PNG carries
the squircle's transparent corners; JPG composites onto the dark canvas
that's baked into the SVG itself, so JPGs are safe to drop on any
background.

| Size | Use |
| --- | --- |
| 16, 32, 48 | Favicons, tab icons |
| 64, 128 | Small toolbar / dock previews |
| 256, 512 | Standard app icon |
| 1024 | macOS Big Sur+, Apple App Store, hi-DPI press |

### Line-art mark — `icon-mark-{dark,light}-{64,128,256,512}.png`, `icon-mark-{dark,light}-512.jpg`

Stripped-down Δ + spark in a single stroke weight. No fills, no
gradients. Use this for headers, footers, READMEs, monogram avatars
where the gradient app icon would feel busy.

- `icon-mark-dark-*` — near-black stroke, transparent / cream JPG. Use on light backgrounds.
- `icon-mark-light-*` — cream stroke, transparent / near-black JPG. Use on dark backgrounds.

### Wordmark — `wordmark-{320,640,1280}.png` and `wordmark-cream-{320,640,1280}.{png,jpg}`

The Δ + "Delta" lockup. Two register variants:

- `wordmark-*` — for dark backgrounds. White Δ-glyph + serif italic "Delta" type. PNG only (transparent background; JPG would lose the hairline edges).
- `wordmark-cream-*` — for light/cream backgrounds. Darker mint Δ + near-black type on a cream rect. Both PNG and JPG available.

| Size | Use |
| --- | --- |
| 320×80   | Footer / inline byline |
| 640×160  | README hero / Slack header |
| 1280×320 | Press kit, slide decks |

### Open Graph card — `og-image.{png,jpg}` (1200×630), `og-image@2x.{png,jpg}` (2400×1260)

The unfurled-link card you'll see when someone pastes
`https://delta-practice.github.io/Browser/` into X / Slack / Discord /
iMessage. Dark canvas, mint Δ + spark on the left, "delta" wordmark +
tagline + three badges on the right.

The `@2x` variant is for higher-quality re-embeds (some platforms
re-encode the source).

## Regenerating

```bash
# from the repo root
brand/scripts/build-exports.sh
```

Idempotent. Outputs land in `brand/exports/png/` and `brand/exports/jpg/`.

## Licensing

Brand assets follow the rules in [`brand/guidelines.md`](../guidelines.md):
free for screenshots, talks, write-ups, and "see this thing I'm building
on top of Delta" demos. Please don't ship a fork called Delta with these
marks — pick your own name and your own brand.
