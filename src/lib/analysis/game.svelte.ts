// The analysis of one game in the browser, on KaTrain's schedule (core/game.py, analyze_all_nodes and analyze_extra):
// 1. the rules first: every position from the engine's describe, so the board works before the network loads;
// 2. a sweep: every position at a small budget (KaTrain: fast_visits, 25), for the game's shape;
// 3. a label pass: every position at the label budget, since labels from the sweep are mostly wrong;
// 4. deeper where the player looks: the position on screen, searched in slices with its results shown as they come
//    (KaTrain: max_visits, 500), then the key moments. The key moments' searches run in slices too, so that the
//    position on screen can stop one when no worker is free (pool.ts), and the stopped one runs again later.
// The budgets come from the measurement of label agreement against a deep search (docs/decisions/engine.md, "Label
// agreement against search budget"): 256 visits is the first budget whose mistake flags are mostly right.
// Results are kept in the browser (cache.ts).
//
// The game is a tree (src/lib/review/tree.ts): the player can add branches, and a branch's positions are searched as
// the game's are, when the player looks at them. A game's branches are kept in the browser, as Lichess keeps its
// analysis tree (ui/analyse/src/idbTree.ts).
import { describeGame } from "#lib/engine/describe.ts";
import { edgeName, parseEdge, type Edge } from "#lib/engine/notation.ts";
import type { AnalysisReply, DescribeReply, MoveInfo } from "#lib/engine/protocol.ts";
import { errorText } from "#lib/errors.ts";
import { gameId } from "#lib/game/store.ts";
import type { Analysis, LineStep, Move, Position, ReviewData } from "#lib/review/model.ts";
import { keepLine, mainIndex, pathKey } from "#lib/review/tree.ts";
import { STORES, dbGet, dbPut } from "#lib/storage/db.ts";
import { analysisKey, cacheGet, cachePut } from "./cache.ts";
import { Cancelled, type EnginePool } from "./pool.ts";

export const SWEEP_VISITS = 32;
export const LABEL_VISITS = 256;
export const DEEP_VISITS = 1024;
const SLICE_VISITS = 32;
const PRIORITY = { focus: 10, moment: 5, label: 2, sweep: 1 };

/** The engine's description of a position, as the board draws it. */
export function boardPosition(d: DescribeReply): Position {
  const ring = (poly: [number, number][]) => ({ area: 0, rings: [poly] });
  return {
    edges: [d.edges.b.map(parseEdge), d.edges.r.map(parseEdge)],
    protected: d.protected.map(parseEdge), placed: d.placed.map(parseEdge),
    scores: d.scores, areas: d.areas, player: d.mover === "b" ? 0 : 1, movesLeft: d.movesLeft,
    regions: [d.regions.b.map(ring), d.regions.r.map(ring)], over: d.outcome !== null,
  };
}

/** An analysis reply as the review reads it: values from Blue's side, the candidates in the engine's order. */
export function toAnalysis(r: AnalysisReply): Analysis {
  return {
    blueWin: r.rootInfo.winrate, visits: r.rootInfo.visits, lead: r.rootInfo.scoreLead, margin: r.rootInfo.scoreSelfplay,
    spread: r.rootInfo.scoreStdev,
    candidates: [...r.moveInfos].sort((a, b) => a.order - b.order).map(c => ({
      edge: parseEdge(c.move), visits: c.edgeVisits, blueWin: c.winrate, lead: c.scoreLead, margin: c.scoreSelfplay,
      ...withLine(c),
    })),
  };
}

/** A candidate's line (KataGo's pv, the move first), up to its first pass, with the visits through each of its edges. */
function withLine(c: MoveInfo): { line: Edge[]; lineVisits?: number[] } {
  const line: Edge[] = [];
  for (const m of c.pv) {
    if (!m.includes("-")) break; // a pass ends the turn: the line stops there
    line.push(parseEdge(m));
  }
  return { line, ...(c.pvEdgeVisits ? { lineVisits: c.pvEdgeVisits.slice(0, line.length) } : {}) };
}

/** A position in a branch: the board, the move that led to it, and its analysis once searched. */
export interface BranchNode { position: Position; move: Move; analysis?: Analysis }

/** A game's branches as kept in the browser: the lines from the start, each to a branch's end. */
interface KeptBranches { version: 1; lines: string[][] }

export class GameAnalysis {
  moves: string[];
  mainNames: string[] = []; // the game's moves as the tree names them (notation.ts's spelling), once the rules ran
  // Raw state: these arrays are replaced, never changed in place, so the page reads plain objects, not proxies.
  positions = $state.raw<Position[]>([]);
  played = $state.raw<Move[]>([]);
  analysis = $state.raw<(Analysis | undefined)[]>([]);
  branches = $state.raw<Record<string, BranchNode>>({}); // by path key, in the order they were added
  rulesReady = $state(false);
  engineReady = $state(false);
  swept = $state(0);
  labelled = $state(0);
  error = $state("");
  private focusing: string | null = null; // the path key of the position searched for the player
  private stopFocus: (() => void) | null = null;
  private focusGeneration = 0; // a new focus makes every earlier focus search stale
  private pool: EnginePool;
  private id: string | null = null; // the game's id (game/store.ts), under which its branches are kept
  private lines: string[][] = [];

  constructor(pool: EnginePool, moves: string[]) {
    this.pool = pool;
    this.moves = moves;
    this.analysis = Array(moves.length + 1).fill(undefined);
  }

  /** The game as the review reads it. */
  data(players: ReviewData["players"]): ReviewData | null {
    if (!this.rulesReady) return null;
    const end = this.positions.at(-1)!.scores;
    return { players, result: { blue: end[0], red: end[1] }, moves: this.played, positions: this.positions, analysis: this.analysis };
  }

  /** Describes every position (the rules, no network), then sweeps the game. */
  async start() {
    try {
      const game = await describeGame(this.pool.rules, this.moves);
      const positions = game.positions.map(boardPosition);
      this.played = this.moves.map((m, i) => {
        const cut = game.cuts[i];
        return { player: positions[i].player, edge: m === "pass" ? null : parseEdge(m), cut: cut === null ? null : parseEdge(cut) };
      });
      this.positions = positions;
      this.mainNames = this.played.map(m => (m.edge ? edgeName(m.edge) : "pass"));
      this.rulesReady = true;
    } catch (e) {
      this.error = errorText(e);
      return;
    }
    await this.loadBranches();
  }

  /** The analysis of a position anywhere in the tree. */
  analysisOf(path: string[]): Analysis | undefined {
    const i = mainIndex(path, this.mainNames);
    return i !== null ? this.analysis[i] : this.branches[pathKey(path)]?.analysis;
  }

  /** Adds a line from the start to the tree: the positions it adds come from the rules. Keeps the game's branches in
   *  the browser, unless `keep` is false. */
  async addLine(line: string[], keep = true) {
    const path = [...line]; // a plain array, to keep in the browser
    let k = path.length;
    while (k > 0 && !this.known(path.slice(0, k))) k--;
    if (k < path.length) {
      const { positions, cuts } = await describeGame(this.pool.rules, [...this.engineMoves(path.slice(0, k)), ...path.slice(k)], k);
      const next = { ...this.branches };
      for (let j = 1; j < positions.length; j++) {
        const m = path[k + j - 1], cut = cuts[j - 1];
        next[pathKey(path.slice(0, k + j))] = {
          position: boardPosition(positions[j]),
          move: { player: positions[j - 1].mover === "b" ? 0 : 1, edge: m === "pass" ? null : parseEdge(m), cut: cut === null ? null : parseEdge(cut) },
        };
      }
      this.branches = next;
    }
    if (!keep || mainIndex(path, this.mainNames) !== null) return;
    this.lines = keepLine(this.lines, path);
    if (this.id) await dbPut(STORES.branches, this.id, { version: 1, lines: this.lines } satisfies KeptBranches);
  }

  /** The game's branches kept from an earlier visit. A line that the rules refuse is dropped. */
  private async loadBranches() {
    try {
      this.id = await gameId(this.moves);
    } catch {
      return; // no hashing here (an insecure page): the branches last for this visit only
    }
    const kept = await dbGet<KeptBranches>(STORES.branches, this.id);
    for (const line of kept?.lines ?? []) {
      try {
        await this.addLine(line, false);
        this.lines = keepLine(this.lines, line);
      } catch {
        // the line is dropped
      }
    }
  }

  private known(path: string[]) {
    return mainIndex(path, this.mainNames) !== null || pathKey(path) in this.branches;
  }

  /** The moves the engine gets for a path: the record's own on the game's line. Always a plain array: a path from the
   *  page can be a state proxy, which a worker message and the browser's store cannot copy. */
  private engineMoves(path: string[]): string[] {
    const i = mainIndex(path, this.mainNames);
    return i !== null ? this.moves.slice(0, i) : [...path];
  }

  /** A position the engine can search: on the game's line before its end, or a branch node where the game goes on. */
  private searchable(path: string[]) {
    const i = mainIndex(path, this.mainNames);
    if (i !== null) return i < this.moves.length;
    const node = this.branches[pathKey(path)];
    return !!node && !node.position.over;
  }

  /** The sweep, then the label pass. Call after start() and once the pool has a network. */
  async sweep() {
    this.engineReady = true;
    const n = this.moves.length;
    const pass = (visits: number, priority: number, tag: string, done: () => void) =>
      Promise.all(Array.from({ length: n }, (_, i) =>
        this.search(this.mainNames.slice(0, i), visits, priority, tag).then(done).catch(this.fail)));
    await pass(SWEEP_VISITS, PRIORITY.sweep, "sweep", () => { this.swept++; });
    await pass(LABEL_VISITS, PRIORITY.label, "label", () => { this.labelled++; });
  }

  /** Searches the position deeper, in slices, showing the results as they come. One position at a time. */
  focus(path: string[]) {
    const key = pathKey(path);
    if (!this.engineReady || !this.searchable(path)) return;
    if (this.focusing === key) return;
    // An earlier focus is stale: stop its search if it runs, drop it if it waits. A search still reading the cache
    // reaches the queue only after this, so it also checks its generation before it starts.
    const generation = ++this.focusGeneration;
    this.stopFocus?.();
    this.stopFocus = null;
    this.pool.cancel(t => t === "focus");
    if ((this.analysisOf(path)?.visits ?? 0) >= DEEP_VISITS) { this.focusing = null; return; }
    this.focusing = key;
    this.search(path, DEEP_VISITS, PRIORITY.focus, "focus", true, () => generation === this.focusGeneration)
      .catch(this.fail)
      .finally(() => { if (this.focusing === key) this.focusing = null; });
  }

  /** Each edge of a line from the position at `path`, played: the edge it cuts (or null), and the regions and areas
   *  after it. The rules, no network. */
  async lineSteps(path: string[], line: Edge[]): Promise<LineStep[]> {
    const { positions, cuts } = await describeGame(this.pool.rules, [...this.engineMoves(path), ...line.map(edgeName)], path.length);
    return cuts.map((c, k) => ({
      cut: c === null ? null : parseEdge(c), regions: boardPosition(positions[k + 1]).regions, areas: positions[k + 1].areas,
    }));
  }

  /** Searches these positions deeper, after the focus and before the sweep. */
  deepen(indices: number[]) {
    for (const i of indices) this.search(this.mainNames.slice(0, i), DEEP_VISITS, PRIORITY.moment, "moment", true).catch(this.fail);
  }

  /** Keeps an engine error for the page. A task cancelled before it ran is not an error. */
  private fail = (e: unknown) => {
    if (!(e instanceof Cancelled)) this.error = errorText(e);
  };

  /** Searches the position at `path` to `visits`, or takes the result from the cache. `wanted` false: the search
   *  is no longer needed (a stale focus), so it does not start. */
  private async search(path: string[], visits: number, priority: number, tag: string, sliced = false, wanted = () => true) {
    const moves = this.engineMoves(path);
    const key = () => analysisKey(this.pool.version!.build, this.pool.model!.sha256, moves, visits);
    const held = () => this.analysisOf(path)?.visits ?? 0;
    const cached = await cacheGet<Analysis>(key());
    if (cached) { this.keep(path, cached); return; }
    if (held() >= visits || !wanted()) return;
    await this.pool.run(priority, tag, async (engine, onStop) => {
      if (held() >= visits || !wanted()) return;
      const run = engine.analyse({ moves, maxVisits: visits, includePVVisits: true, ...(sliced ? { slice: { visits: SLICE_VISITS } } : {}) },
                                 r => this.keep(path, toAnalysis(r)));
      if (sliced) onStop(run.stop); // the pool may stop it to give way, and runs it again later
      if (tag === "focus") this.stopFocus = run.stop;
      const t = await run.done;
      const a = toAnalysis(t.reply);
      this.keep(path, a);
      if (!t.reply.terminated && a.visits >= visits) await cachePut(key(), a);
    });
  }

  /** Keeps the deeper of the analysis held and the new one. */
  private keep(path: string[], a: Analysis) {
    if ((this.analysisOf(path)?.visits ?? 0) > a.visits) return;
    const i = mainIndex(path, this.mainNames);
    if (i !== null) {
      const next = this.analysis.slice();
      next[i] = a;
      this.analysis = next;
      return;
    }
    const key = pathKey(path), node = this.branches[key];
    if (node) this.branches = { ...this.branches, [key]: { ...node, analysis: a } };
  }
}
