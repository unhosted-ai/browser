// Clear browsing data — wraps Electron's session.clearStorageData with
// a tighter API that maps onto the user's mental model from the dialog:
// cookies, cache, history, downloads.
//
// Conversations + bookmarks + tracker stats are NOT touched here. They
// have their own surfaces and clearing them feels surprising. Each store
// has its own "Reset" button.

import { session } from "electron"
import type { HistoryStore } from "./history"
import type { DownloadsManager } from "./downloads"
import type { IdentityStore } from "./identity"

export type ClearScope = {
  cookies?: boolean
  cache?: boolean
  history?: boolean
  downloads?: boolean
  identity?: boolean
}

export async function clearBrowsingData(
  scope: ClearScope,
  ctx: {
    history: HistoryStore | null
    downloads: DownloadsManager | null
    identity?: IdentityStore | null
  },
): Promise<void> {
  const sess = session.defaultSession

  // session.clearStorageData supports the storages we care about:
  // "cookies" | "filesystem" | "indexdb" | "localstorage" | "shadercache"
  // | "websql" | "serviceworkers" | "cachestorage"
  type Storage =
    | "cookies" | "filesystem" | "indexdb" | "localstorage"
    | "shadercache" | "websql" | "serviceworkers" | "cachestorage"
  const storages: Storage[] = []
  if (scope.cookies) {
    // "cookies" alone covers the cookie jar; also wipe localStorage/IDB
    // so per-site identity tokens don't survive a "clear cookies".
    storages.push("cookies", "localstorage", "indexdb", "websql", "serviceworkers", "cachestorage")
  }
  if (storages.length) {
    await sess.clearStorageData({ storages })
  }
  if (scope.cache) {
    await sess.clearCache()
  }
  if (scope.history) {
    ctx.history?.clear()
  }
  if (scope.downloads) {
    ctx.downloads?.clear()
  }
  if (scope.identity) {
    ctx.identity?.signOut()
  }
}
