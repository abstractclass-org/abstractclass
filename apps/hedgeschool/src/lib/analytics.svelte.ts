// Hedge School's visit counts and events (designs 11, 17, 25 and 27): the analytics of every site
// (@abstractclass/site/analytics.svelte.ts), with this build's two services and Hedge School's keys. The build names
// the services (VITE_GA_ID, VITE_CF_ANALYTICS_TOKEN). Without them, as in development, nothing loads. The purposes are
// Google Analytics' cookies and, where the build stores practice games, the random number that links them. The
// consent's key is new with the second purpose: a consent covers the purposes that it named, so every visitor was
// asked again.
import { STORES_PRACTICE_GAMES } from "#lib/edition.ts";
import { isInternal } from "#lib/internalTraffic.ts";
import { Analytics } from "@abstractclass/site/analytics.svelte.ts";

export type { Consent, Purpose } from "@abstractclass/site/analytics.svelte.ts";

export const analytics = new Analytics({
  gaId: import.meta.env.VITE_GA_ID,
  cfToken: import.meta.env.VITE_CF_ANALYTICS_TOKEN,
  keys: {
    consent: "hedge-school:consent:2", // :1 (analytics-consent:1) held Google Analytics' alone
    number: "hedge-school:browser-number:1",
    ask: "hedge-school:analytics-ask:1",
  },
  storesGames: STORES_PRACTICE_GAMES,
  isInternal,
});

export const PURPOSES = analytics.purposes;
export const ASKS_CONSENT = analytics.asksConsent;
export const consent = analytics.consent;
export const { consentChosen, linksGames, asksToAllow, closeAsk, startAnalytics, track, trackOnce, setVisitor, choose,
               chooseShown, chooseAll, browserNumber, keptNumber, forgetNumber } = analytics;
