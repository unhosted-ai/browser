#!/usr/bin/env bash
# Render brand/icon.svg → apps/browser/build/{icon.icns, icon.png}.
#
# Prefers rsvg-convert (librsvg) when available — it respects SVG alpha so
# the squircle's outside corners stay transparent. Falls back to qlmanage
# only when rsvg-convert isn't installed (qlmanage fills transparent areas
# with white, which produces visible white edges in the dock).
#
# Idempotent: rerun any time icon.svg changes.

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script uses macOS-only tools (sips, iconutil)." >&2
  echo "Substitute imagemagick / inkscape to port to Linux." >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
src="$repo_root/brand/icon.svg"
out_dir="$repo_root/apps/browser/build"
mkdir -p "$out_dir"

work="$(mktemp -d -t delta-iconset)"
trap 'rm -rf "$work"' EXIT

iconset="$work/delta.iconset"
mkdir -p "$iconset"
master="$work/master-1024.png"

# 1. Master 1024px raster from the SVG.
if command -v rsvg-convert >/dev/null 2>&1; then
  echo "→ rasterising via rsvg-convert (alpha-preserving)…"
  rsvg-convert -w 1024 -h 1024 -o "$master" "$src"
else
  echo "⚠ rsvg-convert not found; falling back to qlmanage (will produce white corners — install via 'brew install librsvg')"
  qlmanage -t -s 1024 -o "$work" "$src" >/dev/null 2>&1
  mv "$work/icon.svg.png" "$master"
fi

if [[ ! -f "$master" ]]; then
  echo "rasterisation failed; no master PNG produced" >&2
  exit 1
fi

# 2. Resample into Apple's strict iconset spec (10 named files).
sips -z 1024 1024 "$master" --out "$iconset/icon_512x512@2x.png" >/dev/null
sips -z  512  512 "$master" --out "$iconset/icon_512x512.png"    >/dev/null
sips -z  512  512 "$master" --out "$iconset/icon_256x256@2x.png" >/dev/null
sips -z  256  256 "$master" --out "$iconset/icon_256x256.png"    >/dev/null
sips -z  256  256 "$master" --out "$iconset/icon_128x128@2x.png" >/dev/null
sips -z  128  128 "$master" --out "$iconset/icon_128x128.png"    >/dev/null
sips -z   64   64 "$master" --out "$iconset/icon_32x32@2x.png"   >/dev/null
sips -z   32   32 "$master" --out "$iconset/icon_32x32.png"      >/dev/null
sips -z   32   32 "$master" --out "$iconset/icon_16x16@2x.png"   >/dev/null
sips -z   16   16 "$master" --out "$iconset/icon_16x16.png"      >/dev/null

# 3. Pack into .icns.
iconutil -c icns "$iconset" -o "$out_dir/icon.icns"

# 4. Save the master 1024 PNG.
cp "$master" "$out_dir/icon.png"

echo "wrote: $out_dir/icon.icns ($(du -h "$out_dir/icon.icns" | cut -f1))"
echo "wrote: $out_dir/icon.png  ($(du -h "$out_dir/icon.png"  | cut -f1))"
