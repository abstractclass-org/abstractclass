// The engine protocol, version 0.3 (the engine repository's docs/design/04-notation-and-protocol.md): KataGo's analysis
// protocol as JSON lines, with the rules as actions. Only the fields the site uses are typed. Before 1.0 the protocol
// is in development (Semantic Versioning's 0.x): any new version may break a client, so a client accepts only the
// exact version it was written for.
//
// 0.3 searches with KataGo's analysis defaults (root noise on, no moves from before the root to the network), and a
// request without a `seed` gives the same reply each time. The site sends no settings, so it keeps those defaults
// (docs/decisions/engine.md, "Protocol 0.3").
//
// Every win chance and score is from Blue's side. Win chance 0-1. Scores in game points.

export const PROTOCOL = "0.3";
/** The versions a build may report for PROTOCOL. */
export const PROTOCOL_REPORTED = ["0.3"];

export type Side = "b" | "r";

/** The engine tag on every analysis reply: which build and which network made it (the network's SHA-256). */
export interface EngineTag { protocol: string; build: string; model: string }

export interface ErrorReply { id: string; error: string; field?: string }

export interface VersionReply {
  id: string;
  protocol: string;
  build: string;
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
