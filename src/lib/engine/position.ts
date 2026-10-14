// The engine's description of a position (protocol.ts, PositionFields), as the board draws it (review/model.ts,
// Position). A module of its own, with nothing of the engine's workers, so that a page can draw a stored position
// (the home page's board) without loading the analysis.
import { parseEdge } from "./notation.ts";
import type { PositionFields } from "./protocol.ts";
import type { Position } from "#lib/review/model.ts";

/** The engine's description of a position, as the board draws it. */
export function boardPosition(d: PositionFields): Position {
  const ring = (poly: [number, number][]) => ({ area: 0, rings: [poly] });
  return {
    edges: [d.edges.b.map(parseEdge), d.edges.r.map(parseEdge)],
    protected: d.protected.map(parseEdge), placed: d.placed.map(parseEdge),
    scores: d.scores, areas: d.areas, player: d.mover === "b" ? 0 : 1, movesLeft: d.movesLeft,
    regions: [d.regions.b.map(ring), d.regions.r.map(ring)], over: d.outcome !== null, count: d.moveCount, notation: d.position,
  };
}
