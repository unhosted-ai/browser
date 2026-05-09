// Reader mode — strip a page down to the article content.
//
// We load Mozilla's Readability source from node_modules, then inject it
// into the target WebContentsView via executeJavaScript. The injected
// script clones the document, runs Readability on the clone (so the live
// page state is preserved for an "Exit reader" reload), and replaces the
// body with a clean serif column.
//
// Toggling off reloads the original URL — simpler than diffing the prior
// document, and identical to what Safari does.

import type { WebContentsView } from "electron"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { createRequire } from "node:module"

// Resolve the raw Readability source (NOT the index.js wrapper, which is
// a CommonJS shim that calls require()). We resolve the package, then sit
// on the directory and read Readability.js directly — that file ends with
// a guarded `module.exports = Readability` so we can pick up the symbol
// either way.
const READABILITY_SRC: string = (() => {
  try {
    const req = createRequire(import.meta.url)
    const indexPath = req.resolve("@mozilla/readability")
    const pkgDir = dirname(indexPath)
    const src = readFileSync(join(pkgDir, "Readability.js"), "utf8")
    // The file declares `var Readability = function(...)`. After loading,
    // hoist it onto globalThis for the injected applier to find.
    return (
      src +
      "\n;try { globalThis.Readability = Readability; } catch (e) {}"
    )
  } catch {
    // Best-effort fallback — the user can still browse without reader mode.
    return "globalThis.Readability = null;"
  }
})()

// Tracks which WebContents currently have reader mode applied. We can't
// inspect the DOM cheaply, so we keep our own bookkeeping. Reset when the
// tab navigates away (handled by the caller invalidating per tabId).
const ACTIVE = new Set<number>()

export function isReaderActive(view: WebContentsView): boolean {
  return ACTIVE.has(view.webContents.id)
}

/**
 * Toggle reader mode on the given view. Returns the new state.
 * Throws if the page can't be parsed (caller may show a toast).
 */
export async function toggleReader(view: WebContentsView): Promise<boolean> {
  const wcId = view.webContents.id
  if (ACTIVE.has(wcId)) {
    ACTIVE.delete(wcId)
    // Reload restores the original page — cheaper and more reliable than
    // trying to reverse our DOM mutations.
    view.webContents.reload()
    return false
  }

  // Inject Readability + the apply script. We catch errors inside the
  // page so a parse failure doesn't crash the tab.
  const script = `
    (() => {
      try {
        ${READABILITY_SRC}
        if (!globalThis.Readability) return { ok: false, reason: "no_readability" };
        const docClone = document.cloneNode(true);
        const article = new globalThis.Readability(docClone).parse();
        if (!article || !article.content) return { ok: false, reason: "no_article" };

        // Replace the page with a clean serif reader view. We keep the
        // <head> intact so the title + meta survive, and rewrite <body>.
        const styles = \`
          html, body { background: #fafaf7 !important; }
          body {
            margin: 0; padding: 0;
            color: #1c1c1c;
            font: 18px/1.65 ui-serif, Georgia, "Times New Roman", serif;
          }
          .delta-reader {
            max-width: 720px;
            margin: 0 auto;
            padding: clamp(2.5rem, 6vw, 4rem) clamp(1.25rem, 4vw, 2.5rem);
          }
          .delta-reader h1 {
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
            font-size: clamp(28px, 4vw, 40px);
            font-weight: 600;
            letter-spacing: -0.02em;
            line-height: 1.15;
            margin: 0 0 0.4em;
          }
          .delta-reader .byline {
            color: #6b7280;
            font-size: 14px;
            font-family: ui-sans-serif, system-ui, sans-serif;
            margin: 0 0 2.5rem;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 1.5rem;
          }
          .delta-reader p { margin: 0 0 1.2em; text-wrap: pretty; }
          .delta-reader a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
          .delta-reader img, .delta-reader figure { max-width: 100%; height: auto; margin: 1.2em 0; border-radius: 6px; }
          .delta-reader figcaption { font-size: 14px; color: #6b7280; margin-top: 0.4em; }
          .delta-reader blockquote { border-left: 3px solid #d1d5db; margin: 1.4em 0; padding: 0.2em 0 0.2em 1.2em; color: #374151; font-style: italic; }
          .delta-reader pre { background: #f3f4f6; padding: 1em; border-radius: 6px; overflow-x: auto; font: 14px/1.5 ui-monospace, Menlo, monospace; }
          .delta-reader code { font: 0.9em ui-monospace, Menlo, monospace; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }
          .delta-reader h2 { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 22px; font-weight: 600; margin: 2em 0 0.4em; }
          .delta-reader h3 { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 18px; font-weight: 600; margin: 1.6em 0 0.4em; }
          .delta-reader ul, .delta-reader ol { padding-left: 1.4em; margin: 0 0 1.2em; }
          .delta-reader li { margin-bottom: 0.4em; }
          @media (prefers-color-scheme: dark) {
            html, body { background: #15171c !important; }
            body { color: #e5e7eb; }
            .delta-reader .byline { color: #9ca3af; border-color: #2a2f3a; }
            .delta-reader a { color: #93c5fd; }
            .delta-reader pre, .delta-reader code { background: #1f2330; }
            .delta-reader blockquote { border-color: #374151; color: #cbd5e1; }
          }
        \`;
        const style = document.createElement("style");
        style.id = "delta-reader-style";
        style.textContent = styles;
        document.head.appendChild(style);

        const wrap = document.createElement("article");
        wrap.className = "delta-reader";
        const title = document.createElement("h1");
        title.textContent = article.title || document.title || "";
        wrap.appendChild(title);
        if (article.byline || article.siteName) {
          const byline = document.createElement("p");
          byline.className = "byline";
          byline.textContent = [article.byline, article.siteName].filter(Boolean).join(" · ");
          wrap.appendChild(byline);
        }
        const body = document.createElement("div");
        body.innerHTML = article.content;
        wrap.appendChild(body);

        document.body.innerHTML = "";
        document.body.appendChild(wrap);
        document.body.scrollTo(0, 0);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: String(err && err.message || err) };
      }
    })()
  `

  const result = await view.webContents.executeJavaScript(script, true) as { ok: boolean; reason?: string }
  if (result?.ok) {
    ACTIVE.add(wcId)
    return true
  }
  return false
}

/** Called by TabManager on top-level navigation — the new page starts fresh. */
export function clearReaderState(webContentsId: number): void {
  ACTIVE.delete(webContentsId)
}

