// Per-site password import. Same encryption story as API keys: we
// use Electron `safeStorage` (OS keychain — macOS Keychain / Windows
// DPAPI / libsecret on Linux). The renderer never sees the plaintext
// password — only `{ id, origin, username, hasPassword, importedAt }`
// over IPC. Decryption happens only inside main, only when we're
// about to inject into the active tab's focused form.
//
// CSV format we accept: Chrome/Brave/Edge/Firefox/Safari all export a
// table with at least `url`, `username`, `password` columns (header
// names vary slightly — we case-insensitive match on common aliases).
// We don't fingerprint the file beyond that; a "good enough" RFC 4180
// parser with quoted-field support handles every export we've seen.
//
// Import is a two-step flow:
//   1. pickAndPreview() opens a native file dialog, parses the CSV,
//      returns a CredentialImportPreview. No state mutation yet.
//   2. importSelected({ filePath, keepIndices }) re-reads the file,
//      filters to the user-picked indices, encrypts each password,
//      writes them to credentials.json. This is the "user allows only
//      for that specific site" mechanic — they toggle per-row in
//      Settings before any password leaves the CSV.

import { app, BrowserWindow, dialog, safeStorage, type WebContents } from "electron"
import { randomUUID } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type {
  CredentialImportPreview,
  CredentialImportRow,
  CredentialImportSelection,
  SavedCredential,
} from "@shared/types"

const FILE = () => join(app.getPath("userData"), "credentials.json")

// On-disk shape. The wire shape (SavedCredential) drops the ciphertext.
type StoredCredential = {
  id: string
  origin: string
  username: string
  passwordCipher?: string  // base64 — present iff a password was imported
  importedAt: number
  lastUsedAt: number | null
}

export class CredentialsStore {
  private creds: StoredCredential[]
  private listeners = new Set<(creds: SavedCredential[]) => void>()

  constructor() {
    this.creds = this.read()
  }

  list(): SavedCredential[] {
    return this.creds.map(toWire)
  }

  listForOrigin(originRaw: string): SavedCredential[] {
    const want = normaliseOrigin(originRaw)
    if (!want) return []
    return this.creds.filter((c) => c.origin === want).map(toWire)
  }

  remove(id: string): void {
    this.creds = this.creds.filter((c) => c.id !== id)
    this.persist()
    this.emit()
  }

  /** Plaintext returned only inside main. Never expose this over IPC. */
  resolve(id: string): { origin: string; username: string; password: string | null } | null {
    const c = this.creds.find((x) => x.id === id)
    if (!c) return null
    let password: string | null = null
    if (c.passwordCipher) {
      try {
        password = safeStorage.decryptString(Buffer.from(c.passwordCipher, "base64"))
      } catch {
        password = null
      }
    }
    c.lastUsedAt = Date.now()
    this.persist()
    return { origin: c.origin, username: c.username, password }
  }

  onChange(cb: (creds: SavedCredential[]) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Open the native file picker, parse what the user chose. No persistence. */
  async pickAndPreview(parent: BrowserWindow | null): Promise<CredentialImportPreview | null> {
    const opts: Electron.OpenDialogOptions = {
      title: "Import passwords from a CSV",
      properties: ["openFile"],
      filters: [{ name: "CSV", extensions: ["csv", "txt"] }],
    }
    const result = parent
      ? await dialog.showOpenDialog(parent, opts)
      : await dialog.showOpenDialog(opts)
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]!
    return this.previewFile(filePath)
  }

  previewFile(filePath: string): CredentialImportPreview {
    const raw = readFileSync(filePath, "utf8")
    const parsed = parseCsv(raw)
    if (parsed.rows.length === 0) {
      return { filePath, rows: [], rejected: 0 }
    }
    const cols = pickColumnIndices(parsed.header)
    const rows: CredentialImportRow[] = []
    let rejected = 0
    parsed.rows.forEach((row, i) => {
      const url      = cols.url      != null ? row[cols.url]      ?? "" : ""
      const username = cols.username != null ? row[cols.username] ?? "" : ""
      const password = cols.password != null ? row[cols.password] ?? "" : ""
      const origin = normaliseOrigin(url)
      if (!origin || !username) { rejected += 1; return }
      rows.push({
        index: i,
        origin,
        username,
        passwordHint: hintForPassword(password),
        alreadyExists: this.creds.some((c) => c.origin === origin && c.username === username),
        invalid: false,
      })
    })
    return { filePath, rows, rejected }
  }

  /** Persist the rows the user kept. Refuses if safeStorage is unavailable. */
  importSelected(selection: CredentialImportSelection): number {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "OS keychain encryption is unavailable on this platform; refusing to persist passwords.",
      )
    }
    const raw = readFileSync(selection.filePath, "utf8")
    const parsed = parseCsv(raw)
    const cols = pickColumnIndices(parsed.header)
    const keep = new Set(selection.keepIndices)
    let imported = 0
    parsed.rows.forEach((row, i) => {
      if (!keep.has(i)) return
      const url      = cols.url      != null ? row[cols.url]      ?? "" : ""
      const username = cols.username != null ? row[cols.username] ?? "" : ""
      const password = cols.password != null ? row[cols.password] ?? "" : ""
      const origin = normaliseOrigin(url)
      if (!origin || !username) return
      // Replace if same (origin, username) already exists — keep one
      // canonical entry per pair so the address-bar fill chip doesn't
      // have to disambiguate.
      this.creds = this.creds.filter((c) => !(c.origin === origin && c.username === username))
      const entry: StoredCredential = {
        id: "cred:" + randomUUID(),
        origin,
        username,
        importedAt: Date.now(),
        lastUsedAt: null,
      }
      if (password) {
        entry.passwordCipher = safeStorage.encryptString(password).toString("base64")
      }
      this.creds.push(entry)
      imported += 1
    })
    this.persist()
    this.emit()
    return imported
  }

  /** Fill the credential into the focused form on the supplied WebContents. */
  async fillActive(id: string, contents: WebContents | null): Promise<boolean> {
    if (!contents) return false
    const resolved = this.resolve(id)
    if (!resolved) return false
    const { username, password } = resolved
    if (password == null) return false
    // Inject the credentials into whichever password field is on the
    // page and the nearest preceding text-shaped input. Fires native
    // input + change events so React/Vue/Angular pages see the value.
    // Returns true if both fields were filled.
    const payload = JSON.stringify({ username, password })
    try {
      const ok = await contents.executeJavaScript(
        `(() => {
          const data = ${payload};
          const pwd = document.querySelector('input[type="password"]');
          if (!pwd) return false;
          // Username = the nearest preceding text/email/tel input. If none, the first one in the form.
          const form = pwd.closest('form');
          const scope = form || document;
          const candidates = Array.from(scope.querySelectorAll(
            'input[type="text"], input[type="email"], input[type="tel"], input:not([type])'
          ));
          const user = candidates.find((c) => c.compareDocumentPosition(pwd) & Node.DOCUMENT_POSITION_FOLLOWING) || candidates[0];
          const setReact = (el, value) => {
            const proto = Object.getPrototypeOf(el);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (setter) setter.call(el, value); else el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          };
          if (user) setReact(user, data.username);
          setReact(pwd, data.password);
          return !!user;
        })()`,
        true,
      )
      return !!ok
    } catch (err) {
      console.warn("[credentials] fill failed:", err)
      return false
    }
  }

  private read(): StoredCredential[] {
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
      writeFileSync(FILE(), JSON.stringify(this.creds, null, 2), "utf8")
    } catch (err) {
      console.warn("[credentials] failed to persist:", err)
    }
  }

  private emit(): void {
    const wire = this.list()
    for (const cb of this.listeners) cb(wire)
  }
}

// ── helpers ──────────────────────────────────────────────────
function toWire(c: StoredCredential): SavedCredential {
  return {
    id: c.id,
    origin: c.origin,
    username: c.username,
    hasPassword: !!c.passwordCipher,
    importedAt: c.importedAt,
    lastUsedAt: c.lastUsedAt,
  }
}

function normaliseOrigin(raw: string): string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return ""
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`)
    return `${u.protocol}//${u.host}`.toLowerCase()
  } catch {
    return ""
  }
}

function hintForPassword(pw: string): string {
  if (!pw) return ""
  const tail = pw.slice(-2)
  return "••••" + (tail ? `…${tail}` : "")
}

type ColumnMap = { url?: number; username?: number; password?: number }

function pickColumnIndices(header: string[]): ColumnMap {
  const lower = header.map((h) => h.trim().toLowerCase())
  const find = (aliases: string[]) => {
    for (const a of aliases) {
      const i = lower.indexOf(a)
      if (i !== -1) return i
    }
    return undefined
  }
  return {
    url:      find(["url", "website", "site", "login_uri", "origin"]),
    username: find(["username", "user", "login", "email", "login_username"]),
    password: find(["password", "pass", "login_password"]),
  }
}

// Tiny RFC 4180-ish CSV parser. Handles quoted fields, escaped quotes
// (""), embedded newlines inside quotes, and the BOM that some exports
// prepend. Not a full RFC 4180 implementation — but matches every
// Chrome/Brave/Edge/Firefox/Safari export I've checked.
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
  let src = text
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1)
  const rows: string[][] = []
  let cur: string[] = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"' && field === "") {
        inQuotes = true
      } else if (ch === ",") {
        cur.push(field); field = ""
      } else if (ch === "\n") {
        cur.push(field); rows.push(cur); cur = []; field = ""
      } else if (ch === "\r") {
        // Defer — handle as part of \r\n or treat lone \r as newline.
        if (src[i + 1] === "\n") continue
        cur.push(field); rows.push(cur); cur = []; field = ""
      } else {
        field += ch
      }
    }
  }
  // Final field / row
  if (field.length > 0 || cur.length > 0) {
    cur.push(field)
    rows.push(cur)
  }
  if (rows.length === 0) return { header: [], rows: [] }
  const header = rows[0]!
  return { header, rows: rows.slice(1).filter((r) => r.length > 0 && !(r.length === 1 && r[0] === "")) }
}

function isStored(x: unknown): x is StoredCredential {
  if (!x || typeof x !== "object") return false
  const c = x as Record<string, unknown>
  return (
    typeof c.id === "string" &&
    typeof c.origin === "string" &&
    typeof c.username === "string"
  )
}
