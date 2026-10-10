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
import { describeGame } from "#lib/engine/describe.ts";
import { edgeName, parseEdge, type Edge } from "#lib/engine/notation.ts";
import type { AnalysisReply, DescribeReply } from "#lib/engine/protocol.ts";
import { errorText } from "#lib/errors.ts";
import type { Analysis, LineStep, Move, Position, ReviewData } from "#lib/review/model.ts";
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
    regions: [d.regions.b.map(ring), d.regions.r.map(ring)],
  };
}

/** An analysis reply as the review reads it: values from Blue's side, the candidates in the engine's order. */
export function toAnalysis(r: AnalysisReply): Analysis {
  return {
    blueWin: r.rootInfo.winrate, visits: r.rootInfo.visits, lead: r.rootInfo.scoreLead, margin: r.rootInfo.scoreSelfplay,
    spread: r.rootInfo.scoreStdev,
    candidates: [...r.moveInfos].sort((a, b) => a.order - b.order).map(c => ({
      edge: parseEdge(c.move), visits: c.edgeVisits, blueWin: c.winrate, lead: c.scoreLead, margin: c.scoreSelfplay,
      line: lineOf(c.pv),
    })),
  };
}

/** A candidate's line (KataGo's pv, the move first), up to its first pass. */
function lineOf(pv: string[]): Edge[] {
  const line: Edge[] = [];
  for (const m of pv) {
    if (!m.includes("-")) break; // a pass ends the turn: the line stops there
    line.push(parseEdge(m));
  }
  return line;
}

export class GameAnalysis {
  moves: string[];
  // Raw state: these arrays are replaced, never changed in place, so the page reads plain objects, not proxies.
  positions = $state.raw<Position[]>([]);
  played = $state.raw<Move[]>([]);
  analysis = $state.raw<(Analysis | undefined)[]>([]);
  rulesReady = $state(false);
  engineReady = $state(false);
  swept = $state(0);
  labelled = $state(0);
  error = $state("");
  private focusing: number | null = null;
  private stopFocus: (() => void) | null = null;
  private focusGeneration = 0; // a new focus makes every earlier focus search stale
  private pool: EnginePool;

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
      this.rulesReady = true;
    } catch (e) {
      this.error = errorText(e);
    }
  }

  /** The sweep, then the label pass. Call after start() and once the pool has a network. */
  async sweep() {
    this.engineReady = true;
    const n = this.moves.length;
    const pass = (visits: number, priority: number, tag: string, done: () => void) =>
      Promise.all(Array.from({ length: n }, (_, i) =>
        this.search(i, visits, priority, tag).then(done).catch(this.fail)));
    await pass(SWEEP_VISITS, PRIORITY.sweep, "sweep", () => { this.swept++; });
    await pass(LABEL_VISITS, PRIORITY.label, "label", () => { this.labelled++; });
  }

  /** Searches the position deeper, in slices, showing the results as they come. One position at a time. */
  focus(i: number) {
    if (!this.engineReady || i >= this.moves.length) return;
    if (this.focusing === i) return;
    // An earlier focus is stale: stop its search if it runs, drop it if it waits. A search still reading the cache
    // reaches the queue only after this, so it also checks its generation before it starts.
    const generation = ++this.focusGeneration;
    this.stopFocus?.();
    this.stopFocus = null;
    this.pool.cancel(t => t === "focus");
    if ((this.analysis[i]?.visits ?? 0) >= DEEP_VISITS) { this.focusing = null; return; }
    this.focusing = i;
    this.search(i, DEEP_VISITS, PRIORITY.focus, "focus", true, () => generation === this.focusGeneration)
      .catch(this.fail)
      .finally(() => { if (this.focusing === i) this.focusing = null; });
  }

  /** Each edge of a line from the position after `i` moves, played: the edge it cuts (or null) and the regions after
   *  it. The rules, no network. */
  async lineSteps(i: number, line: Edge[]): Promise<LineStep[]> {
    const { positions, cuts } = await describeGame(this.pool.rules, [...this.moves.slice(0, i), ...line.map(edgeName)], i);
    return cuts.map((c, k) => ({
      cut: c === null ? null : parseEdge(c), regions: boardPosition(positions[k + 1]).regions, areas: positions[k + 1].areas,
    }));
  }

  /** Searches these positions deeper, after the focus and before the sweep. */
  deepen(indices: number[]) {
    for (const i of indices) this.search(i, DEEP_VISITS, PRIORITY.moment, "moment", true).catch(this.fail);
  }

  /** Keeps an engine error for the page. A task cancelled before it ran is not an error. */
  private fail = (e: unknown) => {
    if (!(e instanceof Cancelled)) this.error = errorText(e);
  };

  /** Searches position i to `visits`, or takes the result from the cache. `wanted` false: the search is no longer
   *  needed (a stale focus), so it does not start. */
  private async search(i: number, visits: number, priority: number, tag: string, sliced = false, wanted = () => true) {
    const moves = this.moves.slice(0, i);
    const key = () => analysisKey(this.pool.version!.build, this.pool.model!.sha256, moves, visits);
    const cached = await cacheGet<Analysis>(key());
    if (cached) { this.keep(i, cached); return; }
    if ((this.analysis[i]?.visits ?? 0) >= visits || !wanted()) return;
    await this.pool.run(priority, tag, async (engine, onStop) => {
      if ((this.analysis[i]?.visits ?? 0) >= visits || !wanted()) return;
      const run = engine.analyse({ moves, maxVisits: visits, ...(sliced ? { slice: { visits: SLICE_VISITS } } : {}) },
                                 r => this.keep(i, toAnalysis(r)));
      if (sliced) onStop(run.stop); // the pool may stop it to give way, and runs it again later
      if (tag === "focus") this.stopFocus = run.stop;
      const t = await run.done;
      const a = toAnalysis(t.reply);
      this.keep(i, a);
      if (!t.reply.terminated && a.visits >= visits) await cachePut(key(), a);
    });
  }

  /** Keeps the deeper of the analysis held and the new one. */
  private keep(i: number, a: Analysis) {
    if ((this.analysis[i]?.visits ?? 0) > a.visits) return;
    const next = this.analysis.slice();
    next[i] = a;
    this.analysis = next;
  }
}
