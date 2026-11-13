// The visitor's Decline of the practice games' link on Cyanotype (its design 33, "Analytics", item 3), kept before any
// page of a context loads, as Hedge School's tests keep it (layout.spec.ts). A build that stores practice games, as
// check:all's and CI's do, asks once with the consent banner at the window's lower left, which would cover the board,
// the hands and the Review tab's list until the visitor chooses. A choice that a test keeps itself stays.
import type { BrowserContext } from "./page-log.ts";

/** The key under which Cyanotype keeps the visitor's choice (src/lib/analytics.svelte.ts). */
const CONSENT_KEY = "cyanotype:consent:1";

/** Keeps the Decline in each page of `context` before the page's code runs, unless the page has a choice already. */
export const declineGames = (context: BrowserContext) => context.addInitScript(key => {
  try {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({ games: "denied" }));
  } catch { /* about:blank has no storage */ }
}, CONSENT_KEY);
