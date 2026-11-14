// The keys under which this browser keeps Hedge School's settings, the consent's answer, the practice game and the
// Analysis board's position in local storage. The site's modules and the browser tests (tests/) import them from here,
// so a key's new version reaches the tests too. This module imports nothing: Playwright's loader, which loads the
// tests' imports in Node, cannot load a .svelte file or read import.meta.env. review/display.ts imports a .svelte file,
// analytics.svelte.ts reads import.meta.env, and the Analysis board's page is a .svelte file.

/** The engine's settings (analysis/engineSettings.ts). Version 2: the review's names changed (version 1's "standard"
 *  was 256 visits, now Lite's). */
export const ENGINE_KEY = "learn-enclosure:engine:2";
/** The review's display settings (review/display.ts). */
export const DISPLAY_KEY = "learn-enclosure:review-display:1";
/** The consent's answer (analytics.svelte.ts). :1 (analytics-consent:1) held Google Analytics' alone. :2 held it and
 *  the games' link. */
export const CONSENT_KEY = "hedge-school:consent:2";
/** The random number that links the practice games (analytics.svelte.ts). */
export const BROWSER_NUMBER_KEY = "hedge-school:browser-number:1";
/** The player's choices on Practice's settings card (practice/hedgefund.ts). */
export const PRACTICE_CHOICES_KEY = "hedge-school:practice-choices:1";
/** The practice game in progress (practice/hedgefund.ts). */
export const PRACTICE_GAME_KEY = "hedge-school:practice-game:1";
/** The position on the Analysis board's screen, kept for the next visit (routes/analysis/+page.svelte). A convenience:
 *  the board opens at the start without it. */
export const BOARD_AT_KEY = "hedge-school:board-at";
