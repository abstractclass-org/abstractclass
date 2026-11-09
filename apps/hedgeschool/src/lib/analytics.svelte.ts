// Hedge School's visit counts and events (designs 11, 17 and 25): the analytics of every site
// (@abstractclass/site/analytics.svelte.ts), with this build's two services and Hedge School's keys. The build names
// the services (VITE_POSTHOG_KEY, VITE_CF_ANALYTICS_TOKEN). Without them, as in development and in the previews,
// nothing loads, and a build without PostHog's key holds none of its code (the shared analytics read the key). The
// consent's one purpose, where the build stores practice games, is the random number that links them. Its key keeps the
// choices made when the consent also had Google Analytics' cookies: the games' choice stays valid.
import { STORES_PRACTICE_GAMES } from "#lib/edition.ts";
import { isInternal } from "#lib/internalTraffic.ts";
import { Analytics } from "@abstractclass/site/analytics.svelte.ts";

export type { Purpose } from "@abstractclass/site/analytics.svelte.ts";

export const analytics = new Analytics({
  cfToken: import.meta.env.VITE_CF_ANALYTICS_TOKEN,
  // :1 (analytics-consent:1) held Google Analytics' alone. :2 held it and the games' link.
  games: STORES_PRACTICE_GAMES ? { consent: "hedge-school:consent:2", number: "hedge-school:browser-number:1" } : undefined,
  isInternal,
});

export const PURPOSES = analytics.purposes;
export const ASKS_CONSENT = analytics.asksConsent;
export const consent = analytics.consent;
// The banner takes `analytics` itself, for its choices.
export const { consentChosen, linksGames, startAnalytics, track, trackOnce, setVisitor, chooseShown, browserNumber,
               keptNumber, forgetNumber } = analytics;
