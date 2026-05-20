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
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"
import { join } from "node:path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import type { SettingsUpdate, UserSettings } from "@shared/types"

// PBKDF2 — 200k iterations of SHA-256, 32-byte salt, 32-byte hash. Tuned
// to ~150ms on a 2023 M-series laptop, which is fast enough for a lock
// screen and slow enough to make brute-forcing a 4-digit PIN feel.
const PBKDF2_ITERS = 200_000
const PBKDF2_KEYLEN = 32
const PBKDF2_DIGEST = "sha256"

function hashSecret(plain: string, saltB64?: string): { salt: string; hash: string } {
  const salt = saltB64 ? Buffer.from(saltB64, "base64") : randomBytes(32)
  const hash = pbkdf2Sync(plain.normalize("NFKC"), salt, PBKDF2_ITERS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
  return { salt: salt.toString("base64"), hash: hash.toString("base64") }
}

function verifySecret(plain: string, saltB64: string, expectedHashB64: string): boolean {
  const { hash } = hashSecret(plain, saltB64)
  const a = Buffer.from(hash, "base64")
  const b = Buffer.from(expectedHashB64, "base64")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// PINs are 4–12 digits; passwords are 8+ printable chars. Cheap
// guardrails to keep users from accidentally setting a 1-char lock.
function validateLockSecret(kind: "pin" | "password", secret: string): void {
  const s = secret.normalize("NFKC")
  if (kind === "pin") {
    if (!/^\d{4,12}$/.test(s)) {
      throw new Error("PIN must be 4 to 12 digits.")
    }
  } else {
    if (s.length < 8) {
      throw new Error("Password must be at least 8 characters.")
    }
  }
}

// On-disk shape. The renderer's `hasApiKey` boolean is computed from the
// cipher being present, so the stored shape just carries id/label/endpoint
// + optional ciphertext.
type StoredEndpoint = {
  id: string
  label: string
  endpoint: string
  apiKeyCipher?: string
}
type StoredSettings = Omit<UserSettings, "openaiHasKey" | "anthropicHasKey" | "customEndpoints" | "accountLockConfigured"> & {
  openaiKeyCipher?: string     // base64 of safeStorage ciphertext
  anthropicKeyCipher?: string
  customEndpoints: StoredEndpoint[]
  // permissionGrants is in the wire shape too — store it as-is.
  accountLockSalt?: string     // base64 — present iff a lock is configured
  accountLockHash?: string     // base64 — PBKDF2-SHA256 of the secret + salt
}

const FILE = "settings.json"

const DEFAULTS: StoredSettings = {
  openaiEnabled: false,
  anthropicEnabled: false,
  customEndpoints: [],
  defaultProvider: { id: "auto" },
  permissionGrants: [],
  newtabBackground: "procedural",
  newtabFolder: null,
  requireBiometric: false,
  useAdBlock: true,
  useExtendedTrackerList: true,
  httpsOnly: true,
  httpsOnlyBypass: [],
  strictReferrerPolicy: true,
  dnsOverHttps: false,
  dohProvider: "cloudflare",
  autoUpdateCheck: false,
  personalSlmEnabled: false,
  accountLockKind: "none",
  secondBrainPath: null,
  tabDiscardMinutes: 30,
  maxLiveTabs: 0,
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
    openaiEnabled:    s.openaiEnabled    && !!s.openaiKeyCipher,
    openaiHasKey:     !!s.openaiKeyCipher,
    anthropicEnabled: s.anthropicEnabled && !!s.anthropicKeyCipher,
    anthropicHasKey:  !!s.anthropicKeyCipher,
    customEndpoints: s.customEndpoints.map((e) => ({
      id: e.id,
      label: e.label,
      endpoint: e.endpoint,
      hasApiKey: !!e.apiKeyCipher,
    })),
    defaultProvider: s.defaultProvider,
    permissionGrants: s.permissionGrants ?? [],
    newtabBackground: s.newtabBackground ?? "procedural",
    newtabFolder: s.newtabFolder ?? null,
    requireBiometric: s.requireBiometric ?? false,
    useAdBlock: s.useAdBlock ?? true,
    useExtendedTrackerList: s.useExtendedTrackerList ?? true,
    httpsOnly: s.httpsOnly ?? true,
    httpsOnlyBypass: s.httpsOnlyBypass ?? [],
    strictReferrerPolicy: s.strictReferrerPolicy ?? true,
    dnsOverHttps: s.dnsOverHttps ?? false,
    dohProvider: s.dohProvider ?? "cloudflare",
    autoUpdateCheck: s.autoUpdateCheck ?? false,
    personalSlmEnabled: s.personalSlmEnabled ?? false,
    accountLockKind: s.accountLockKind ?? "none",
    accountLockConfigured:
      (s.accountLockKind ?? "none") !== "none" && !!s.accountLockHash && !!s.accountLockSalt,
    secondBrainPath: s.secondBrainPath ?? null,
    tabDiscardMinutes: clampDiscardMinutes(s.tabDiscardMinutes),
    maxLiveTabs: clampMaxLiveTabs(s.maxLiveTabs),
  }
}

function clampDiscardMinutes(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 30
  return Math.max(0, Math.min(720, Math.floor(v)))
}

function clampMaxLiveTabs(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0
  // 0 = unlimited. Otherwise 3..200 — under 3 makes the browser unusable
  // (active + one neighbour), over 200 defeats the point of the cap.
  const n = Math.floor(v)
  if (n <= 0) return 0
  return Math.max(3, Math.min(200, n))
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

  resolveAnthropicKey(): string | null {
    if (!this.state.anthropicKeyCipher) return null
    return decrypt(this.state.anthropicKeyCipher)
  }

  hasPermission(origin: string, tool: string): boolean {
    return (this.state.permissionGrants ?? []).some(
      (g) => g.origin === origin && g.tool === tool,
    )
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
      case "anthropicEnabled":
        this.state.anthropicEnabled = update.value
        break
      case "anthropicKey":
        if (update.value === null) {
          delete this.state.anthropicKeyCipher
          this.state.anthropicEnabled = false
        } else {
          this.state.anthropicKeyCipher = encrypt(update.value)
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
      case "grantPermission": {
        const { origin, tool } = update
        if (!this.state.permissionGrants) this.state.permissionGrants = []
        if (!this.state.permissionGrants.some((g) => g.origin === origin && g.tool === tool)) {
          this.state.permissionGrants.push({ origin, tool })
        }
        break
      }
      case "revokePermission": {
        const { origin, tool } = update
        if (this.state.permissionGrants) {
          this.state.permissionGrants = this.state.permissionGrants.filter(
            (g) => !(g.origin === origin && g.tool === tool),
          )
        }
        break
      }
      case "newtabBackground":
        this.state.newtabBackground = update.value
        break
      case "newtabFolder":
        this.state.newtabFolder = update.value
        break
      case "requireBiometric":
        this.state.requireBiometric = update.value
        break
      case "useExtendedTrackerList":
        this.state.useExtendedTrackerList = update.value
        break
      case "useAdBlock":
        this.state.useAdBlock = update.value
        break
      case "httpsOnly":
        this.state.httpsOnly = update.value
        break
      case "httpsOnlyBypassAdd": {
        const h = update.host.toLowerCase().trim()
        if (h && !this.state.httpsOnlyBypass.includes(h)) {
          this.state.httpsOnlyBypass = [...this.state.httpsOnlyBypass, h]
        }
        break
      }
      case "httpsOnlyBypassRemove":
        this.state.httpsOnlyBypass = this.state.httpsOnlyBypass.filter(
          (h) => h !== update.host.toLowerCase(),
        )
        break
      case "strictReferrerPolicy":
        this.state.strictReferrerPolicy = update.value
        break
      case "dnsOverHttps":
        this.state.dnsOverHttps = update.value
        break
      case "dohProvider":
        this.state.dohProvider = update.value
        break
      case "autoUpdateCheck":
        this.state.autoUpdateCheck = update.value
        break
      case "personalSlmEnabled":
        this.state.personalSlmEnabled = update.value
        break
      case "secondBrainPath":
        this.state.secondBrainPath = update.value
        break
      case "tabDiscardMinutes":
        this.state.tabDiscardMinutes = clampDiscardMinutes(update.value)
        break
      case "maxLiveTabs":
        this.state.maxLiveTabs = clampMaxLiveTabs(update.value)
        break
      case "setAccountLock": {
        // If a lock is already configured the caller MUST present the
        // current secret. Refuse silently otherwise — never write a new
        // hash without authorisation.
        if (this.state.accountLockHash && this.state.accountLockSalt) {
          if (!update.currentSecret) {
            throw new Error("Current PIN/password required to change the lock.")
          }
          if (!verifySecret(update.currentSecret, this.state.accountLockSalt, this.state.accountLockHash)) {
            throw new Error("Current PIN/password is incorrect.")
          }
        }
        validateLockSecret(update.lockKind, update.secret)
        const { salt, hash } = hashSecret(update.secret)
        this.state.accountLockKind = update.lockKind
        this.state.accountLockSalt = salt
        this.state.accountLockHash = hash
        break
      }
      case "clearAccountLock": {
        if (this.state.accountLockHash && this.state.accountLockSalt) {
          if (!verifySecret(update.currentSecret, this.state.accountLockSalt, this.state.accountLockHash)) {
            throw new Error("Current PIN/password is incorrect.")
          }
        }
        this.state.accountLockKind = "none"
        delete this.state.accountLockSalt
        delete this.state.accountLockHash
        // The lock is now gone — mark this session as unlocked so the
        // renderer doesn't redraw a lock screen on the next requiresUnlock().
        this.sessionUnlocked = true
        break
      }
    }
    persist(this.state)
    this.emit()
    return this.get()
  }

  // ── Account lock — session verification ─────────────────────
  // The lock is enforced once per process. On a successful verify we
  // flip sessionUnlocked; subsequent IPC requiresUnlock() returns false
  // until the process exits.
  private sessionUnlocked = false

  /** True iff a lock is configured AND has not been verified yet this session. */
  requiresUnlock(): boolean {
    if (this.sessionUnlocked) return false
    if (this.state.accountLockKind === "none") return false
    if (!this.state.accountLockHash || !this.state.accountLockSalt) return false
    return true
  }

  /** Verify the user-entered secret. Returns true on success and unlocks the session. */
  verifyAccountLock(secret: string): boolean {
    if (!this.state.accountLockHash || !this.state.accountLockSalt) {
      // No lock configured — treat as already unlocked.
      this.sessionUnlocked = true
      return true
    }
    const ok = verifySecret(secret, this.state.accountLockSalt, this.state.accountLockHash)
    if (ok) this.sessionUnlocked = true
    return ok
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
