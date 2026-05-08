"use client"

import Link from "next/link"

const explores = [
  {
    title: "Try the Chatbot",
    description: "Open the live chat interface and start a conversation with any supported model.",
    href: "/chat",
    cta: "Open Chat",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "View Source",
    description: "Explore the clean, well-structured codebase. Fork it, customize it, ship it.",
    href: "https://github.com/vercel/ai",
    cta: "GitHub",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: "Deploy to Vercel",
    description: "One-click deploy to your Vercel account. The AI Gateway is provisioned automatically.",
    href: "https://vercel.com/new",
    cta: "Deploy",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 19.5h20L12 2z" />
      </svg>
    ),
  },
]

export function ExploreCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {explores.map((item) => (
        <Link
          key={item.title}
          href={item.href}
          className="group flex flex-col justify-between gap-6 p-6 rounded-xl border border-border bg-card hover:border-foreground/20 transition-colors"
        >
          <div className="flex flex-col gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
              {item.icon}
            </div>
            <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            {item.cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
              <path d="M7 17l9.2-9.2M17 17V7.8H7.8" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  )
}
