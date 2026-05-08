"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { type AgentSettings, AVAILABLE_MODELS } from "@/lib/agent-settings"

interface AgentSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AgentSettings
  onSettingsChange: (settings: AgentSettings) => void
}

export function AgentSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: AgentSettingsDialogProps) {
  const currentModel = AVAILABLE_MODELS.find((m) => m.id === settings.model)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background backdrop-blur-none">
        <DialogHeader>
          <DialogTitle className="text-foreground">Agent Settings</DialogTitle>
          <DialogDescription>
            Configure the AI model, behavior, and capabilities.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 pt-2">
          {/* Model */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Model</Label>
            <Select
              value={settings.model}
              onValueChange={(value) =>
                onSettingsChange({ ...settings, model: value })
              }
            >
              <SelectTrigger className="bg-card text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary text-secondary-foreground">
                        {model.provider}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentModel && (
              <p className="text-xs text-muted-foreground">
                {currentModel.provider} via Vercel AI Gateway
              </p>
            )}
          </div>

          {/* Temperature */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">Temperature</Label>
              <span className="text-xs font-mono text-muted-foreground">
                {settings.temperature.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[settings.temperature]}
              onValueChange={([value]) =>
                onSettingsChange({ ...settings, temperature: value })
              }
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Lower values are more focused, higher values are more creative.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Max Tokens</Label>
            <Input
              type="number"
              value={settings.maxTokens}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  maxTokens: Number.parseInt(e.target.value) || 4096,
                })
              }
              min={256}
              max={128000}
              className="bg-card text-foreground font-mono"
            />
          </div>

          {/* System Prompt */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">System Prompt</Label>
            <Textarea
              value={settings.systemPrompt}
              onChange={(e) =>
                onSettingsChange({ ...settings, systemPrompt: e.target.value })
              }
              rows={4}
              className="bg-card text-foreground resize-none"
              placeholder="You are a helpful assistant..."
            />
          </div>

          {/* Info section */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              How it works
            </h4>
            <ul className="text-xs text-muted-foreground flex flex-col gap-1.5">
              <li>The model, temperature, and system prompt are sent with each message.</li>
              <li>All models are accessed through the Vercel AI Gateway -- no API keys needed.</li>
              <li>Streaming responses use AI SDK 6 with streamText and useChat.</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
