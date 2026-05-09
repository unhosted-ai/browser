// Listen-to-page — text-to-speech driven by the page's own
// `window.speechSynthesis` (Web Speech API).
//
// We don't ship voices ourselves; we use whatever the OS has installed.
// On macOS that means the System Settings → Accessibility voices, which
// are excellent at the Premium tier and adequate at the default tier.
//
// State (which tabs are speaking) is tracked here so the address-bar
// button can show "playing / paused / stopped" without a polling round-
// trip to the page.

import type { WebContentsView } from "electron"

const SPEAKING = new Set<number>()

export function isSpeaking(view: WebContentsView): boolean {
  return SPEAKING.has(view.webContents.id)
}

/** Start reading the page. Returns true on success. */
export async function startSpeaking(view: WebContentsView): Promise<boolean> {
  const wcId = view.webContents.id
  // Inject a script that:
  //  1. Pulls the visible main-text content
  //  2. Cancels any prior utterance (in case the user double-clicked)
  //  3. Speaks the text in chunks (browsers cap utterances at ~32K chars)
  //
  // The chunking is important — Chromium's TTS engine cuts off long
  // utterances silently around 32K.
  const script = `
    (() => {
      try {
        if (!('speechSynthesis' in window)) return { ok: false, reason: "no_tts" };
        // Prefer the article element if reader mode is on; else body.
        const root = document.querySelector("article.delta-reader") || document.body;
        // innerText respects rendering (skips display:none, joins block-
        // level with newlines) — better than textContent for this.
        const raw = (root && root.innerText) ? root.innerText : "";
        const text = raw.replace(/\\s+/g, " ").trim();
        if (!text) return { ok: false, reason: "no_text" };

        window.speechSynthesis.cancel();

        const CHUNK = 220;
        const chunks = [];
        let i = 0;
        while (i < text.length) {
          let end = Math.min(i + CHUNK, text.length);
          if (end < text.length) {
            // Snap to a sentence boundary if we can find one nearby.
            const slice = text.slice(i, end);
            const lastDot = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
            if (lastDot > CHUNK * 0.5) end = i + lastDot + 1;
          }
          chunks.push(text.slice(i, end));
          i = end;
        }
        for (const c of chunks) {
          const u = new SpeechSynthesisUtterance(c);
          u.rate = 1.0;
          u.pitch = 1.0;
          window.speechSynthesis.speak(u);
        }
        return { ok: true, chunks: chunks.length };
      } catch (err) {
        return { ok: false, reason: String(err && err.message || err) };
      }
    })()
  `
  const result = await view.webContents.executeJavaScript(script, true) as { ok: boolean; reason?: string }
  if (result?.ok) {
    SPEAKING.add(wcId)
    return true
  }
  return false
}

export async function stopSpeaking(view: WebContentsView): Promise<void> {
  SPEAKING.delete(view.webContents.id)
  await view.webContents.executeJavaScript(
    `try { window.speechSynthesis.cancel(); } catch {}`,
    true,
  )
}

/** Called by TabManager on top-level navigation. */
export function clearSpeakingState(webContentsId: number): void {
  SPEAKING.delete(webContentsId)
}
