// PostHog's client as the sites start it (Hedge School's designs 11 and 17): posthog-js from npm, in its slim bundle
// with no external loading, so that the version is the lockfile's and the client loads no script from PostHog. The
// sites import this module only in a build with VITE_POSTHOG_KEY (POSTHOG in analytics.svelte.ts), so a build without
// the key holds none of PostHog's code. Each option's name and meaning is from PostHog's docs
// (posthog.com/docs/libraries/js/config.md, posthog.com/docs/privacy/data-collection.md and
// posthog.com/docs/libraries/js.md, "Tree shaking with the slim bundle"), and for the error reports
// posthog.com/docs/error-tracking/capture.md.
import posthog from "posthog-js/dist/module.slim.no-external";
import { AnalyticsExtensions, ErrorTrackingExtensions } from "posthog-js/dist/extension-bundles";
// The error reports' hooks on the page's uncaught errors, which the client otherwise loads from PostHog's servers
// (posthog.com/docs/libraries/js.md: "Finally you can also import specific extra dependencies").
import "posthog-js/dist/exception-autocapture";
import { scrubEvent } from "./scrub.ts";
import { POSTHOG_PATH } from "./posthogProxy.ts";

/** PostHog's app for the project, in its US region: the links of PostHog's own features, such as its toolbar. */
const POSTHOG_APP = "https://us.posthog.com";

export type PostHogClient = Pick<typeof posthog, "capture" | "captureException" | "register">;

/** Starts PostHog with the project's key. `properties` go with every event of the page, the first page view too. */
export function startPostHog(key: string, properties: Record<string, string | number | boolean>): PostHogClient {
  posthog.init(key, {
    // The requests go to the site's own address, and its Function passes them to PostHog's US region
    // (posthogProxy.ts): a blocker whose list names PostHog's hosts does not stop them (Hedge School's design 27, item
    // 6). PostHog's guide: "The `ui_host` must point to PostHog's actual domain so features like the toolbar link
    // correctly" (posthog.com/docs/advanced/proxy/cloudflare).
    api_host: POSTHOG_PATH,
    ui_host: POSTHOG_APP,
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
    // Only the site's own events, the page views and the error reports: no clicks, no session recording, no heatmaps,
    // no surveys, no dead or rage clicks, no web vitals.
    autocapture: false,
    disable_session_recording: true,
    capture_heatmaps: false,
    disable_surveys: true,
    capture_dead_clicks: false,
    rageclick: false,
    capture_performance: false,
    // The page's uncaught errors and unhandled promise rejections as error reports, but not the console's errors
    // (posthog.com/docs/error-tracking/capture.md: "you can configure which types of errors are automatically captured
    // using the `capture_exceptions` option"). An object names each kind: the client takes a kind that it lacks as off.
    // The init option wins over the project's setting (posthog.com/docs/libraries/js/config.md, "Init config and
    // project settings"), so the reports need no setting in PostHog. The site's caught failures go by captureException
    // (analytics.svelte.ts, engineError and siteError).
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    // Every event loses a game, a record, a file's content and a typed name before it goes (scrub.ts): the error
    // reports carry text that the site does not write. posthog.com/docs/libraries/js/config.md: "A function that allows
    // you to amend or reject events before they are sent to PostHog."
    before_send: event => scrubEvent(event),
    // No scroll depth with the page leave and the next page view: no report uses it, and the privacy pages do not name
    // it.
    disable_scroll_properties: true,
    disable_product_tours: true,
    disable_conversations: true,
    // No request for feature flags or for the project's remote settings: the options here are all the settings.
    advanced_disable_flags: true,
    // No marking of a local address as a test user: it sets a person property, and the site makes no persons. The
    // owner's visits carry `internal` (analytics.svelte.ts), and only the live site has the key.
    internal_or_test_user_hostname: null,
    __extensionClasses: { ...AnalyticsExtensions, ...ErrorTrackingExtensions },
    // Before the first page view (PostHog captures it after `loaded`).
    loaded: ph => ph.register(properties),
  });
  return posthog;
}
