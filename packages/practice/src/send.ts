// Practice games sent to the site when they end (Hedge School's design 25): the game as the site stores it (stored.ts),
// then a queue in this browser for the games that could not be sent, which go on a later visit (each site's layout
// sends them). Only a build that stores games sends them (the site's `stores`, the build's
// VITE_STORE_PRACTICE_GAMES): the site's production and preview deployments, each to its own database. Each site gives
// its queue's key, its version and its analytics' link of the games (Hedge School's src/lib/practice/send.ts,
// Cyanotype's).
import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";
import { storedDay, type StoredOutcome, type StoredPractice } from "./stored.ts";
import type { KeptPractice } from "./practice.ts";
import type { BotMode } from "./botMessages.ts";

/** A site's part of the sending. */
export interface SendingSite {
  outbox: string; // the queue's key in this browser
  stores: boolean; // whether this build stores practice games
  version: string; // the site's version (its commit)
  linksGames(): boolean; // whether the visitor accepts the games' link now (the analytics' choice)
  keptNumber(): string | null; // the browser's random number, when it has one
  forgetNumber(): void;
}

const OUTBOX_MAX = 50; // the games kept waiting: past this, the oldest go
const API = "/api/practice-games";

/** A site's sending: the stored game, the send through the queue, the queue's flush and the delete of a number's
 *  games. */
export function practiceSender(site: SendingSite) {
  /** The game as the site stores it: `record` with no name of the player, the result, the player's outcome, and the
   *  browser's number (null without the visitor's consent). Null for a game with no move played against the bot: an
   *  Abort before any move keeps nothing. */
  function storedGame(kept: KeptPractice<BotMode>, record: string, result: string, outcome: StoredOutcome,
                      browser: string | null): StoredPractice | null {
    const brought = kept.brought ?? 0;
    if (kept.moves.length <= brought) return null;
    return {
      version: 1, id: kept.id ?? crypto.randomUUID(), browser, ended: storedDay(new Date()), site: site.version,
      bot: { ...kept.bot, form: kept.form ?? null, builds: kept.builds }, ...(kept.komi ? { komi: kept.komi } : {}),
      side: kept.human === 0 ? "blue" : "red",
      outcome, result, record, brought, takebacks: kept.undone ?? [],
      ms: Array.from(kept.moves, (_, i) => kept.ms?.[i] ?? null),
    };
  }

  const readOutbox = () => readLocalJson<StoredPractice[]>(site.outbox) ?? [];
  const writeOutbox = (games: StoredPractice[]) =>
    writeLocal(site.outbox, games.length ? JSON.stringify(games.slice(-OUTBOX_MAX)) : null);

  /** Sends a game that ended, through the queue. Nothing in a build that stores no games. */
  function sendPractice(game: StoredPractice | null) {
    if (!site.stores || !game) return;
    const box = readOutbox();
    if (!box.some(g => g.id === game.id)) writeOutbox([...box, game]);
    void flushPractice();
  }

  /** A waiting game as it goes now: with the browser's number only while the visitor accepts the link, as the browser
   *  keeps the choice now (another tab may have changed it), and while the number is still this browser's (its games
   *  not deleted since). Else with no number. */
  const asNow = (game: StoredPractice): StoredPractice =>
    game.browser && site.linksGames() && game.browser === site.keptNumber() ? game : { ...game, browser: null };

  let flushing = false;
  /** Sends the games that wait, oldest first, and stops at the first that fails for now (offline, or the site's
   *  database unreachable): it waits for the next visit. A game that the site refuses (400 or 413) leaves the queue:
   *  sending it again would not change the answer. Each game is read from the queue again just before it goes, so that
   *  a game deleted meanwhile, in this tab or another, does not go. */
  async function flushPractice() {
    if (!site.stores || flushing) return;
    flushing = true;
    try {
      for (const { id } of readOutbox()) {
        const game = readOutbox().find(g => g.id === id);
        if (!game) continue;
        let done = false;
        try {
          const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(asNow(game)), keepalive: true });
          done = r.ok || r.status === 400 || r.status === 413;
        } catch {
          // offline: the game waits
        }
        if (!done) break;
        writeOutbox(readOutbox().filter(g => g.id !== id));
      }
    } finally {
      flushing = false;
    }
  }

  /** Deletes the games sent with this browser's number (the privacy page), and forgets the number: their count. Throws
   *  when the site cannot. The games with the number that still wait leave the queue unsent. A game with the number
   *  already on its way, from this tab or another, is the site's to refuse: it keeps the deleted numbers, and keeps no
   *  game that arrives with one (storedFunction.ts). */
  async function deletePractice(browser: string): Promise<number> {
    writeOutbox(readOutbox().filter(g => g.browser !== browser));
    const r = await fetch(API, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ browser }) });
    if (!r.ok) throw new Error(`the site could not delete them (${r.status})`);
    const { deleted } = (await r.json()) as { deleted: number };
    if (site.keptNumber() === browser) site.forgetNumber();
    return deleted;
  }

  return { storedGame, sendPractice, flushPractice, deletePractice };
}
