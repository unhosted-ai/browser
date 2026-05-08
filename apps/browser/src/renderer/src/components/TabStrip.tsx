import type { Tab, TabId } from "@shared/types"

type Props = {
  tabs: Tab[]
  activeId: TabId | null
  onActivate: (id: TabId) => void
  onClose: (id: TabId) => void
  onCreate: () => void
}

export function TabStrip({ tabs, activeId, onActivate, onClose, onCreate }: Props) {
  return (
    <div className="h-10 flex items-end pl-[80px] pr-2 gap-1 select-none">
      <ul className="flex flex-1 items-end gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === activeId
          return (
            <li
              key={t.id}
              className={[
                "no-drag group relative flex items-center gap-2",
                "h-8 max-w-[220px] min-w-[120px] px-3 rounded-t-md text-[12px]",
                "transition-colors duration-150",
                active
                  ? "bg-chrome-surface-2 text-chrome-text"
                  : "bg-transparent text-chrome-text-2 hover:bg-chrome-surface/60",
              ].join(" ")}
              onClick={() => onActivate(t.id)}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  t.loading
                    ? "bg-signal animate-pulse"
                    : active
                      ? "bg-signal"
                      : "bg-chrome-text-3",
                ].join(" ")}
              />
              <span className="truncate flex-1">{t.title || "New tab"}</span>
              <button
                type="button"
                aria-label="Close tab"
                className="opacity-0 group-hover:opacity-100 h-4 w-4 grid place-items-center rounded text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-border"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(t.id)
                }}
              >
                ×
              </button>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            aria-label="New tab"
            className="no-drag h-8 w-8 grid place-items-center rounded-md text-chrome-text-2 hover:text-chrome-text hover:bg-chrome-surface/60"
            onClick={onCreate}
          >
            +
          </button>
        </li>
      </ul>
    </div>
  )
}
