// URL safety classifier — pure function. Decides which badge to surface in
// the address bar based on the host's TLD/SLD. The categories are coarse on
// purpose: badges are a hint, not a guarantee, and the user still has the
// final read on context.
//
// Future: fold in a curated unsafe-host list (deceptive / phishing) sourced
// at build time. Threat-list *fetching* would belong in main, not here.

export type SafetyKind =
  | "government"
  | "education"
  | "nonprofit"
  | "internal"     // delta:// pages
  | "unsafe"
  | "general"

export type Safety = {
  kind: SafetyKind
  label: string   // short, uppercase, fits in a chip (≤4 chars ideal)
  hint: string    // tooltip text
}

// Suffix patterns matched against the trailing hostname segments. Order
// doesn't matter — we test all and prefer the most specific.
const GOV_SUFFIXES = [
  "gov", "mil",
  "gov.uk", "gov.au", "gov.in", "gov.sg", "gov.za", "gov.br", "gov.ie", "gov.nz", "gov.za",
  "gc.ca", "gouv.fr", "go.jp", "go.kr", "go.id", "go.th",
  "europa.eu",
]
const EDU_SUFFIXES = [
  "edu", "edu.au", "edu.in", "edu.sg", "edu.cn", "edu.hk", "edu.tw", "edu.br",
  "ac.uk", "ac.in", "ac.jp", "ac.kr", "ac.nz", "ac.za", "ac.il",
]

// .org is too broad to badge as nonprofit — most are commercial. We badge
// only well-known ones; everything else is `general`.
const NONPROFIT_HOSTS = new Set([
  "wikipedia.org", "wikimedia.org", "mozilla.org", "archive.org",
  "eff.org", "creativecommons.org", "aclu.org", "redcross.org",
  "doctorswithoutborders.org", "amnesty.org", "savethechildren.org",
])

// Tiny stub of obviously-malicious patterns. In production this would come
// from a maintained source (Google Safe Browsing list, etc.) refreshed in
// main. Keeping it short here so we don't ship false-positives by accident.
const UNSAFE_PATTERNS: RegExp[] = [
  /\bphishing\b/i,
  /\bmalware-test\b/i,
]

function hostnameOf(url: string): string | null {
  try {
    const u = new URL(url)
    return u.hostname.toLowerCase()
  } catch {
    return null
  }
}

function endsWithSuffix(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith("." + suffix)
}

function rootDomain(host: string): string {
  // Best-effort root: last 2 segments. Good enough for our nonprofit set.
  const parts = host.split(".")
  return parts.length >= 2 ? parts.slice(-2).join(".") : host
}

export function classifyUrl(url: string | null | undefined): Safety {
  if (!url) return GENERAL
  if (url.startsWith("delta:")) return INTERNAL
  if (UNSAFE_PATTERNS.some((re) => re.test(url))) return UNSAFE

  const host = hostnameOf(url)
  if (!host) return GENERAL

  for (const s of GOV_SUFFIXES) {
    if (endsWithSuffix(host, s)) return GOVERNMENT
  }
  for (const s of EDU_SUFFIXES) {
    if (endsWithSuffix(host, s)) return EDUCATION
  }
  if (NONPROFIT_HOSTS.has(rootDomain(host))) return NONPROFIT

  return GENERAL
}

const GOVERNMENT: Safety = { kind: "government", label: "GOV",   hint: "Government website. Treat with the same caution as any official document." }
const EDUCATION:  Safety = { kind: "education",  label: "EDU",   hint: "Educational institution." }
const NONPROFIT:  Safety = { kind: "nonprofit",  label: "ORG",   hint: "Verified non-profit organisation." }
const INTERNAL:   Safety = { kind: "internal",   label: "DELTA", hint: "Internal Delta page." }
const UNSAFE:     Safety = { kind: "unsafe",     label: "BLOCK", hint: "This URL matches a known unsafe pattern. Do not enter credentials." }
const GENERAL:    Safety = { kind: "general",    label: "WEB",   hint: "General website. Standard caution applies." }
