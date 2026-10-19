// The sample game (review.json, made as scripts/mock/README.md tells): a bot game with its positions and a mock
// analysis, as the review reads it, and its moves in the engine's notation.
import { moveName, type ReviewData } from "#lib/review/enclosure.ts";
import data from "./review.json";

export const SAMPLE = data as unknown as ReviewData;
export const SAMPLE_MOVES: string[] = SAMPLE.moves.map(m => moveName(m.edge));
