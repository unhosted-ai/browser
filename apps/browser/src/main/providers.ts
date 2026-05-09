// Provider abstraction. Probes local endpoints + (when enabled) cloud / user-
// added custom endpoints. Returns shapes the renderer can list and the agent
// runtime can dispatch against.
//
// Privacy posture: only local endpoints are auto-probed at app start. Cloud
// (OpenAI) and custom endpoints are probed only when the user has configured
// them via Settings — never reached out to otherwise.
import type { ProviderId, ProviderInfo, ProviderStatus } from "@shared/types"
import type { SettingsStore } from "./settings"

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
    })
  } else if (s.openaiHasKey || s.openaiEnabled) {
    // Configured but disabled — surface as a known-but-off entry so the user
    // can see why it isn't being used.
    out.push({
      id: "openai",
      label: "OpenAI",
      endpoint: "https://api.openai.com",
      status: "needs-key",
      models: [],
      authed: true,
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
export async function pickDefaultProvider(
  settings: SettingsStore,
): Promise<{ endpoint: string; model: string; apiKey?: string } | null> {
  const all = await listProviders(settings)
  const s = settings.get()

  function bind(p: ProviderInfo): { endpoint: string; model: string; apiKey?: string } | null {
    if (p.status !== "online" || p.models.length === 0) return null
    const model = s.defaultProvider.model && p.models.includes(s.defaultProvider.model)
      ? s.defaultProvider.model
      : p.models[0]!
    const apiKey = p.id === "openai"
      ? settings.resolveOpenaiKey() ?? undefined
      : p.custom && p.authed
        ? settings.resolveCustomKey(p.id) ?? undefined
        : undefined
    return { endpoint: p.endpoint, model, apiKey }
  }

  if (s.defaultProvider.id !== "auto") {
    const pinned = all.find((p) => p.id === s.defaultProvider.id)
    if (pinned) {
      const bound = bind(pinned)
      if (bound) return bound
    }
    // fall through to auto if the pinned provider isn't usable
  }

  // Auto — local first, then any remaining online (cloud / custom).
  const ordered = [
    ...all.filter((p) => ["ollama", "lmstudio", "llamacpp", "mlx"].includes(p.id)),
    ...all.filter((p) => p.id === "openai"),
    ...all.filter((p) => p.custom),
  ]
  for (const p of ordered) {
    const bound = bind(p)
    if (bound) return bound
  }
  return null
}
