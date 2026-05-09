// Provider abstraction. Probes local endpoints + (when enabled) cloud / user-
// added custom endpoints. Returns shapes the renderer can list and the agent
// runtime can dispatch against.
//
// Privacy posture: only local endpoints are auto-probed at app start. Cloud
// (OpenAI) and custom endpoints are probed only when the user has configured
// them via Settings — never reached out to otherwise.
import type { ProviderId, ProviderInfo, ProviderStatus } from "@shared/types"
import type { SettingsStore } from "./settings"
import { ANTHROPIC_MODELS } from "./adapters/anthropic"

type Endpoint = { label: string; endpoint: string; local: boolean }

const LOCAL_ENDPOINTS: Record<"ollama" | "lmstudio" | "llamacpp" | "mlx", Endpoint> = {
  ollama:   { label: "Ollama",       endpoint: "http://127.0.0.1:11434", local: true },
  lmstudio: { label: "LM Studio",    endpoint: "http://127.0.0.1:1234",  local: true },
  llamacpp: { label: "llama.cpp",    endpoint: "http://127.0.0.1:8080",  local: true },
  mlx:      { label: "MLX (mlx-lm)", endpoint: "http://127.0.0.1:8080",  local: true },
}

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 2500): Promise<T | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function probeLocal(id: ProviderId, endpoint: string): Promise<{ status: ProviderStatus; models: string[] }> {
  if (id === "ollama") {
    type Tag = { name: string }
    const tags = await fetchJson<{ models?: Tag[] }>(`${endpoint}/api/tags`)
    if (tags?.models) return { status: "online", models: tags.models.map((m) => m.name) }
  }
  type OpenAIModelList = { data?: Array<{ id: string }> }
  const list = await fetchJson<OpenAIModelList>(`${endpoint}/v1/models`)
  if (list?.data) return { status: "online", models: list.data.map((m) => m.id) }
  return { status: "offline", models: [] }
}

async function probeOpenAICompatible(
  endpoint: string,
  apiKey: string | null,
): Promise<{ status: ProviderStatus; models: string[] }> {
  type OpenAIModelList = { data?: Array<{ id: string }> }
  const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
  const list = await fetchJson<OpenAIModelList>(`${endpoint}/v1/models`, { headers })
  if (list?.data) return { status: "online", models: list.data.map((m) => m.id) }
  return { status: "offline", models: [] }
}

export async function listProviders(settings?: SettingsStore): Promise<ProviderInfo[]> {
  const out: ProviderInfo[] = []

  // Local — always probed.
  const localEntries = Object.entries(LOCAL_ENDPOINTS) as Array<
    [ProviderId, Endpoint]
  >
  await Promise.all(
    localEntries.map(async ([id, { label, endpoint }]) => {
      const { status, models } = await probeLocal(id, endpoint)
      out.push({ id, label, endpoint, status, models })
    }),
  )

  if (!settings) return out

  const s = settings.get()

  // OpenAI cloud — only when user has enabled it AND a key is set.
  if (s.openaiEnabled && s.openaiHasKey) {
    const key = settings.resolveOpenaiKey()
    const { status, models } = key
      ? await probeOpenAICompatible("https://api.openai.com", key)
      : { status: "needs-key" as const, models: [] }
    out.push({
      id: "openai",
      label: "OpenAI",
      endpoint: "https://api.openai.com",
      status,
      models,
      authed: true,
      kind: "openai",
    })
  } else if (s.openaiHasKey || s.openaiEnabled) {
    out.push({
      id: "openai",
      label: "OpenAI",
      endpoint: "https://api.openai.com",
      status: "needs-key",
      models: [],
      authed: true,
      kind: "openai",
    })
  }

  // Anthropic cloud — same gating: enabled + key. /v1/models isn't a stable
  // endpoint there, so we don't probe; we test the key via a HEAD-ish ping
  // (a 0-token dry run isn't free either) and just trust the key when set.
  // Models are the current shipping set (see adapters/anthropic.ts).
  if (s.anthropicEnabled && s.anthropicHasKey) {
    const key = settings.resolveAnthropicKey()
    out.push({
      id: "anthropic",
      label: "Anthropic",
      endpoint: "https://api.anthropic.com",
      // Optimistic: we treat a configured + enabled cloud key as online.
      // Errors surface in the chat error state if the key is bad.
      status: key ? "online" : "needs-key",
      models: [...ANTHROPIC_MODELS],
      authed: true,
      kind: "anthropic",
    })
  } else if (s.anthropicHasKey || s.anthropicEnabled) {
    out.push({
      id: "anthropic",
      label: "Anthropic",
      endpoint: "https://api.anthropic.com",
      status: "needs-key",
      models: [],
      authed: true,
      kind: "anthropic",
    })
  }

  // Custom endpoints — probe each, attach key if present.
  await Promise.all(
    s.customEndpoints.map(async (e) => {
      const apiKey = e.hasApiKey ? settings.resolveCustomKey(e.id) : null
      const { status, models } = await probeOpenAICompatible(e.endpoint, apiKey)
      out.push({
        id: e.id,
        label: e.label,
        endpoint: e.endpoint,
        status,
        models,
        authed: e.hasApiKey,
        custom: true,
      })
    }),
  )

  return out
}

/**
 * Pick the provider the agent should send the next message to.
 *
 * Honours `defaultProvider` when it points at a specific id; otherwise
 * "auto" — first online local, falling back to cloud / custom only when
 * the user has explicitly enabled and configured them.
 */
export type ResolvedProvider = {
  endpoint: string
  model: string
  apiKey?: string
  kind: "openai" | "anthropic"
}

export async function pickDefaultProvider(settings: SettingsStore): Promise<ResolvedProvider | null> {
  const all = await listProviders(settings)
  const s = settings.get()

  function bind(p: ProviderInfo): ResolvedProvider | null {
    if (p.status !== "online" || p.models.length === 0) return null
    const model = s.defaultProvider.model && p.models.includes(s.defaultProvider.model)
      ? s.defaultProvider.model
      : p.models[0]!
    const kind: "openai" | "anthropic" = p.kind === "anthropic" ? "anthropic" : "openai"
    const apiKey =
        p.id === "openai"    ? settings.resolveOpenaiKey()    ?? undefined
      : p.id === "anthropic" ? settings.resolveAnthropicKey() ?? undefined
      : p.custom && p.authed ? settings.resolveCustomKey(p.id) ?? undefined
                             : undefined
    return { endpoint: p.endpoint, model, apiKey, kind }
  }

  if (s.defaultProvider.id !== "auto") {
    const pinned = all.find((p) => p.id === s.defaultProvider.id)
    if (pinned) {
      const bound = bind(pinned)
      if (bound) return bound
    }
  }

  // Auto — local first, then cloud (OpenAI + Anthropic), then custom.
  const ordered = [
    ...all.filter((p) => ["ollama", "lmstudio", "llamacpp", "mlx"].includes(p.id)),
    ...all.filter((p) => p.id === "openai" || p.id === "anthropic"),
    ...all.filter((p) => p.custom),
  ]
  for (const p of ordered) {
    const bound = bind(p)
    if (bound) return bound
  }
  return null
}
