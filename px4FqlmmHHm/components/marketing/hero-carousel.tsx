"use client"

import { useState, useEffect } from "react"
import { ThumbnailChat } from "./thumbnail-chat"
import { ThumbnailModels } from "./thumbnail-models"
import { ThumbnailSettings } from "./thumbnail-settings"
import { ThumbnailCapabilities } from "./thumbnail-capabilities"

const slides = [
  { component: ThumbnailChat, label: "Chat Interface" },
  { component: ThumbnailModels, label: "Multi-Model" },
  { component: ThumbnailSettings, label: "Agent Settings" },
  { component: ThumbnailCapabilities, label: "Capabilities" },
]

export function HeroCarousel() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => prev + 2)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      setActive((prev) => (prev + 1) % slides.length)
      setProgress(0)
    }
  }, [progress])

  const handleSlideClick = (index: number) => {
    setActive(index)
    setProgress(0)
  }

  const ActiveComponent = slides[active].component

  return (
    <div className="flex flex-col gap-6">
      {/* Main preview */}
      <div className="relative rounded-xl border border-border overflow-hidden bg-card aspect-[16/5] shadow-2xl shadow-background/50">
        <ActiveComponent />
      </div>

      {/* Progress tabs */}
      <div className="flex items-center gap-3">
        {slides.map((slide, i) => (
          <button
            key={slide.label}
            type="button"
            onClick={() => handleSlideClick(i)}
            className="flex-1 flex flex-col gap-2 group"
          >
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all duration-100"
                style={{
                  width: i === active ? `${progress}%` : i < active ? "100%" : "0%",
                }}
              />
            </div>
            <span
              className={`text-xs font-medium transition-colors ${
                i === active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/70"
              }`}
            >
              {slide.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
