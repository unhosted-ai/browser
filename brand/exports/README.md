# brand/exports

Pre-rendered PNG and JPG of every Unhosted Browser brand asset. Committed so
consumers (the GitHub Pages site, READMEs, social cards, third-party
write-ups) don't need `rsvg-convert` installed.

Source-of-truth lives one folder up — these files are *outputs* of
`brand/scripts/build-exports.sh`. Edit the SVGs, rerun the script.

## What's here

### App icon — `icon-{16,32,48,64,128,256,512,1024}.{png,jpg}`

The three-ring Unhosted mark on a cream
squircle. This is the asset that ends up in the macOS dock, the Windows
taskbar, and `apple-touch-icon` slots. PNG carries the squircle's
transparent corners; JPG composites onto the cream canvas that's baked
into the SVG itself, so JPGs are safe to drop on any background.

| Size | Use |
| --- | --- |
| 16, 32, 48 | Favicons, tab icons |
| 64, 128 | Small toolbar / dock previews |
| 256, 512 | Standard app icon |
| 1024 | macOS Big Sur+, Apple App Store, hi-DPI press |

### Line-art mark — `icon-mark-{dark,light}-{64,128,256,512}.{png,jpg}`

The three-ring mark, monochrome. No
fills. Use this for headers, footers, READMEs, monogram avatars.

- `icon-mark-dark-*` — near-black stroke. PNG has a transparent ground; JPG composites onto cream paper (`#f5f5f0`).
- `icon-mark-light-*` — cream stroke. PNG has a transparent ground; JPG composites onto near-black (`#0a0c10`).

### Wordmark — `wordmark-{320,640,1280}.{png,jpg}` and `wordmark-cream-{320,640,1280}.{png,jpg}`

The "unhosted browser" wordmark. Two register variants, both available as PNG + JPG:

- `wordmark-*` — dark register. Cream "unhosted" + mute "browser", mono. PNG keeps the transparent ground; JPG composites onto near-black (`#0a0c10`).
- `wordmark-cream-*` — light register. Near-black "unhosted" + mute "browser". PNG keeps the cream ground baked in by the SVG; JPG matches.

| Size | Use |
| --- | --- |
| 320×80   | Footer / inline byline |
| 640×160  | README hero / Slack header |
| 1280×320 | Press kit, slide decks |

### Open Graph card — `og-image.{png,jpg}` (1200×630), `og-image@2x.{png,jpg}` (2400×1260)

The unfurled-link card you'll see when someone pastes
`https://unhosted-ai.github.io/browser/` into X / Slack / Discord /
iMessage. Cream canvas, the three-ring mark on the left, "unhosted browser"
wordmark + tagline + three badges on the right.

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
on Unhosted" demos. Please don't ship a fork called Unhosted with these
marks — pick your own name and your own brand.
