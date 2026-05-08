"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/delta-practice",          label: "Index" },
  { href: "/delta-practice/work",     label: "Work" },
  { href: "/delta-practice/about",    label: "About" },
  { href: "/delta-practice/contact",  label: "Contact" },
] as const

export function DeltaNav() {
  const pathname = usePathname() ?? ""

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-delta-bg/80 border-b border-delta-border">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12 h-14 flex items-center justify-between">
        <Link
          href="/delta-practice"
          className="flex items-center gap-2 text-delta-text"
          aria-label="Delta Practice — Home"
        >
          <span aria-hidden className="grid place-items-center h-7 w-7 rounded-md bg-delta-surface-2 border border-delta-border">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-signal">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-serif text-[16px] tracking-[-0.01em] leading-none">
            Delta&nbsp;Practice<span className="text-signal">.</span>
          </span>
        </Link>

        <ul className="flex items-center gap-7 font-mono text-[11px] tracking-[0.12em] uppercase">
          {NAV.map((item) => {
            const active =
              item.href === "/delta-practice"
                ? pathname === item.href
                : pathname.startsWith(item.href)
            return (
              <li key={item.href} className="relative">
                {active && (
                  <span
                    aria-hidden
                    className="absolute -left-3 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-signal"
                  />
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "transition-colors duration-150 ease-delta-snap",
                    active
                      ? "text-delta-text"
                      : "text-delta-text-2 hover:text-delta-text"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
