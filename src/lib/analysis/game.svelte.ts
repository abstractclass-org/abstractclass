// The analysis of one game in the browser, on KaTrain's schedule (core/game.py, analyze_all_nodes and analyze_extra):
// 1. the rules first: every position from the engine's describe, so the board works before the network loads;
// 2. a sweep: every position at a small budget (KaTrain: fast_visits, 25), for the game's shape;
// 3. a label pass: every position at the label budget, since labels from the sweep are mostly wrong;
// 4. deeper where the player looks: the position on screen, searched in slices with its results shown as they come
//    (KaTrain: max_visits, 500), then the key moments.
// The budgets come from the measurement of label agreement against a deep search (docs/decisions/engine.md, "Label
// agreement against search budget"): 256 visits is the first budget whose mistake flags are mostly right.
// Results are kept in the browser (cache.ts).
import { edgeName, parseEdge, type Edge } from "#lib/engine/notation.ts";
import type { AnalysisReply, DescribeReply } from "#lib/engine/protocol.ts";
import type { Analysis, Move, Player, Position, ReviewData } from "#lib/review/model.ts";
import { analysisKey, cacheGet, cachePut } from "./cache.ts";
import type { EnginePool } from "./pool.ts";

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
    scores: d.scores, player: d.mover === "b" ? 0 : 1, movesLeft: d.movesLeft,
    regions: [d.regions.b.map(ring), d.regions.r.map(ring)],
  };
}

/** An analysis reply as the review reads it: values from Blue's side, the candidates in the engine's order. */
export function toAnalysis(r: AnalysisReply): Analysis {
  return {
    blueWin: r.rootInfo.winrate, visits: r.rootInfo.visits, lead: r.rootInfo.scoreLead, margin: r.rootInfo.scoreSelfplay,
    spread: r.rootInfo.scoreStdev,
    candidates: [...r.moveInfos].sort((a, b) => a.order - b.order).map(c => ({
      edge: parseEdge(c.move), visits: c.visits, blueWin: c.winrate, lead: c.scoreLead, margin: c.scoreSelfplay,
    })),
  };
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
  focusing = $state<number | null>(null);
  error = $state("");
  private stopFocus: (() => void) | null = null;
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
      // All at once: the worker runs them back to back, with no round trip between them.
      const n = this.moves.length;
      const positions = (await Promise.all(Array.from({ length: n + 1 }, (_, i) =>
        this.pool.rules.describe({ moves: this.moves.slice(0, i) })))).map(t => boardPosition(t.reply));
      this.played = this.moves.map((m, i) => {
        const p = positions[i].player as Player, opp = (1 - p) as Player;
        const after = new Set(positions[i + 1].edges[opp].map(e => edgeName(e)));
        const cut = positions[i].edges[opp].find(e => !after.has(edgeName(e))) ?? null;
        return { player: p, edge: m === "pass" ? null : parseEdge(m), cut };
      });
      this.positions = positions;
      this.rulesReady = true;
    } catch (e) {
      this.error = String(e);
    }
  }

  /** The sweep, then the label pass. Call after start() and once the pool has a network. */
  async sweep() {
    this.engineReady = true;
    const n = this.moves.length;
    const pass = (visits: number, priority: number, tag: string, done: () => void) =>
      Promise.all(Array.from({ length: n }, (_, i) =>
        this.search(i, visits, priority, tag).then(done).catch(e => (this.error = String(e)))));
    await pass(SWEEP_VISITS, PRIORITY.sweep, "sweep", () => { this.swept++; });
    await pass(LABEL_VISITS, PRIORITY.label, "label", () => { this.labelled++; });
  }

  /** Searches the position deeper, in slices, showing the results as they come. One position at a time. */
  focus(i: number) {
    if (!this.engineReady || i >= this.moves.length) return;
    if (this.focusing === i) return;
    this.stopFocus?.();
    this.pool.cancel(t => t === "focus");
    if ((this.analysis[i]?.visits ?? 0) >= DEEP_VISITS) { this.focusing = null; return; }
    this.focusing = i;
    this.search(i, DEEP_VISITS, PRIORITY.focus, "focus", true)
      .catch(e => (this.error = String(e)))
      .finally(() => { if (this.focusing === i) this.focusing = null; });
  }

  /** Searches these positions deeper, after the focus and before the sweep. */
  deepen(indices: number[]) {
    for (const i of indices) this.search(i, DEEP_VISITS, PRIORITY.moment, "moment").catch(e => (this.error = String(e)));
  }

  private async search(i: number, visits: number, priority: number, tag: string, sliced = false) {
    const moves = this.moves.slice(0, i);
    const key = () => analysisKey(this.pool.version!.build, this.pool.model!.sha256, moves, visits);
    const cached = await cacheGet<Analysis>(key());
    if (cached) { this.keep(i, cached); return; }
    if ((this.analysis[i]?.visits ?? 0) >= visits) return;
    await this.pool.run(priority, tag, async engine => {
      if ((this.analysis[i]?.visits ?? 0) >= visits) return;
      const run = engine.analyse({ moves, maxVisits: visits, ...(sliced ? { slice: { visits: SLICE_VISITS } } : {}) },
                                 r => this.keep(i, toAnalysis(r)));
      if (sliced) this.stopFocus = run.stop;
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
