// The keys under which this browser keeps Hedge School's settings and the consent's answer in local storage. The site's
// modules and the browser tests (tests/) import them from here, so a key's new version reaches the tests too. This
// module imports nothing: Playwright's loader, which loads the tests' imports in Node, cannot load a .svelte file or
// read import.meta.env, and the modules that use the keys do both.

/** The engine's settings (analysis/engineSettings.ts). Version 2: the review's names changed (version 1's "standard"
 *  was 256 visits, now Lite's). */
export const ENGINE_KEY = "learn-enclosure:engine:2";
/** The review's display settings (review/display.ts). */
export const DISPLAY_KEY = "learn-enclosure:review-display:1";
/** The consent's answer, and the random number that links the practice games (analytics.svelte.ts). :1
 *  (analytics-consent:1) held Google Analytics' alone. :2 held it and the games' link. */
export const CONSENT_KEY = "hedge-school:consent:2";
export const BROWSER_NUMBER_KEY = "hedge-school:browser-number:1";
