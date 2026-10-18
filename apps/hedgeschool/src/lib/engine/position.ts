// The engine's description of a position (protocol.ts, PositionFields), as the board draws it (review/model.ts,
// Position), and its rules as the edge input takes them. A module of its own, with nothing of the engine's workers, so
// that a script in Node can store positions for a page (scripts/home-replay.mjs, the home page's scenes) without
// loading the analysis.
import { parseEdge, parsePoint } from "./notation.ts";
import type { DescribeReply, PositionFields } from "./protocol.ts";
import type { EdgeRules } from "#lib/board/edgeInput.svelte.ts";
import type { Position } from "#lib/review/model.ts";

/** The rules of describe's position, for the edge input (board/edgeInput.svelte.ts): its legal edges (not "pass") and
 *  the mover's nodes. */
export const rulesOf = (reply: DescribeReply): EdgeRules => ({
  legal: reply.legal.filter(m => m.includes("-")).map(parseEdge),
  nodes: reply.nodes[reply.mover].map(parsePoint),
});

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
