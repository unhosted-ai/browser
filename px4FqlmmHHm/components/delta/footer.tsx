export function DeltaFooter({ lastUpdated }: { lastUpdated: string }) {
  return (
    <footer className="mt-32 border-t border-delta-border">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12 py-14 grid grid-cols-4 md:grid-cols-12 gap-y-10 md:gap-x-6">
        <div className="col-span-4 md:col-span-6">
          <p className="font-serif italic text-[28px] leading-[1.2] tracking-[-0.01em] text-delta-text max-w-[18ch]">
            A practice for AI-shaped products.
          </p>
        </div>

        <div className="col-span-2 md:col-span-3 md:col-start-8">
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-delta-text-3 mb-3">
            Contact
          </p>
          <a
            href="mailto:hello@delta.practice"
            className="block text-[15px] text-delta-text hover:text-signal transition-colors duration-150 ease-delta-snap"
          >
            hello@delta.practice
          </a>
        </div>

        <div className="col-span-2 md:col-span-2 md:col-start-11">
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-delta-text-3 mb-3">
            Elsewhere
          </p>
          <ul className="space-y-1.5 text-[15px]">
            <li>
              <a
                className="text-delta-text hover:text-signal transition-colors duration-150 ease-delta-snap"
                href="https://github.com/"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                className="text-delta-text hover:text-signal transition-colors duration-150 ease-delta-snap"
                href="https://read.cv/"
                target="_blank"
                rel="noreferrer"
              >
                Read.cv
              </a>
            </li>
          </ul>
        </div>

        <div className="col-span-4 md:col-span-12 mt-6 pt-6 border-t border-delta-border flex flex-wrap justify-between gap-y-2 font-mono text-[11px] tracking-[0.12em] uppercase text-delta-text-3">
          <span>© Delta Practice</span>
          <span>
            Last updated{" "}
            <time
              dateTime={lastUpdated}
              className="text-delta-text-2 tabular-nums"
            >
              {lastUpdated}
            </time>
          </span>
        </div>
      </div>
    </footer>
  )
}
