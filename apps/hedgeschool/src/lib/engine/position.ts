// Enclosure's description of a position, as its engine's describe and describe_game give it (protocol 0.6.1: the
// engine repository's docs/design/04-notation-and-protocol.md), as the board draws it (review/enclosure.ts, Position),
// and its rules as the edge input takes them. The engine package types only what every game's engine shares (its
// protocol.ts, design 29): these fields are Enclosure's. A module of its own, with nothing of the engine's workers, so
// that a script in Node can store positions for a page (scripts/home-replay.mjs, the home page's scenes) without
// loading the analysis.
import { parseEdge, parsePoint } from "./notation.ts";
import type { CheckReason, DescribeGameReply as GameReply } from "@abstractclass/engine/protocol.ts";
import type { EdgeRules } from "#lib/board/edgeInput.svelte.ts";
import type { Player, Position } from "#lib/review/enclosure.ts";

/** A player as the engine names it: Blue ("b") or Red ("r"). */
export type Side = "b" | "r";
/** The player of a side: 0 Blue, 1 Red. */
export const playerOf = (side: Side): Player => (side === "b" ? 0 : 1);

/** A position as describe and describe_game give it. */
export interface PositionFields {
  position: string;
  edges: Record<Side, string[]>;
  protected: string[];
  placed: string[];
  regions: Record<Side, [number, number][][]>; // polygons; their union is the enclosed region
  areas: [number, number];
  scores: [number, number];
  mover: Side;
  movesLeft: number;
  moveCount: number;
  outcome: { result: string } | null;
}

export interface DescribeReply extends PositionFields {
  id: string;
  nodes: Record<Side, string[]>;
  legal: string[];
  check?: { possible: boolean; reasons: CheckReason[] }; // the position's, before its moves (protocol 0.5)
}

/** A position in describe_game's reply (protocol 0.6.1), and `cuts`: the opponent's edge that the move to it cut, as
 *  `play` gives it. Null before the moves, and after a move that cuts nothing. */
export interface GamePosition extends PositionFields { cuts: string | null }
/** describe_game's reply: each position from the query's `from` to the end, so the cut of `moves[k]` is
 *  `positions[k - from + 1].cuts`. */
export type DescribeGameReply = GameReply<GamePosition>;

export interface PlayReply {
  id: string;
  legal: boolean;
  why?: string;
  move?: string;
  cuts?: string | null;
  removedNodes?: string[];
  position?: string;
  outcome?: { result: string } | null;
}

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
    scores: d.scores, areas: d.areas, player: playerOf(d.mover), movesLeft: d.movesLeft,
    regions: [d.regions.b.map(ring), d.regions.r.map(ring)], over: d.outcome !== null, count: d.moveCount, notation: d.position,
  };
}
