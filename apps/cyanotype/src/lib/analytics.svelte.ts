// Cyanotype's visit counts and events (design 33, "Analytics and consent"; Hedge School's designs 11, 17, 25 and 27):
// the analytics of every site (@abstractclass/site/analytics.svelte.ts), with this build's two services and
// Cyanotype's keys. The build names the services (VITE_GA_ID, VITE_CF_ANALYTICS_TOKEN): Cyanotype's own Google
// Analytics stream, and the domain's one Cloudflare Web Analytics site (docs/hosting.md, "Cyanotype's analytics").
// Without them, as in development, nothing loads, and the site asks for no consent. Cyanotype stores no practice games
// yet (abscls-8tl1.50), so its one purpose is Google Analytics' cookies.
import { isInternal } from "#lib/internalTraffic.ts";
import { Analytics } from "@abstractclass/site/analytics.svelte.ts";

export type { Purpose } from "@abstractclass/site/analytics.svelte.ts";

export const analytics = new Analytics({
  gaId: import.meta.env.VITE_GA_ID,
  cfToken: import.meta.env.VITE_CF_ANALYTICS_TOKEN,
  keys: { consent: "cyanotype:consent:1", number: "cyanotype:browser-number:1", ask: "cyanotype:analytics-ask:1" },
  storesGames: false,
  isInternal,
});

export const PURPOSES = analytics.purposes;
export const ASKS_CONSENT = analytics.asksConsent;
export const consent = analytics.consent;
export const { consentChosen, asksToAllow, startAnalytics, track, trackOnce, setVisitor, chooseShown } = analytics;
