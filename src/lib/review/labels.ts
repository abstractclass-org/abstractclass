// Move labels: from a played edge's or turn's loss of win chance, from the mover's side (design 10).
//
// - The win chance is a human player's, not the engine's: σ(HUMAN_WIN_K · lead / spread), from the engine's lead
//   (scoreLead) and its spread (scoreStdev), as Lichess turns Stockfish's centipawns into the win chance of human games
//   (lila pull request 11148). The engine's own win chance is that of a game between two engines. The curve is fitted
//   on the meaf.us archive's games between near-equal players (scripts/measure/fit-win-curve.mjs, decisions/engine.md,
//   "The win curve's flat middle"): 0.986 at 1,024 visits, 0.998 at 512.
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

export const HUMAN_WIN_K = 0.99;
/** A human player's win chance, Blue's, from the engine's lead for Blue and its spread (both in points). */
export const humanWin = (blueLead: number, spread: number) => 1 / (1 + Math.exp(-HUMAN_WIN_K * blueLead / Math.max(1, spread)));

/** The Good band's upper limit: a loss within it is Good or better. */
export const GOOD_WIN = 0.05;
const WIN_BANDS: [Label, number][] = [["excellent", 0.02], ["good", GOOD_WIN], ["inaccuracy", 0.10], ["mistake", 0.20]];
export const ONLY_EDGE_GAP = 0.10;

/** The label of a played edge or turn, from its loss of a human's win chance. */
export function classify(winLoss: number, playedBest: boolean, isOnly: boolean): Label {
  if (playedBest) return isOnly ? "great" : "best";
  for (const [label, upTo] of WIN_BANDS) if (winLoss <= upTo) return label;
  return "blunder";
}
