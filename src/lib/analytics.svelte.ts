// Visit counts (design 11): Cloudflare Web Analytics, with no cookies, and Google Analytics in Google's consent mode,
// advanced form. The Google tag loads on every page with its cookies denied, so until the visitor accepts it sends
// cookieless pings. "Accept" grants its cookies, "Decline" keeps them denied. Ads are never granted: the site has none.
//
// The build names the two services (VITE_GA_ID, VITE_CF_ANALYTICS_TOKEN). Without them, as in development, nothing
// loads and no banner shows. Neither service sees a game: a page whose address holds a game after its `#` (a record, a
// packed review or analysis, design 22) takes it out of the address before it starts them, every other page starts
// them from the layout, and the review names its game's id after the `#`, which neither records.
//
// Google Analytics also takes events (design 17): what a visitor did, in counts and ranges (measure.ts), for the
// decisions in that design. A visitor who has not accepted sends them as cookieless pings, counted with no visitor.
import { readLocal, writeLocal } from "#lib/storage/local.ts";

const GA_ID: string | undefined = import.meta.env.VITE_GA_ID;
const CF_TOKEN: string | undefined = import.meta.env.VITE_CF_ANALYTICS_TOKEN;
const KEY = "hedge-school:analytics-consent:1";

export type Consent = "granted" | "denied";

/** Whether the site asks for consent: only a build with Google Analytics does. */
export const ASKS_CONSENT = Boolean(GA_ID);

/** The visitor's choice, or null before they choose. */
export const consent = $state<{ choice: Consent | null }>({ choice: readChoice() });

function readChoice(): Consent | null {
  const kept = readLocal(KEY);
  return kept === "granted" || kept === "denied" ? kept : null;
}

declare global {
  interface Window { dataLayer: unknown[] }
}

// gtag.js reads each command as an `arguments` object, so this is a function, not an arrow.
function gtag(..._args: unknown[]) {
  window.dataLayer.push(arguments);
}

let started = false;

/** Loads both services once. Call it only when the address holds no record. */
export function startAnalytics() {
  if (started) return;
  started = true;
  if (CF_TOKEN) addScript("https://static.cloudflareinsights.com/beacon.min.js", { "data-cf-beacon": JSON.stringify({ token: CF_TOKEN }) });
  if (GA_ID) {
    window.dataLayer = window.dataLayer || [];
    // The defaults come before the tag's first command (Google's consent mode guide).
    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: consent.choice ?? "denied",
    });
    gtag("js", new Date());
    gtag("config", GA_ID);
    addScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
  }
}

/** Sends an event to Google Analytics (design 17): its name and parameters, counts and ranges only, never a game, a
 *  player's name or a game's id. Nothing in a build without it, or before the services start. */
export function track(name: string, params: Record<string, string | number | boolean> = {}) {
  if (GA_ID && started) gtag("event", name, params);
}

const sent = new Set<string>();
/** Sends an event once for each `key` in this page's life: a feature's first use in a review, not each use. The key
 *  stays in the page: it may name the game. */
export function trackOnce(key: string, name: string, params: Record<string, string | number | boolean> = {}) {
  if (sent.has(key)) return;
  sent.add(key);
  track(name, params);
}

/** Sets properties of the visitor that Google Analytics gives every later event (ranges only). */
export function setVisitor(properties: Record<string, string>) {
  if (GA_ID && started) gtag("set", "user_properties", properties);
}

/** Keeps the visitor's choice and tells the Google tag. */
export function choose(choice: Consent) {
  consent.choice = choice;
  writeLocal(KEY, choice);
  if (started && GA_ID) gtag("consent", "update", { analytics_storage: choice });
}

function addScript(src: string, attributes: Record<string, string> = {}) {
  const script = document.createElement("script");
  script.async = true; // as Google's snippet loads gtag.js
  script.src = src;
  for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
  document.head.append(script);
}
