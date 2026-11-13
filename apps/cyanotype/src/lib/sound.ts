// Which of a move's two sounds (@abstractclass/site/sound.ts, Hedge School's design 08) a Blueprints move plays
// (design 33, "The move sounds"): a placement that captures has the removal's sound, as Hedge School's edge that cuts.
// A placement that captures nothing, an edit and a pass have the move's sound.
import type { BoardMove } from "./board/position.ts";

/** Whether the move removes the opponent's cells: a placement that captures, with points or none. */
export const removes = (move: BoardMove | null | undefined): boolean => move?.type === "place" && move.captured.length > 0;
