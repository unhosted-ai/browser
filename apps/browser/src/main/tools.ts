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
import { clickElement, getInteractiveElements, typeIntoElement, type Criteria } from "./page-agent"

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

// ── Act tools ──────────────────────────────────────────────────────────
// All act tools route through the permission gate in agent.ts. They never
// run from inside this module's handlers without a prior allow decision.
//
// Surface area kept tiny on purpose: navigate + open_tab don't poke the
// page DOM, only the URL bar — much smaller blast radius than click /
// type which need a content script (Phase 3.1, separate commit).
const navigate: Tool = {
  def: {
    name: "navigate",
    description:
      "Load a URL in the user's currently active tab. Use this when the user explicitly asks to go somewhere, or when the answer requires navigating to a specific page first. Permissioned: the user is asked to allow each (origin, navigate) pair the first time.",
    schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Absolute URL to load. Must include scheme (https:// or http://)." },
      },
      required: ["url"],
    },
    side: "act",
  },
  handler: async (args, ctx) => {
    if (typeof args?.url !== "string") return { error: "invalid_args", message: "url is required" }
    const state = ctx.tabs.getState()
    if (!state.activeId) return { error: "no_active_tab" }
    ctx.tabs.navigate(state.activeId, args.url)
    return { ok: true, url: args.url, tabId: state.activeId }
  },
}

const open_tab: Tool = {
  def: {
    name: "open_tab",
    description:
      "Open a URL in a new tab. Use this when the user asks for something to be opened alongside their current tabs (e.g. background research) instead of replacing the active tab. Permissioned: same per-(origin, open_tab) gate as navigate.",
    schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Absolute URL. Must include scheme." },
      },
      required: ["url"],
    },
    side: "act",
  },
  handler: async (args, ctx) => {
    if (typeof args?.url !== "string") return { error: "invalid_args", message: "url is required" }
    const tab = ctx.tabs.create(args.url)
    return { ok: true, tabId: tab.id, url: args.url }
  },
}

// ── Phase 3.1: click + type (content-script driven) ───────────────────
// These let the agent actually push buttons and fill fields on the active
// page. Each goes through the per-(origin, tool) permission gate, and the
// sensitive-site classifier auto-blocks them on banking / gov / payment /
// wallet / healthcare hosts. Password and file inputs are refused even
// on whitelisted sites — see page-agent.ts.
//
// The agent typically calls get_interactive_elements first so it knows
// what the page exposes (labels, types, indices). Click and type then
// accept a criteria object: { index } for the freshest snapshot, { text }
// for a visible-label match, or { selector } for an explicit CSS path.

function _activeView(ctx: ToolContext) {
  const state = ctx.tabs.getState()
  if (!state.activeId) return null
  return ctx.tabs.getView(state.activeId)
}

const get_interactive_elements: Tool = {
  def: {
    name: "get_interactive_elements",
    description:
      "Snapshot every visible button, link, input, select, textarea, and ARIA-interactive element on the active tab. Returns an indexed list with labels — call this before click/type so you know what's on the page and how to refer to it.",
    schema: { type: "object", properties: {} },
    side: "read",
  },
  handler: async (_args, ctx) => {
    const view = _activeView(ctx)
    if (!view) return { error: "no_active_tab" }
    return await getInteractiveElements(view)
  },
}

const click: Tool = {
  def: {
    name: "click",
    description:
      "Click an interactive element on the active tab. Pass ONE of: { index: number } (from a recent get_interactive_elements snapshot), { text: string } (a visible-label / aria-label substring match), or { selector: string } (raw CSS selector). Permissioned — the user is asked to allow each (origin, click) pair the first time. Sensitive sites auto-block.",
    schema: {
      type: "object",
      properties: {
        index:    { type: "number", description: "Index from get_interactive_elements." },
        text:     { type: "string", description: "Visible-label / aria-label substring. Case-insensitive." },
        selector: { type: "string", description: "Raw CSS selector. Use only when index/text isn't enough." },
      },
    },
    side: "act",
  },
  handler: async (args, ctx) => {
    const view = _activeView(ctx)
    if (!view) return { error: "no_active_tab" }
    const criteria = _criteriaFrom(args)
    if (!criteria) return { error: "invalid_args", message: "Pass one of: index, text, selector." }
    return await clickElement(view, criteria)
  },
}

const type_tool: Tool = {
  def: {
    name: "type",
    description:
      "Type text into a form field on the active tab. Same matcher shape as click (index | text | selector), plus `value: string`. Refuses password fields and file inputs unconditionally. Permissioned + sensitive-site auto-block.",
    schema: {
      type: "object",
      properties: {
        index:    { type: "number", description: "Index from get_interactive_elements." },
        text:     { type: "string", description: "Visible-label / placeholder / name match." },
        selector: { type: "string", description: "Raw CSS selector." },
        value:    { type: "string", description: "The text to type into the field." },
      },
      required: ["value"],
    },
    side: "act",
  },
  handler: async (args, ctx) => {
    const view = _activeView(ctx)
    if (!view) return { error: "no_active_tab" }
    const criteria = _criteriaFrom(args)
    if (!criteria) return { error: "invalid_args", message: "Pass one of: index, text, selector." }
    if (typeof args?.value !== "string") return { error: "invalid_args", message: "value (string) is required." }
    return await typeIntoElement(view, criteria, args.value)
  },
}

function _criteriaFrom(args: any): Criteria | null {
  if (args && typeof args.index === "number") return { index: args.index }
  if (args && typeof args.text === "string" && args.text.length) return { text: args.text }
  if (args && typeof args.selector === "string" && args.selector.length) return { selector: args.selector }
  return null
}

// ── Registry ────────────────────────────────────────────────────────────
const TOOLS: Tool[] = [list_tabs, read_active_page, read_tab, navigate, open_tab, get_interactive_elements, click, type_tool]
const BY_NAME: Record<string, Tool> = Object.fromEntries(TOOLS.map((t) => [t.def.name, t]))

/** All tool definitions, in the shape providers expect to see. */
export function toolDefs(): ToolDef[] {
  return TOOLS.map((t) => t.def)
}

/** Look up a tool's permission tier by name. Defaults to "read" for unknown
 *  names so we don't block unknown tools from being told they're invalid;
 *  agent.ts will report `unknown_tool` from runTool() in that case. */
export function toolSide(name: string): "read" | "act" {
  return BY_NAME[name]?.def.side ?? "read"
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
