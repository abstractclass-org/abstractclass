// Move labels: from a played edge's loss, in win chance and in points, from the mover's side.
//
// Placeholders until Enclosure's own thresholds are fitted (design 01, principle 3):
// - Win-chance bands: chess.com's bands of expected points (Excellent to 0.02, Good to 0.05, Inaccuracy to 0.10,
//   Mistake to 0.20, then Blunder).
// - Point bands: KaTrain's bands of points lost (0.5, 1.5, 3, 6, 12 Go points, config.json eval_thresholds) times the
//   engine fork's score scale, 12 (katago/ENCLOSURE.md, "Score scale": Enclosure's score bins against Go's).
// - The label is the worse of the two, as OGS colours a move (src/components/AIReview/generateHeatmapAndMarks.ts):
//   a loss of points in a decided game still shows, though the win chance has saturated.
// - Best: the played edge is the engine's first choice. Great: the first choice, when the second is at least 0.10 of
//   win chance worse: the only good edge (En Croissant's "!" rule, utils/score.ts).

export type Label = "great" | "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder";
export const LABELS: Label[] = ["great", "best", "excellent", "good", "inaccuracy", "mistake", "blunder"];
export const BAD_LABELS: Label[] = ["inaccuracy", "mistake", "blunder"];

export const SCORE_SCALE = 12;
/** The Good band's upper limits, in win chance and in points: a loss within both is Good or better. */
export const GOOD_WIN = 0.05, GOOD_POINTS = 3 * SCORE_SCALE;
const WIN_BANDS: [Label, number][] = [["excellent", 0.02], ["good", GOOD_WIN], ["inaccuracy", 0.10], ["mistake", 0.20]];
const POINT_BANDS: [Label, number][] = [["excellent", 1.5 * SCORE_SCALE], ["good", GOOD_POINTS],
                                        ["inaccuracy", 6 * SCORE_SCALE], ["mistake", 12 * SCORE_SCALE]];
export const ONLY_EDGE_GAP = 0.10;

const band = (bands: [Label, number][], loss: number): Label => {
  for (const [label, upTo] of bands) if (loss <= upTo) return label;
  return "blunder";
};
const worse = (a: Label, b: Label) => (LABELS.indexOf(a) >= LABELS.indexOf(b) ? a : b);

/** The label of a played edge. `pointsLost` is undefined when the analysis has no scores. */
export function classify(winLoss: number, pointsLost: number | undefined, playedBest: boolean, isOnly: boolean): Label {
  if (playedBest) return isOnly ? "great" : "best";
  const byWin = band(WIN_BANDS, winLoss);
  return pointsLost === undefined ? byWin : worse(byWin, band(POINT_BANDS, pointsLost));
}
