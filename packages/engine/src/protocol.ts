// The engine protocol, version 0.6.1 (the engine repository's docs/design/04-notation-and-protocol.md): KataGo's
// analysis protocol as JSON lines, with the rules as actions. Only the fields the site uses are typed. Before 1.0, a
// breaking change takes the next minor version (0.6 to 0.7) and a compatible change the next patch (0.6 to 0.6.1), so
// a client takes the patches of its minor version (design 04, "Versioning"). A client ignores reply fields it does not
// know, takes an error it does not know as a failed request, and sends only the actions and fields of design 04.
//
// 0.3 searches with KataGo's analysis defaults (root noise on, no moves from before the root to the network), and a
// request without a `seed` gives the same reply each time. The site sends no settings, so it keeps those defaults
// (docs/decisions/engine.md, "Protocol 0.3").
//
// 0.4 keeps KataGo's symmetric twins in `moveInfos` (the engine's design 04, "Symmetric twins"): in a position that is
// its own image, as the start is under the mirror of row r to row 20 - r, the engine searches one edge of each mirror
// pair and lists the other right after it, with its values, its line mirrored, and `isSymmetryOf` naming the searched
// edge. A twin is the same move: a second choice or a count of visits skips it (@abstractclass/analysis/model.ts,
// distinctCandidates).
//
// 0.5 checks that a position could occur in a game (request 16): `describe` gives `check` for its `position`, and an
// analysis of a position that no game reaches gets an error with the reasons. Its search is 0.4's (request 17).
//
// 0.6 adds `search` to the engine tag and to `query_version`: the first build that searched as this one does. The
// site keys stored results by it (@abstractclass/analysis/cache.ts). Earlier modules do not report it: the manifest
// gives it (engine.lock.json). The manifest keeps it for later modules too: the review reads its stored results before
// the module answers (cache.ts, warmCache).
//
// 0.6.1 adds `describe_game` (request 18): every position of a game from a move on, in one request, with describe's
// fields but the legal moves, the nodes and the check, and each move's cut edge.
//
// 0.7.0 is Blueprints' build only (request 24): the search of the root's views. `rootViews` is on by default, so a query
// can search several views of the board. A reply of more views has no network's raw values, and a query whose searches
// find no candidate is refused with an error of the field `maxVisits`. New in it: a query's `rootViews`, `rootInfo`'s
// `views` and `searches`, and a candidate's `checkVisits`. Enclosure's engine stays 0.6.x, so each site says which
// protocol its code is written for: Hedge School PROTOCOL, Cyanotype ROOT_VIEWS_PROTOCOL (its engine.lock.json's
// `protocol`, which fetch-engine.mjs copies into the manifest).
//
// 0.7.1 is compatible (abscls-csmy): a query whose searches find no candidate, as with few visits over many views, is
// no longer refused. The search gives its first pass's policy move. Cyanotype's practice bot then plays at any
// visits from 1, as Hedge School's does.
//
// 0.8.0 is Blueprints' build only, and breaks a 0.7 client as 0.5 broke a 0.4 client (request 28): `describe` gives
// `check` for its `position`, as Enclosure's 0.5 does, and an analysis of a position that no game reaches is refused
// with an error of the field `position` and the reasons. A finished position gets the game's end first. Its search is
// 0.7.1's (search 91ab0b7d). Each game's reason names its own places: Enclosure's its edges, Blueprints' its hexes.
//
// The fields of describe, describe_game and play are each game's own: the engine package types only the analysis and
// the messages that every game's engine shares (design 29). Enclosure's are in Hedge School's
// src/lib/engine/position.ts. Every win chance and score is from the first player's side (KataGo's convention:
// Enclosure's Blue). Win chance 0-1. Scores in game points.

/** The protocol that a site's code is written for, unless its manifest names another: 0.6.1 brings describe_game. */
export const PROTOCOL = "0.6.1";
/** Blueprints' protocol: 0.7.0 brings the search of the root's views, 0.7.1 its move at few visits, and 0.8.0 the
 *  position check. */
export const ROOT_VIEWS_PROTOCOL = "0.8.0";
/** Whether a build's protocol is one that a site written for `site` speaks: the same major and minor version (before
 *  1.0, a minor version can break), with `site`'s patch or a later one. */
export function speaksProtocol(version: string, site = PROTOCOL): boolean {
  const [major, minor, patch] = site.split(".").map(Number);
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return !!m && Number(m[1]) === major && Number(m[2]) === minor && Number(m[3]) >= patch;
}

/** The engine tag on every analysis reply: which build and which network made it (the network's SHA-256). */
export interface EngineTag { protocol: string; build: string; search: string; model: string }

/** A reason why a position could not occur in a game (Enclosure's protocol 0.5, Blueprints' 0.8.0): its code and
 *  words for the player. Each game's reason also names its places: Enclosure's `edges`, Blueprints' `hexes`. */
export interface CheckReason { code: string; text: string }
/** describe's `check` of its `position`: whether a game can reach it, and the reasons when none can. */
export interface PositionCheck<R extends CheckReason = CheckReason> { possible: boolean; reasons: R[] }
/** Why no game can reach a position, for a notice: `lead`, the site's words that say so, then each reason in the
 *  engine's words, each a sentence of its own. Each site gives the lead that fits the words before it: a notice that
 *  starts "cannot open this position:" goes on with "no game can reach it", and a sentence alone says "No game can reach
 *  this position". Null when a game can reach the position, or when the engine gave no check. */
export function checkProblem(check: PositionCheck | null | undefined, lead: string): string | null {
  if (!check || check.possible) return null;
  return [lead, ...check.reasons.map(r => r.text)].map(s => s.replace(/\.?$/, ".")).join(" ");
}

export interface ErrorReply { id: string; error: string; field?: string; reasons?: CheckReason[] }

export interface VersionReply {
  id: string;
  protocol: string;
  build: string;
  search: string; // from protocol 0.6
  rules: string;
  model: ModelInfo | null;
  trained: string[];
}
export interface ModelInfo { name: string; bytes: number; sha256: string }
export interface LoadModelReply { id: string; model: ModelInfo }

/** A query starts from the standard start, or from `position` (one line of the notation), then plays `moves`. */
export interface PositionQuery { position?: string; moves: string[] }
/** The query of `moves` from `start`: the standard start when it is null. */
export const positionQuery = (start: string | null | undefined, moves: string[]): PositionQuery =>
  ({ ...(start ? { position: start } : {}), moves });

/** describe_game's reply: each position from the query's `from` to the end, in the game's own fields (Enclosure's:
 *  Hedge School's src/lib/engine/position.ts). */
export interface DescribeGameReply<F> { id: string; positions: F[] }

export interface AnalysisQuery extends PositionQuery {
  maxVisits: number;
  komi?: number; // KataGo's: the komi, points added to Red's final score (a starting score); none: 0
  slice?: { visits: number } | { ms: number };
  includePolicy?: boolean;
  includeOwnership?: boolean; // KataGo's: the reply gives `ownership`
  includePVVisits?: boolean; // KataGo's: the reply gives the visits of each move of each pv
  rootViews?: boolean; // 0.7: whether to search the root's views, by default the module's setting (true)
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
  // 0.7, in a search of more views: the visits of the search of the candidate's child position (its check), whose
  // values the candidate then has. `visits` are its visits in the searches of the views.
  checkVisits?: number;
}

/** A view of Blueprints' board (0.7): the hex in its middle, its orientation (0 to 5) and its radius in hexes. */
export interface EngineView { q: number; r: number; orientation: number; radius: number }

export interface RootInfo {
  currentPlayer: string; // the player to move, as the game's engine names it (Enclosure's: "b", "r")
  visits: number;
  winrate: number;
  scoreSelfplay: number;
  scoreStdev: number;
  scoreLead: number;
  // The network's values at the root. A reply of more views (0.7) has none: each of its searches has its own root.
  rawWinrate?: number;
  rawScoreSelfplay?: number;
  rawLead?: number;
  // 0.7: the views that hold the root's legal placements (the cover), and the searches that the move took: one for each
  // view, then one for each candidate that a second search checked.
  views?: EngineView[];
  searches?: number;
}

export interface AnalysisReply {
  id: string;
  engine: EngineTag;
  isDuringSearch: boolean;
  terminated?: boolean;
  rootInfo: RootInfo;
  moveInfos: MoveInfo[];
  policy?: [string, number][]; // every legal edge with its prior, highest first
  // With includeOwnership: a value for each point, from the first player's side (Enclosure: 361, index y * 19 + x), the
  // mean over the search's tree of the network's ownership (KataGo's getAverageTreeOwnership). Enclosure's: from -1 to 1,
  // the mean over the turn ends left of +1 inside Blue's regions and -1 inside Red's (the engine repository's
  // games/enclosure/docs/design/06-ownership-and-spatial-targets.md).
  ownership?: number[];
  // 0.7: the view whose hexes the ownership gives, the rule's view of the position. Blueprints' ownership has a value
  // for each hex of the view, at the index y * 67 + x (the engine repository's games/blueprints/README.md, "The
  // ownership").
  view?: EngineView;
}

export const isError = (r: unknown): r is ErrorReply => typeof r === "object" && r !== null && "error" in r;
