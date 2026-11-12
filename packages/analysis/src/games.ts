// The player's games, kept in the browser (@abstractclass/storage/db.ts, the `games` store) until a server exists
// (Hedge School's design 04). A game is stored as its record's text, so an export is the record itself, and a later
// server can import it as it is. Each site gives its record's reader, a game's id from its record and the local key of
// its last review (gameStore): Hedge School's src/lib/game/store.ts and Cyanotype's. The id covers what makes the game
// (its moves, a set-up start, a komi), so the same game imported twice is one game. A game keeps the mark of its
// deepest review that ran to its end, and the review settings it came with (Hedge School's designs 09 and 13).
import { STORES, dbDelete, dbEntries, dbGet, dbPut } from "@abstractclass/storage/db.ts";
import { keepStorage } from "@abstractclass/storage/persist.ts";
import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";
import { modelOf, moduleOf, searchModules, type Manifest } from "@abstractclass/engine/client.ts";
import { makeEarlierRemovalDue } from "./cache.ts";

export interface StoredGame {
  version: 1;
  id: string;
  record: string; // the record's text, as imported, with the game's marks added (each site's import)
  added: string; // ISO date and time
  reviewed?: ReviewMark; // the deepest review that ran to its end with the engine named in it
  settings?: GameSettings; // the review settings it came with, when it keeps them
  partner?: KeptPartner; // the partner site it came from by a link, which takes its review back (Hedge School's design 18)
}

/** What a game keeps of the partner site it came from: the partner's name and its save page. It is the shape of
 *  @abstractclass/import/partners.ts's GamePartner, which makes it: this package does not depend on that one. */
export interface KeptPartner { name: string; save: string }

/** Keeps the partner site that a game came from, and its save page (@abstractclass/import/partners.ts). */
export async function setGamePartner(id: string, partner: KeptPartner) {
  const game = await dbGet<StoredGame>(STORES.games, id);
  if (game) await dbPut(STORES.games, id, { ...game, partner });
}

/** The review settings that a game keeps (Hedge School's design 13): the network and the review's visits that an
 *  imported review file or a shared link came with, so that its review is the one it came with. The browser's own
 *  settings serve every other game. */
export interface GameSettings { network: string; visits: number }

/** Keeps a game's own review settings. */
export async function setGameSettings(id: string, settings: GameSettings) {
  const game = await dbGet<StoredGame>(STORES.games, id);
  if (game) await dbPut(STORES.games, id, { ...game, settings });
}

/** A review that ran to its end (Hedge School's design 13): the CPU module's and the network's SHA-256 (the
 *  manifest's), the network's id, and the review's depth. A game exports only when its mark names a module of the
 *  site's search, the network set now, and the review depth set now or deeper. `search` is the module's search, which
 *  keys the review's results (cache.ts): a review snapshot reads them by their keys (Hedge School's design 20). An older
 *  mark, which the site kept before marks held their search, has none. */
export interface ReviewMark { module: string; model: string; network: string; visits: number; at: string; search?: string }
/** A review to compare a mark with: its mark, and the modules whose search is its module's (client.ts, searchModules). */
export interface WantedReview extends Omit<ReviewMark, "at"> { modules: string[] }

/** The mark of a review run with `manifest`'s engine and `network` at `visits`, or null when the manifest lacks them. */
export function reviewMark(manifest: Manifest, network: string, visits: number): WantedReview | null {
  const m = moduleOf(manifest), module = m?.sha256, model = modelOf(manifest, network)?.sha256;
  return module && model
    ? { module, model, network, visits, ...(m?.search ? { search: m.search } : {}), modules: searchModules(manifest) }
    : null;
}

/** Whether `mark` covers a review with these: the same search and network, at least as deep. */
export const reviewCovers = (mark: ReviewMark | undefined, want: WantedReview | null) =>
  !!mark && !!want && want.modules.includes(mark.module) && mark.model === want.model && mark.visits >= want.visits;

/** Why a game reviewed before is reviewed again, when the site changed and the player did not: "engine" when the
 *  engine's search changed, "network" when the same network has another file, null otherwise (no review before, or the
 *  player chose another network or a deeper review). The stored results are keyed by both, so the review runs again.
 *  The page tells the player why (Hedge School's design 11). */
export function reviewAgainWhy(mark: ReviewMark | undefined, want: WantedReview | null): "engine" | "network" | null {
  if (!mark || !want || mark.network !== want.network) return null;
  if (!want.modules.includes(mark.module)) return "engine";
  return mark.model !== want.model ? "network" : null;
}

/** Whether a new mark replaces a mark of another CPU module or network file: the earlier one's results, which its
 *  review snapshot read, may then be of no use (Hedge School's design 20). */
export const replacesAnother = (before: ReviewMark | undefined, mark: Omit<ReviewMark, "at">) =>
  !!before && (before.module !== mark.module || before.model !== mark.model);

/** Marks a game's review as done. A deeper mark of the same search and network stays: it takes the search's name when
 *  it has none (an older mark), so that its review snapshot after a later release reads its keys. */
export async function markReviewed(id: string, { modules, ...mark }: WantedReview) {
  const game = await dbGet<StoredGame>(STORES.games, id), before = game?.reviewed;
  if (!game) return;
  if (before && reviewCovers(before, { ...mark, modules })) {
    if (!before.search && mark.search) await dbPut(STORES.games, id, { ...game, reviewed: { ...before, search: mark.search } });
    return;
  }
  await dbPut(STORES.games, id, { ...game, reviewed: { ...mark, at: new Date().toISOString() } });
  if (replacesAnother(before, mark)) makeEarlierRemovalDue();
}

/** What a site gives its store of games: its record's reader, which throws on a record that it cannot read, a game's
 *  id from its record, and the local storage key that names the last game reviewed in this browser. */
export interface GameSite<R extends { moves: string[] }> {
  parse(text: string): R;
  id(record: R): string | Promise<string>;
  lastReviewKey: string;
}

/** A game as the store reads it: a game that a site kept before it had a list of games (Cyanotype's review kept its
 *  record and the time it came) has no version and no id, and its key gives the id. A stored field stays as stored. */
const asStored = (key: string, value: StoredGame): StoredGame =>
  ({ ...value, version: value.version ?? 1, id: value.id ?? key });

/** A site's store of games. */
export function gameStore<R extends { moves: string[] }>(site: GameSite<R>) {
  /** The id of the last game reviewed in this browser, or null. Storage can be blocked, so a read or a write may fail,
   *  and the Review tab then offers no last review. */
  const lastReview = (): string | null => readLocal(site.lastReviewKey);
  /** Keeps the id of the game a review opened, or forgets it (null). */
  const rememberReview = (id: string | null) => writeLocal(site.lastReviewKey, id);
  /** Stored games, each with its key in the store (asStored), with their records read. A game whose record does not
   *  read is left out: it cannot open. The list and the removal of earlier results (earlierResults.ts) read them so. */
  const readGames = (entries: [string, unknown][]): { game: StoredGame; record: R }[] =>
    entries.flatMap(([key, value]) => {
      const game = asStored(key, value as StoredGame);
      try { return [{ game, record: site.parse(game.record) }]; } catch { return []; }
    });
  return {
    lastReview, rememberReview, readGames,

    /** Saves a game. Returns its id, and whether the browser kept it (storage can be blocked). A game kept already
     *  stays as it is. */
    async saveGame(text: string, record: R): Promise<{ id: string; kept: boolean }> {
      const id = await site.id(record);
      const existing = await dbGet<StoredGame>(STORES.games, id);
      if (existing) return { id, kept: true };
      const game: StoredGame = { version: 1, id, record: text, added: new Date().toISOString() };
      const kept = await dbPut(STORES.games, id, game);
      if (kept) void keepStorage(); // the player now has something to lose
      return { id, kept };
    },

    async loadGame(id: string): Promise<{ game: StoredGame; record: R } | undefined> {
      const value = await dbGet<StoredGame>(STORES.games, id), game = value && asStored(id, value);
      return game && { game, record: site.parse(game.record) };
    },

    /** The stored games, newest first. */
    async listGames(): Promise<{ game: StoredGame; record: R }[]> {
      return readGames(await dbEntries<StoredGame>(STORES.games))
        .sort((a, b) => b.game.added.localeCompare(a.game.added));
    },

    /** Deletes a game, its variations, and the Review link's pointer to it, for good: the player confirmed it (Hedge
     *  School's design 11). The site's engine's analyses stay: they belong to positions, which other games can share,
     *  and an import of the same game then opens its review from them at once. An earlier engine's, which only the
     *  game's review snapshot read, go at a later start, unless another game needs them (Hedge School's design 20). */
    async deleteGame(id: string) {
      await Promise.all([dbDelete(STORES.games, id), dbDelete(STORES.branches, id)]);
      if (lastReview() === id) rememberReview(null);
      makeEarlierRemovalDue();
    },
  };
}
