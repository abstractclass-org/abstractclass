// A game record into the player's games (design 33, as Hedge School's src/lib/game/import.ts): refused when the review
// does not take it (a game from a set-up start, setUpProblem), checked by the engine's rules (a move that they refuse,
// a capture mark that they do not confirm: review/recordCheck.ts), given its capture marks, and kept in this browser
// (store.ts). So the list keeps no game that the review refuses. The Review tab's paste and a shared review's page
// (review/SharedArrival.svelte) come here (importRecord), and so does the import page's review, with the check that
// the page ran already (keepChecked). Each shows the outcome.
import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
import { mergeBranches, type KeptBranches } from "@abstractclass/analysis/kept.ts";
import type { Checked } from "./check.ts";
import { markCaptures, parseRecord, setUpProblem, type GameRecord } from "./record.ts";
import { sharedRecord, type SharedReview } from "./share.ts";
import { saveGame, setGameSettings } from "./store.ts";
import { checkRecordMarks } from "../review/recordCheck.ts";
import { SITE_NAME } from "../site.ts";

/** A record's check by the engine's rules, with each move's capture mark: recordCheck.ts's, in a worker of its own. A
 *  test gives its own. */
export type RecordCheck = (record: GameRecord) => Promise<Checked>;

/** An error's text, ended by one period. */
const sentence = (text: string) => text.replace(/\.?$/, ".");

/** Throws the review's refusal of a game from a set-up start: before the engine's check, which it makes needless. */
function refuseSetUp(record: GameRecord) {
  const setUp = setUpProblem(record, SITE_NAME);
  if (setUp) throw new Error(setUp);
}

/** Imports a read record: the engine's rules check it, then keepChecked keeps it. Returns the game's id, or throws an
 *  Error whose message tells the player what is wrong. */
export async function importRecord(text: string, record: GameRecord,
                                   check: RecordCheck = checkRecordMarks): Promise<string> {
  refuseSetUp(record);
  return keepChecked(text, record, await check(record));
}

/** Keeps a read record with the answer of its check by the engine's rules, `checked`: the import page's, which checked
 *  its game before the choice, so that the rules check it once. Returns the game's id, or throws as importRecord. */
export async function keepChecked(text: string, record: GameRecord, { problem, captures }: Checked): Promise<string> {
  refuseSetUp(record);
  if (problem) throw new Error(`${SITE_NAME} cannot review this game: ${sentence(problem)}`);
  // The record is kept with a capture mark on every move that captures, as the notation writes it.
  const { id, kept } = await saveGame(markCaptures(text, record, captures), record);
  if (!kept) throw new Error("This browser does not let the site keep games (a private window, or blocked site data).");
  return id;
}

/** Keeps a shared review's game and variations in this browser, beside the variations it may have already, and the
 *  sender's network and depth with the game (`network`: this site's id of the sender's network, null when it has no
 *  such network), as Hedge School's importShare does. Its review is not in the link: the review page searches again.
 *  Returns the game's id. */
export async function importShare(shared: SharedReview, network: string | null,
                                  check: RecordCheck = checkRecordMarks): Promise<string> {
  const text = sharedRecord(shared);
  const id = await importRecord(text, parseRecord(text), check);
  if (shared.branches.length)
    await dbPut(STORES.branches, id, mergeBranches((await dbGet<KeptBranches>(STORES.branches, id)) ?? null,
                                                   { version: 2, nodes: shared.branches }));
  if (network) await setGameSettings(id, { network, visits: shared.visits });
  return id;
}
