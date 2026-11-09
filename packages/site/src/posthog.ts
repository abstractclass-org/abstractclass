// PostHog's client as the sites start it (Hedge School's designs 11 and 17): posthog-js from npm, in its slim bundle
// with no external loading, so that the version is the lockfile's and the client loads no script from PostHog. A site
// imports this module only in a build with VITE_POSTHOG_KEY (each site's src/lib/analytics.svelte.ts), so a build
// without the key holds none of PostHog's code. Each option's name and meaning is from PostHog's docs
// (posthog.com/docs/libraries/js/config.md, posthog.com/docs/privacy/data-collection.md and
// posthog.com/docs/libraries/js.md, "Tree shaking with the slim bundle").
import posthog from "posthog-js/dist/module.slim.no-external";
import { AnalyticsExtensions } from "posthog-js/dist/extension-bundles";

/** PostHog's address for the project, in its US region. */
export const POSTHOG_HOST = "https://us.i.posthog.com";

export type PostHogClient = Pick<typeof posthog, "capture" | "register">;

/** Starts PostHog with the project's key. `properties` go with every event of the page, the first page view too. */
export function startPostHog(key: string, properties: Record<string, string | number | boolean>): PostHogClient {
  posthog.init(key, {
    api_host: POSTHOG_HOST,
    // The defaults of PostHog's latest snapshot: an option set here overrides its default.
    defaults: "2026-08-30",
    // No cookie and nothing in the browser's storage: PostHog counts visitors by a hash on its servers. The project's
    // setting "Enable cookieless tracking" must be on, or PostHog drops the events.
    cookieless_mode: "always",
    // No person profiles: the events stay anonymous, and identify() does nothing.
    person_profiles: "never",
    // A page view at each change of the address's path, as the site's pages change without a reload, and a page leave.
    capture_pageview: "history_change",
    // An address's `#` part can hold a game's id (the review's page, design 22): PostHog receives addresses without it.
    disable_capture_url_hashes: true,
    // Only the site's own events and the page views: no clicks, no session recording, no heatmaps, no surveys, no
    // dead or rage clicks, no web vitals, no errors.
    autocapture: false,
    disable_session_recording: true,
    capture_heatmaps: false,
    disable_surveys: true,
    capture_dead_clicks: false,
    rageclick: false,
    capture_performance: false,
    capture_exceptions: false,
    disable_product_tours: true,
    disable_conversations: true,
    // No request for feature flags or for the project's remote settings: the options here are all the settings.
    advanced_disable_flags: true,
    // No marking of a local address as a test user: it sets a person property, and the site makes no persons. The
    // owner's visits carry `internal` (analytics.svelte.ts), and only the live site has the key.
    internal_or_test_user_hostname: null,
    __extensionClasses: { ...AnalyticsExtensions },
    // Before the first page view (PostHog captures it after `loaded`).
    loaded: ph => ph.register(properties),
  });
  return posthog;
}
