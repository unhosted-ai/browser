import type { Tab, TabId } from "@shared/types"
import { RamPip } from "./RamPip"

type Props = {
  tabs: Tab[]
  activeId: TabId | null
  onActivate: (id: TabId) => void
  onClose: (id: TabId) => void
  onCreate: () => void
}

function favicon(url: string): string | null {
  try {
    const u = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`
  } catch {
    return null
  }
}

export function TabStrip({ tabs, activeId, onActivate, onClose, onCreate }: Props) {
  return (
    <div className="h-10 flex items-end pl-3 pr-2 gap-[2px] select-none">
      <ul className="flex flex-1 items-end gap-[2px] overflow-x-auto scrollbar-none min-w-0">
        {tabs.map((t) => {
          const active = t.id === activeId
          const fav = favicon(t.url)
          return (
            <li
              key={t.id}
              className={[
                "no-drag group relative flex items-center gap-2",
                "h-9 max-w-[220px] min-w-[140px] pl-2.5 pr-1.5",
                "rounded-t-lg text-[12px] cursor-default",
                "transition-colors duration-150",
                active
                  ? "bg-chrome-surface-2 text-chrome-text"
                  : "bg-transparent text-chrome-text-2 hover:bg-chrome-surface/70 hover:text-chrome-text",
              ].join(" ")}
              onClick={() => onActivate(t.id)}
              onAuxClick={(e) => {
                if (e.button === 1) onClose(t.id)
              }}
            >
              {/* Active accent line at top edge */}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-2.5 right-2.5 top-0 h-[2px] rounded-full bg-signal"
                />
              )}

              {/* Favicon */}
              <span className="grid place-items-center h-4 w-4 shrink-0">
                {t.loading ? (
                  <span className="h-2 w-2 rounded-full bg-signal animate-pulse" />
                ) : fav ? (
                  <img
                    src={fav}
                    alt=""
                    className="h-4 w-4 rounded-sm"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")}
                  />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-chrome-text-3" />
                )}
              </span>

              {/* Title */}
              <span className="truncate flex-1 leading-none">
                {t.title || "New tab"}
              </span>

              {/* Close button */}
              <button
                type="button"
                aria-label="Close tab"
                className="opacity-0 group-hover:opacity-100 h-5 w-5 grid place-items-center rounded text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-border transition-opacity duration-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(t.id)
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            aria-label="New tab"
            className="no-drag h-9 w-9 grid place-items-center rounded-md text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface/70 transition-colors duration-150"
            onClick={onCreate}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      </ul>
      <div className="h-9 pl-2 flex items-center shrink-0">
        <RamPip />
      </div>
    </div>
  )
}
