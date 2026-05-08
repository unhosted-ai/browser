// Provider abstraction. Probes local endpoints, lists available models, and
// returns a structure the agent runtime can pick a default from.
//
// Privacy posture: only local providers are auto-probed. The "Cloud API"
// entry exists so the user can opt in via a future settings drawer; we
// never auto-call out to it.
import type { ProviderId, ProviderInfo, ProviderStatus } from "@shared/types"

const ENDPOINTS: Record<ProviderId, { label: string; endpoint: string; local: boolean }> = {
  ollama:   { label: "Ollama",        endpoint: "http://127.0.0.1:11434", local: true  },
  lmstudio: { label: "LM Studio",     endpoint: "http://127.0.0.1:1234",  local: true  },
  llamacpp: { label: "llama.cpp",     endpoint: "http://127.0.0.1:8080",  local: true  },
  mlx:      { label: "MLX (mlx-lm)",  endpoint: "http://127.0.0.1:8080",  local: true  },
  api:      { label: "Cloud API",     endpoint: "https://api.anthropic.com", local: false },
}

async function fetchJson<T>(url: string, timeoutMs = 800): Promise<T | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, { method: "GET", signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function probeLocal(id: ProviderId, endpoint: string): Promise<{ status: ProviderStatus; models: string[] }> {
  // Each provider exposes models a little differently. Where we can, we use
  // the OpenAI-compatible `/v1/models` shape; for Ollama we prefer its native
  // tags endpoint (richer), then fall back.
  if (id === "ollama") {
    type Tag = { name: string }
    const tags = await fetchJson<{ models?: Tag[] }>(`${endpoint}/api/tags`)
    if (tags?.models) return { status: "online", models: tags.models.map(m => m.name) }
  }
  type OpenAIModelList = { data?: Array<{ id: string }> }
  const list = await fetchJson<OpenAIModelList>(`${endpoint}/v1/models`)
  if (list?.data) return { status: "online", models: list.data.map(m => m.id) }
  return { status: "offline", models: [] }
}

async function probeOne(id: ProviderId): Promise<ProviderInfo> {
  const { label, endpoint, local } = ENDPOINTS[id]
  if (!local) {
    // Privacy default: never probe cloud endpoints.
    return { id, label, endpoint, status: "unknown", models: [] }
  }
  const { status, models } = await probeLocal(id, endpoint)
  return { id, label, endpoint, status, models }
}

export async function listProviders(): Promise<ProviderInfo[]> {
  const ids: ProviderId[] = ["ollama", "lmstudio", "llamacpp", "mlx", "api"]
  return Promise.all(ids.map(probeOne))
}

// Pick the first usable local provider — used as the agent's default. Returns
// null when nothing local is online; the agent surfaces "no providers online"
// rather than reaching out to the cloud.
export async function pickDefaultLocalProvider(): Promise<{ endpoint: string; model: string; id: ProviderId } | null> {
  const all = await listProviders()
  for (const p of all) {
    if (p.id === "api") continue
    if (p.status === "online" && p.models.length > 0) {
      return { endpoint: p.endpoint, model: p.models[0]!, id: p.id }
    }
  }
  return null
}
