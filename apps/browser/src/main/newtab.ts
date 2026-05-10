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
import { buildBgResponse, pickRandomImage } from "./newtab-bg"

type ReportGetter = () => PrivacyReport | null
type BgGetter = () => { mode: "procedural" | "photographic"; folder: string | null }

export function registerNewtabProtocol(
  getReport: ReportGetter = () => null,
  getBg: BgGetter = () => ({ mode: "procedural", folder: null }),
): void {
  protocol.handle("delta", (req) => {
    const url = new URL(req.url)
    const host = url.hostname || "newtab"

    // ── delta://newtab-bg/<encoded-abs-path> ───────────────
    // Serves a single image file for the photographic background. Path
    // traversal is enforced inside buildBgResponse — only files within
    // the user-picked folder are returned.
    if (host === "newtab-bg") {
      try {
        // We hand the photo path back in url.pathname (skip leading /).
        const decoded = decodeURIComponent(url.pathname.slice(1))
        return buildBgResponse(decoded, getBg().folder)
      } catch {
        return new Response("Bad path", { status: 400 })
      }
    }

    // ── delta://newtab ─────────────────────────────────────
    if (host === "newtab") {
      const report = getReport()
      const stats7d = report ? sumLastNDays(report.dailyCounts, 7) : 0
      const bg = getBg()
      // Pick an image at request time. If photographic mode is on but the
      // folder is empty/missing, we fall back to procedural — `bgUrl` is
      // empty and the body class stays "bg-procedural".
      let bgUrl = ""
      let bgClass = "bg-procedural"
      if (bg.mode === "photographic" && bg.folder) {
        const pick = pickRandomImage(bg.folder)
        if (pick) {
          bgUrl = "delta://newtab-bg/" + encodeURIComponent(pick)
          bgClass = "bg-photographic"
        }
      }
      const html = HTML
        .replace(/__STATS_7D__/g, String(stats7d))
        .replace(/__BG_URL__/g, bgUrl)
        .replace(/__BG_CLASS__/g, bgClass)
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

// Sky palettes — hand-tuned for cohesion. Inspired by the moodboards
// you find on Pinterest "calm desktop" / "Studio Ghibli sky" boards and
// the most-saved Unsplash nature shots: cotton candy dawns, Mojave dusks,
// Ghibli noons, foggy mountains, aurora nights.
//   `dark`   → enables stars + city lights + (rarely) a shooting star
//   `aurora` → enables the green/purple aurora wisps
//   `haze`   → CSS color used for the mid-altitude haze layer
type Palette = {
  name: string
  a: string; b: string; c: string
  sun: string
  horizon: string
  haze: string
  dark?: boolean
  aurora?: boolean
}
const PALETTES: Palette[] = [
  // Dawn — pale lavender → peach
  { name: "dawn",         a: "#1d2540", b: "#5a6e9a", c: "#f4c79a", sun: "#ffd9a8", horizon: "#0e1422", haze: "rgba(255,225,200,0.20)" },
  // Cotton candy — pastel pink/purple/cream (Pinterest-core)
  { name: "cottoncandy",  a: "#2a1f3a", b: "#d8a0c8", c: "#fce4d4", sun: "#ffd6e0", horizon: "#1a1024", haze: "rgba(255,210,225,0.22)" },
  // Ghibli noon — deep cyan with cream clouds
  { name: "ghibli",       a: "#1f4e8a", b: "#6cb4e0", c: "#f6f3e3", sun: "#fff7c4", horizon: "#0f2c50", haze: "rgba(255,255,255,0.18)" },
  // Mojito morning — mint green + cream
  { name: "mojito",       a: "#1f4536", b: "#7fc7a4", c: "#eef5e3", sun: "#fff5b8", horizon: "#0f2418", haze: "rgba(220,255,230,0.20)" },
  // Golden hour — purple → coral → amber
  { name: "goldenhour",   a: "#3a2a52", b: "#c95f5a", c: "#f4a261", sun: "#ffd58a", horizon: "#1c1428", haze: "rgba(255,180,140,0.22)" },
  // Mojave dusk — burnt orange + teal (Pinterest desert vibe)
  { name: "mojave",       a: "#1a3540", b: "#c46a3a", c: "#f4d3a4", sun: "#ffc080", horizon: "#0f2028", haze: "rgba(255,170,100,0.22)" },
  // Pink dusk — mauve to soft rose
  { name: "pinkdusk",     a: "#2a1c3a", b: "#a06a9b", c: "#f0c0c4", sun: "#ffc6c6", horizon: "#150e1e", haze: "rgba(240,180,200,0.20)" },
  // Foggy mountain — slate greys + pale yellow
  { name: "foggy",        a: "#3b3f4a", b: "#7a8190", c: "#b9bfca", sun: "#e9eaee", horizon: "#1f2127", haze: "rgba(255,255,255,0.30)" },
  // Stormy — deep blue-grey
  { name: "stormy",       a: "#1a2230", b: "#3e5470", c: "#7f95b3", sun: "#cdd9e8", horizon: "#0b0f17", haze: "rgba(180,200,220,0.18)", dark: true },
  // Midnight — deep navy with starlight
  { name: "midnight",     a: "#0b0e1c", b: "#1d2545", c: "#3c4a78", sun: "#aab8e3", horizon: "#05070d", haze: "rgba(80,120,180,0.10)", dark: true },
  // Aurora — deep night with green/purple wisps overlaid
  { name: "aurora",       a: "#040814", b: "#0e1a3a", c: "#1f2a52", sun: "#9ec3ff", horizon: "#020410", haze: "rgba(120,200,180,0.12)", dark: true, aurora: true },
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
    /* "Breathing" — the gradient stops shift by ~3% over a 24s loop, so
       the sky feels alive without distracting. Slow enough that the eye
       doesn't track it; fast enough that you notice within ~10s. */
    animation: skyBreath 24s ease-in-out infinite alternate;
  }
  @keyframes skyBreath {
    0%   { background-position: 0% 0%, 0% 0%; filter: brightness(1.00) saturate(1.00); }
    100% { background-position: 0% 3%, 0% 0%; filter: brightness(1.04) saturate(1.06); }
  }
  /* Sun shimmer — a separate radial that pulses on top of the sky's
     baked-in sun. Subtle: opacity 0.35 → 0.55 over 6s. */
  .sun-shimmer {
    position: absolute; inset: 0;
    background: radial-gradient(circle at var(--sun-x, 70%) var(--sun-y, 22%),
      var(--sun, #fff) 0%, transparent 22%);
    mix-blend-mode: screen;
    opacity: 0.35;
    pointer-events: none;
    animation: sunPulse 6s ease-in-out infinite alternate;
  }
  @keyframes sunPulse {
    0%   { opacity: 0.32; transform: scale(1.00); }
    100% { opacity: 0.58; transform: scale(1.06); }
  }
  /* ── drifting clouds ────────────────────────────────── */
  /* Three layers — wispy cirrus (highest), tufted altocumulus (middle),
     puffy cumulus (low). Each is a cluster of overlapping ellipses run
     through a Gaussian blur filter so the edges read soft + organic
     instead of geometric. Layers move at different speeds for parallax. */
  .clouds {
    position: absolute; inset: 0;
    pointer-events: none;
    overflow: hidden;
    mix-blend-mode: screen;
  }
  .cloud-layer {
    position: absolute;
    left: -50%;
    width: 200%;
    background-repeat: repeat-x;
    background-size: contain;
    will-change: transform;
  }
  /* Cirrus — highest layer, wispy and almost transparent. */
  .cloud-far {
    top: 8%; height: 14%;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 140'><defs><filter id='b1' x='-10%25' y='-10%25' width='120%25' height='120%25'><feGaussianBlur stdDeviation='3.5'/></filter></defs><g fill='white' fill-opacity='0.5' filter='url(%23b1)'><ellipse cx='80' cy='70' rx='95' ry='5'/><ellipse cx='160' cy='75' rx='110' ry='4'/><ellipse cx='270' cy='68' rx='80' ry='3.5'/><ellipse cx='420' cy='72' rx='130' ry='5'/><ellipse cx='540' cy='66' rx='100' ry='4'/><ellipse cx='720' cy='74' rx='150' ry='5'/><ellipse cx='870' cy='70' rx='90' ry='4'/></g></svg>");
    animation: drift 220s linear infinite;
    opacity: 0.7;
  }
  /* Altocumulus — middle layer, soft tufts. */
  .cloud-mid {
    top: 18%; height: 22%;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 220'><defs><filter id='b2' x='-10%25' y='-10%25' width='120%25' height='120%25'><feGaussianBlur stdDeviation='5'/></filter></defs><g fill='white' fill-opacity='0.8' filter='url(%23b2)'><ellipse cx='90' cy='130' rx='55' ry='28'/><ellipse cx='140' cy='115' rx='60' ry='30'/><ellipse cx='195' cy='128' rx='50' ry='24'/><ellipse cx='150' cy='148' rx='90' ry='12'/><ellipse cx='420' cy='110' rx='65' ry='32'/><ellipse cx='480' cy='100' rx='75' ry='38'/><ellipse cx='550' cy='115' rx='60' ry='30'/><ellipse cx='480' cy='140' rx='110' ry='14'/><ellipse cx='760' cy='125' rx='58' ry='28'/><ellipse cx='820' cy='115' rx='68' ry='32'/><ellipse cx='880' cy='128' rx='55' ry='26'/><ellipse cx='820' cy='148' rx='100' ry='12'/></g></svg>");
    animation: drift 140s linear infinite;
    opacity: 0.85;
  }
  /* Cumulus — lowest layer, big puffy shapes with flat bases. */
  .cloud-near {
    top: 30%; height: 28%;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 280'><defs><filter id='b3' x='-10%25' y='-10%25' width='120%25' height='120%25'><feGaussianBlur stdDeviation='8'/></filter></defs><g fill='white' fill-opacity='0.95' filter='url(%23b3)'><ellipse cx='110' cy='150' rx='75' ry='42'/><ellipse cx='180' cy='130' rx='90' ry='52'/><ellipse cx='260' cy='145' rx='80' ry='45'/><ellipse cx='320' cy='160' rx='65' ry='35'/><ellipse cx='200' cy='185' rx='160' ry='18'/><ellipse cx='560' cy='155' rx='85' ry='48'/><ellipse cx='650' cy='135' rx='100' ry='58'/><ellipse cx='740' cy='150' rx='90' ry='50'/><ellipse cx='820' cy='165' rx='70' ry='38'/><ellipse cx='670' cy='195' rx='180' ry='20'/></g></svg>");
    animation: drift 90s linear infinite;
    opacity: 0.8;
  }
  @keyframes drift {
    0%   { transform: translateX(0); }
    100% { transform: translateX(50%); }
  }
  /* ── sun god-rays ───────────────────────────────────── */
  /* Conic gradient from the sun position with narrow wedge stops, masked
     to fade out radially. Slowly rotates so the rays look like light
     scattering through atmosphere. Only visible when the sun is in the
     visible part of the sky (controlled by --rays-opacity). */
  .sun-rays {
    position: absolute; inset: 0;
    pointer-events: none;
    background: conic-gradient(
      from 0deg at var(--sun-x, 70%) var(--sun-y, 22%),
      transparent 0deg, var(--sun, #fff) 4deg, transparent 12deg,
      transparent 32deg, var(--sun, #fff) 36deg, transparent 44deg,
      transparent 70deg, var(--sun, #fff) 74deg, transparent 82deg,
      transparent 110deg, var(--sun, #fff) 114deg, transparent 122deg,
      transparent 150deg, var(--sun, #fff) 154deg, transparent 162deg,
      transparent 195deg, var(--sun, #fff) 199deg, transparent 207deg,
      transparent 240deg, var(--sun, #fff) 244deg, transparent 252deg,
      transparent 285deg, var(--sun, #fff) 289deg, transparent 297deg,
      transparent 330deg, var(--sun, #fff) 334deg, transparent 342deg,
      transparent 360deg
    );
    -webkit-mask: radial-gradient(circle at var(--sun-x, 70%) var(--sun-y, 22%), black 0%, transparent 45%);
            mask: radial-gradient(circle at var(--sun-x, 70%) var(--sun-y, 22%), black 0%, transparent 45%);
    mix-blend-mode: screen;
    opacity: var(--rays-opacity, 0.18);
    animation: rotateSlow 180s linear infinite;
  }
  @keyframes rotateSlow {
    0%   { filter: hue-rotate(0deg); transform: rotate(0deg); transform-origin: var(--sun-x, 70%) var(--sun-y, 22%); }
    100% { filter: hue-rotate(0deg); transform: rotate(360deg); transform-origin: var(--sun-x, 70%) var(--sun-y, 22%); }
  }
  /* ── starfield (only shown on dark palettes) ────────── */
  .stars {
    position: absolute; inset: 0;
    pointer-events: none;
    display: none;
  }
  body.stars-on .stars { display: block; }
  .stars circle {
    fill: white;
    transform-origin: center;
    animation: twinkle var(--twinkle-dur, 3s) ease-in-out var(--twinkle-delay, 0s) infinite alternate;
  }
  @keyframes twinkle {
    0%   { opacity: 0.18; }
    100% { opacity: 0.95; }
  }
  /* ── flying bird (rare, charming detail) ────────────── */
  .bird {
    position: absolute;
    top: 22%;
    width: 22px; height: 14px;
    pointer-events: none;
    opacity: 0;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 22 14'><path d='M1 9 Q5 2 11 7 Q17 2 21 9' stroke='%23000' stroke-width='1.2' fill='none' stroke-linecap='round' stroke-linejoin='round' opacity='0.55'/></svg>");
    background-repeat: no-repeat; background-size: contain;
    animation: birdFly 70s linear infinite;
    animation-delay: var(--bird-delay, -20s);
  }
  @keyframes birdFly {
    0%   { transform: translate(-5vw, 0); opacity: 0; }
    4%   { opacity: 0.55; }
    50%  { transform: translate(50vw, 6vh); opacity: 0.55; }
    96%  { opacity: 0; }
    100% { transform: translate(110vw, 12vh); opacity: 0; }
  }
  /* ── atmospheric haze (mountain depth) ──────────────── */
  /* A horizontal band of haze that sits between the far ridge and the
     mid ridge, fading the distant mountains into the sky for depth. */
  .haze {
    position: absolute; left: 0; right: 0;
    bottom: 28%; height: 18%;
    background: linear-gradient(180deg,
      transparent 0%,
      var(--haze-color, rgba(255,255,255,0.18)) 60%,
      transparent 100%);
    pointer-events: none;
    mix-blend-mode: overlay;
  }
  /* ── aurora (only on aurora palette) ────────────────── */
  /* Two soft curving bands of green-purple that gently translate +
     pulse opacity. SVG path filled with a vertical gradient, blurred,
     screen-blended over the sky. Hidden by default; body class flips
     it on. */
  .aurora {
    position: absolute; inset: 0;
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: 0;
    transition: opacity 1s ease;
  }
  body.aurora-on .aurora {
    opacity: 0.85;
    animation: auroraDrift 28s ease-in-out infinite alternate;
  }
  @keyframes auroraDrift {
    0%   { transform: translateY(0) scaleY(1.00); filter: blur(8px) hue-rotate(0deg); }
    100% { transform: translateY(-2%) scaleY(1.04); filter: blur(10px) hue-rotate(20deg); }
  }
  /* ── distant city lights (only on dark palettes) ────── */
  /* Tiny dots along the horizon — warm yellow, twinkle slowly. Hidden
     unless body has stars-on (re-using the dark-palette flag). */
  .citylights {
    position: absolute; left: 0; right: 0;
    bottom: 26%; height: 6px;
    pointer-events: none;
    display: none;
  }
  body.stars-on .citylights { display: block; }
  .citylights span {
    position: absolute; top: 0;
    width: 2px; height: 2px; border-radius: 50%;
    background: #ffd58a;
    box-shadow: 0 0 4px #ffd58a;
    opacity: 0.7;
    animation: twinkle var(--twinkle-dur, 4s) ease-in-out var(--twinkle-delay, 0s) infinite alternate;
  }
  /* ── shooting star (very rare, dark palettes only) ──── */
  .shootingstar {
    position: absolute;
    top: 12%; left: 0;
    width: 80px; height: 1px;
    pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent);
    opacity: 0;
    transform: rotate(-18deg);
    display: none;
  }
  body.stars-on .shootingstar {
    display: block;
    animation: shootStar 22s ease-out infinite;
    animation-delay: var(--shoot-delay, 8s);
  }
  @keyframes shootStar {
    0%, 5%   { transform: translate(0, 0) rotate(-18deg); opacity: 0; }
    6%       { opacity: 1; }
    11%      { transform: translate(70vw, 22vh) rotate(-18deg); opacity: 0; }
    100%     { transform: translate(70vw, 22vh) rotate(-18deg); opacity: 0; }
  }
  /* When the user prefers reduced motion, hold everything still. */
  @media (prefers-reduced-motion: reduce) {
    .sky, .sun-shimmer, .cloud-far, .cloud-mid, .cloud-near, .photo { animation: none !important; }
  }
  /* ── photographic background ────────────────────────── */
  /* When body has class .bg-photographic, the .photo layer is shown and
     the procedural sky + clouds + horizon are hidden. The photo gets a
     slow Ken-Burns-style scale to add motion without re-fetching. */
  .photo {
    position: absolute; inset: 0;
    background-image: var(--photo-url, none);
    background-size: cover;
    background-position: center;
    display: none;
    transform-origin: center;
    animation: kenburns 60s ease-in-out infinite alternate;
  }
  @keyframes kenburns {
    0%   { transform: scale(1.00) translate(0, 0); }
    100% { transform: scale(1.08) translate(-1%, 1%); }
  }
  /* Darkening overlay so the wordmark + search remain legible on bright
     photos. Tuned for a slightly higher contrast than the procedural sky. */
  .photo-veil {
    position: absolute; inset: 0;
    background:
      linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 35%, rgba(0,0,0,0.55) 100%);
    display: none;
    pointer-events: none;
  }
  body.bg-photographic .sky,
  body.bg-photographic .sun-shimmer,
  body.bg-photographic .clouds,
  body.bg-photographic .horizon { display: none; }
  body.bg-photographic .photo,
  body.bg-photographic .photo-veil { display: block; }
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
<body class="__BG_CLASS__" style="--photo-url: url('__BG_URL__');">
<main>
  <div class="frame" id="frame">
    <!-- Procedural sky stack (hidden when body.bg-photographic). -->
    <div class="sky" id="sky"></div>
    <!-- Aurora wisps for the night-aurora palette (hidden by default). -->
    <svg class="aurora" id="aurora" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="aur1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stop-color="rgba(120,255,170,0)"/>
          <stop offset="50%" stop-color="rgba(120,255,170,0.55)"/>
          <stop offset="100%" stop-color="rgba(180,140,255,0)"/>
        </linearGradient>
        <linearGradient id="aur2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stop-color="rgba(180,140,255,0)"/>
          <stop offset="55%" stop-color="rgba(180,140,255,0.45)"/>
          <stop offset="100%" stop-color="rgba(120,255,170,0)"/>
        </linearGradient>
      </defs>
      <path d="M-100 220 Q300 60 600 280 T1100 240 L1100 0 L-100 0 Z" fill="url(#aur1)"/>
      <path d="M-100 320 Q400 180 700 360 T1200 320 L1200 0 L-100 0 Z" fill="url(#aur2)"/>
    </svg>
    <!-- Sun rays (rotating). Opacity controlled by --rays-opacity (0 at night). -->
    <div class="sun-rays" id="sun-rays" aria-hidden="true"></div>
    <div class="sun-shimmer" id="sun-shimmer"></div>
    <!-- Starfield (only painted when body has class stars-on). -->
    <svg class="stars" id="stars" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"></svg>
    <!-- Distant city lights at the horizon (only on dark palettes). -->
    <div class="citylights" id="citylights" aria-hidden="true"></div>
    <!-- Rare shooting star (dark palettes only). -->
    <div class="shootingstar" aria-hidden="true"></div>
    <div class="clouds" aria-hidden="true">
      <div class="cloud-layer cloud-far"></div>
      <div class="cloud-layer cloud-mid"></div>
      <div class="cloud-layer cloud-near"></div>
    </div>
    <!-- Atmospheric haze band — fades distant ridges into the sky. -->
    <div class="haze" aria-hidden="true"></div>
    <!-- Charm: a tiny bird silhouette occasionally crosses. -->
    <div class="bird" id="bird" aria-hidden="true"></div>
    <div class="horizon">
      <svg viewBox="0 0 1200 400" preserveAspectRatio="none" id="horizon-svg"></svg>
    </div>
    <!-- Photographic stack (hidden when body.bg-procedural). The image
         path is server-injected at protocol-handler time so the photo
         paints on first frame, no IPC. -->
    <div class="photo" aria-hidden="true"></div>
    <div class="photo-veil" aria-hidden="true"></div>
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
  // Day-of-year so the horizon ridge stays stable within a day (re-rolling
  // the mountains every tab is too busy). The sky palette, on the other
  // hand, re-rolls per-session so opening a new tab actually feels new.
  function dayIndex(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }
  const day = dayIndex(now);

  // ── Sky palette: random per session ────────────────────────
  // Use Math.random so each new-tab open picks a fresh sky. The horizon
  // (mountains) still uses the daily seed so the *shape* feels consistent
  // through the day — only the colour changes.
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
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
  // Several layers read --sun-* from their own elements (CSS doesn't
  // inherit sibling-set custom props), so propagate explicitly.
  function setSunVars(el) {
    if (!el) return;
    el.style.setProperty("--sun", palette.sun);
    el.style.setProperty("--sun-x", sunX + "%");
    el.style.setProperty("--sun-y", sunY + "%");
  }
  setSunVars(document.getElementById("sun-shimmer"));
  // Sun rays opacity tracks the day arc — fades to 0 at night so dark
  // palettes don't get a phantom rotating glow on top of the stars.
  const raysEl = document.getElementById("sun-rays");
  if (raysEl) {
    setSunVars(raysEl);
    const rayOpacity = palette.dark ? 0 : (0.10 + 0.18 * Math.sin(arc * Math.PI));
    raysEl.style.setProperty("--rays-opacity", rayOpacity.toFixed(3));
  }
  document.querySelector(".horizon").style.setProperty("--horizon", palette.horizon);
  // Haze color from the palette (mountain depth band).
  const haze = document.querySelector(".haze");
  if (haze) haze.style.setProperty("--haze-color", palette.haze);

  // Body class flags drive the conditional layers (stars, aurora, city
  // lights, shooting star). Cleaner than per-layer JS toggling.
  if (palette.dark)   document.body.classList.add("stars-on");
  if (palette.aurora) document.body.classList.add("aurora-on");

  // ── Starfield: ~80 random dots in the upper 60% of the viewport ──
  if (palette.dark) {
    const starsSvg = document.getElementById("stars");
    const r = seedRand(day * 31 + 17);
    const STAR_COUNT = 90;
    let starsHtml = "";
    for (let i = 0; i < STAR_COUNT; i++) {
      const x  = (r() * 100).toFixed(2);
      const y  = (r() * 60).toFixed(2);
      const sz = (0.10 + r() * 0.32).toFixed(2);
      const dur   = (1.5 + r() * 3.0).toFixed(2);
      const delay = (r() * 4).toFixed(2);
      starsHtml += '<circle cx="' + x + '" cy="' + y + '" r="' + sz + '" style="--twinkle-dur:' + dur + 's;--twinkle-delay:' + delay + 's"/>';
    }
    starsSvg.innerHTML = starsHtml;

    // City lights along the horizon — ~24 warm dots spaced unevenly.
    const cityEl = document.getElementById("citylights");
    let cityHtml = "";
    for (let i = 0; i < 28; i++) {
      const x   = (r() * 100).toFixed(2);
      const dur = (3 + r() * 3).toFixed(2);
      const dly = (r() * 2).toFixed(2);
      cityHtml += '<span style="left:' + x + '%;--twinkle-dur:' + dur + 's;--twinkle-delay:' + dly + 's"></span>';
    }
    cityEl.innerHTML = cityHtml;
  }

  // ── Bird: random per-session delay so the bird shows up at unpredictable
  //    moments. ~40% of the time the bird is mid-flight when you open the
  //    tab, ~60% it'll cross within the next 70s. Charming, not noisy.
  const birdEl = document.getElementById("bird");
  if (birdEl) {
    birdEl.style.setProperty("--bird-delay", (-Math.random() * 70).toFixed(1) + "s");
  }

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
