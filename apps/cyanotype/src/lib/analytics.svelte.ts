// Cyanotype's visit counts and events (design 33, "Analytics"; Hedge School's designs 11 and 17): the analytics of
// every site (@abstractclass/site/analytics.svelte.ts), with this build's two services. The build names the services
// (VITE_POSTHOG_KEY, VITE_CF_ANALYTICS_TOKEN): the one PostHog project of all the sites, and the domain's one
// Cloudflare Web Analytics site (docs/hosting.md, "Cyanotype's analytics"). Without them, as in development and in the
// previews, nothing loads, and a build without PostHog's key holds none of its code: the import below is only in a
// build with the key. Cyanotype stores no practice games yet (abscls-8tl1.50), so it asks for no consent.
import { isInternal } from "#lib/internalTraffic.ts";
import { Analytics } from "@abstractclass/site/analytics.svelte.ts";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;

export const analytics = new Analytics({
  posthog: POSTHOG_KEY ? { key: POSTHOG_KEY, load: () => import("@abstractclass/site/posthog.ts") } : undefined,
  cfToken: import.meta.env.VITE_CF_ANALYTICS_TOKEN,
  games: undefined,
  isInternal,
});

export const { startAnalytics, track, trackOnce, setVisitor } = analytics;
