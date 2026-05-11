// Page-agent — content-script helpers injected into the active page so
// the agent can read interactive elements and act on them (click, type).
//
// We do NOT install a persistent content script — instead we inject a
// fresh self-contained IIFE on every tool call. This trades a few ms of
// per-call overhead for two real wins:
//
//   1. No state leaks across navigations or reloads. A stale element
//      reference in `window.__delta_*` would silently click the wrong
//      thing after a soft re-render.
//   2. No surface area for a malicious page to tamper with our hooks
//      between calls (the script lives only during the call).
//
// The injected scripts return JSON-serialisable results via the
// `executeJavaScript` Promise.

import type { WebContentsView } from "electron"

// ──────────────────────────────────────────────────────────
// Shared helper code — concatenated into every tool script.
// ──────────────────────────────────────────────────────────
const HELPERS = `
function _visible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const s = window.getComputedStyle(el);
  if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  return true;
}
function _inViewport(el) {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
}
function _label(el) {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  // For form fields, prefer the associated <label>.
  if (el.labels && el.labels.length) {
    const t = Array.from(el.labels).map(l => l.innerText).join(" ").trim();
    if (t) return t;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") {
    return (el.placeholder || el.name || el.title || "").trim();
  }
  const text = (el.innerText || "").trim();
  if (text) return text.slice(0, 160);
  return (el.title || el.getAttribute("alt") || "").trim();
}
// All elements we treat as interactive — buttons, links, form fields,
// and anything with an explicit interactive ARIA role or an onclick.
function _interactiveSelector() {
  return [
    "a[href]",
    "button",
    "input:not([type=hidden])",
    "select",
    "textarea",
    "[contenteditable=true]",
    "[role=button]",
    "[role=link]",
    "[role=menuitem]",
    "[role=tab]",
    "[role=checkbox]",
    "[role=switch]",
    "[role=radio]",
    "[role=combobox]",
    "[onclick]",
  ].join(",");
}
function _enumerate() {
  const all = Array.from(document.querySelectorAll(_interactiveSelector()));
  const out = [];
  for (const el of all) {
    if (!_visible(el)) continue;
    const tag = el.tagName.toLowerCase();
    const r = el.getBoundingClientRect();
    out.push({
      el,
      data: {
        index: out.length,
        tag,
        type: el.type || null,
        label: _label(el),
        href: tag === "a" ? el.getAttribute("href") : null,
        placeholder: el.placeholder || null,
        name: el.name || null,
        disabled: !!el.disabled,
        in_viewport: _inViewport(el),
        bbox: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      },
    });
  }
  return out;
}
// Find one element by an opaque criteria object: { index, text, selector }.
// Returns { el, data } | null. When multiple match by text, returns null
// (caller decides whether to surface an ambiguity error).
function _findOne(criteria) {
  const list = _enumerate();
  if (criteria.selector) {
    const target = document.querySelector(criteria.selector);
    if (!target) return null;
    const found = list.find(x => x.el === target);
    return found || (_visible(target) ? { el: target, data: { tag: target.tagName.toLowerCase(), label: _label(target) } } : null);
  }
  if (typeof criteria.index === "number") {
    return list[criteria.index] || null;
  }
  if (criteria.text) {
    const needle = String(criteria.text).trim().toLowerCase();
    const matches = list.filter(x =>
      (x.data.label || "").toLowerCase().includes(needle) ||
      (x.data.placeholder || "").toLowerCase().includes(needle)
    );
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    // Exact-match disambiguation: if exactly one label equals the needle,
    // prefer that. Otherwise surface the ambiguity.
    const exact = matches.filter(x => (x.data.label || "").toLowerCase() === needle);
    if (exact.length === 1) return exact[0];
    return { ambiguous: matches.map(m => m.data) };
  }
  return null;
}
// React/Vue framework state syncs require the native value setter, not
// just el.value = "...". This wrapper handles inputs, textareas, and
// contenteditable elements.
function _setValue(el, text) {
  const tag = el.tagName.toLowerCase();
  if (el.getAttribute("contenteditable") === "true") {
    el.focus();
    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
    return true;
  }
  if (tag !== "input" && tag !== "textarea" && tag !== "select") return false;
  el.focus();
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, "value") || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const setter = desc && desc.set;
  if (setter) setter.call(el, text);
  else el.value = text;
  el.dispatchEvent(new Event("input",  { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
`

// ──────────────────────────────────────────────────────────
// Public API — three async functions wrap executeJavaScript.
// ──────────────────────────────────────────────────────────

export type Criteria =
  | { index: number }
  | { text: string }
  | { selector: string }

export type InteractiveElement = {
  index: number
  tag: string
  type: string | null
  label: string
  href: string | null
  placeholder: string | null
  name: string | null
  disabled: boolean
  in_viewport: boolean
  bbox: { x: number; y: number; w: number; h: number }
}

/** Snapshot every visible interactive element on the page. */
export async function getInteractiveElements(
  view: WebContentsView,
): Promise<{ elements: InteractiveElement[]; url: string; title: string }> {
  const script = `
    (() => {
      ${HELPERS}
      const list = _enumerate().map(x => x.data);
      return {
        elements: list,
        url: location.href,
        title: document.title,
      };
    })()
  `
  return view.webContents.executeJavaScript(script, true)
}

/** Click an element matched by index | text | selector. */
export async function clickElement(
  view: WebContentsView,
  criteria: Criteria,
): Promise<
  | { ok: true; label: string }
  | { ok: false; error: string; ambiguous?: InteractiveElement[] }
> {
  const script = `
    (() => {
      ${HELPERS}
      const found = _findOne(${JSON.stringify(criteria)});
      if (!found) return { ok: false, error: "no_match" };
      if (found.ambiguous) return { ok: false, error: "ambiguous", ambiguous: found.ambiguous };
      const { el, data } = found;
      if (data && data.disabled) return { ok: false, error: "disabled" };
      try {
        el.scrollIntoView({ block: "center", behavior: "instant" });
      } catch {}
      try {
        el.focus();
      } catch {}
      // Use the native click; falls back to a synth event for elements
      // that don't have HTMLElement.prototype.click (rare).
      try {
        if (typeof el.click === "function") el.click();
        else el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      } catch (err) {
        return { ok: false, error: "click_failed: " + String(err) };
      }
      return { ok: true, label: (data && data.label) || _label(el) };
    })()
  `
  return view.webContents.executeJavaScript(script, true)
}

/** Type text into an element matched by index | text | selector. */
export async function typeIntoElement(
  view: WebContentsView,
  criteria: Criteria,
  text: string,
): Promise<
  | { ok: true; label: string }
  | { ok: false; error: string; ambiguous?: InteractiveElement[] }
> {
  // Hard-refusal of password + file fields. Even on non-sensitive sites,
  // the agent should never type credentials, and file inputs can't be
  // set programmatically anyway.
  const script = `
    (() => {
      ${HELPERS}
      const found = _findOne(${JSON.stringify(criteria)});
      if (!found) return { ok: false, error: "no_match" };
      if (found.ambiguous) return { ok: false, error: "ambiguous", ambiguous: found.ambiguous };
      const { el, data } = found;
      const tag = el.tagName.toLowerCase();
      const type = (el.type || "").toLowerCase();
      if (type === "password") return { ok: false, error: "password_field_refused" };
      if (type === "file")     return { ok: false, error: "file_input_refused" };
      try { el.scrollIntoView({ block: "center", behavior: "instant" }); } catch {}
      const ok = _setValue(el, ${JSON.stringify(text)});
      if (!ok) return { ok: false, error: "not_typable: " + tag };
      return { ok: true, label: (data && data.label) || _label(el) };
    })()
  `
  return view.webContents.executeJavaScript(script, true)
}
