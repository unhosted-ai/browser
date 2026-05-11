#!/usr/bin/env node
// Pull EasyPrivacy's pure-hostname rules into a generated TS file we can
// import at runtime. Re-run any time we want a fresh snapshot.
//
//   node apps/browser/scripts/build-tracker-list.mjs
//
// EasyPrivacy is dual-licensed GPL-3.0 / CC-BY-SA-3.0. The generated
// file preserves the attribution + source URL + commit hash so the
// licence flows through to the binary.
//
// Output: apps/browser/src/main/tracker-list.easyprivacy.ts
//
// What we keep:
//   - lines of shape `||example.com^` — bare hostname rules, no options,
//     no path. These match cleanly against the existing host-suffix
//     matcher in tracker-list.ts.
// What we drop:
//   - rules with `$` options (most are too narrow / break legitimate sites)
//   - element-hiding rules (##...) — those need a CSS layer we don't have
//   - regex rules / wildcards / paths — out of scope for a host-only blocker

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const SOURCE_URL = "https://easylist.to/easylist/easyprivacy.txt"
const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "main",
  "tracker-list.easyprivacy.ts",
)

const HOST_RULE = /^\|\|([a-z0-9.-]+)\^$/i

async function main() {
  process.stdout.write(`→ fetching ${SOURCE_URL}\n`)
  const res = await fetch(SOURCE_URL)
  if (!res.ok) {
    console.error(`fetch failed: HTTP ${res.status}`)
    process.exit(1)
  }
  const text = await res.text()

  // Header metadata for attribution + traceability.
  const versionMatch  = text.match(/^! Version:\s*(.+)$/m)
  const commitMatch   = text.match(/^! Commit:\s*(.+)$/m)
  const modifiedMatch = text.match(/^! Last modified:\s*(.+)$/m)

  const hosts = new Set()
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("!")) continue
    const m = line.match(HOST_RULE)
    if (m) {
      const h = m[1].toLowerCase()
      // Sanity: must contain a dot, ≤ 253 chars, no leading dot.
      if (h.length > 253 || !h.includes(".") || h.startsWith(".")) continue
      hosts.add(h)
    }
  }

  const sorted = Array.from(hosts).sort()
  process.stdout.write(`✓ ${sorted.length.toLocaleString()} hostnames extracted\n`)

  const out = [
    "// AUTO-GENERATED — do not edit.",
    "//",
    "// Source:   " + SOURCE_URL,
    "// Version:  " + (versionMatch?.[1] ?? "unknown"),
    "// Commit:   " + (commitMatch?.[1] ?? "unknown"),
    "// Modified: " + (modifiedMatch?.[1] ?? "unknown"),
    "// Entries:  " + sorted.length,
    "//",
    "// Regenerate with: node apps/browser/scripts/build-tracker-list.mjs",
    "//",
    "// EasyPrivacy is © contributors of the EasyList project, dual-licensed",
    "// under GPL-3.0 and CC-BY-SA-3.0. We re-distribute the host-rule subset",
    "// here for the in-app tracker matcher. Original list:",
    "// https://easylist.to/  ·  https://github.com/easylist/easylist",
    "",
    "export const EASYPRIVACY_HOSTS: readonly string[] = [",
    ...sorted.map((h) => `  ${JSON.stringify(h)},`),
    "] as const",
    "",
  ].join("\n")

  writeFileSync(OUT_PATH, out, "utf-8")
  process.stdout.write(`✓ wrote ${OUT_PATH}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
