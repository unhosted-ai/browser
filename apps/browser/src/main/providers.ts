// Provider abstraction stub. v1 only probes endpoints; chat is a future task.
import type { ProviderId, ProviderInfo, ProviderStatus } from "@shared/types"

const ENDPOINTS: Record<ProviderId, { label: string; endpoint: string }> = {
  ollama:   { label: "Ollama",        endpoint: "http://127.0.0.1:11434" },
  lmstudio: { label: "LM Studio",     endpoint: "http://127.0.0.1:1234" },
  llamacpp: { label: "llama.cpp",     endpoint: "http://127.0.0.1:8080" },
  mlx:      { label: "MLX (mlx-lm)",  endpoint: "http://127.0.0.1:8080" },
  api:      { label: "Cloud API",     endpoint: "https://api.anthropic.com" },
}

async function probe(url: string): Promise<ProviderStatus> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 800)
    const res = await fetch(url, { method: "GET", signal: ctrl.signal })
    clearTimeout(t)
    return res.ok || res.status === 404 ? "online" : "offline"
  } catch {
    return "offline"
  }
}

async function probeOne(id: ProviderId): Promise<ProviderInfo> {
  const { label, endpoint } = ENDPOINTS[id]
  // For local providers, hit their root or a known introspection path.
  const probeUrl =
    id === "ollama"   ? `${endpoint}/api/tags` :
    id === "lmstudio" ? `${endpoint}/v1/models` :
    id === "llamacpp" ? `${endpoint}/health`   :
    id === "mlx"      ? `${endpoint}/v1/models`:
    /* api */           endpoint
  const status: ProviderStatus = id === "api" ? "unknown" : await probe(probeUrl)
  return { id, label, endpoint, status, models: [] }
}

export async function listProviders(): Promise<ProviderInfo[]> {
  const ids: ProviderId[] = ["ollama", "lmstudio", "llamacpp", "mlx", "api"]
  return Promise.all(ids.map(probeOne))
}
