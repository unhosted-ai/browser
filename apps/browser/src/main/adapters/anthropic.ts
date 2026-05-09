// Anthropic adapter — translates our internal OpenAI-shaped turn buffer to
// /v1/messages and parses the SSE stream back into the same StreamResult
// the agent loop already understands.
//
// Why not use the OpenAI shape directly against Anthropic? Anthropic's API
// puts system prompt at the top level (not in messages[]), uses content
// blocks (text / tool_use / tool_result) instead of role: "tool" messages,
// names tool fields differently (input_schema, not parameters), and
// streams content blocks instead of choices.delta. The translation layer
// is small but load-bearing.

import type { ToolDef } from "@shared/types"

// ── Internal types matching the agent's runtime shape ─────────────────
type ApiToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export type Turn =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ApiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string }

export type StreamResult = {
  text: string
  finishReason: string | null
  toolCalls: ApiToolCall[]
}

const ANTHROPIC_VERSION = "2023-06-01"
// Hard-coded for now; future: probe /v1/models when Anthropic exposes it.
// Sticks to the current shipping family.
export const ANTHROPIC_MODELS = [
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
] as const

// ── Body builder ──────────────────────────────────────────────────────
export function buildAnthropicBody(args: {
  model: string
  systemPrompt: string
  history: Turn[]
  tools: ToolDef[]
  maxTokens?: number
}): Record<string, unknown> {
  return {
    model: args.model,
    max_tokens: args.maxTokens ?? 4096,
    stream: true,
    system: args.systemPrompt,
    messages: turnsToMessages(args.history),
    tools: args.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.schema,
    })),
  }
}

/**
 * OpenAI-shaped turns → Anthropic messages[].
 *
 * Key collapses:
 * - System prompt is pulled to the top-level `system` field by the caller;
 *   we drop it from the messages stream here if it sneaks in.
 * - Assistant turns with tool_calls become assistant messages with mixed
 *   content blocks (optional `text` + one `tool_use` per call).
 * - Tool result turns (role: "tool") get folded into a USER message with
 *   `tool_result` content blocks. Anthropic insists results live in a
 *   user-role message; we group consecutive tool turns into one.
 */
function turnsToMessages(history: Turn[]): Array<{ role: "user" | "assistant"; content: unknown }> {
  const out: Array<{ role: "user" | "assistant"; content: unknown }> = []
  let pendingToolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = []

  const flushToolResults = () => {
    if (pendingToolResults.length === 0) return
    out.push({ role: "user", content: pendingToolResults })
    pendingToolResults = []
  }

  for (const turn of history) {
    if (turn.role === "system") continue // pulled out by caller
    if (turn.role === "tool") {
      pendingToolResults.push({
        type: "tool_result",
        tool_use_id: turn.tool_call_id,
        content: turn.content,
      })
      continue
    }
    flushToolResults()
    if (turn.role === "user") {
      out.push({ role: "user", content: turn.content })
    } else if (turn.role === "assistant") {
      const blocks: Array<Record<string, unknown>> = []
      if (turn.content) blocks.push({ type: "text", text: turn.content })
      if (turn.tool_calls?.length) {
        for (const tc of turn.tool_calls) {
          let input: unknown = {}
          try {
            input = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
          } catch {
            input = {}
          }
          blocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.function.name,
            input,
          })
        }
      }
      out.push({ role: "assistant", content: blocks.length ? blocks : (turn.content || "") })
    }
  }
  flushToolResults()
  return out
}

// ── Streaming parser ──────────────────────────────────────────────────
// The agent calls this with an active fetch response and an emit callback
// for token-level UI streaming. Returns the final StreamResult once the
// SSE stream closes.
//
// Anthropic SSE event shapes we care about:
//   message_start        — { message: { id, role, ... } }
//   content_block_start  — { index, content_block: { type, id?, name? } }
//   content_block_delta  — { index, delta: { type, text? | partial_json? } }
//   content_block_stop   — { index }
//   message_delta        — { delta: { stop_reason, ... } }
//   message_stop
//   error                — { error: { type, message } }
//
// We don't rely on `message_stop` since the stream's `done` is the real
// terminator; stop_reason from message_delta tells us "tool_use" vs
// "end_turn".
export async function readAnthropicStream(
  res: Response,
  emitTextDelta: (delta: string) => void,
): Promise<StreamResult> {
  if (!res.body) throw new Error("Anthropic response has no body")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ""
  let text = ""
  let finishReason: string | null = null

  // Per-content-block accumulators, keyed by index.
  type Acc =
    | { type: "text" }
    | { type: "tool_use"; id: string; name: string; argsJson: string }
  const blocks = new Map<number, Acc>()

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })

    let sep: number
    while ((sep = buf.indexOf("\n\n")) !== -1) {
      const event = buf.slice(0, sep)
      buf = buf.slice(sep + 2)
      // Each event is `event: <name>\ndata: <json>` (sometimes name omitted).
      let eventType: string | null = null
      let dataLine: string | null = null
      for (const line of event.split("\n")) {
        if (line.startsWith("event:")) eventType = line.slice(6).trim()
        else if (line.startsWith("data:")) dataLine = line.slice(5).trim()
      }
      if (!dataLine) continue
      let json: any
      try { json = JSON.parse(dataLine) } catch { continue }

      const t = eventType ?? json.type
      switch (t) {
        case "content_block_start": {
          const idx: number = json.index ?? 0
          const cb = json.content_block ?? {}
          if (cb.type === "tool_use") {
            blocks.set(idx, {
              type: "tool_use",
              id: cb.id ?? `toolu_${idx}`,
              name: cb.name ?? "",
              argsJson: "",
            })
          } else {
            blocks.set(idx, { type: "text" })
          }
          break
        }
        case "content_block_delta": {
          const idx: number = json.index ?? 0
          const acc = blocks.get(idx)
          const delta = json.delta ?? {}
          if (delta.type === "text_delta" && typeof delta.text === "string" && delta.text.length > 0) {
            text += delta.text
            emitTextDelta(delta.text)
          } else if (delta.type === "input_json_delta" && acc?.type === "tool_use") {
            acc.argsJson += String(delta.partial_json ?? "")
          }
          break
        }
        case "message_delta": {
          const sr = json.delta?.stop_reason
          if (sr) {
            // Map Anthropic's stop_reason to our OpenAI-shaped finishReason.
            finishReason =
              sr === "tool_use" ? "tool_calls"
              : sr === "max_tokens" ? "length"
              : "stop"
          }
          break
        }
        case "error": {
          const msg = json.error?.message ?? "anthropic error"
          throw new Error(`Anthropic stream error: ${msg}`)
        }
        // ignore message_start, content_block_stop, message_stop, ping
      }
    }
  }

  // Flatten tool_use content blocks into our OpenAI-shaped tool calls.
  const toolCalls: ApiToolCall[] = []
  for (const acc of blocks.values()) {
    if (acc.type === "tool_use" && acc.name) {
      toolCalls.push({
        id: acc.id,
        type: "function",
        function: { name: acc.name, arguments: acc.argsJson || "{}" },
      })
    }
  }

  return { text, finishReason, toolCalls }
}

// ── Header helper ─────────────────────────────────────────────────────
export function anthropicHeaders(apiKey: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
  }
}
