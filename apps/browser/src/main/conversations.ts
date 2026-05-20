// Conversation persistence — closes the amnesia gap from the PO audit.
//
// Each conversation is one file under userData/conversations/<id>.json.gz
// (gzip-compressed JSON). We write on every meaningful change (message
// added / tool call landed / task done) so a crash mid-stream loses at
// most the last few tokens.
//
// Why gzip: LLM conversations grow fastest of all on-disk surfaces —
// page-text attachments + tool-call results are highly compressible
// (typical 4-6× ratio on chat transcripts). gzip is in `zlib` core
// (no dep), the syncSync flavour is fast enough for our write cadence,
// and the format is universal so users can inspect with `gunzip` if
// they ever need to.
//
// Backwards compatibility: we still READ legacy `<id>.json` files;
// next save rewrites the `.json.gz` and deletes the legacy file. So
// existing users transparently migrate the first time they touch a
// conversation.
//
// We do NOT persist secrets or anything outside the conversation
// itself. Tool-call results that contain page text are kept (the agent
// already summarises them), but a future "redact" pass can scrub URLs
// / titles per-profile if we ever ship sharing.
import { app } from "electron"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { gunzipSync, gzipSync } from "node:zlib"
import type { AgentMessage } from "@shared/types"

export type ConversationSummary = {
  id: string
  title: string         // first user message, truncated
  createdAt: number
  updatedAt: number
  messageCount: number
}

export type ConversationRecord = {
  id: string
  createdAt: number
  updatedAt: number
  messages: AgentMessage[]
}

function dir(): string {
  const p = join(app.getPath("userData"), "conversations")
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
  return p
}

function pathGz(id: string): string  { return join(dir(), `${id}.json.gz`) }
function pathJson(id: string): string { return join(dir(), `${id}.json`) }

// Read a conversation file, transparently handling both modern .json.gz
// and legacy .json. Returns null when neither exists or both are
// corrupt. Used by load() and the listing path.
function readEither(id: string): ConversationRecord | null {
  if (existsSync(pathGz(id))) {
    try {
      const buf = readFileSync(pathGz(id))
      const txt = gunzipSync(buf).toString("utf-8")
      return JSON.parse(txt) as ConversationRecord
    } catch { /* fall through */ }
  }
  if (existsSync(pathJson(id))) {
    try {
      return JSON.parse(readFileSync(pathJson(id), "utf-8")) as ConversationRecord
    } catch { /* fall through */ }
  }
  return null
}

export class ConversationStore {
  /** Save / overwrite the on-disk file for this conversation. */
  save(id: string, messages: AgentMessage[]): ConversationRecord {
    const now = Date.now()
    let createdAt = now
    const prev = readEither(id)
    if (prev) createdAt = prev.createdAt
    const record: ConversationRecord = { id, createdAt, updatedAt: now, messages }
    // JSON.stringify without indentation — gzip eats whitespace for free
    // and the file is a binary blob anyway. ~20-30% smaller pre-gzip.
    const buf = gzipSync(Buffer.from(JSON.stringify(record), "utf-8"))
    writeFileSync(pathGz(id), buf)
    // Migrate: if a legacy .json was sitting next to us, retire it.
    // We only do this after the .gz write succeeded so a crash in the
    // middle leaves the old file intact.
    if (existsSync(pathJson(id))) {
      try { rmSync(pathJson(id)) } catch { /* best-effort */ }
    }
    return record
  }

  load(id: string): ConversationRecord | null {
    return readEither(id)
  }

  delete(id: string): void {
    try { rmSync(pathGz(id)) } catch { /* maybe legacy */ }
    try { rmSync(pathJson(id)) } catch { /* already gone */ }
  }

  /** Sorted newest-first. Each summary is small (no message bodies). */
  list(): ConversationSummary[] {
    let files: string[]
    try { files = readdirSync(dir()) } catch { return [] }
    // Build an id-set so we don't double-list when both .json.gz and
    // legacy .json briefly coexist for an unmigrated file.
    const ids = new Set<string>()
    for (const f of files) {
      if (f.endsWith(".json.gz")) ids.add(f.slice(0, -".json.gz".length))
      else if (f.endsWith(".json")) ids.add(f.slice(0, -".json".length))
    }
    const out: ConversationSummary[] = []
    for (const id of ids) {
      const r = readEither(id)
      if (!r) continue
      out.push({
        id: r.id,
        title: titleOf(r.messages),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        messageCount: r.messages.length,
      })
    }
    out.sort((a, b) => b.updatedAt - a.updatedAt)
    return out
  }
}

function titleOf(messages: AgentMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.text.trim())
  if (!firstUser) return "Untitled"
  const t = firstUser.text.replace(/\s+/g, " ").trim()
  return t.length > 80 ? t.slice(0, 80) + "…" : t
}
