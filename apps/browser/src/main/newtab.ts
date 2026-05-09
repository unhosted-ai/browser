// Delta new-tab page.
//
// Served at delta://newtab via a custom protocol handler. Self-contained:
// the HTML, CSS, JS, and rotating content all live in this file as a string,
// so there are no remote calls (privacy posture) and no asset bundling step.
//
// Daily rotation is date-seeded (see `seed()` in the inline JS) so the page
// looks meaningfully different each day but is deterministic — the sky, the
// aphorism, the manifesto excerpt, the silhouette all rotate together.
import { protocol } from "electron"
import type { PrivacyReport } from "@shared/types"

type ReportGetter = () => PrivacyReport | null

export function registerNewtabProtocol(getReport: ReportGetter = () => null): void {
  protocol.handle("delta", (req) => {
    const url = new URL(req.url)
    const path = url.hostname || "newtab"
    if (path === "newtab") {
      // Snapshot stats at request time and inline them into the page so
      // the card paints with real numbers on first frame — no IPC round-
      // trip from the renderer required.
      const report = getReport()
      const stats7d = report ? sumLastNDays(report.dailyCounts, 7) : 0
      const html = HTML.replace(/__STATS_7D__/g, String(stats7d))
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    }
    return new Response("Not found", { status: 404 })
  })
}

function sumLastNDays(daily: Array<{ date: string; count: number }>, n: number): number {
  return daily.slice(-n).reduce((a, d) => a + d.count, 0)
}

// ── Rotating content ─────────────────────────────────────
// Defined here as TS so editing them is a normal code change, then injected
// into the HTML at module load time. Adding entries doesn't need a schema
// migration — just push to the array.

const APHORISMS = [
  "Browse quietly.",
  "Your machine. Your model.",
  "The page is the conversation.",
  "Local first. Always.",
  "Ask the page anything.",
  "Privacy is the default, not a setting.",
  "Read, then act.",
  "Slow tools beat fast surveillance.",
  "Every model on your laptop is a small act of independence.",
  "The agent works for you, not for the page.",
  "Untrusted input, trusted runtime.",
  "Your context, never theirs.",
  "Good software gets out of the way.",
  "A browser should know less about you than you do.",
  "Nothing leaves this machine without a reason.",
  "The web, narrated by a model that lives in your dock.",
  "Permissions belong to the user.",
  "Data is heavier than code.",
  "Cache the work. Forget the people.",
  "An open tab is a question waiting to be asked.",
  "Curiosity, with the receipts.",
  "Read everything. Trust nothing.",
  "The page is data. You are not.",
  "Locality is a feature.",
  "The right model is the one already on your disk.",
  "Sovereignty is a system property.",
  "Tools should not call home.",
  "What you read is yours.",
] as const

const MANIFESTOS = [
  "Delta exists because the browser has become a surveillance instrument with a search bar attached. We think a different shape is possible: a browser that defaults to a model running on your own machine, that treats every page as untrusted input, and that answers to you alone.",
  "The agent in your sidebar is not a service. It is a process running on your hardware, reading the document you are looking at, and replying with whatever your local model is good at. There is no roundtrip to a datacenter, no logging, no profile being assembled across sessions you didn't ask for.",
  "We borrow the patterns the cloud got right — streaming, tool calls, cancellation, structured permissions — and we run them locally. The only thing we leave behind is the assumption that the user is the product.",
  "Acting on the user's behalf is a feature that requires care. Every act-tool call is gated, scoped per origin, and visible. The agent cannot click a button without you knowing. This is not negotiable.",
  "Sensitive sites — banking, health, payment — get fewer tools, not more. The model is never told there's an action it could take on a page where the consequences live outside the browser.",
  "Local models will get cheaper, faster, and better. We are designing for the world where every laptop runs a 70B-class model on a unified-memory chip. The cloud will still exist; using it should be a choice you make, not a default.",
  "The web is full of text that wants to instruct your model. We treat all of it as data, wrap it in a tag, and tell the system prompt that nothing inside that tag is an instruction. Defense in depth, not in marketing.",
  "Tasks are first-class. You should be able to ask the agent to do something, see what it's about to do, leave the room, come back, and find the work where you left it.",
  "Every cycle of computation that happens on your machine is a cycle that nobody else can see. This is not a slogan. It is the architecture.",
  "The address bar is a question, not a contract. We never sell the queries. We never log them. There is no registry to leak.",
  "We are not building a hardened security browser; for that there is Tor and arkenfox. We are building a default-good browser — fewer tracking mechanisms enabled, fewer assumptions about what the user agrees to, and a clear line between page content and agent reasoning.",
  "An AI browser without an opinion about privacy is not a browser. It is a funnel.",
  "If the agent is going to take an action on a page, it must show its work first. The model proposes; the user disposes.",
  "Software you can read is software you can trust. Delta is open from day one because the alternative is asking you to take our word for things that should be verifiable.",
] as const

// 7 sky palettes, one per weekday. Hand-tuned for cohesion.
const PALETTES: Array<{ a: string; b: string; c: string; sun: string; horizon: string }> = [
  // Mon — dawn
  { a: "#1d2540", b: "#5a6e9a", c: "#f4c79a", sun: "#ffd9a8", horizon: "#0e1422" },
  // Tue — clear noon
  { a: "#2c4a78", b: "#7fa9d4", c: "#dfeaf5", sun: "#ffe9b6", horizon: "#162437" },
  // Wed — golden hour
  { a: "#3a2a52", b: "#c95f5a", c: "#f4a261", sun: "#ffd58a", horizon: "#1c1428" },
  // Thu — overcast
  { a: "#3b3f4a", b: "#7a8190", c: "#b9bfca", sun: "#e9eaee", horizon: "#1f2127" },
  // Fri — pink dusk
  { a: "#2a1c3a", b: "#a06a9b", c: "#f0c0c4", sun: "#ffc6c6", horizon: "#150e1e" },
  // Sat — stormy
  { a: "#1a2230", b: "#3e5470", c: "#7f95b3", sun: "#cdd9e8", horizon: "#0b0f17" },
  // Sun — midnight
  { a: "#0b0e1c", b: "#1d2545", c: "#3c4a78", sun: "#aab8e3", horizon: "#05070d" },
]

// ── HTML ─────────────────────────────────────────────────
// Self-contained. Injected at load. No remote calls.
const HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Delta</title>
<style>
  :root {
    --fg: hsl(0 0% 98%);
    --fg-2: hsl(0 0% 78%);
    --fg-3: hsl(0 0% 60%);
    --bg: hsl(240 4% 5%);
    --signal: hsl(135 55% 66%);
    --inset: min(2vw, 1.5rem);
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; height: 100%;
    background: var(--bg); color: var(--fg);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }
  main {
    position: fixed; inset: 0;
    padding: var(--inset);
  }
  .frame {
    position: relative;
    width: 100%; height: 100%;
    border-radius: clamp(28px, 4vw, 56px);
    overflow: hidden;
    background: var(--bg);
    box-shadow: 0 30px 80px -20px rgba(0,0,0,0.6);
  }
  /* ── procedural sky ─────────────────────────────────── */
  .sky {
    position: absolute; inset: 0;
    background:
      radial-gradient(circle at var(--sun-x, 70%) var(--sun-y, 22%),
        var(--sun, #fff) 0%,
        transparent 38%),
      linear-gradient(180deg,
        var(--c1, #1d2540) 0%,
        var(--c2, #5a6e9a) 55%,
        var(--c3, #f4c79a) 100%);
  }
  .grain {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/></svg>");
    opacity: 0.10;
    mix-blend-mode: overlay;
    pointer-events: none;
  }
  .horizon {
    position: absolute; left: 0; right: 0; bottom: 0;
    height: 38%;
    background:
      linear-gradient(180deg, transparent 0%, var(--horizon, #0a0e18) 75%);
    pointer-events: none;
  }
  .horizon svg {
    position: absolute; bottom: 0; left: 0; width: 100%; height: 100%;
    display: block;
  }
  .horizon path { fill: var(--horizon, #0a0e18); }
  /* ── content ────────────────────────────────────────── */
  .content {
    position: relative;
    height: 100%; width: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 2.5rem 1.5rem;
    text-align: center;
    color: var(--fg);
    text-shadow: 0 1px 24px rgba(0,0,0,0.35);
  }
  .wordmark {
    display: flex; align-items: baseline; gap: 0.4em;
    font-family: "Instrument Serif", ui-serif, Georgia, "Times New Roman", serif;
    font-style: italic;
    font-weight: 400;
    font-size: clamp(72px, 14vw, 220px);
    line-height: 0.9;
    letter-spacing: -0.01em;
  }
  .wordmark .mark {
    display: inline-block;
    color: var(--signal);
    transform: translateY(-0.04em);
  }
  .search {
    margin-top: clamp(1.5rem, 3vh, 2.25rem);
    width: min(640px, 90%);
    height: 64px;
    display: flex; align-items: center;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.18);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-radius: 999px;
    padding: 0 0.5rem 0 1.5rem;
    transition: background .18s ease, border-color .18s ease;
  }
  .search:focus-within {
    background: rgba(255,255,255,0.16);
    border-color: rgba(255,255,255,0.32);
  }
  .search input {
    flex: 1;
    background: transparent;
    border: 0; outline: 0;
    color: var(--fg);
    font: inherit;
    font-size: 17px;
  }
  .search input::placeholder { color: rgba(255,255,255,0.55); }
  .search button {
    height: 48px; width: 48px; border-radius: 999px;
    border: 0; cursor: pointer;
    background: rgba(255,255,255,0.95);
    color: hsl(240 4% 8%);
    display: grid; place-items: center;
    transition: transform .12s ease, background .18s ease;
  }
  .search button:hover { background: white; transform: translateX(1px); }
  .search button:active { transform: translateX(2px); }
  .aphorism {
    margin-top: 1.4rem;
    font-family: "Instrument Serif", ui-serif, Georgia, serif;
    font-style: italic;
    font-size: clamp(15px, 2vw, 19px);
    color: rgba(255,255,255,0.86);
    max-width: 36ch;
    text-wrap: balance;
  }
  .manifesto-btn {
    margin-top: clamp(1.6rem, 3vh, 2.4rem);
    height: 44px;
    padding: 0 1.5rem;
    background: rgba(255,255,255,0.92);
    color: hsl(240 4% 8%);
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.01em;
    border: 0; border-radius: 999px;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    transition: transform .15s ease, background .18s ease;
    position: relative; overflow: hidden;
  }
  .manifesto-btn:hover { background: white; transform: translateY(-1px); }
  .manifesto-btn::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
    transform: translateX(-100%);
    animation: shine 1.6s ease-out 0.4s 1 forwards;
  }
  @keyframes shine {
    to { transform: translateX(200%); }
  }
  .manifesto {
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    max-width: min(680px, 88vw);
    max-height: 70vh;
    overflow-y: auto;
    padding: 1.75rem 2rem;
    border-radius: 24px;
    background: rgba(20, 22, 30, 0.66);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: 0 30px 80px -20px rgba(0,0,0,0.6);
    color: var(--fg);
    font-family: "Instrument Serif", ui-serif, Georgia, serif;
    font-style: italic;
    font-size: clamp(15px, 1.6vw, 18px);
    line-height: 1.55;
    text-align: left;
    text-wrap: pretty;
    opacity: 0; pointer-events: none;
    transition: opacity .25s ease;
  }
  .manifesto.open { opacity: 1; pointer-events: auto; }
  .manifesto .close {
    position: absolute; top: 0.8rem; right: 0.8rem;
    height: 28px; width: 28px;
    border-radius: 999px; border: 0; cursor: pointer;
    background: rgba(255,255,255,0.10);
    color: var(--fg);
    font: inherit; font-style: normal;
    display: grid; place-items: center;
  }
  .manifesto .close:hover { background: rgba(255,255,255,0.20); }
  .manifesto .meta {
    margin: 0 0 0.75rem 0;
    font-style: normal;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--fg-3);
  }
  .footer {
    position: absolute;
    bottom: clamp(1rem, 2.4vh, 1.6rem);
    left: 50%; transform: translateX(-50%);
    display: flex; gap: 0.75rem;
  }
  .footer a {
    height: 40px; width: 40px;
    display: grid; place-items: center;
    border-radius: 999px;
    background: rgba(255,255,255,0.10);
    color: var(--fg);
    text-decoration: none;
    border: 1px solid rgba(255,255,255,0.16);
    transition: background .18s ease;
  }
  .footer a:hover { background: rgba(255,255,255,0.22); }
  .stamp {
    position: absolute;
    top: clamp(1rem, 2.2vh, 1.6rem);
    right: clamp(1.25rem, 2.6vw, 2rem);
    font: 500 10px/1 ui-monospace, Menlo, monospace;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.6);
  }
  .stamp .dot { color: var(--signal); }
  /* ── Privacy chip (top-left). Compact stat — opens full report in
       Settings on click. Stays visible only when the count is > 0,
       so the page doesn't carry a "0 trackers blocked" placeholder. */
  .privacy-chip {
    position: absolute;
    top: clamp(1rem, 2.2vh, 1.6rem);
    left: clamp(1.25rem, 2.6vw, 2rem);
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.18);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: rgba(255,255,255,0.86);
    font: 500 11px/1 ui-monospace, Menlo, monospace;
    letter-spacing: 0.06em;
    cursor: pointer;
    text-decoration: none;
    transition: background .18s ease, border-color .18s ease;
  }
  .privacy-chip:hover { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.30); }
  .privacy-chip[hidden] { display: none; }
  .privacy-chip .shield {
    width: 12px; height: 12px;
    color: var(--signal);
  }
  .privacy-chip .num { color: #fff; font-weight: 600; }
</style>
</head>
<body>
<main>
  <div class="frame" id="frame">
    <div class="sky" id="sky"></div>
    <div class="horizon">
      <svg viewBox="0 0 1200 400" preserveAspectRatio="none" id="horizon-svg"></svg>
    </div>
    <div class="grain"></div>

    <div class="content">
      <a href="#" id="privacy-chip" class="privacy-chip" hidden title="Open privacy report">
        <svg class="shield" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5l5.5 2v4.2c0 3.6-2.4 6.6-5.5 7.3-3.1-.7-5.5-3.7-5.5-7.3V3.5L8 1.5z"
                stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"
                fill="currentColor" fill-opacity="0.18"/>
          <path d="M5.5 8l1.8 1.8L11 6.6" stroke="currentColor" stroke-width="1.4"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span><span class="num" id="privacy-num">0</span> trackers blocked this week</span>
      </a>

      <div class="stamp">
        <span id="stamp-day"></span>
        <span class="dot">·</span>
        <span>Local</span>
        <span class="dot">·</span>
        <span>Private</span>
      </div>

      <div class="wordmark">
        <span class="mark" aria-hidden="true">&#916;</span>
        <span>Delta</span>
      </div>

      <form class="search" id="search-form" autocomplete="off">
        <input
          id="search-input"
          type="text"
          placeholder="Search the web, or type a URL"
          spellcheck="false"
          autocapitalize="off"
          autocorrect="off"
          aria-label="Search or address"
        />
        <button type="submit" aria-label="Go">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 9h11M9 4l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </form>

      <p class="aphorism" id="aphorism"></p>

      <button class="manifesto-btn" id="manifesto-btn">Manifesto</button>
    </div>

    <div class="manifesto" id="manifesto" role="dialog" aria-labelledby="manifesto-title" aria-hidden="true">
      <button class="close" id="manifesto-close" aria-label="Close">&times;</button>
      <p class="meta" id="manifesto-meta"></p>
      <p id="manifesto-body"></p>
    </div>

    <div class="footer">
      <a href="https://github.com/Delta-Practice" target="_blank" rel="noopener" title="GitHub">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      </a>
      <a href="#" id="docs-link" title="About Delta">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 1.5l5.5 10H3.5L9 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.18"/>
        </svg>
      </a>
    </div>
  </div>
</main>
<script>
  // Date-seeded daily rotation. Same content for everyone seeing the same day.
  const APHORISMS = ${JSON.stringify(APHORISMS)};
  const MANIFESTOS = ${JSON.stringify(MANIFESTOS)};
  const PALETTES = ${JSON.stringify(PALETTES)};

  const now = new Date();
  // Day-of-year so the seed is monotonic.
  function dayIndex(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }
  const day = dayIndex(now);
  const dow = now.getDay(); // 0=Sun..6=Sat → palette index

  // ── Sky palette + sun position (sun rises across the day) ──
  const palette = PALETTES[dow];
  const minutes = now.getHours() * 60 + now.getMinutes();
  // Sun arcs from x=15% at 6am to x=85% at 8pm; outside that, hidden up high.
  const arc = Math.max(0, Math.min(1, (minutes - 6 * 60) / (14 * 60)));
  const sunX = 15 + arc * 70; // %
  const sunY = 50 - Math.sin(arc * Math.PI) * 36; // %
  const sky = document.getElementById("sky");
  sky.style.setProperty("--c1", palette.a);
  sky.style.setProperty("--c2", palette.b);
  sky.style.setProperty("--c3", palette.c);
  sky.style.setProperty("--sun", palette.sun);
  sky.style.setProperty("--sun-x", sunX + "%");
  sky.style.setProperty("--sun-y", sunY + "%");
  document.querySelector(".horizon").style.setProperty("--horizon", palette.horizon);

  // ── Procedural horizon (mountains + foreground), seeded by day ──
  function seedRand(seed) {
    let s = seed | 0;
    return function () {
      s = (s * 1664525 + 1013904223) | 0;
      return ((s >>> 0) % 100000) / 100000;
    };
  }
  function buildHorizon(svg, seed) {
    const r = seedRand(seed);
    // Far range, mid range, foreground.
    const W = 1200, H = 400;
    function ridge(amp, offY, points, opacity) {
      let d = "M 0 " + H + " L 0 " + (offY + amp);
      const step = W / points;
      for (let i = 0; i <= points; i++) {
        const x = i * step;
        const y = offY + (r() - 0.5) * amp * 2;
        d += " L " + x.toFixed(0) + " " + y.toFixed(0);
      }
      d += " L " + W + " " + H + " Z";
      return '<path d="' + d + '" opacity="' + opacity + '"></path>';
    }
    svg.innerHTML =
      ridge(40, 200, 14, 0.45) +
      ridge(60, 270, 18, 0.7) +
      ridge(80, 340, 22, 1.0);
  }
  buildHorizon(document.getElementById("horizon-svg"), day);

  // ── Aphorism + manifesto ──
  const aph = APHORISMS[day % APHORISMS.length];
  document.getElementById("aphorism").textContent = aph;

  const manifesto = MANIFESTOS[day % MANIFESTOS.length];
  document.getElementById("manifesto-body").textContent = "“" + manifesto + "”";

  // ── Stamp (date in the corner) ──
  const fmt = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  document.getElementById("stamp-day").textContent = fmt;

  // ── Manifesto meta line ──
  document.getElementById("manifesto-meta").textContent =
    "Manifesto · entry " + ((day % MANIFESTOS.length) + 1) + " of " + MANIFESTOS.length;

  // ── Manifesto open/close ──
  const dialog = document.getElementById("manifesto");
  const openBtn = document.getElementById("manifesto-btn");
  const closeBtn = document.getElementById("manifesto-close");
  function setOpen(o) {
    dialog.classList.toggle("open", o);
    dialog.setAttribute("aria-hidden", o ? "false" : "true");
    if (o) closeBtn.focus(); else openBtn.focus();
  }
  openBtn.addEventListener("click", () => setOpen(true));
  closeBtn.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  // ── Search bar — mirrors AddressBar.tsx normalizeUrl ──
  function normalizeUrl(input) {
    const trimmed = input.trim();
    if (!trimmed) return "";
    if (/^[a-z][a-z0-9+\\-.]*:\\/\\//i.test(trimmed)) return trimmed;
    if (/^[\\w-]+(\\.[\\w-]+)+(\\/.*)?$/.test(trimmed)) return "https://" + trimmed;
    return "https://www.google.com/search?q=" + encodeURIComponent(trimmed);
  }
  document.getElementById("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = document.getElementById("search-input").value;
    const url = normalizeUrl(v);
    if (url) window.location.href = url;
  });
  // Autofocus the search bar — primary affordance on a new tab.
  setTimeout(() => document.getElementById("search-input").focus(), 30);

  // ── Docs link → opens GitHub repo until a docs site exists ──
  document.getElementById("docs-link").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "https://github.com/Delta-Practice";
  });

  // ── Privacy chip — only shows when there's something to show ──
  // The count is server-injected (templated into the page at protocol-
  // handler time). Click navigates to delta://settings, which the main
  // process intercepts and converts into the menu:openSettings IPC.
  const _stats7d = __STATS_7D__;
  if (_stats7d > 0) {
    const chip = document.getElementById("privacy-chip");
    document.getElementById("privacy-num").textContent = _stats7d.toLocaleString();
    chip.hidden = false;
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "delta://settings/privacy";
    });
  }
</script>
</body>
</html>`
