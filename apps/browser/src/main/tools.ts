// Tool registry — Phase 2 (read tools only).
//
// Each tool has a JSON-Schema-shaped definition the model sees, plus a
// handler that runs in main with access to TabManager. Args are validated
// loosely (we only check well-known fields) — the model occasionally
// passes extras, and rejecting on unknown keys causes more breakage than
// it prevents.
//
// All tools here are `side: "read"` — they don't change page state. Phase 3
// adds an `act` tier that goes through the permission gate. Tools added
// later just push onto TOOLS; the registry is otherwise self-contained.
import type { ToolDef } from "@shared/types"
import type { TabManager } from "./tabs"

const MAX_PAGE_CHARS_DEFAULT = 16_000

export type ToolContext = { tabs: TabManager }

export type ToolHandler = (args: any, ctx: ToolContext) => Promise<unknown>

export type Tool = { def: ToolDef; handler: ToolHandler }

// ── Read tools ──────────────────────────────────────────────────────────
const list_tabs: Tool = {
  def: {
    name: "list_tabs",
    description:
      "List all of the user's currently open browser tabs (id, title, url, whether it's the active tab). Use this when you need an overview before reading specific tabs.",
    schema: { type: "object", properties: {} },
    side: "read",
  },
  handler: async (_args, ctx) => {
    const state = ctx.tabs.getState()
    return state.tabs.map((t) => ({
      id: t.id,
      title: t.title,
      url: t.url,
      active: t.id === state.activeId,
    }))
  },
}

const read_active_page: Tool = {
  def: {
    name: "read_active_page",
    description:
      "Read the rendered text of the active tab. Returns the page title, URL, and innerText (truncated). Use this to ground answers in what the user is currently looking at.",
    schema: {
      type: "object",
      properties: {
        maxChars: {
          type: "number",
          description: "Maximum characters of page text to return. Defaults to 16000.",
        },
      },
    },
    side: "read",
  },
  handler: async (args, ctx) => {
    const max = clampMax(args?.maxChars)
    const page = await ctx.tabs.readActivePage()
    if (!page) return { error: "no_active_tab" }
    return {
      title: page.title,
      url: page.url,
      text: page.text.slice(0, max),
      truncated: page.text.length > max,
    }
  },
}

const read_tab: Tool = {
  def: {
    name: "read_tab",
    description:
      "Read the rendered text of a specific tab by id. Use this after list_tabs when you need the contents of a tab that isn't currently active. Returns title, URL, and innerText (truncated).",
    schema: {
      type: "object",
      properties: {
        tabId: { type: "string", description: "The tab's id (from list_tabs)." },
        maxChars: {
          type: "number",
          description: "Maximum characters of page text to return. Defaults to 16000.",
        },
      },
      required: ["tabId"],
    },
    side: "read",
  },
  handler: async (args, ctx) => {
    if (typeof args?.tabId !== "string") return { error: "invalid_args", message: "tabId is required" }
    const max = clampMax(args?.maxChars)
    const page = await ctx.tabs.readTabPage(args.tabId)
    if (!page) return { error: "tab_not_found", tabId: args.tabId }
    return {
      title: page.title,
      url: page.url,
      text: page.text.slice(0, max),
      truncated: page.text.length > max,
    }
  },
}

function clampMax(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : MAX_PAGE_CHARS_DEFAULT
  return Math.max(500, Math.min(64_000, n))
}

// ── Registry ────────────────────────────────────────────────────────────
const TOOLS: Tool[] = [list_tabs, read_active_page, read_tab]
const BY_NAME: Record<string, Tool> = Object.fromEntries(TOOLS.map((t) => [t.def.name, t]))

/** All tool definitions, in the shape providers expect to see. */
export function toolDefs(): ToolDef[] {
  return TOOLS.map((t) => t.def)
}

/** Look up + run a tool. Returns the result or an error envelope. */
export async function runTool(
  name: string,
  args: unknown,
  ctx: ToolContext,
): Promise<{ ok: true; data: unknown; durationMs: number } | { ok: false; error: string; durationMs: number }> {
  const tool = BY_NAME[name]
  const start = Date.now()
  if (!tool) {
    return { ok: false, error: `unknown_tool: ${name}`, durationMs: 0 }
  }
  try {
    const data = await tool.handler(args ?? {}, ctx)
    return { ok: true, data, durationMs: Date.now() - start }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    }
  }
}
