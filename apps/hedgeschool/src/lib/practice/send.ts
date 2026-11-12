// Practice games sent to the site when they end (design 25): the practice's sending (@abstractclass/practice/send.ts),
// with Hedge School's queue, version and analytics. The game as the site stores it (stored.ts), then a queue in this
// browser for the games that could not be sent, which go on a later visit (the layout sends them). Only a build that
// stores games sends them (STORES_PRACTICE_GAMES, the build's VITE_STORE_PRACTICE_GAMES): the site's production and
// preview deployments, each to its own database.
import { SITE_VERSION, STORES_PRACTICE_GAMES } from "#lib/edition.ts";
import { forgetNumber, keptNumber, linksGames } from "#lib/analytics.svelte.ts";
import { practiceSender } from "@abstractclass/practice/send.ts";

export type { StoredPractice } from "./stored.ts";

export const { storedGame, sendPractice, flushPractice, deletePractice } = practiceSender({
  outbox: "hedge-school:practice-outbox:1", stores: STORES_PRACTICE_GAMES, version: SITE_VERSION,
  linksGames, keptNumber, forgetNumber,
});
