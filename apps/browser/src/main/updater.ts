// Auto-update glue. Uses electron-updater against the GitHub Releases
// publish target configured in package.json's build.publish field.
//
// Two-stage rollout:
//   1. Today — UNSIGNED builds: we only check; we never install.
//      When a newer release exists, the renderer gets an
//      `updater:available` event with version + release URL. The user
//      clicks through to GitHub and downloads manually. This is honest
//      about the current security posture: an unsigned auto-installer
//      is a worse security model than asking the user to confirm.
//   2. Once the macOS Developer ID + Windows code-signing cert are in
//      place (see STATUS.md), flip to autoInstallOnAppQuit = true and
//      let electron-updater run the full install path.
//
// The setting `autoUpdateCheck` controls whether we hit the GitHub API
// at all. Off by default for now since the project ships unsigned.

import { app, BrowserWindow, shell } from "electron"
import { autoUpdater } from "electron-updater"

let configured = false

export function setupAutoUpdater(opts: {
  enabled: boolean
  win: BrowserWindow | null
}): void {
  if (!opts.enabled) return
  if (configured) {
    // Already wired up — just trigger a fresh check.
    void autoUpdater.checkForUpdates().catch((err) => {
      console.warn("[delta] update check failed:", err?.message ?? err)
    })
    return
  }
  configured = true

  // We do the check, not the install. The signing story isn't ready
  // for hands-off updates yet — see file header.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on("update-available", (info) => {
    const releaseUrl = `https://github.com/Delta-Practice/Browser/releases/tag/v${info.version}`
    opts.win?.webContents.send("updater:available", {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseUrl,
    })
  })

  autoUpdater.on("update-not-available", () => {
    opts.win?.webContents.send("updater:up-to-date")
  })

  autoUpdater.on("error", (err) => {
    console.warn("[delta] auto-updater error:", err?.message ?? err)
    opts.win?.webContents.send("updater:error", { message: String(err?.message ?? err) })
  })

  void autoUpdater.checkForUpdates().catch((err) => {
    // GitHub's release API returns 404 when there are no releases yet
    // — common during early development. Don't pollute the user's
    // console with a stack trace for that.
    if (!String(err).includes("404")) {
      console.warn("[delta] update check failed:", err?.message ?? err)
    }
  })
}

/** Open the GitHub release page in the user's default browser. Wired to the
 *  "Get update" button in the renderer toast. */
export function openReleasePage(url: string): void {
  void shell.openExternal(url)
}
