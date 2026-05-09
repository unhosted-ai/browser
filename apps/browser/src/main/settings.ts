// Persisted user settings.
//
// Storage rules:
// - Non-sensitive data goes to electron-store as-is.
// - Sensitive data (API keys) is encrypted via safeStorage before it touches
//   disk. The renderer never sees a key value; it only learns whether one is
//   *configured* via the boolean `*HasKey` fields.
// - If safeStorage isn't available on this platform (rare), we refuse to
//   persist keys rather than fall back to plaintext on disk.
import { app, safeStorage } from "electron"
import { randomUUID } from "node:crypto"
import { join } from "node:path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import type { SettingsUpdate, UserSettings } from "@shared/types"

// On-disk shape. The renderer's `hasApiKey` boolean is computed from the
// cipher being present, so the stored shape just carries id/label/endpoint
// + optional ciphertext.
type StoredEndpoint = {
  id: string
  label: string
  endpoint: string
  apiKeyCipher?: string
}
type StoredSettings = Omit<UserSettings, "openaiHasKey" | "customEndpoints"> & {
  openaiKeyCipher?: string  // base64 of safeStorage ciphertext
  customEndpoints: StoredEndpoint[]
}

const FILE = "settings.json"

const DEFAULTS: StoredSettings = {
  openaiEnabled: false,
  customEndpoints: [],
  defaultProvider: { id: "auto" },
}

function settingsPath(): string {
  const dir = app.getPath("userData")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, FILE)
}

function load(): StoredSettings {
  const path = settingsPath()
  if (!existsSync(path)) return { ...DEFAULTS }
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8"))
    return { ...DEFAULTS, ...raw }
  } catch {
    return { ...DEFAULTS }
  }
}

function persist(s: StoredSettings): void {
  writeFileSync(settingsPath(), JSON.stringify(s, null, 2), "utf-8")
}

function encrypt(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      "OS keychain encryption is unavailable on this platform; refusing to persist API keys in plaintext."
    )
  }
  return safeStorage.encryptString(plain).toString("base64")
}

function decrypt(cipher: string): string | null {
  try {
    return safeStorage.decryptString(Buffer.from(cipher, "base64"))
  } catch {
    return null
  }
}

// ── Public-facing shape ───────────────────────────────────
function toWire(s: StoredSettings): UserSettings {
  return {
    openaiEnabled: s.openaiEnabled && !!s.openaiKeyCipher,
    openaiHasKey: !!s.openaiKeyCipher,
    customEndpoints: s.customEndpoints.map((e) => ({
      id: e.id,
      label: e.label,
      endpoint: e.endpoint,
      hasApiKey: !!e.apiKeyCipher,
    })),
    defaultProvider: s.defaultProvider,
  }
}

export class SettingsStore {
  private state: StoredSettings
  private listeners = new Set<(s: UserSettings) => void>()

  constructor() {
    this.state = load()
  }

  get(): UserSettings {
    return toWire(this.state)
  }

  /** Resolve secret material for use in main only. Never expose this. */
  resolveOpenaiKey(): string | null {
    if (!this.state.openaiKeyCipher) return null
    return decrypt(this.state.openaiKeyCipher)
  }

  /** Resolve a custom endpoint's API key for use in main only. */
  resolveCustomKey(id: string): string | null {
    const e = this.state.customEndpoints.find((x) => x.id === id)
    if (!e?.apiKeyCipher) return null
    return decrypt(e.apiKeyCipher)
  }

  apply(update: SettingsUpdate): UserSettings {
    switch (update.kind) {
      case "openaiEnabled":
        this.state.openaiEnabled = update.value
        break
      case "openaiKey":
        if (update.value === null) {
          delete this.state.openaiKeyCipher
          this.state.openaiEnabled = false
        } else {
          this.state.openaiKeyCipher = encrypt(update.value)
        }
        break
      case "addCustomEndpoint": {
        const id = "custom:" + randomUUID()
        const e: StoredEndpoint = {
          id,
          label: update.label.trim() || new URL(update.endpoint).host,
          endpoint: update.endpoint.replace(/\/$/, ""),
        }
        if (update.apiKey) e.apiKeyCipher = encrypt(update.apiKey)
        this.state.customEndpoints.push(e)
        break
      }
      case "removeCustomEndpoint":
        this.state.customEndpoints = this.state.customEndpoints.filter(
          (e) => e.id !== update.id
        )
        if (this.state.defaultProvider.id === update.id) {
          this.state.defaultProvider = { id: "auto" }
        }
        break
      case "defaultProvider":
        this.state.defaultProvider = { id: update.id, model: update.model }
        break
    }
    persist(this.state)
    this.emit()
    return this.get()
  }

  onChange(cb: (s: UserSettings) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private emit(): void {
    const wire = this.get()
    for (const cb of this.listeners) cb(wire)
  }
}
