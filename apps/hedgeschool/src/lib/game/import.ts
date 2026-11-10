// A game record into the player's games: checked with the engine's rules (check.ts), given its cut marks, and kept in
// this browser (store.ts). The pages that import (Home, and the review's ways in, Arrival.svelte) show the outcome.
// It also gives the reason why a page refuses a game of other rules or from a set-up start (variantProblem): the
// review, the Analysis board and Practice each refuse in their own words.
import { setUpRefusal } from "@abstractclass/record/record.ts";
import { setUpStart } from "#lib/engine/notation.ts";
import { checkMoves, type Checked } from "./check.ts";
import { markCuts, type GameRecord } from "./record.ts";
import { saveGame } from "./store.ts";

/** The pages that refuse a game of other rules, each in its own words (design 21, design 24). */
type RulesPage = "review" | "analysis" | "practice";
const onlineRulesSentence: Record<RulesPage, string> = {
  review: "Hedge School reviews games of the online rules only.",
  analysis: "The Analysis board shows games of the online rules only.",
  practice: "Practice plays games of the online rules only.",
};

/** Why a page cannot take a game of other rules or from a set-up start, or null. The notation names the two with the
 *  `Rules` and `Position` tags, which a game of the online rules from the standard start leaves out (the /notation
 *  page). The engine plays the online rules only, so a game of other rules is refused, never reviewed or played by the
 *  wrong rules (design 18). The review refuses a set-up start too: a review is of a game from the standard start
 *  (design 21). The Analysis board and Practice take a set-up start (design 21, design 24). */
export function variantProblem(record: GameRecord, page: RulesPage): string | null {
  const rules = otherRules(record);
  if (rules) return `This game uses other rules (${rules}). ${onlineRulesSentence[page]}`;
  return page === "review" && setUpStart(record.tags.Position) ? setUpRefusal("Hedge School") : null;
}

/** The rules that a game's `Rules` tag names, or null for the online rules: no tag, or "?" or "-". */
function otherRules(record: GameRecord): string | null {
  const rules = record.tags.Rules?.trim();
  return rules && rules !== "?" && rules !== "-" ? rules : null;
}

/** Why each of the arrival's two ways (ToolChoice.svelte, design 21) refuses a tool's game before its click, or null
 *  for a way that takes the game. Each way's reason is the one that its page gives after the click. */
export function wayRefusals(record: GameRecord): { review: string | null; analyze: string | null } {
  return { review: variantProblem(record, "review"), analyze: variantProblem(record, "analysis") };
}

/** A record's check by the engine's rules, with the moves that cut: check.ts's, in a worker of its own. A test gives
 *  its own. */
export type MoveCheck = (record: GameRecord) => Promise<Checked>;

/** Imports a read record: the paste's, a shared review's and a review file's. Returns the game's id, or throws an Error
 *  whose message tells the player what is wrong. */
export async function importRecord(text: string, record: GameRecord, check: MoveCheck = checkMoves): Promise<string> {
  const variant = variantProblem(record, "review");
  if (variant) throw new Error(variant);
  const { problem, cuts } = await check(record);
  if (problem) throw new Error(problem);
  // The record is kept with a cut mark on every move that cuts, as the notation asks.
  const { id, kept } = await saveGame(cuts ? markCuts(text, record, cuts) : text, record);
  if (!kept) throw new Error("This browser does not let the site keep games (a private window, or blocked site data).");
  return id;
}
