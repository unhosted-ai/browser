// Photographic new-tab background helpers.
//
// Two responsibilities:
//   1. List image files in a user-picked folder (cheap; runs on protocol-
//      handler request).
//   2. Serve a single image at delta://newtab-bg/<encoded-abs-path> with
//      a path-traversal guard — only files inside the configured folder
//      are served, even if a malicious URL asks for /etc/passwd.
//
// We do NOT cache the folder listing in memory: the user can drop new
// images into the folder while the app is running, and it should pick
// them up on the next new tab.

import { dialog, protocol, type BrowserWindow } from "electron"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { extname, normalize, resolve, sep } from "node:path"
import type { SettingsStore } from "./settings"

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"])

/** Returns absolute paths of image files directly in `folder` (no recursion). */
export function listImages(folder: string): string[] {
  if (!folder || !existsSync(folder)) return []
  try {
    const entries = readdirSync(folder)
    const out: string[] = []
    for (const name of entries) {
      const full = resolve(folder, name)
      if (!IMAGE_EXTS.has(extname(name).toLowerCase())) continue
      try {
        if (statSync(full).isFile()) out.push(full)
      } catch { /* unreadable entry — skip */ }
    }
    return out
  } catch {
    return []
  }
}

/** Random pick from `listImages(folder)`. Returns null when empty. */
export function pickRandomImage(folder: string): string | null {
  const imgs = listImages(folder)
  if (imgs.length === 0) return null
  return imgs[Math.floor(Math.random() * imgs.length)]
}

/**
 * Open a native folder-picker. Returns the chosen folder, or null if the
 * user cancelled. Used by the Settings UI's "Pick a folder…" button.
 */
export async function pickFolder(win: BrowserWindow | null): Promise<string | null> {
  const opts: Electron.OpenDialogOptions = {
    title: "Pick a folder of images for the new-tab background",
    properties: ["openDirectory", "createDirectory"],
  }
  const res = win
    ? await dialog.showOpenDialog(win, opts)
    : await dialog.showOpenDialog(opts)
  if (res.canceled || res.filePaths.length === 0) return null
  return res.filePaths[0]
}

/**
 * Register the delta://newtab-bg/<encoded-path> protocol handler. The
 * encoded path MUST resolve to a file *inside* the configured folder —
 * we don't trust the URL alone, since anyone can craft one.
 */
export function registerNewtabBgProtocol(getFolder: () => string | null): void {
  protocol.handle("delta", (req) => {
    // Only handle the bg subroute here; the main newtab handler is in newtab.ts.
    // Electron will fall through to the other registered handler if we return
    // a 404 — but actually `protocol.handle` only allows ONE handler per
    // scheme, so we have to dispatch internally. That's why this function
    // ISN'T called separately; see registerDeltaProtocol() below.
    return new Response("Not found", { status: 404 })
  })
  void getFolder
}

/**
 * Combined delta:// router: routes /newtab and /newtab-bg/<path> to the
 * right handler. We register ONE handler for the scheme because Electron
 * permits only one.
 */
export function buildBgResponse(absPath: string, folder: string | null): Response {
  if (!folder) return new Response("No folder configured", { status: 404 })
  const normalised = normalize(absPath)
  // Path-traversal guard: the resolved path must START with the folder +
  // separator. `path.normalize` collapses `..`; the prefix check then
  // rejects anything that escaped.
  const normFolder = normalize(folder)
  if (!normalised.startsWith(normFolder + sep)) {
    return new Response("Forbidden", { status: 403 })
  }
  if (!existsSync(normalised)) return new Response("Not found", { status: 404 })
  try {
    const data = readFileSync(normalised)
    const ext = extname(normalised).toLowerCase()
    const mime = MIME[ext] ?? "application/octet-stream"
    return new Response(data, { headers: { "content-type": mime, "cache-control": "no-store" } })
  } catch {
    return new Response("Read error", { status: 500 })
  }
}

const MIME: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif":  "image/gif",
}

// Re-export so the SettingsStore reference doesn't get tree-shaken.
export type { SettingsStore }
