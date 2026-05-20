// Local cron-of-one. Time-triggered actions persisted in
// userData/schedules.json and fired from the main process — no remote
// service, no calendar integration, the device clock is the source of
// truth. See shared/types.ts for the data model.
//
// Two trigger shapes for v1:
//   - oneShot: a single fire at an absolute ISO timestamp.
//   - every  : fires every N minutes from createdAt.
//
// Three action shapes:
//   - reminder: native Electron Notification (system tray on macOS,
//     toast on Win/Linux).
//   - openUrl : creates a new tab at a URL. Useful for "be on this
//     booking page at 9:00".
//   - agent   : kicks off a fresh agent task with a prompt. The
//     conversation appears in the sidebar history. Pairs with the
//     planned click/type act tools to make "book the table" real;
//     today the agent can navigate and read but not yet form-fill.
//
// Scheduler implementation: a single setTimeout chain per task, re-armed
// after each fire from computeNextRun(). We avoid setInterval so a long
// system sleep doesn't backlog dozens of fires — on wake we just compute
// the next slot ahead of `now` and arm that.

import { app, BrowserWindow, Notification } from "electron"
import { randomUUID } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type {
  ScheduledTask,
  ScheduledTaskAction,
  ScheduledTaskInput,
  ScheduledTaskTrigger,
} from "@shared/types"

const FILE = () => join(app.getPath("userData"), "schedules.json")

// setTimeout's delay is a signed 32-bit int (~24.8 days). Anything
// longer would silently fire immediately. We clamp to that ceiling and
// re-arm on tick — for a v1 with reminders/openUrl/agent, this is fine.
const MAX_TIMEOUT_MS = 2_147_483_000

export type ScheduleFireContext = {
  /** Create a new tab. Used by openUrl actions. */
  openTab: (url: string) => void
  /** Kick off an agent prompt. Returns once dispatched. */
  runAgentPrompt: (prompt: string) => Promise<void>
  /** Push live updates to the renderer (list change + fire events). */
  emit: (event: ScheduleEvent) => void
}

export type ScheduleEvent =
  | { type: "list"; tasks: ScheduledTask[] }
  | { type: "fired"; id: string; label: string; action: ScheduledTaskAction }

export class SchedulesStore {
  private tasks: ScheduledTask[]
  private timers = new Map<string, NodeJS.Timeout>()
  private ctx: ScheduleFireContext | null = null

  constructor() {
    this.tasks = this.read()
    // Defensive cleanup: drop any oneShots whose `at` is more than a
    // day in the past. The user clearly missed them; firing now would
    // be surprising. We keep recent past oneShots so a "fire on launch"
    // recipe works.
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    this.tasks = this.tasks.filter(
      (t) => !(t.trigger.kind === "oneShot" && Date.parse(t.trigger.at) < cutoff),
    )
    for (const t of this.tasks) {
      t.nextRunAt = computeNextRun(t.trigger, t.lastRunAt ?? t.createdAt)
    }
    this.persist()
  }

  /** Called once at app start, after the agent + tabs are ready. */
  bind(ctx: ScheduleFireContext): void {
    this.ctx = ctx
    for (const t of this.tasks) {
      if (t.enabled) this.arm(t)
    }
    this.broadcast()
  }

  list(): ScheduledTask[] {
    return this.tasks.map((t) => ({ ...t }))
  }

  create(input: ScheduledTaskInput): ScheduledTask {
    validate(input)
    const now = Date.now()
    const t: ScheduledTask = {
      id: "task:" + randomUUID(),
      label: input.label.trim() || defaultLabel(input.action),
      trigger: input.trigger,
      action: input.action,
      enabled: true,
      createdAt: now,
      nextRunAt: computeNextRun(input.trigger, now),
      lastRunAt: null,
      lastError: null,
      fireCount: 0,
    }
    this.tasks.push(t)
    this.persist()
    this.arm(t)
    this.broadcast()
    return { ...t }
  }

  update(id: string, patch: Partial<ScheduledTaskInput> & { enabled?: boolean }): ScheduledTask {
    const t = this.tasks.find((x) => x.id === id)
    if (!t) throw new Error("No such task.")
    if (patch.label !== undefined) t.label = patch.label.trim() || defaultLabel(t.action)
    if (patch.trigger) {
      validateTrigger(patch.trigger)
      t.trigger = patch.trigger
      t.nextRunAt = computeNextRun(patch.trigger, t.lastRunAt ?? t.createdAt)
    }
    if (patch.action) {
      validateAction(patch.action)
      t.action = patch.action
    }
    if (patch.enabled !== undefined) t.enabled = patch.enabled
    this.persist()
    this.disarm(t.id)
    if (t.enabled) this.arm(t)
    this.broadcast()
    return { ...t }
  }

  delete(id: string): void {
    this.disarm(id)
    this.tasks = this.tasks.filter((t) => t.id !== id)
    this.persist()
    this.broadcast()
  }

  /** Fire immediately without disturbing the regular schedule. */
  async runNow(id: string): Promise<void> {
    const t = this.tasks.find((x) => x.id === id)
    if (!t) throw new Error("No such task.")
    await this.fire(t, { reArm: false })
  }

  // ── internals ─────────────────────────────────────────────
  private arm(t: ScheduledTask): void {
    if (!this.ctx) return
    if (t.nextRunAt == null) return
    const delay = Math.max(0, t.nextRunAt - Date.now())
    const handle = setTimeout(() => {
      void this.fire(t, { reArm: true })
    }, Math.min(delay, MAX_TIMEOUT_MS))
    // Don't keep the event loop alive on its own.
    handle.unref?.()
    this.timers.set(t.id, handle)
  }

  private disarm(id: string): void {
    const h = this.timers.get(id)
    if (h) clearTimeout(h)
    this.timers.delete(id)
  }

  private async fire(t: ScheduledTask, opts: { reArm: boolean }): Promise<void> {
    if (!this.ctx) return
    try {
      await runAction(t.action, this.ctx)
      t.lastRunAt = Date.now()
      t.lastError = null
      t.fireCount += 1
      this.ctx.emit({ type: "fired", id: t.id, label: t.label, action: t.action })
    } catch (err) {
      t.lastError = err instanceof Error ? err.message : String(err)
    }
    if (opts.reArm) {
      if (t.trigger.kind === "oneShot") {
        // OneShot retires itself after firing.
        t.enabled = false
        t.nextRunAt = null
      } else {
        t.nextRunAt = computeNextRun(t.trigger, t.lastRunAt ?? Date.now())
        this.arm(t)
      }
    }
    this.persist()
    this.broadcast()
  }

  private broadcast(): void {
    this.ctx?.emit({ type: "list", tasks: this.list() })
  }

  private read(): ScheduledTask[] {
    try {
      if (!existsSync(FILE())) return []
      const raw = readFileSync(FILE(), "utf8")
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(isScheduledTask)
    } catch {
      return []
    }
  }

  private persist(): void {
    try {
      writeFileSync(FILE(), JSON.stringify(this.tasks, null, 2), "utf8")
    } catch (err) {
      console.warn("[schedules] failed to persist:", err)
    }
  }
}

// ── helpers ──────────────────────────────────────────────────
function computeNextRun(trigger: ScheduledTaskTrigger, anchor: number): number | null {
  const now = Date.now()
  if (trigger.kind === "oneShot") {
    const t = Date.parse(trigger.at)
    return Number.isFinite(t) && t > now ? t : null
  }
  // "every N minutes" from anchor — walk forward in N-minute steps
  // until we land past `now`. anchor is usually lastRunAt or createdAt.
  const stepMs = Math.max(1, trigger.minutes) * 60 * 1000
  if (anchor <= now) {
    const steps = Math.ceil((now - anchor) / stepMs) + 1
    return anchor + steps * stepMs
  }
  return anchor
}

async function runAction(action: ScheduledTaskAction, ctx: ScheduleFireContext): Promise<void> {
  switch (action.kind) {
    case "reminder": {
      if (!Notification.isSupported()) {
        console.warn("[schedules] Notification API unsupported on this platform; skipping reminder")
        return
      }
      const n = new Notification({
        title: action.title || "Delta reminder",
        body: action.body ?? "",
        silent: false,
      })
      n.show()
      return
    }
    case "openUrl": {
      ctx.openTab(action.url)
      return
    }
    case "agent": {
      await ctx.runAgentPrompt(action.prompt)
      return
    }
  }
}

function defaultLabel(a: ScheduledTaskAction): string {
  switch (a.kind) {
    case "reminder": return a.title || "Reminder"
    case "openUrl":  return a.title || `Open ${a.url}`
    case "agent":    return a.title || a.prompt.slice(0, 48)
  }
}

function validate(input: ScheduledTaskInput): void {
  if (!input.label?.trim() && !input.action) throw new Error("Label or action required.")
  validateTrigger(input.trigger)
  validateAction(input.action)
}

function validateTrigger(t: ScheduledTaskTrigger): void {
  if (t.kind === "oneShot") {
    const n = Date.parse(t.at)
    if (!Number.isFinite(n)) throw new Error("Invalid ISO timestamp.")
  } else if (t.kind === "every") {
    if (!Number.isFinite(t.minutes) || t.minutes < 1) {
      throw new Error("Interval must be at least 1 minute.")
    }
  } else {
    throw new Error("Unknown trigger kind.")
  }
}

function validateAction(a: ScheduledTaskAction): void {
  if (a.kind === "reminder") {
    if (!a.title?.trim()) throw new Error("Reminder needs a title.")
  } else if (a.kind === "openUrl") {
    try { new URL(a.url) } catch { throw new Error("openUrl needs a valid URL.") }
  } else if (a.kind === "agent") {
    if (!a.prompt?.trim()) throw new Error("Agent task needs a prompt.")
  } else {
    throw new Error("Unknown action kind.")
  }
}

function isScheduledTask(x: unknown): x is ScheduledTask {
  if (!x || typeof x !== "object") return false
  const t = x as Record<string, unknown>
  return (
    typeof t.id === "string" &&
    typeof t.label === "string" &&
    typeof t.enabled === "boolean" &&
    typeof t.trigger === "object" &&
    typeof t.action === "object"
  )
}

// Re-export so main/index.ts can wire BrowserWindow → tabs without a
// circular import via shared/types.
export type { BrowserWindow }
