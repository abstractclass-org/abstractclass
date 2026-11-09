// A review from the browser's store alone, with no search (Hedge School's designs 13 and 20): the engine's rules give
// the positions, the site's own step after them gives what it adds (Hedge School's opening book's values, Cyanotype's
// check of the record's capture marks), and the stored results give the rest. Three parts of each site take these
// steps, in one order, so that their quality labels are the ones that the review page shows: the label snapshot
// (openStored), the annotated record of a stored game (annotatedFromStore), and the review snapshot, a game's last
// review by an earlier engine or network file shown as it was (openSnapshot). The review page takes the first steps
// too (startStored). Each site's src/lib/review/storedReview.ts gives its step.
import { GameAnalysis } from "./analysis.svelte.ts";
import { snapshotExcept, snapshotPositions, snapshotSearch } from "./cache.ts";
import type { Game, GameTypes } from "./game.ts";
import type { ReviewMark } from "./games.ts";
import type { ReviewData } from "./model.ts";
import { EnginePool } from "@abstractclass/engine/pool.ts";
import { modelOf, type Manifest } from "@abstractclass/engine/client.ts";

/** A site's step after the rules on `g`, the game's analysis: why the site cannot review the game, in a sentence for
 *  the player, or null when it can. */
export type StoredStep<G extends GameTypes> = (g: GameAnalysis<G>) => Promise<string | null>;

/** Starts the review of `g`'s game at the review depth `visits`: the rules (GameAnalysis.start), then the site's step
 *  `step`, once the rules take the game. Answers false when the rules refuse it (`g.error` says why), else what `step`
 *  answers. */
export async function startStored<G extends GameTypes>(g: GameAnalysis<G>, visits: number, step: StoredStep<G>): Promise<string | null | false> {
  g.setReview(visits);
  await g.start();
  if (!g.rulesReady) return false;
  return step(g);
}

/** Opens the review of `g`'s game from the store: startStored, then the stored results of the search `search` with the
 *  network `model` (GameAnalysis.fromStore), when the game is taken. Answers as startStored. The site's step comes
 *  first: the stored results that the review reads (the Greats' confirmations) follow what it gives. */
export async function openStored<G extends GameTypes>(g: GameAnalysis<G>, visits: number, search: string, model: string,
                                                      step: StoredStep<G>): Promise<string | null | false> {
  const taken = await startStored(g, visits, step);
  if (taken === null) await g.fromStore(search, model);
  return taken;
}

/** What a site gives a review from its store. `open` opens the review of `g`'s game from the store at the review depth
 *  `visits`, with the stored results of the search `search` and the network `model`: the site's openStored. It answers
 *  null when the review opened, else why it did not. */
export interface ReviewFromStore<G extends GameTypes> {
  game: Game<G>;
  id: string; // the game's id in the store
  moves: string[];
  komi: number;
  open(g: GameAnalysis<G>, visits: number, search: string, model: string): Promise<string | null>;
}

/** The annotated record of a stored game (Hedge School's design 13), from the stored results of the network `network`
 *  at the review depth `visits`: the ones that the game reviews with. `write` writes it from the review's data and
 *  the game's variations. Loads the engine's rules, not its network. Throws when the store lacks a result of the game's
 *  line: a record without the engine's values would still say that the game was reviewed. */
export async function annotatedFromStore<G extends GameTypes>(stored: ReviewFromStore<G>, manifest: Manifest | null,
                                                              network: string, visits: number,
                                                              players: ReviewData<G>["players"],
                                                              write: (data: ReviewData<G>, branches: GameAnalysis<G>["branches"]) => string): Promise<string> {
  if (!manifest) throw new Error("this site has no engine");
  const model = modelOf(manifest, network);
  if (!model) throw new Error(`this site has no network ${network}`);
  const pool = new EnginePool(0); // the rules alone: no search
  try {
    await pool.start(manifest, network);
    const game = new GameAnalysis(stored.game, pool, stored.moves, stored.id, null, { komi: stored.komi });
    const problem = await stored.open(game, visits, pool.search!, model.sha256);
    if (problem !== null) throw new Error(problem);
    const data = game.data(players);
    if (!data) throw new Error("the engine could not read this game");
    // A game this browser has not reviewed with the current engine and network, or only in part: the review page
    // reviews it. The start is left out: every game shares it, so another game's review stores it.
    const own = data.analysis.slice(1, data.moves.length), found = own.filter(a => a).length;
    if (found === 0) throw new Error("open the game to review it first");
    if (found < own.length) throw new Error("open the game to finish its review first");
    return write(data, game.branches);
  } finally {
    pool.terminate();
  }
}

/** Opens a game's last review, by an earlier engine or network file (`why`), as it was (Hedge School's design 20): the
 *  engine's rules alone (`rules`, a pool of none of the engine's search workers), no network, and the stored results of
 *  the mark's search, which hold the game's line at the review's depth. For an older mark, which names no search, the
 *  search that holds it. The start is left out of that test: every game shares it. So are the positions whose values
 *  the site's step gave (Hedge School's opening book, its design 32): the review took their values there, and the
 *  review snapshot takes them as the review did. `step` is the site's step after the rules (startStored, at the mark's
 *  depth). Answers the review's analysis, frozen (GameAnalysis.freeze), or null when the store lacks the results, the
 *  rules refuse the game or the site's step does: the caller then ends `rules`. */
export async function openSnapshot<G extends GameTypes>(stored: Omit<ReviewFromStore<G>, "open">, rules: EnginePool, manifest: Manifest,
                                                        network: string, mark: ReviewMark, why: "engine" | "network",
                                                        step: StoredStep<G>): Promise<GameAnalysis<G> | null> {
  // The store is read while the rules worker starts: an earlier engine's search is not the site's. The positions that
  // the test needs come once the rules give the game's positions and the site's step its values there.
  const started = rules.start(manifest, network).then(() => snapshotExcept(why, rules.search));
  const g = new GameAnalysis(stored.game, rules, stored.moves, stored.id, null, { komi: stored.komi });
  const line = snapshotPositions(stored.moves, stored.komi);
  let taken = false;
  // An older mark, which names no search, is older than the book: its review searched every position, and the removal
  // of earlier results keeps them by that rule (Hedge School's earlierResults.ts)
  const needed = started.then(async () => {
    taken = (await startStored(g, mark.visits, step)) === null;
    return mark.search === undefined ? line : line.filter((_, i) => !g.bookResults[i + 1]); // line[i]: after i + 1 moves
  });
  const search = await snapshotSearch(mark.search, mark.model, line, mark.visits, started, needed);
  if (!search || !taken) return null; // the review then runs, and shows why the rules or the site's step refused it
  await g.fromStore(search, mark.model);
  g.freeze(search, mark.model); // its maps from the store alone
  return g;
}
