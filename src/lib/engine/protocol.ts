// The engine protocol, version 0.5 (the engine repository's docs/design/04-notation-and-protocol.md): KataGo's analysis
// protocol as JSON lines, with the rules as actions. Only the fields the site uses are typed. Before 1.0 the protocol
// is in development (Semantic Versioning's 0.x): any new version may break a client, so a client accepts only the
// exact version it was written for.
//
// 0.3 searches with KataGo's analysis defaults (root noise on, no moves from before the root to the network), and a
// request without a `seed` gives the same reply each time. The site sends no settings, so it keeps those defaults
// (docs/decisions/engine.md, "Protocol 0.3").
//
// 0.4 keeps KataGo's symmetric twins in `moveInfos` (the engine's design 04, "Symmetric twins"): in a position that is
// its own image, as the start is under the mirror of row r to row 20 - r, the engine searches one edge of each mirror
// pair and lists the other right after it, with its values, its line mirrored, and `isSymmetryOf` naming the searched
// edge. A twin is the same move: a second choice or a count of visits skips it (review/model.ts, distinctCandidates).
//
// 0.5 checks that a position could occur in a game (request 16): `describe` gives `check` for its `position`, and an
// analysis of a position that no game reaches gets an error with the reasons. Its search is 0.4's (request 17).
//
// 0.6 adds `search` to the engine tag and to `query_version`: the first build that searched as this one does. The
// site keys stored results by it (analysis/cache.ts). Earlier modules do not report it: the manifest gives it
// (engine.lock.json).
//
// Every win chance and score is from Blue's side. Win chance 0-1. Scores in game points.

export const PROTOCOL = "0.5";
/** The versions a build may report for PROTOCOL. */
export const PROTOCOL_REPORTED = ["0.5"];

export type Side = "b" | "r";

/** The engine tag on every analysis reply: which build and which network made it (the network's SHA-256). */
export interface EngineTag { protocol: string; build: string; search?: string; model: string }

/** A reason why a position could not occur in a game (protocol 0.5): its code, words for the player, and the edges
 *  that it names. */
export interface CheckReason { code: string; text: string; edges: string[] }

export interface ErrorReply { id: string; error: string; field?: string; reasons?: CheckReason[] }

export interface VersionReply {
  id: string;
  protocol: string;
  build: string;
  search?: string; // from protocol 0.6
  rules: string;
  model: ModelInfo | null;
  trained: string[];
}
export interface ModelInfo { name: string; bytes: number; sha256: string }
export interface LoadModelReply { id: string; model: ModelInfo }

/** A query starts from the standard start, or from `position` (one line of the notation), then plays `moves`. */
export interface PositionQuery { position?: string; moves: string[] }

export interface DescribeReply {
  id: string;
  position: string;
  edges: Record<Side, string[]>;
  nodes: Record<Side, string[]>;
  protected: string[];
  placed: string[];
  regions: Record<Side, [number, number][][]>; // polygons; their union is the enclosed region
  areas: [number, number];
  scores: [number, number];
  mover: Side;
  movesLeft: number;
  moveCount: number;
  legal: string[];
  outcome: { result: string } | null;
  check?: { possible: boolean; reasons: CheckReason[] }; // the position's, before its moves (protocol 0.5)
}

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

export interface AnalysisQuery extends PositionQuery {
  maxVisits: number;
  slice?: { visits: number } | { ms: number };
  includePolicy?: boolean;
  includeOwnership?: boolean;
  includePVVisits?: boolean; // KataGo's: the reply gives the visits of each move of each pv
}

export interface MoveInfo {
  move: string;
  order: number;
  // KataGo's two counts (search/searchresults.cpp): `visits` is the child node's, which with graph search includes the
  // visits that reach the same position by another order of edges (common: a turn's two edges in either order).
  // `edgeVisits` is the visits through this move: KataGo's order and its LCB check use it.
  visits: number;
  edgeVisits: number;
  winrate: number;
  scoreSelfplay: number;
  scoreStdev: number;
  scoreLead: number;
  prior: number;
  lcb: number;
  utility: number;
  pv: string[];
  // With includePVVisits, one number for each move of `pv` (KataGo's): `pvVisits` the node's visits after the move,
  // `pvEdgeVisits` the visits through the move. With graph search both can grow along a line.
  pvVisits?: number[];
  pvEdgeVisits?: number[];
  // A symmetric twin (0.4): the edge that was searched, of which this edge is the mirror image. Its values, visits and
  // prior are that edge's, its line and ownership mirrored. Absent for a searched edge.
  isSymmetryOf?: string;
}

export interface RootInfo {
  currentPlayer: Side;
  visits: number;
  winrate: number;
  scoreSelfplay: number;
  scoreStdev: number;
  scoreLead: number;
  rawWinrate: number;
  rawScoreSelfplay: number;
  rawLead: number;
}

export interface AnalysisReply {
  id: string;
  engine: EngineTag;
  isDuringSearch: boolean;
  terminated?: boolean;
  rootInfo: RootInfo;
  moveInfos: MoveInfo[];
  policy?: [string, number][]; // every legal edge with its prior, highest first
  ownership?: number[]; // 361 values, index y * 19 + x, row 1 first, from Blue's side
}

export const isError = (r: unknown): r is ErrorReply => typeof r === "object" && r !== null && "error" in r;
