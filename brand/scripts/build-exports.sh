#!/usr/bin/env bash
# Render every SVG under brand/ into brand/exports/{png,jpg}/ at the sizes
# people actually need (favicons, app store, social, README, hi-DPI press).
#
# Idempotent — rerun any time a source SVG changes. The output folder is
# committed so consumers never need to install rsvg-convert.
#
# Requires: rsvg-convert (alpha-preserving) + sips (macOS PNG→JPG).

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script uses macOS-only tools (sips). Substitute imagemagick" >&2
  echo "to port to Linux." >&2
  exit 1
fi

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert not found. Install via: brew install librsvg" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
brand="$repo_root/brand"
out="$brand/exports"

# JPG can't carry alpha. Composite onto these backgrounds — dark for the
# default brand register, cream for the GitHub Pages site.
JPG_BG_DARK="#0a0c10"
JPG_BG_CREAM="#f5f5f0"

mkdir -p "$out/png" "$out/jpg"

# render <src.svg> <out-base> <width> <height> [jpg-bg-color]
render_one() {
  local src="$1" base="$2" w="$3" h="$4" bg="${5:-$JPG_BG_DARK}"
  local png="$out/png/${base}.png"
  local jpg="$out/jpg/${base}.jpg"
  rsvg-convert -w "$w" -h "$h" -o "$png" "$src"
  # PNG → JPG via sips. We can't set a background color directly, so we
  # use sips's `-s format jpeg` — alpha gets composited onto white by
  # default. For dark variants we render again from SVG with a forced
  # rect fill via an inline transform; easier path is to keep the PNG as
  # source-of-truth and only build JPGs for SVGs that already have an
  # opaque background (icon.svg, og-image.svg, wordmark-cream.svg).
  if [[ "$bg" == "transparent" ]]; then
    return 0
  fi
  sips -s format jpeg -s formatOptions 92 "$png" --out "$jpg" >/dev/null
  echo "  → $base (${w}x${h})"
}

echo "rendering brand/icon.svg"
# Square app icon — full standard ladder.
for size in 16 32 48 64 128 256 512 1024; do
  render_one "$brand/icon.svg" "icon-${size}" "$size" "$size"
done

echo "rendering brand/wordmark.svg (dark register)"
# PNG keeps the transparent background. For JPG we composite onto the
# dark canvas by injecting a <rect> before any other paint instruction
# — same temp-SVG trick the icon-mark loop uses below.
wordmark_dark_tmp="$(mktemp -t delta-wordmark-dark.XXXX).svg"
trap 'rm -f "$mark_dark_tmp" "$mark_cream_tmp" "$wordmark_dark_tmp"' EXIT
# `</svg>` is unique-enough as an anchor; insert the fill rect right
# after the opening <svg ...> tag.
awk -v bg="$JPG_BG_DARK" '
  !inserted && /<svg /,/>/ {
    print
    if (/>/) {
      print "<rect width=\"100%\" height=\"100%\" fill=\"" bg "\"/>"
      inserted = 1
    }
    next
  }
  { print }
' "$brand/wordmark.svg" > "$wordmark_dark_tmp"
for w in 320 640 1280; do
  h=$(( w / 4 ))
  rsvg-convert -w "$w" -h "$h" -o "$out/png/wordmark-${w}.png" "$brand/wordmark.svg"
  rsvg-convert -w "$w" -h "$h" -o "$out/png/wordmark-${w}-onDark.png" "$wordmark_dark_tmp"
  sips -s format jpeg -s formatOptions 92 "$out/png/wordmark-${w}-onDark.png" --out "$out/jpg/wordmark-${w}.jpg" >/dev/null
  rm -f "$out/png/wordmark-${w}-onDark.png"
  echo "  → wordmark-${w} (${w}×${h}) [png transparent + jpg on dark]"
done

echo "rendering brand/wordmark-cream.svg (cream register)"
for w in 320 640 1280; do
  h=$(( w / 4 ))
  render_one "$brand/wordmark-cream.svg" "wordmark-cream-${w}" "$w" "$h" "$JPG_BG_CREAM"
done

echo "rendering brand/og-image.svg (1200x630, social)"
render_one "$brand/og-image.svg" "og-image" 1200 630
# A 2x retina version too, for higher-quality embeds.
render_one "$brand/og-image.svg" "og-image@2x" 2400 1260

echo "rendering brand/icon-mark.svg (line-art mark, two color variants)"
# The source uses currentColor; we sed it out to render an explicit
# dark variant (for use on cream pages) and a cream variant (for use on
# dark pages). Same shape, two colorways, no fork in source-of-truth.
mark_dark_tmp="$(mktemp -t delta-mark-dark.XXXX).svg"
mark_cream_tmp="$(mktemp -t delta-mark-cream.XXXX).svg"
sed 's/currentColor/#0a0a0a/g' "$brand/icon-mark.svg" > "$mark_dark_tmp"
sed 's/currentColor/#f5f5f0/g' "$brand/icon-mark.svg" > "$mark_cream_tmp"
# Composite copies for JPG output (alpha → flat). The dark-stroke mark
# sits on cream paper; the cream-stroke mark sits on near-black paper.
mark_dark_jpg_tmp="$(mktemp -t delta-mark-dark-jpg.XXXX).svg"
mark_cream_jpg_tmp="$(mktemp -t delta-mark-cream-jpg.XXXX).svg"
trap 'rm -f "$mark_dark_tmp" "$mark_cream_tmp" "$wordmark_dark_tmp" "$mark_dark_jpg_tmp" "$mark_cream_jpg_tmp"' EXIT
awk -v bg="$JPG_BG_CREAM" '
  !inserted && /<svg /,/>/ { print; if (/>/) { print "<rect width=\"100%\" height=\"100%\" fill=\"" bg "\"/>"; inserted = 1 } next }
  { print }
' "$mark_dark_tmp" > "$mark_dark_jpg_tmp"
awk -v bg="$JPG_BG_DARK" '
  !inserted && /<svg /,/>/ { print; if (/>/) { print "<rect width=\"100%\" height=\"100%\" fill=\"" bg "\"/>"; inserted = 1 } next }
  { print }
' "$mark_cream_tmp" > "$mark_cream_jpg_tmp"
for size in 64 128 256 512; do
  rsvg-convert -w "$size" -h "$size" -o "$out/png/icon-mark-dark-${size}.png" "$mark_dark_tmp"
  rsvg-convert -w "$size" -h "$size" -o "$out/png/icon-mark-light-${size}.png" "$mark_cream_tmp"
  # Composite PNGs at the same sizes, then sips → JPG, then discard the
  # composite PNG (we keep the transparent one as the canonical PNG).
  rsvg-convert -w "$size" -h "$size" -o "$out/png/icon-mark-dark-${size}-onCream.png" "$mark_dark_jpg_tmp"
  rsvg-convert -w "$size" -h "$size" -o "$out/png/icon-mark-light-${size}-onDark.png" "$mark_cream_jpg_tmp"
  sips -s format jpeg -s formatOptions 92 "$out/png/icon-mark-dark-${size}-onCream.png" --out "$out/jpg/icon-mark-dark-${size}.jpg" >/dev/null
  sips -s format jpeg -s formatOptions 92 "$out/png/icon-mark-light-${size}-onDark.png" --out "$out/jpg/icon-mark-light-${size}.jpg" >/dev/null
  rm -f "$out/png/icon-mark-dark-${size}-onCream.png" "$out/png/icon-mark-light-${size}-onDark.png"
  echo "  -> icon-mark-dark-${size} / icon-mark-light-${size} (${size}x${size}) [png + jpg]"
done

echo
echo "wrote PNGs:"
ls -1 "$out/png" | sed 's/^/  /'
echo
echo "wrote JPGs:"
ls -1 "$out/jpg" | sed 's/^/  /'
echo
echo "done. total size:"
du -sh "$out" | sed 's/^/  /'
