// Unpacked Chrome-extension loader.
//
// Electron exposes `session.loadExtension(path, opts)` which handles
// MV3 content scripts, themes, action popups, devtools panels, and a
// subset of the chrome.* runtime APIs. It is NOT a full Chrome
// extension polyfill — chrome.identity, chrome.cookies, chrome.sync,
// and the bulk of chrome.tabs.* are not implemented by Electron. Our
// take: ship loading + lifecycle + clear UI, and document the limits.
// Heavier integrations (electron-chrome-extensions polyfill) are a
// separate decision because they expand the attack surface meaningfully.
//
// Persistence model: a list of `{ id, path }` in
// `userData/extensions.json`. On boot, every entry is loaded into the
// default session. Failures are non-fatal — we capture the error in
// the entry's `lastError` so the user can see what went wrong without
// the app refusing to launch.

import { app, BrowserWindow, dialog, session } from "electron"
import { randomUUID } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { ExtensionEntry } from "@shared/types"

const FILE = () => join(app.getPath("userData"), "extensions.json")

type StoredEntry = Pick<ExtensionEntry, "id" | "path" | "addedAt">

export class ExtensionsStore {
  private entries: ExtensionEntry[]
  private listeners = new Set<(list: ExtensionEntry[]) => void>()
  /** Electron returns an Extension object per loaded extension; we
   *  keep the id around so we can call session.removeExtension on it. */
  private electronIdById = new Map<string, string>()

  constructor() {
    const stored = this.read()
    this.entries = stored.map((s) => ({
      ...s,
      name: null,
      version: null,
      description: null,
      loaded: false,
      lastError: null,
    }))
  }

  /** Called once at app boot, after the default session is ready. */
  async loadAll(): Promise<void> {
    for (const e of this.entries) {
      await this.loadOne(e)
    }
    this.persist()
    this.emit()
  }

  list(): ExtensionEntry[] {
    return this.entries.map((e) => ({ ...e }))
  }

  async pickAndAdd(parent: BrowserWindow | null): Promise<ExtensionEntry | null> {
    const opts: Electron.OpenDialogOptions = {
      title: "Pick an unpacked extension folder",
      properties: ["openDirectory"],
      message: "Pick the folder that contains the extension's manifest.json.",
    }
    const result = parent
      ? await dialog.showOpenDialog(parent, opts)
      : await dialog.showOpenDialog(opts)
    if (result.canceled || result.filePaths.length === 0) return null
    const path = result.filePaths[0]!
    return await this.add(path)
  }

  async add(path: string): Promise<ExtensionEntry> {
    // Sanity-check the folder before saving so we don't add a path
    // that obviously won't load — the failure will still be captured
    // on the entry if it loads later but errors at runtime.
    if (!existsSync(join(path, "manifest.json"))) {
      throw new Error("That folder doesn't contain a manifest.json.")
    }
    // De-dup: if the user re-adds the same folder, just return the
    // existing entry and skip a duplicate load.
    const existing = this.entries.find((e) => e.path === path)
    if (existing) return { ...existing }
    const entry: ExtensionEntry = {
      id: "ext:" + randomUUID(),
      path,
      name: null,
      version: null,
      description: null,
      loaded: false,
      lastError: null,
      addedAt: Date.now(),
    }
    this.entries.push(entry)
    await this.loadOne(entry)
    this.persist()
    this.emit()
    return { ...entry }
  }

  async remove(id: string): Promise<void> {
    const e = this.entries.find((x) => x.id === id)
    if (!e) return
    const electronId = this.electronIdById.get(id)
    if (electronId) {
      try { session.defaultSession.removeExtension(electronId) } catch { /* already gone */ }
      this.electronIdById.delete(id)
    }
    this.entries = this.entries.filter((x) => x.id !== id)
    this.persist()
    this.emit()
  }

  async reload(id: string): Promise<ExtensionEntry> {
    const e = this.entries.find((x) => x.id === id)
    if (!e) throw new Error("No such extension.")
    const electronId = this.electronIdById.get(id)
    if (electronId) {
      try { session.defaultSession.removeExtension(electronId) } catch { /* */ }
      this.electronIdById.delete(id)
    }
    e.loaded = false
    e.lastError = null
    await this.loadOne(e)
    this.persist()
    this.emit()
    return { ...e }
  }

  onChange(cb: (list: ExtensionEntry[]) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  // ── internals ────────────────────────────────────────────
  private async loadOne(entry: ExtensionEntry): Promise<void> {
    // Pull metadata from manifest.json so the UI has something to
    // show even if the load itself fails downstream.
    try {
      const raw = readFileSync(join(entry.path, "manifest.json"), "utf8")
      const m = JSON.parse(raw) as { name?: string; version?: string; description?: string }
      entry.name        = typeof m.name        === "string" ? m.name        : null
      entry.version     = typeof m.version     === "string" ? m.version     : null
      entry.description = typeof m.description === "string" ? m.description : null
    } catch (err) {
      entry.lastError = err instanceof Error ? err.message : String(err)
      entry.loaded = false
      return
    }
    try {
      // allowFileAccess lets extensions read file:// URLs — most
      // browse-and-modify extensions need this. The user opted in by
      // pointing us at the folder; we don't second-guess.
      const ext = await session.defaultSession.loadExtension(entry.path, { allowFileAccess: true })
      this.electronIdById.set(entry.id, ext.id)
      entry.loaded = true
      entry.lastError = null
    } catch (err) {
      entry.loaded = false
      entry.lastError = err instanceof Error ? err.message : String(err)
    }
  }

  private read(): StoredEntry[] {
    try {
      if (!existsSync(FILE())) return []
      const raw = readFileSync(FILE(), "utf8")
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(isStored)
    } catch {
      return []
    }
  }

  private persist(): void {
    try {
      // Strip the runtime-only fields. Re-derived from disk on next boot.
      const serial: StoredEntry[] = this.entries.map((e) => ({
        id: e.id, path: e.path, addedAt: e.addedAt,
      }))
      writeFileSync(FILE(), JSON.stringify(serial, null, 2), "utf8")
    } catch (err) {
      console.warn("[extensions] failed to persist:", err)
    }
  }

  private emit(): void {
    const wire = this.list()
    for (const cb of this.listeners) cb(wire)
  }
}

function isStored(x: unknown): x is StoredEntry {
  if (!x || typeof x !== "object") return false
  const e = x as Record<string, unknown>
  return typeof e.id === "string" && typeof e.path === "string"
}
