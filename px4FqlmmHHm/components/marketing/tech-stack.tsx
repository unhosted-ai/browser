"use client"

import { Badge } from "@/components/ui/badge"

const stack = [
  { name: "Next.js 16", category: "framework" },
  { name: "AI SDK 6", category: "ai" },
  { name: "Vercel AI Gateway", category: "ai" },
  { name: "React 19", category: "framework" },
  { name: "TypeScript", category: "language" },
  { name: "Tailwind CSS", category: "styling" },
  { name: "shadcn/ui", category: "ui" },
  { name: "Streaming", category: "feature" },
  { name: "App Router", category: "framework" },
]

export function TechStack() {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {stack.map((item) => (
        <Badge
          key={item.name}
          variant="secondary"
          className="px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors cursor-default"
        >
          {item.name}
        </Badge>
      ))}
    </div>
  )
}
