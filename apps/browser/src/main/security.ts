// Connection-layer privacy hardening. Sits alongside the tracker
// blocker — same Session, separate concerns:
//
//   • HTTPS-only upgrade — rewrite top-level http:// navigations to
//     https:// before they leave the device. Per-host bypass when the
//     site genuinely can't speak TLS (legacy intranet, localhost, etc).
//   • Strict referrer policy — strip the path + query from outgoing
//     Referer headers on cross-origin requests. Same policy Firefox /
//     Brave default to: strict-origin-when-cross-origin.
//   • DNS-over-HTTPS — Chromium-level. Applied via
//     app.configureHostResolver before any session is touched.
//
// All three are toggleable in Settings → Security. Each one is a single
// boolean; the live state is read from a small module-local store that
// main/index.ts syncs from SettingsStore.

import { app, session, type BeforeSendResponse, type OnBeforeRequestListenerDetails, type OnBeforeSendHeadersListenerDetails, type Session } from "electron"

// ── Live config (kept in module scope, refreshed by setters) ──────────
const state = {
  httpsOnly: false,
  httpsOnlyBypass: new Set<string>(),
  strictReferrer: false,
}

export function setHttpsOnly(on: boolean): void {
  state.httpsOnly = on
}
export function setHttpsOnlyBypass(hosts: readonly string[]): void {
  state.httpsOnlyBypass = new Set(hosts.map((h) => h.toLowerCase()))
}
export function setStrictReferrer(on: boolean): void {
  state.strictReferrer = on
}

function matchesBypass(host: string): boolean {
  const h = host.toLowerCase()
  if (state.httpsOnlyBypass.has(h)) return true
  // Suffix match so a bypass on `example.com` covers `api.example.com`.
  let dot = h.indexOf(".")
  while (dot !== -1) {
    if (state.httpsOnlyBypass.has(h.slice(dot + 1))) return true
    dot = h.indexOf(".", dot + 1)
  }
  return false
}

// ── HTTPS-only ───────────────────────────────────────────────────────
// We use the webRequest.onBeforeRequest API and return a redirect URL
// for any top-level navigation that came in as http://. Sub-resources
// inherit the page's mixed-content rules (Chromium blocks/restricts
// most http sub-resources automatically when the top frame is https).
//
// localhost / 127.0.0.1 / *.local / IP literals are always allowed
// over plain http — these are dev / homelab / LAN paths that often
// don't have valid TLS and shouldn't be forced.
function isLocalhostLike(host: string): boolean {
  if (!host) return true
  if (host === "localhost" || host.endsWith(".localhost")) return true
  if (host === "127.0.0.1" || host === "::1") return true
  if (host.endsWith(".local")) return true
  // IPv4 in private ranges. Cheap regex — not perfect but enough.
  if (/^10\./.test(host)) return true
  if (/^192\.168\./.test(host)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true
  return false
}

function maybeUpgrade(details: OnBeforeRequestListenerDetails): { redirectURL?: string } | undefined {
  if (!state.httpsOnly) return undefined
  if (details.resourceType !== "mainFrame") return undefined
  if (!details.url.startsWith("http://")) return undefined
  let u: URL
  try { u = new URL(details.url) } catch { return undefined }
  if (isLocalhostLike(u.hostname)) return undefined
  if (matchesBypass(u.hostname)) return undefined
  u.protocol = "https:"
  return { redirectURL: u.toString() }
}

// ── Strict referrer policy ───────────────────────────────────────────
// Strategy: strict-origin-when-cross-origin. Same-origin requests keep
// the full Referer; cross-origin requests get just the scheme+host
// (no path, no query). This is what Firefox + Brave do by default.
//
// We use onBeforeSendHeaders to intercept and rewrite — Electron also
// exposes setReferrerPolicy at the renderer level but doing it at the
// request layer covers fetch/XHR/img/script equally without renderer
// cooperation.
function rewriteReferrer(details: OnBeforeSendHeadersListenerDetails): BeforeSendResponse {
  if (!state.strictReferrer) return { requestHeaders: details.requestHeaders }
  const headers = { ...details.requestHeaders }
  // Header names from Chromium can vary in case. Find any case-variant
  // of "Referer" and rewrite it consistently.
  const refKey = Object.keys(headers).find((k) => k.toLowerCase() === "referer")
  if (!refKey) return { requestHeaders: headers }
  const ref = headers[refKey]
  if (!ref) return { requestHeaders: headers }

  try {
    const refUrl = new URL(ref)
    const target = new URL(details.url)
    if (refUrl.origin === target.origin) {
      return { requestHeaders: headers }   // same-origin, keep as-is
    }
    headers[refKey] = refUrl.origin + "/"  // cross-origin, strip path+query
    return { requestHeaders: headers }
  } catch {
    // Malformed Referer or target — drop the header entirely rather than
    // leaking something unparsable.
    delete headers[refKey]
    return { requestHeaders: headers }
  }
}

// ── DNS-over-HTTPS ──────────────────────────────────────────────────
// Wired up at app startup BEFORE any session is opened, so the very
// first lookup goes through the secure resolver. Changes after launch
// take effect on the next launch — Chromium doesn't expose a hot-swap.
const DOH_SERVERS = {
  cloudflare: "https://cloudflare-dns.com/dns-query{?dns}",
  quad9:      "https://dns.quad9.net/dns-query{?dns}",
  google:     "https://dns.google/dns-query{?dns}",
} as const

export function configureDoH(opts: { enabled: boolean; provider: "cloudflare" | "quad9" | "google" }): void {
  // configureHostResolver is documented from Electron 22+; types may
  // lag. The cast keeps the call site clean if the signature shifts.
  const ca = app as unknown as {
    configureHostResolver: (config: {
      secureDnsMode: "off" | "automatic" | "secure"
      secureDnsServers?: string[]
    }) => void
  }
  if (!opts.enabled) {
    ca.configureHostResolver({ secureDnsMode: "off" })
    return
  }
  ca.configureHostResolver({
    secureDnsMode: "secure",
    secureDnsServers: [DOH_SERVERS[opts.provider]],
  })
}

// ── Bind to a session ───────────────────────────────────────────────
// Called once at startup from main/index.ts. The same listener is
// shared with TrackerBlocker — webRequest.onBeforeRequest only accepts
// one listener per session, so we wrap both behaviours here when the
// session is the default. For now the blocker owns onBeforeRequest;
// we attach a second pass via filter + redirect at a different stage.
//
// Concretely: we attach our maybeUpgrade to a separate listener slot
// using session.webRequest.onBeforeRequest with a URL filter that
// catches only `http://*`. Electron lets us coexist via the urls
// filter — once a listener is registered, calling onBeforeRequest
// again replaces it. So instead, we expose `applyHttpsUpgrade` as a
// helper TrackerBlocker calls first inside its own listener.
export function applyHttpsUpgrade(details: OnBeforeRequestListenerDetails): { redirectURL?: string } | null {
  const r = maybeUpgrade(details)
  return r?.redirectURL ? { redirectURL: r.redirectURL } : null
}

export function bindReferrerPolicy(sess: Session = session.defaultSession): void {
  sess.webRequest.onBeforeSendHeaders((details, callback) => {
    callback(rewriteReferrer(details))
  })
}
