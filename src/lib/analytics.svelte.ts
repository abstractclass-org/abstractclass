// Visit counts (design 11): Cloudflare Web Analytics, with no cookies, and Google Analytics in Google's consent mode,
// advanced form. The Google tag loads on every page with its cookies denied, so until the visitor accepts it sends
// cookieless pings. "Accept" grants its cookies, "Decline" keeps them denied. Ads are never granted: the site has none.
//
// The build names the two services (VITE_GA_ID, VITE_CF_ANALYTICS_TOKEN). Without them, as in development, nothing
// loads and no banner shows. Neither service sees a game: the import page removes a record from the address before it
// starts them (src/routes/import/+page.svelte), and every other page starts them from the layout.
const GA_ID: string | undefined = import.meta.env.VITE_GA_ID;
const CF_TOKEN: string | undefined = import.meta.env.VITE_CF_ANALYTICS_TOKEN;
const KEY = "hedge-school:analytics-consent:1";

export type Consent = "granted" | "denied";

/** Whether the site asks for consent: only a build with Google Analytics does. */
export const ASKS_CONSENT = Boolean(GA_ID);

/** The visitor's choice, or null before they choose. */
export const consent = $state<{ choice: Consent | null }>({ choice: readChoice() });

function readChoice(): Consent | null {
  try {
    const kept = typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
    return kept === "granted" || kept === "denied" ? kept : null;
  } catch {
    return null;
  }
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

/** Keeps the visitor's choice and tells the Google tag. */
export function choose(choice: Consent) {
  consent.choice = choice;
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // Blocked storage: the choice holds until the page closes.
  }
  if (started && GA_ID) gtag("consent", "update", { analytics_storage: choice });
}

function addScript(src: string, attributes: Record<string, string> = {}) {
  const script = document.createElement("script");
  script.async = true; // as Google's snippet loads gtag.js
  script.src = src;
  for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
  document.head.append(script);
}
