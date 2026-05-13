import { app, net } from "electron"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Identity, IdentityProvider } from "@shared/types"

// Persisted at userData/identity.json — plain JSON because nothing in it
// is sensitive (public name + public avatar URL). The user can delete the
// file by hand and the app behaves as if signed out. There is no token,
// no refresh, no remote account. See docs/identity.md §0.
const FILE = () => join(app.getPath("userData"), "identity.json")

export class IdentityStore {
  private current: Identity | null
  private listeners = new Set<(id: Identity | null) => void>()

  constructor() {
    this.current = this.read()
  }

  get(): Identity | null {
    return this.current
  }

  onChange(cb: (id: Identity | null) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  async signIn(provider: IdentityProvider, rawHandle: string): Promise<Identity> {
    const handle = rawHandle.trim()
    if (!handle) throw new Error("Enter a handle to continue.")
    const identity =
      provider === "github" ? await fetchGitHub(handle) : fromEmail(handle)
    this.current = identity
    this.write(identity)
    this.emit()
    return identity
  }

  signOut(): void {
    this.current = null
    try {
      if (existsSync(FILE())) writeFileSync(FILE(), JSON.stringify(null))
    } catch {
      // Best-effort — if we can't write, the in-memory state is still
      // cleared and the next read will see whatever's on disk.
    }
    this.emit()
  }

  private read(): Identity | null {
    try {
      if (!existsSync(FILE())) return null
      const raw = readFileSync(FILE(), "utf8")
      const parsed = JSON.parse(raw) as Identity | null
      if (!parsed || !parsed.provider || !parsed.handle) return null
      return parsed
    } catch {
      return null
    }
  }

  private write(id: Identity | null): void {
    try {
      writeFileSync(FILE(), JSON.stringify(id, null, 2))
    } catch (err) {
      console.warn("[identity] failed to persist:", err)
    }
  }

  private emit(): void {
    for (const cb of this.listeners) cb(this.current)
  }
}

// One public-profile lookup. github.com lets you read /users/<name>
// without an Authorization header — strictly the same data anyone with a
// browser could see at github.com/<name>. We pick name + avatar_url and
// drop the rest.
async function fetchGitHub(rawHandle: string): Promise<Identity> {
  const handle = rawHandle.replace(/^@/, "").trim()
  if (!/^[a-z0-9-]{1,39}$/i.test(handle)) {
    throw new Error("That doesn't look like a GitHub username.")
  }
  const res = await net.fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Delta-Browser",
    },
  })
  if (res.status === 404) throw new Error(`No public GitHub user "${handle}".`)
  if (!res.ok) throw new Error(`GitHub lookup failed (${res.status}).`)
  const body = (await res.json()) as { login?: string; name?: string; avatar_url?: string }
  if (!body.login) throw new Error("GitHub returned an unexpected response.")
  return {
    provider: "github",
    handle: `@${body.login}`,
    displayName: body.name?.trim() || body.login,
    avatarUrl: body.avatar_url ?? null,
    importedAt: Date.now(),
  }
}

// Google/Gmail intentionally does NOT perform OAuth — the privacy promise
// is that nothing leaves the device. We compute the gravatar hash locally
// (md5 of lowercased email) and let the browser fetch the avatar lazily
// when the chip renders. If the user has no gravatar set, the URL 404s
// and the ProfileChip falls back to initials.
function fromEmail(rawEmail: string): Identity {
  const email = rawEmail.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("Enter a valid email address.")
  }
  const hash = createHash("md5").update(email).digest("hex")
  const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || email
  return {
    provider: "google",
    handle: email,
    displayName: titleCase(name),
    avatarUrl: `https://www.gravatar.com/avatar/${hash}?s=120&d=404`,
    importedAt: Date.now(),
  }
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}
