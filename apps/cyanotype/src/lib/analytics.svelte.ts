// Cyanotype's visit counts and events (design 33, "Analytics"; Hedge School's designs 11 and 17): the analytics of
// every site (@abstractclass/site/analytics.svelte.ts), with this build's two services. The build names the services
// (VITE_POSTHOG_KEY, VITE_CF_ANALYTICS_TOKEN): the one PostHog project of all the sites, and the domain's one
// Cloudflare Web Analytics site (docs/hosting.md, "Cyanotype's analytics"). Without them, as in development and in the
// previews, nothing loads, and a build without PostHog's key holds none of its code (the shared analytics read the
// key). The consent's one purpose, where the build stores practice games, is the random number that links them, as on
// Hedge School (its design 25). A build that stores none asks for no consent.
import { STORES_PRACTICE_GAMES } from "@abstractclass/site/edition.ts";
import { isInternal } from "#lib/internalTraffic.ts";
import { Analytics } from "@abstractclass/site/analytics.svelte.ts";

export type { Purpose } from "@abstractclass/site/analytics.svelte.ts";

export const analytics = new Analytics({
  cfToken: import.meta.env.VITE_CF_ANALYTICS_TOKEN,
  games: STORES_PRACTICE_GAMES ? { consent: "cyanotype:consent:1", number: "cyanotype:browser-number:1" } : undefined,
  isInternal,
});

export const PURPOSES = analytics.purposes;
export const ASKS_CONSENT = analytics.asksConsent;
export const consent = analytics.consent;
// The banner takes `analytics` itself, for its choices.
export const { consentChosen, linksGames, startAnalytics, track, trackOnce, setVisitor, chooseShown, browserNumber,
               keptNumber, forgetNumber } = analytics;
