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
import { execFile } from "node:child_process"
import { randomUUID } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { promisify } from "node:util"
import type {
  CredentialImportPreview,
  CredentialImportRow,
  CredentialImportSelection,
  SavedCredential,
  SystemCredentialEntry,
  SystemCredentialImportResult,
} from "@shared/types"

const execFileP = promisify(execFile)

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

  /** Enumerate web-password entries in the OS keychain. Metadata only —
   *  no password values are read here, so the OS access-prompt does NOT
   *  appear. Returns `{ host, username, alreadyImported }` so the UI can
   *  ask the user which entries to import.
   *
   *  Platforms: macOS shells out to `security dump-keychain` and parses
   *  internet-password records (class:"inet"). Windows + Linux return an
   *  empty list today — same shape, separate PR. */
  async listSystemPasswords(): Promise<SystemCredentialEntry[]> {
    if (process.platform !== "darwin") return []
    try {
      // `-c inet` filters to internet passwords (Safari / iCloud Keychain
      // form fills). We don't pass `-d` — that would dump secrets and
      // trigger the OS prompt per item even though we don't need values.
      const { stdout } = await execFileP("security", ["dump-keychain"], {
        maxBuffer: 32 * 1024 * 1024,
      })
      const parsed = parseSecurityDump(stdout)
      const seen = new Set<string>()
      const out: SystemCredentialEntry[] = []
      for (const item of parsed) {
        if (item.class !== "inet") continue
        if (!item.srvr || !item.acct) continue
        const host = item.srvr.toLowerCase()
        const username = item.acct
        const key = `${host}\t${username}`
        if (seen.has(key)) continue
        seen.add(key)
        const protocol = item.ptcl === "http" ? "http" : "https"
        const origin = `${protocol}://${host}`
        out.push({
          host,
          username,
          origin,
          alreadyImported: this.creds.some((c) => c.origin === origin && c.username === username),
        })
      }
      // Stable display order: alphabetical by host, then username.
      out.sort((a, b) => a.host.localeCompare(b.host) || a.username.localeCompare(b.username))
      return out
    } catch (err) {
      console.warn("[credentials] system keychain listing failed:", err)
      return []
    }
  }

  /** Import the user-selected entries from the OS keychain. For each entry,
   *  fetches the password via `security find-internet-password -w` — the OS
   *  shows its access-prompt the first time, then remembers if the user
   *  clicks "Always allow". Returns a per-entry result so the UI can show
   *  which ones the user denied or which were missing. Plaintext never
   *  leaves main. */
  async importFromSystemPasswords(entries: SystemCredentialEntry[]): Promise<SystemCredentialImportResult> {
    if (process.platform !== "darwin") {
      return { imported: 0, results: entries.map((e) => ({ host: e.host, username: e.username, status: "unsupported" })) }
    }
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("OS keychain encryption is unavailable; refusing to persist passwords.")
    }
    const results: SystemCredentialImportResult["results"] = []
    let imported = 0
    for (const entry of entries) {
      const host = entry.host?.trim().toLowerCase()
      const username = entry.username?.trim()
      if (!host || !username) {
        results.push({ host: entry.host, username: entry.username, status: "skipped" })
        continue
      }
      let password: string | null = null
      try {
        const { stdout } = await execFileP("security", [
          "find-internet-password",
          "-s", host,
          "-a", username,
          "-w",
        ])
        // `-w` prints the password followed by a newline; trim that.
        password = stdout.replace(/\n$/, "")
        if (!password) {
          results.push({ host, username, status: "no_password" })
          continue
        }
      } catch (err: any) {
        // `security` exits non-zero when the user denies or the item is
        // missing. We can't always distinguish — surface a generic
        // "denied_or_missing" so the UI tells the user to try again.
        const msg = (err?.stderr?.toString?.() ?? err?.message ?? "").toLowerCase()
        const denied = msg.includes("user interaction is not allowed") || msg.includes("user name or signature") || msg.includes("user canceled")
        results.push({ host, username, status: denied ? "denied" : "not_found" })
        continue
      }
      // Replace any prior entry for the same (origin, username) — same
      // policy as the CSV path.
      const origin = entry.origin ?? `https://${host}`
      this.creds = this.creds.filter((c) => !(c.origin === origin && c.username === username))
      this.creds.push({
        id: "cred:" + randomUUID(),
        origin,
        username,
        passwordCipher: safeStorage.encryptString(password).toString("base64"),
        importedAt: Date.now(),
        lastUsedAt: null,
      })
      // Drop the plaintext reference immediately.
      password = null
      imported += 1
      results.push({ host, username, status: "imported" })
    }
    this.persist()
    this.emit()
    return { imported, results }
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

// ── macOS `security dump-keychain` parser ─────────────────────────────
// The CLI prints one item at a time, each item is a `keychain:` line
// followed by a `class:` line and an `attributes:` block. Inside the
// attributes block, each row is one keyed attribute. We only care about
// `srvr` (server), `acct` (account/username), and `ptcl` (protocol);
// every other attribute is ignored. Output looks like:
//
//   keychain: "/.../login.keychain-db"
//   class: "inet"
//   attributes:
//       "acct"<blob>="alice@example.com"
//       "srvr"<blob>="example.com"
//       "ptcl"<uint32>="htps"
//
// Quoted blob values can contain escaped characters (`\134` = backslash,
// etc) but for hostnames + usernames the encoding is plain ASCII in
// every example we've checked.
type ParsedSecurityItem = { class: string; srvr?: string; acct?: string; ptcl?: string }
function parseSecurityDump(text: string): ParsedSecurityItem[] {
  const out: ParsedSecurityItem[] = []
  let current: ParsedSecurityItem | null = null
  const lines = text.split("\n")
  for (const line of lines) {
    const klass = line.match(/^class:\s*"([^"]+)"/)
    if (klass) {
      if (current) out.push(current)
      current = { class: klass[1]! }
      continue
    }
    if (!current) continue
    const attr = line.match(/^\s*"(\w{4})"<[^>]+>=(?:"([^"]*)"|0x([0-9A-Fa-f]+))/)
    if (!attr) continue
    const key = attr[1]
    const quoted = attr[2]
    const hex = attr[3]
    let value: string | undefined = quoted
    if (value === undefined && hex !== undefined) {
      // Some attributes are emitted as hex (e.g. when the blob contains
      // non-printable bytes). Decode as UTF-8 for sanity.
      try { value = Buffer.from(hex, "hex").toString("utf8") } catch { value = undefined }
    }
    if (value === undefined) continue
    if (key === "srvr") current.srvr = value
    else if (key === "acct") current.acct = value
    else if (key === "ptcl") current.ptcl = value.toLowerCase().includes("htps") ? "https" : "http"
  }
  if (current) out.push(current)
  return out
}
