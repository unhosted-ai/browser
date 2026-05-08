import {
  consumeStream,
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const {
    messages,
    model = "anthropic/claude-opus-4.6",
    temperature = 0.7,
    maxTokens = 4096,
    systemPrompt = "You are a helpful assistant. Be concise and direct in your responses.",
  }: {
    messages: UIMessage[]
    model?: string
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
  } = await req.json()

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    temperature,
    maxOutputTokens: maxTokens,
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
