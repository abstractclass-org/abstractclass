// Visit counts (design 11): Cloudflare Web Analytics, with no cookies, and Google Analytics in Google's consent mode,
// advanced form. The Google tag loads on every page with its cookies denied, so until the visitor accepts it sends
// cookieless pings. "Accept" grants its cookies, "Decline" keeps them denied. Ads are never granted: the site has none.
//
// The build names the two services (VITE_GA_ID, VITE_CF_ANALYTICS_TOKEN). Without them, as in development, nothing
// loads, and the banner asks only about the purposes that the build has (none in development). Neither service sees a game: a page whose address holds a game after its `#` (a record, a
// packed review or analysis, design 22) takes it out of the address before it starts them, every other page starts
// them from the layout, and the review names its game's id after the `#`, which neither records.
//
// Google Analytics also takes events (design 17): what a visitor did, in counts and ranges (measure.ts), for the
// decisions in that design. A visitor who has not accepted sends them as cookieless pings, counted with no visitor. A
// browser with the flag of internal traffic (internalTraffic.ts) marks its events, so that the owner's visits stay out.
//
// The visitor's consent has a choice for each purpose (design 25): Google Analytics' cookies, and the random number
// that links this browser's practice games. The banner's Accept and Decline set both, and the privacy page each. The
// key is new with the second purpose: a consent covers the purposes that it named, so every visitor is asked again.
//
// A blocker (an ad blocker, or the browser's tracking protection) can stop the Google tag (design 27). The page does
// not look for blockers: it knows only whether its own tag ran. A visitor who accepted Google Analytics' cookies, and
// whose tag did not run, is asked to allow the site in the blocker until they close the ask (AnalyticsAsk.svelte). The
// site never sends the tag through its own address to get past a blocker: that would override the visitor's own choice.
import { STORES_PRACTICE_GAMES } from "#lib/edition.ts";
import { isInternal } from "#lib/internalTraffic.ts";
import { readLocal, readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";

const GA_ID: string | undefined = import.meta.env.VITE_GA_ID;
const CF_TOKEN: string | undefined = import.meta.env.VITE_CF_ANALYTICS_TOKEN;
const KEY = "hedge-school:consent:2"; // the choice for each purpose; :1 (analytics-consent:1) held Google Analytics' alone
const NUMBER = "hedge-school:browser-number:1"; // the random number that links this browser's practice games
const ASK = "hedge-school:analytics-ask:1"; // "closed": the visitor closed the ask to allow Google Analytics

export type Consent = "granted" | "denied";
export type Purpose = "analytics" | "games";

/** The purposes that this build asks about: Google Analytics' cookies where it loads, the games' link where the build
 *  stores practice games. */
export const PURPOSES: Purpose[] = [...(GA_ID ? ["analytics" as const] : []),
                                    ...(STORES_PRACTICE_GAMES ? ["games" as const] : [])];
/** Whether the site asks for consent: only a build with a purpose does. */
export const ASKS_CONSENT = PURPOSES.length > 0;

/** The visitor's choice for each purpose, null before they choose. */
export const consent = $state<Record<Purpose, Consent | null>>(readChoices());

function readChoices(): Record<Purpose, Consent | null> {
  const kept = readLocalJson<Partial<Record<Purpose, unknown>>>(KEY) ?? {};
  const one = (v: unknown) => (v === "granted" || v === "denied" ? v : null);
  return { analytics: one(kept.analytics), games: one(kept.games) };
}

/** Whether the visitor has chosen for every purpose that this build asks about: the banner shows until they have. */
export const consentChosen = () => PURPOSES.every(p => consent[p] !== null);

/** Whether the visitor accepts the games' link now, as the browser keeps it, not as this page read it: another tab may
 *  have changed it since. Read before a game takes or sends the number. */
export const linksGames = () => readChoices().games === "granted";

/** Whether the Google tag's script answered in this page and the tag did not run: the script failed to load (a blocker,
 *  the browser's tracking protection, or a failed network load), or loaded and did not run as the tag (a blocker's
 *  stand-in script). False until the script answers, and in a build without it. */
let tagFailed = $state(false);

const askKeptClosed = () => readLocal(ASK) === "closed";
let askClosed = $state(askKeptClosed());

/** Whether to ask the visitor to allow Google Analytics in their blocker (design 27): they accepted its cookies, the
 *  banner is gone, and the tag did not run in this page. Once closed, never again in this browser. */
export const asksToAllow = () => consentChosen() && consent.analytics === "granted" && tagFailed && !askClosed;

/** Closes the ask for good in this browser. */
export function closeAsk() {
  askClosed = true;
  writeLocal(ASK, "closed");
}

declare global {
  interface Window { dataLayer: unknown[] }
}

// gtag.js reads each command as an `arguments` object, so this is a function, not an arrow.
function gtag(..._args: unknown[]) {
  window.dataLayer.push(arguments);
}

let started = false;

// A choice made in another tab of the site (its banner or its privacy page): the browser tells the other tabs when one
// writes the key, and each takes the choice, so that its banner, its privacy page and its Google tag follow it. The
// ask closed in another tab closes here too.
if (typeof window !== "undefined") {
  window.addEventListener("storage", e => {
    if (e.key === ASK || e.key === null) askClosed = askKeptClosed();
    if (e.key !== KEY && e.key !== null) return; // null: the site's storage cleared
    const now = readChoices();
    if (now.analytics !== consent.analytics && started && GA_ID) gtag("consent", "update", { analytics_storage: now.analytics ?? "denied" });
    Object.assign(consent, now);
  });
}

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
      analytics_storage: consent.analytics ?? "denied",
    });
    gtag("js", new Date());
    // A browser with the flag of internal traffic (internalTraffic.ts): the tag gives every event of the page the
    // parameter that Google's "Internal Traffic" filter drops, the first page view too.
    if (isInternal()) gtag("config", GA_ID, { traffic_type: "internal" });
    else gtag("config", GA_ID);
    const script = addScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
    // gtag.js defines google_tag_manager as it runs, before its load event. A blocker's stand-in for it (uBlock
    // Origin's googletagmanager_gtm.js, or Firefox's SmartBlock shim) loads, and defines none.
    script.onload = () => (tagFailed = !("google_tag_manager" in window));
    script.onerror = () => (tagFailed = true);
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

/** Keeps the visitor's choice for a purpose, and tells the Google tag of its own. */
export function choose(purpose: Purpose, choice: Consent) {
  consent[purpose] = choice;
  writeLocal(KEY, JSON.stringify(consent));
  if (purpose === "analytics" && started && GA_ID) gtag("consent", "update", { analytics_storage: choice });
}

/** A switch on the privacy page: the choice for its purpose, and "denied" for each purpose not chosen yet, as its
 *  switch shows it off. So a visitor can accept one purpose and decline another without granting it first. */
export function chooseShown(purpose: Purpose, choice: Consent) {
  for (const p of PURPOSES) if (p !== purpose && consent[p] === null) choose(p, "denied");
  choose(purpose, choice);
}

/** The banner's Accept or Decline: the same choice for every purpose that this build asks about. */
export function chooseAll(choice: Consent) {
  for (const p of PURPOSES) choose(p, choice);
}

/** The random number that links this browser's practice games: made on the first game sent with the visitor's
 *  consent, and null without it. A number kept from before stays in the browser after a Decline, unsent, so that the
 *  privacy page can still delete its games (keptNumber). */
export function browserNumber(): string | null {
  if (!linksGames()) return null;
  const kept = readLocal(NUMBER);
  if (kept) return kept;
  const made = crypto.randomUUID();
  writeLocal(NUMBER, made);
  return made;
}

/** The number kept in this browser, whatever the consent now: the games that went with it can be deleted. */
export const keptNumber = () => readLocal(NUMBER);

/** Forgets the number, once its games are deleted: the next game with consent takes a new one. */
export const forgetNumber = () => writeLocal(NUMBER, null);

function addScript(src: string, attributes: Record<string, string> = {}) {
  const script = document.createElement("script");
  script.async = true; // as Google's snippet loads gtag.js
  script.src = src;
  for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
  document.head.append(script);
  return script;
}
