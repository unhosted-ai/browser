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

// Curated set — owners and categories are rich, the list is small.
const CURATED_DOMAINS = new Set(TRACKERS.map((t) => t.domain.split("/")[0]))
const TRACKER_OWNER = new Map(TRACKERS.map((t) => [t.domain.split("/")[0], t.owner] as const))

// Extended set — pulled from EasyPrivacy at build time. ~40k+ entries with no
// per-host owner/category metadata. We can flip it off at runtime via
// SettingsStore.useExtendedTrackerList in case a user hits a false positive.
import { EASYPRIVACY_HOSTS } from "./tracker-list.easyprivacy"
const EXTENDED_DOMAINS = new Set<string>(EASYPRIVACY_HOSTS)

// ── Ad-blocking ───────────────────────────────────────────────────────
// Curated, ~70 well-known display/video/header-bidding/native-ad
// networks. Separate from the tracker list so we can:
//   - count "ads blocked" and "trackers blocked" separately in the UI
//   - let users toggle ad-blocking independently of tracker-blocking
//   - keep the tracker counts honest (EasyPrivacy is analytics-leaning;
//     EasyList is ad-leaning; we don't conflate)
//
// Many of these also appear in the EasyPrivacy extended list — that's
// fine: ad-blocking flips first in matchBlocked(), so when a domain
// matches both we count it as an ad (more user-friendly label).
//
// Bulk EasyList import is a planned follow-up: a build script will
// extract domains from the `||example.com^` rules into a sibling
// `tracker-list.easylist.ts`, same shape as easyprivacy.
const AD_NETWORKS: ReadonlyArray<{ domain: string; owner: string }> = [
  // Display + retargeting
  { domain: "criteo.com",            owner: "Criteo" },
  { domain: "criteo.net",            owner: "Criteo" },
  { domain: "adsrvr.org",            owner: "The Trade Desk" },
  { domain: "rubiconproject.com",    owner: "Magnite" },
  { domain: "openx.net",             owner: "OpenX" },
  { domain: "pubmatic.com",          owner: "PubMatic" },
  { domain: "casalemedia.com",       owner: "Index Exchange" },
  { domain: "indexww.com",           owner: "Index Exchange" },
  { domain: "adnxs.com",             owner: "Xandr (Microsoft)" },
  { domain: "adform.net",            owner: "Adform" },
  { domain: "adsymptotic.com",       owner: "Drawbridge" },
  { domain: "smartadserver.com",     owner: "Equativ" },
  { domain: "yieldmo.com",           owner: "Yieldmo" },
  { domain: "yieldlab.net",          owner: "Yieldlab" },
  { domain: "outbrain.com",          owner: "Outbrain" },
  { domain: "taboola.com",           owner: "Taboola" },
  { domain: "revcontent.com",        owner: "Revcontent" },
  { domain: "mgid.com",              owner: "MGID" },
  { domain: "media.net",             owner: "Media.net" },
  { domain: "adcolony.com",          owner: "Digital Turbine" },
  { domain: "applovin.com",          owner: "AppLovin" },
  { domain: "supersonicads.com",     owner: "ironSource" },
  { domain: "vungle.com",            owner: "Liftoff" },
  { domain: "appodeal.com",          owner: "Appodeal" },
  { domain: "moatads.com",           owner: "Oracle Moat" },
  { domain: "atemda.com",            owner: "Atemda" },
  { domain: "advertising.com",       owner: "Yahoo (Verizon Media)" },
  { domain: "yldbt.com",             owner: "Yieldbot" },
  { domain: "33across.com",          owner: "33Across" },
  { domain: "lijit.com",             owner: "Sovrn" },
  { domain: "sovrn.com",             owner: "Sovrn" },
  { domain: "onetag.com",            owner: "OneTag" },
  { domain: "districtm.io",          owner: "District M" },
  { domain: "gumgum.com",            owner: "GumGum" },
  { domain: "tribalfusion.com",      owner: "Exponential" },
  { domain: "exponential.com",       owner: "Exponential" },
  { domain: "smaato.net",            owner: "Smaato" },
  { domain: "adform.com",            owner: "Adform" },
  // Video / connected TV
  { domain: "spotxchange.com",       owner: "SpotX" },
  { domain: "freewheel.tv",          owner: "FreeWheel" },
  { domain: "fwmrm.net",             owner: "FreeWheel" },
  { domain: "innovid.com",           owner: "Innovid" },
  { domain: "imrworldwide.com",      owner: "Nielsen" },
  { domain: "adsafeprotected.com",   owner: "IAS" },
  { domain: "doubleverify.com",      owner: "DoubleVerify" },
  // ID providers / cookie sync
  { domain: "rlcdn.com",             owner: "LiveRamp" },
  { domain: "liveramp.com",          owner: "LiveRamp" },
  { domain: "id5-sync.com",          owner: "ID5" },
  { domain: "btloader.com",          owner: "Burst Loader" },
  { domain: "agkn.com",              owner: "Neustar" },
  { domain: "tapad.com",             owner: "Tapad" },
  // Pubs' own ad CDNs
  { domain: "adlightning.com",       owner: "Ad Lightning" },
  { domain: "cootlogix.com",         owner: "Cootlogix" },
  { domain: "yellowblue.io",         owner: "YellowBlue" },
  { domain: "measureadv.com",        owner: "Adelaide" },
  { domain: "nextmillmedia.com",     owner: "NextMillennium" },
  // Header bidding / SSP
  { domain: "prebid.org",            owner: "Prebid" },
  { domain: "amazon-adsystem.com",   owner: "Amazon Ads" },
  { domain: "krushmedia.com",        owner: "Krushmedia" },
  { domain: "vidazoo.com",           owner: "Vidazoo" },
  { domain: "engageya.com",          owner: "Engageya" },
  { domain: "ssp.disqus.com",        owner: "Disqus" },
  { domain: "ssum-sec.casalemedia.com", owner: "Index Exchange" },
  // Native + social ads
  { domain: "sharethrough.com",      owner: "Sharethrough" },
  { domain: "districtm.ca",          owner: "District M" },
  { domain: "smartyads.com",         owner: "SmartyAds" },
  { domain: "adriver.ru",            owner: "AdRiver" },
  { domain: "between-exchange.com",  owner: "Between Exchange" },
  // Affiliate / coupon
  { domain: "viglink.com",           owner: "Sovrn Commerce" },
  { domain: "skimresources.com",     owner: "Sovrn Commerce" },
]
const AD_DOMAINS = new Set(AD_NETWORKS.map((a) => a.domain))
const AD_OWNER = new Map(AD_NETWORKS.map((a) => [a.domain, a.owner] as const))

// Module-level kill switches — flipped by privacy.ts based on the user's
// settings. The extended list is what makes the privacy report
// comparable to uBlock Origin's coverage.
let extendedEnabled = true
let adBlockEnabled = true
export function setExtendedTrackerListEnabled(on: boolean): void {
  extendedEnabled = on
}
export function setAdBlockEnabled(on: boolean): void {
  adBlockEnabled = on
}

export type BlockKind = "tracker" | "ad"
export type BlockMatch = { kind: BlockKind; domain: string }

/**
 * Backwards-compatible: returns the matched tracker domain or null.
 * New callers should prefer `matchBlocked()` which also covers ad
 * domains and labels them.
 */
export function matchTracker(host: string): string | null {
  const m = matchBlocked(host)
  return m ? m.domain : null
}

/**
 * Returns whichever of (tracker, ad) matches `host` first. Ad domains
 * win the tie because the "Ads blocked" label is more user-friendly
 * than "Tracker blocked" for the head of EasyPrivacy that's actually
 * ad-tech (rubicon, openx, pubmatic, etc).
 *
 * Match rules:
 *   "doubleclick.net"          → { kind: "tracker", domain: "doubleclick.net" }
 *   "www.criteo.com"           → { kind: "ad",      domain: "criteo.com" }
 *   "evil.example.com"         → null
 */
export function matchBlocked(host: string): BlockMatch | null {
  const h = host.toLowerCase()
  // Direct hits first (cheapest)
  if (adBlockEnabled && AD_DOMAINS.has(h)) return { kind: "ad",      domain: h }
  if (CURATED_DOMAINS.has(h))              return { kind: "tracker", domain: h }
  if (extendedEnabled && EXTENDED_DOMAINS.has(h)) return { kind: "tracker", domain: h }
  // Walk back labels for suffix matches
  let dot = h.indexOf(".")
  while (dot !== -1) {
    const tail = h.slice(dot + 1)
    if (adBlockEnabled && AD_DOMAINS.has(tail))             return { kind: "ad",      domain: tail }
    if (CURATED_DOMAINS.has(tail))                          return { kind: "tracker", domain: tail }
    if (extendedEnabled && EXTENDED_DOMAINS.has(tail))      return { kind: "tracker", domain: tail }
    dot = h.indexOf(".", dot + 1)
  }
  return null
}

export function ownerOf(domain: string): string {
  return AD_OWNER.get(domain) ?? TRACKER_OWNER.get(domain) ?? domain
}

/** Total number of hostnames the matcher knows about — useful for the
 *  privacy section's "blocking ~N domains" honesty line. */
export function trackerListSize(): { curated: number; extended: number; ads: number } {
  return {
    curated: CURATED_DOMAINS.size,
    extended: extendedEnabled ? EXTENDED_DOMAINS.size : 0,
    ads:      adBlockEnabled  ? AD_DOMAINS.size       : 0,
  }
}
