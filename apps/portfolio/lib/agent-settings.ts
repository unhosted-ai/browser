export interface AgentSettings {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

export const DEFAULT_SETTINGS: AgentSettings = {
  model: "anthropic/claude-opus-4.6",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt:
    "You are a helpful assistant. Be concise and direct in your responses.",
}

export const AVAILABLE_MODELS = [
  { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6", provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "anthropic/claude-haiku-3.5-20241022", name: "Claude 3.5 Haiku", provider: "Anthropic" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "xai/grok-3-mini-fast", name: "Grok 3 Mini", provider: "xAI" },
] as const
