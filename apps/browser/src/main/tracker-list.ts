// Curated list of well-known tracker domains, grouped by owning company.
//
// This is a starting set — ~200 high-traffic trackers across analytics, ads,
// session replay, A/B testing, tag managers, and social. It is NOT a hosts-
// file. Coverage will improve as users report sites where tracking still
// gets through.
//
// Sourcing: synthesised from the well-known top of DuckDuckGo's Tracker
// Radar and EasyPrivacy. We do not redistribute either list verbatim — the
// entries below are domains that are both widely-deployed and unambiguously
// classified as analytics/advertising trackers.
//
// Matching is host-suffix: `www.google-analytics.com` matches the entry
// `google-analytics.com`. Be conservative — never list a domain that also
// serves first-party CDN content (e.g. amazonaws.com, akamaihd.net).

export type TrackerEntry = {
  domain: string
  owner: string
  category: "analytics" | "ads" | "session-replay" | "tag-manager" | "social" | "ab-testing" | "fingerprint"
}

export const TRACKERS: readonly TrackerEntry[] = [
  // ── Google ──────────────────────────────────────────
  { domain: "google-analytics.com",        owner: "Google", category: "analytics" },
  { domain: "googletagmanager.com",        owner: "Google", category: "tag-manager" },
  { domain: "googletagservices.com",       owner: "Google", category: "ads" },
  { domain: "googlesyndication.com",       owner: "Google", category: "ads" },
  { domain: "googleadservices.com",        owner: "Google", category: "ads" },
  { domain: "doubleclick.net",             owner: "Google", category: "ads" },
  { domain: "adservice.google.com",        owner: "Google", category: "ads" },
  { domain: "google-analytics.l.google.com", owner: "Google", category: "analytics" },
  { domain: "stats.g.doubleclick.net",     owner: "Google", category: "analytics" },
  { domain: "ampproject.org",              owner: "Google", category: "analytics" },

  // ── Facebook / Meta ─────────────────────────────────
  { domain: "connect.facebook.net",        owner: "Meta", category: "social" },
  { domain: "facebook.com/tr",             owner: "Meta", category: "ads" },
  { domain: "an.facebook.com",             owner: "Meta", category: "ads" },
  { domain: "atdmt.com",                   owner: "Meta", category: "ads" },

  // ── Microsoft / Bing ────────────────────────────────
  { domain: "bat.bing.com",                owner: "Microsoft", category: "ads" },
  { domain: "clarity.ms",                  owner: "Microsoft", category: "session-replay" },
  { domain: "ads.microsoft.com",           owner: "Microsoft", category: "ads" },

  // ── Adobe ───────────────────────────────────────────
  { domain: "demdex.net",                  owner: "Adobe", category: "ads" },
  { domain: "everesttech.net",             owner: "Adobe", category: "ads" },
  { domain: "omtrdc.net",                  owner: "Adobe", category: "analytics" },
  { domain: "2o7.net",                     owner: "Adobe", category: "analytics" },
  { domain: "adobedtm.com",                owner: "Adobe", category: "tag-manager" },

  // ── Amazon (advertising/affiliate, NOT s3/cloudfront) ─
  { domain: "amazon-adsystem.com",         owner: "Amazon", category: "ads" },
  { domain: "assoc-amazon.com",            owner: "Amazon", category: "ads" },

  // ── X / Twitter ─────────────────────────────────────
  { domain: "ads-twitter.com",             owner: "X",       category: "ads" },
  { domain: "static.ads-twitter.com",      owner: "X",       category: "ads" },
  { domain: "analytics.twitter.com",       owner: "X",       category: "analytics" },
  { domain: "t.co",                        owner: "X",       category: "analytics" },

  // ── LinkedIn ────────────────────────────────────────
  { domain: "px.ads.linkedin.com",         owner: "LinkedIn", category: "ads" },
  { domain: "snap.licdn.com",              owner: "LinkedIn", category: "ads" },

  // ── TikTok ──────────────────────────────────────────
  { domain: "analytics.tiktok.com",        owner: "TikTok",  category: "analytics" },
  { domain: "ads.tiktok.com",              owner: "TikTok",  category: "ads" },
  { domain: "business-api.tiktok.com",     owner: "TikTok",  category: "ads" },

  // ── Pinterest / Reddit / Snap ───────────────────────
  { domain: "ct.pinterest.com",            owner: "Pinterest", category: "ads" },
  { domain: "events.redditmedia.com",      owner: "Reddit",    category: "analytics" },
  { domain: "redditstatic.com/ads",        owner: "Reddit",    category: "ads" },
  { domain: "sc-static.net",               owner: "Snap",      category: "ads" },

  // ── Independent analytics ───────────────────────────
  { domain: "mixpanel.com",                owner: "Mixpanel",       category: "analytics" },
  { domain: "api.mixpanel.com",            owner: "Mixpanel",       category: "analytics" },
  { domain: "segment.io",                  owner: "Segment",        category: "analytics" },
  { domain: "segment.com",                 owner: "Segment",        category: "analytics" },
  { domain: "api.segment.io",              owner: "Segment",        category: "analytics" },
  { domain: "amplitude.com",               owner: "Amplitude",      category: "analytics" },
  { domain: "api.amplitude.com",           owner: "Amplitude",      category: "analytics" },
  { domain: "api2.amplitude.com",          owner: "Amplitude",      category: "analytics" },
  { domain: "matomo.cloud",                owner: "Matomo",         category: "analytics" },
  { domain: "stats.wp.com",                owner: "Automattic",     category: "analytics" },
  { domain: "pixel.wp.com",                owner: "Automattic",     category: "analytics" },
  { domain: "quantserve.com",              owner: "Quantcast",      category: "analytics" },
  { domain: "scorecardresearch.com",       owner: "Comscore",       category: "analytics" },
  { domain: "chartbeat.com",               owner: "Chartbeat",      category: "analytics" },
  { domain: "static.chartbeat.com",        owner: "Chartbeat",      category: "analytics" },
  { domain: "parsely.com",                 owner: "Parse.ly",       category: "analytics" },
  { domain: "hubspot.com/__hs",            owner: "HubSpot",        category: "analytics" },
  { domain: "js.hs-analytics.net",         owner: "HubSpot",        category: "analytics" },
  { domain: "track.hubspot.com",           owner: "HubSpot",        category: "analytics" },

  // ── Session replay / heatmap ────────────────────────
  { domain: "hotjar.com",                  owner: "Hotjar",         category: "session-replay" },
  { domain: "static.hotjar.com",           owner: "Hotjar",         category: "session-replay" },
  { domain: "fullstory.com",               owner: "FullStory",      category: "session-replay" },
  { domain: "fs.fullstory.com",            owner: "FullStory",      category: "session-replay" },
  { domain: "rs.fullstory.com",            owner: "FullStory",      category: "session-replay" },
  { domain: "logrocket.com",               owner: "LogRocket",      category: "session-replay" },
  { domain: "cdn.logrocket.io",            owner: "LogRocket",      category: "session-replay" },
  { domain: "smartlook.com",               owner: "Smartlook",      category: "session-replay" },
  { domain: "rec.smartlook.com",           owner: "Smartlook",      category: "session-replay" },
  { domain: "mouseflow.com",               owner: "Mouseflow",      category: "session-replay" },
  { domain: "crazyegg.com",                owner: "Crazy Egg",      category: "session-replay" },
  { domain: "script.crazyegg.com",         owner: "Crazy Egg",      category: "session-replay" },
  { domain: "luckyorange.com",             owner: "Lucky Orange",   category: "session-replay" },
  { domain: "cs.luckyorange.net",          owner: "Lucky Orange",   category: "session-replay" },

  // ── A/B testing / personalisation ───────────────────
  { domain: "optimizely.com",              owner: "Optimizely", category: "ab-testing" },
  { domain: "cdn.optimizely.com",          owner: "Optimizely", category: "ab-testing" },
  { domain: "logx.optimizely.com",         owner: "Optimizely", category: "ab-testing" },
  { domain: "vwo.com",                     owner: "VWO",        category: "ab-testing" },
  { domain: "dev.visualwebsiteoptimizer.com", owner: "VWO",     category: "ab-testing" },
  { domain: "convertexperiments.com",      owner: "Convert",    category: "ab-testing" },
  { domain: "splitbee.io",                 owner: "Splitbee",   category: "analytics" },

  // ── Ad networks / SSPs / DSPs ───────────────────────
  { domain: "criteo.com",                  owner: "Criteo",       category: "ads" },
  { domain: "criteo.net",                  owner: "Criteo",       category: "ads" },
  { domain: "static.criteo.net",           owner: "Criteo",       category: "ads" },
  { domain: "taboola.com",                 owner: "Taboola",      category: "ads" },
  { domain: "cdn.taboola.com",             owner: "Taboola",      category: "ads" },
  { domain: "outbrain.com",                owner: "Outbrain",     category: "ads" },
  { domain: "amplify.outbrain.com",        owner: "Outbrain",     category: "ads" },
  { domain: "pubmatic.com",                owner: "PubMatic",     category: "ads" },
  { domain: "rubiconproject.com",          owner: "Magnite",      category: "ads" },
  { domain: "adnxs.com",                   owner: "Xandr",        category: "ads" },
  { domain: "openx.net",                   owner: "OpenX",        category: "ads" },
  { domain: "media.net",                   owner: "Media.net",    category: "ads" },
  { domain: "indexww.com",                 owner: "Index Exchange", category: "ads" },
  { domain: "casalemedia.com",             owner: "Index Exchange", category: "ads" },
  { domain: "smartadserver.com",           owner: "SmartAdserver", category: "ads" },
  { domain: "adform.net",                  owner: "Adform",       category: "ads" },
  { domain: "yieldmo.com",                 owner: "Yieldmo",      category: "ads" },
  { domain: "rlcdn.com",                   owner: "LiveRamp",     category: "ads" },
  { domain: "id5-sync.com",                owner: "ID5",          category: "ads" },
  { domain: "bluekai.com",                 owner: "Oracle",       category: "ads" },
  { domain: "agkn.com",                    owner: "Neustar",      category: "ads" },
  { domain: "nrelate.com",                 owner: "nRelate",      category: "ads" },

  // ── Tag / consent / DMP ─────────────────────────────
  { domain: "tealium.com",                 owner: "Tealium",  category: "tag-manager" },
  { domain: "tealiumiq.com",               owner: "Tealium",  category: "tag-manager" },
  { domain: "tags.tiqcdn.com",             owner: "Tealium",  category: "tag-manager" },
  { domain: "ensighten.com",               owner: "Ensighten", category: "tag-manager" },
  { domain: "krxd.net",                    owner: "Salesforce", category: "ads" },

  // ── Newsletter / marketing pixel ────────────────────
  { domain: "mailchimp.com/track",         owner: "Mailchimp", category: "analytics" },
  { domain: "list-manage.com",             owner: "Mailchimp", category: "analytics" },
  { domain: "klaviyo.com/track",           owner: "Klaviyo",   category: "analytics" },

  // ── Heap / PostHog / Heap-likes ─────────────────────
  { domain: "heap.io",                     owner: "Heap",     category: "analytics" },
  { domain: "heapanalytics.com",           owner: "Heap",     category: "analytics" },
  { domain: "cdn.heapanalytics.com",       owner: "Heap",     category: "analytics" },
  { domain: "app.posthog.com",             owner: "PostHog",  category: "analytics" },
  { domain: "us.i.posthog.com",            owner: "PostHog",  category: "analytics" },

  // ── Cross-domain identity / fingerprinting ──────────
  { domain: "fpjs.io",                     owner: "FingerprintJS", category: "fingerprint" },
  { domain: "api.fpjs.io",                 owner: "FingerprintJS", category: "fingerprint" },
  { domain: "iovation.com",                owner: "TransUnion",    category: "fingerprint" },
  { domain: "threatmetrix.com",            owner: "LexisNexis",    category: "fingerprint" },

  // ── Yahoo / Verizon ─────────────────────────────────
  { domain: "analytics.yahoo.com",         owner: "Yahoo", category: "analytics" },
  { domain: "ads.yahoo.com",               owner: "Yahoo", category: "ads" },

  // ── Yandex ──────────────────────────────────────────
  { domain: "mc.yandex.ru",                owner: "Yandex",  category: "analytics" },
  { domain: "yandex.ru/metrika",           owner: "Yandex",  category: "analytics" },
  { domain: "an.yandex.ru",                owner: "Yandex",  category: "ads" },

  // ── Newsletter / surveys / feedback ─────────────────
  { domain: "qualtrics.com",               owner: "Qualtrics",  category: "analytics" },
  { domain: "siteintercept.qualtrics.com", owner: "Qualtrics",  category: "analytics" },
  { domain: "static.zdassets.com",         owner: "Zendesk",    category: "analytics" },

  // ── Misc trackers commonly seen on news + e-commerce ─
  { domain: "permutive.com",               owner: "Permutive",   category: "ads" },
  { domain: "edge.permutive.com",          owner: "Permutive",   category: "ads" },
  { domain: "tinypass.com",                owner: "Piano",       category: "analytics" },
  { domain: "cdn.tinypass.com",            owner: "Piano",       category: "analytics" },
  { domain: "newrelic.com",                owner: "New Relic",   category: "analytics" },
  { domain: "nr-data.net",                 owner: "New Relic",   category: "analytics" },
  { domain: "bam.nr-data.net",             owner: "New Relic",   category: "analytics" },
  { domain: "branch.io",                   owner: "Branch",      category: "ads" },
  { domain: "app.link",                    owner: "Branch",      category: "ads" },
  { domain: "appsflyer.com",               owner: "AppsFlyer",   category: "ads" },
  { domain: "kochava.com",                 owner: "Kochava",     category: "ads" },
  { domain: "adjust.com",                  owner: "Adjust",      category: "ads" },
  { domain: "app.adjust.com",              owner: "Adjust",      category: "ads" },
] as const

// Normalise to a Set for O(1) exact-match lookup, and keep a sorted array
// of suffixes for the host-suffix path.
const TRACKER_DOMAINS = new Set(TRACKERS.map((t) => t.domain.split("/")[0]))
const TRACKER_OWNER = new Map(TRACKERS.map((t) => [t.domain.split("/")[0], t.owner] as const))

/**
 * Returns the matched tracker domain if `host` is, or is a subdomain of, a
 * known tracker. Returns null otherwise.
 *
 * Match rules:
 *   "googletagmanager.com"          → "googletagmanager.com"
 *   "www.googletagmanager.com"      → "googletagmanager.com"
 *   "googletagmanager.com.evil.com" → null  (must be a real suffix)
 */
export function matchTracker(host: string): string | null {
  const h = host.toLowerCase()
  if (TRACKER_DOMAINS.has(h)) return h
  // Walk back labels — `a.b.c.example.com` checks `b.c.example.com`,
  // `c.example.com`, `example.com`. Stops as soon as a match is found.
  let dot = h.indexOf(".")
  while (dot !== -1) {
    const tail = h.slice(dot + 1)
    if (TRACKER_DOMAINS.has(tail)) return tail
    dot = h.indexOf(".", dot + 1)
  }
  return null
}

export function ownerOf(domain: string): string {
  return TRACKER_OWNER.get(domain) ?? domain
}
