// Move labels: from a played edge's or turn's loss of win chance, from the mover's side (design 10).
//
// - The win chance is the engine's own (its winrate), as chess.com and Lichess judge a move by the win chance their
//   engine gives. It saturates in a decided game, so a move there loses little: a label tells what a move cost the
//   result. Tested on games of known strength (decisions/engine.md, "The label rules on games of known strength").
// - The bands: chess.com's bands of expected points (Excellent to 0.02, Good to 0.05, Inaccuracy to 0.10, Mistake to
//   0.20, then Blunder), the same for every player. Points lost are shown in the notes, but they do not label: a point
//   band flags the moves of a decided game, which chess.com's and Lichess's win-chance labels leave alone.
// - Best: the played edge is the engine's first choice. Great: the first choice, when the second is at least 0.10 of
//   win chance worse: the only good edge (En Croissant's "!" rule, utils/score.ts). The rule compares two equal
//   searches, so a gap in one search only asks for a search of the position after the second choice, as deep as the
//   position after the played edge (model.ts, confirmedOnly).

export type Label = "great" | "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder";
export const LABELS: Label[] = ["great", "best", "excellent", "good", "inaccuracy", "mistake", "blunder"];
export const BAD_LABELS: Label[] = ["inaccuracy", "mistake", "blunder"];

/** The Good band's upper limit: a loss within it is Good or better. */
export const GOOD_WIN = 0.05;
const WIN_BANDS: [Label, number][] = [["excellent", 0.02], ["good", GOOD_WIN], ["inaccuracy", 0.10], ["mistake", 0.20]];

/** The meter's groups (model.ts, `likelyEdges`): Good or better (a loss up to GOOD_WIN), then Inaccuracy, Mistake and
 *  Blunder, by the labels' bands. Maia's Blunder Meter has three groups, cut at 0.05 and 0.10 of win chance; these cut
 *  at the same two places, and at 0.20 too. */
export const METER_GROUPS = ["good", "inaccuracy", "mistake", "blunder"] as const;
export type MeterGroup = (typeof METER_GROUPS)[number];
export function meterGroup(winLoss: number): MeterGroup {
  return winLoss <= GOOD_WIN ? "good" : winLoss <= 0.10 ? "inaccuracy" : winLoss <= 0.20 ? "mistake" : "blunder";
}
export const ONLY_EDGE_GAP = 0.10;

/** A hard position: KaTrain's complexity (model.ts, `complexity`) in win chance at least this much, so that the
 *  network's likely moves lose a Mistake's worth on average. On the archive these are the hardest tenth of the
 *  positions, where 62% of the played edges were Mistakes or worse (decisions/engine.md, "Complexity on the archive"). */
export const HARD = 0.10;

/** A move's weight in its player's accuracy, as KaTrain weighs its points lost (katrain/core/ai.py, game_report):
 *  max(complexity, loss), each against the weight it gets in full, between 0.05 and 1. KaTrain's full weights are a
 *  complexity of 1 Go point and 4 points lost; here, in win chance, a hard position's complexity (HARD) and a
 *  Blunder's loss (0.20). Without a complexity (an analysis without the network's priors), the move weighs 1. */
export function accuracyWeight(complexity: number | undefined, loss: number): number {
  if (complexity === undefined) return 1;
  return Math.max(0.05, Math.min(1, Math.max(complexity / HARD, loss / 0.20)));
}

/** The label of a played edge or turn, from its loss of the engine's win chance. */
export function classify(winLoss: number, playedBest: boolean, isOnly: boolean): Label {
  if (playedBest) return isOnly ? "great" : "best";
  for (const [label, upTo] of WIN_BANDS) if (winLoss <= upTo) return label;
  return "blunder";
}
