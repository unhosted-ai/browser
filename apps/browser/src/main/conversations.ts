// Conversation persistence — closes the amnesia gap from the PO audit.
//
// Each conversation is one JSON file under userData/conversations/<id>.json.
// We write on every meaningful change (message added / tool call landed /
// task done) so a crash mid-stream loses at most the last few tokens.
//
// We do NOT persist secrets or anything outside the conversation itself.
// Tool-call results that contain page text are kept (the agent already
// summarises them), but a future "redact" pass can scrub URLs / titles
// per-profile if we ever ship sharing.
import { app } from "electron"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
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

function path(id: string): string {
  return join(dir(), `${id}.json`)
}

export class ConversationStore {
  /** Save / overwrite the on-disk file for this conversation. */
  save(id: string, messages: AgentMessage[]): ConversationRecord {
    const now = Date.now()
    let createdAt = now
    if (existsSync(path(id))) {
      try {
        const prev = JSON.parse(readFileSync(path(id), "utf-8")) as ConversationRecord
        createdAt = prev.createdAt
      } catch { /* tolerate corruption — overwrite */ }
    }
    const record: ConversationRecord = { id, createdAt, updatedAt: now, messages }
    writeFileSync(path(id), JSON.stringify(record, null, 2), "utf-8")
    return record
  }

  load(id: string): ConversationRecord | null {
    if (!existsSync(path(id))) return null
    try {
      return JSON.parse(readFileSync(path(id), "utf-8")) as ConversationRecord
    } catch {
      return null
    }
  }

  delete(id: string): void {
    try { rmSync(path(id)) } catch { /* already gone */ }
  }

  /** Sorted newest-first. Each summary is small (no message bodies). */
  list(): ConversationSummary[] {
    let files: string[]
    try { files = readdirSync(dir()) } catch { return [] }
    const out: ConversationSummary[] = []
    for (const f of files) {
      if (!f.endsWith(".json")) continue
      const id = f.replace(/\.json$/, "")
      try {
        const r = JSON.parse(readFileSync(join(dir(), f), "utf-8")) as ConversationRecord
        out.push({
          id: r.id,
          title: titleOf(r.messages),
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          messageCount: r.messages.length,
        })
      } catch { /* skip corrupt files */ }
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
