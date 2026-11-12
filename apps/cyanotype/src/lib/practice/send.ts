// Practice games against Stamp Duty sent to the site when they end (design 33, "Practice against Stamp Duty"; Hedge
// School's design 25): the practice's sending (@abstractclass/practice/send.ts), with Cyanotype's queue, version and
// analytics, as Hedge School's src/lib/practice/send.ts. A game that could not be sent waits in this browser, and goes
// on a later visit (the layout sends it). Only a build that stores games sends them (STORES_PRACTICE_GAMES, the
// build's VITE_STORE_PRACTICE_GAMES): the site's production and preview deployments, each to its own database.
import { STORES_PRACTICE_GAMES } from "@abstractclass/site/edition.ts";
import { forgetNumber, keptNumber, linksGames } from "../analytics.svelte.ts";
import { SITE_VERSION } from "../site.ts";
import { practiceSender } from "@abstractclass/practice/send.ts";

export type { StoredPractice } from "./stored.ts";

export const { storedGame, sendPractice, flushPractice, deletePractice } = practiceSender({
  outbox: "cyanotype:practice-outbox:1", stores: STORES_PRACTICE_GAMES, version: SITE_VERSION,
  linksGames, keptNumber, forgetNumber,
});
