"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { AgentSettingsDialog } from "@/components/agent-settings-dialog"
import {
  type AgentSettings,
  DEFAULT_SETTINGS,
  AVAILABLE_MODELS,
} from "@/lib/agent-settings"

export default function ChatPage() {
  const [input, setInput] = useState("")
  const [settings, setSettings] = useState<AgentSettings>(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          id,
          messages,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          systemPrompt: settings.systemPrompt,
        },
      }),
    }),
  })

  const isLoading = status === "streaming" || status === "submitted"
  const currentModel = AVAILABLE_MODELS.find((m) => m.id === settings.model)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function getMessageText(message: (typeof messages)[0]): string {
    if (!message.parts || !Array.isArray(message.parts)) return ""
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("")
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header breadcrumb="Chat" />

      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto">
        {/* Chat toolbar */}
        <div className="flex flex-col border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{currentModel?.name ?? settings.model}</span>
              {isLoading && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Open settings"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </button>
            </div>
          </div>
          {/* Model switcher chips */}
          <div className="flex items-center gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = settings.model === model.id
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSettings((s) => ({ ...s, model: DEFAULT_SETTINGS.model }))
                    } else {
                      setSettings((s) => ({ ...s, model: model.id }))
                    }
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-foreground text-background"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {model.name}
                  <span className="text-[10px] opacity-60">{model.provider}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-foreground">Start a conversation</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Ask anything. Powered by {currentModel?.name ?? "AI"} via the Vercel AI Gateway.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((message) => {
                const text = getMessageText(message)
                if (!text) return null

                return (
                  <div key={message.id} className={`flex gap-3 ${message.role === "assistant" ? "" : "justify-end"}`}>
                    {message.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-foreground flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-background">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                        message.role === "assistant"
                          ? "bg-muted text-foreground rounded-tl-sm"
                          : "bg-foreground text-background rounded-tr-sm"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                    </div>
                    {message.role === "user" && (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!input.trim() || isLoading) return
              sendMessage({ text: input })
              setInput("")
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    if (!input.trim() || isLoading) return
                    sendMessage({ text: input })
                    setInput("")
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = "auto"
                  }
                }}
                placeholder="Send a message..."
                rows={1}
                disabled={isLoading}
                className="w-full resize-none bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-[44px] w-[44px] rounded-xl shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </form>
        </div>
      </div>

      <AgentSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  )
}
