// The analysis of one game in the browser, on KaTrain's schedule (core/game.py, analyze_all_nodes and analyze_extra):
// 1. the rules first: every position from the engine's describe, so the board works before the network loads;
// 2. a sweep: every position at a small budget (KaTrain: fast_visits, 25), for the game's shape;
// 3. a label pass: every position at the label budget, since labels from the sweep are mostly wrong;
// 4. deeper where the player looks: the position on screen, searched in slices with its results shown as they come
//    (KaTrain: max_visits, 500), then the key moments. The key moments' searches run in slices too, so that the
//    position on screen can stop one when no worker is free (pool.ts), and the stopped one runs again later.
// The budgets come from the measurement of label agreement against a deep search (docs/decisions/engine.md, "Label
// agreement against search budget", and again under protocol 0.3): 256 visits is the first budget whose mistake flags
// are mostly right, and the review's Lite depth searches 512, which finds two thirds of the mistakes.
// Results are kept in the browser (cache.ts).
//
// The engine's settings (design 09) change this schedule while it runs: the engine can be off (no search starts, and
// what was found stays), the label budget can be deeper, the position on screen has its own visits and time limit,
// and another network starts the analysis again in a new pool.
//
// The game is a tree (src/lib/review/tree.ts): the player can add branches, and a branch's positions are searched as
// the game's are, when the player looks at them. A game's branches are kept in the browser, as Lichess keeps its
// analysis tree (ui/analyse/src/idbTree.ts).
import { describeGame } from "#lib/engine/describe.ts";
import { edgeName, parseEdge, parsePoint, sameEdge, type Edge } from "#lib/engine/notation.ts";
import type { AnalysisReply, DescribeReply, MoveInfo } from "#lib/engine/protocol.ts";
import { errorText } from "#lib/errors.ts";
import { gameId } from "#lib/game/store.ts";
import { onlyEdge, type Analysis, type LineStep, type Move, type Player, type Position, type ReviewData } from "#lib/review/model.ts";
import type { EdgeRules } from "#lib/board/edgeInput.svelte.ts";
import { mainIndex, pathKey } from "#lib/review/tree.ts";
import { STORES, dbGet, dbPut } from "#lib/storage/db.ts";
import { analysisKey, cacheGet, cachePut } from "./cache.ts";
import { Stopped } from "#lib/engine/client.ts";
import { Cancelled, type EnginePool } from "./pool.ts";

export const SWEEP_VISITS = 32;
export const LABEL_VISITS = 256; // the least visits that give an edge a label (the review's depths: engineSettings.ts)
export const DEEP_VISITS = 1024; // the key moments, and the position on screen by default
const SLICE_VISITS = 32;
// A branch edge's evaluation, asked for in its menu, comes after the position on screen and before the rest.
const PRIORITY = { focus: 10, judge: 7, moment: 5, label: 2, sweep: 1 };

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

/** The key of a path's parent, from the path's key. */
const parentKey = (key: string) => (key.includes(" ") ? key.slice(0, key.lastIndexOf(" ")) : "");

/** A position in a branch: the board, the move that led to it, its analysis once searched, its place among the
 *  branches from its parent (the lower first), and whether the player asked for the move's quality. */
export interface BranchNode { position: Position; move: Move; analysis?: Analysis; order: number; judged?: boolean }

/** A game's branches as kept in the browser: each node's path key, its order, and 1 when its move was evaluated.
 *  Version 1 kept the lines. */
type KeptBranches = { version: 1; lines: string[][] } | { version: 2; nodes: ([string, number] | [string, number, 1])[] };

export class GameAnalysis {
  moves: string[];
  mainNames: string[] = []; // the game's moves as the tree names them (notation.ts's spelling), once the rules ran
  // Raw state: these arrays are replaced, never changed in place, so the page reads plain objects, not proxies.
  positions = $state.raw<Position[]>([]);
  played = $state.raw<Move[]>([]);
  analysis = $state.raw<(Analysis | undefined)[]>([]);
  branches = $state.raw<Record<string, BranchNode>>({}); // by path key
  // Positions outside the tree, by path key: the positions after the engine's second choice, searched to confirm a
  // Great (confirmGreat).
  outside = $state.raw<Record<string, Analysis>>({});
  rulesReady = $state(false);
  engineReady = $state(false);
  paused = $state(false); // the engine is off: no search starts
  labelVisits = $state(LABEL_VISITS); // the label pass's budget
  focusVisits = $state(DEEP_VISITS); // the position on screen is searched to this many visits,
  focusSeconds = $state<number | null>(null); // for at most this many seconds (null: no limit)
  // The positions whose search stopped at the time limit, by path key: the visits and the limit then. Such a position is
  // not searched again for the same settings.
  timed = $state.raw<Record<string, string>>({});
  error = $state("");
  focusing = $state<string | null>(null); // the path key of the position searched for the player, while it runs
  // For each position of the game, the largest pass budget it has met: searched, from the cache, or deeper already.
  private reached = $state.raw<number[]>([]);
  private stopFocus: (() => void) | null = null;
  private focusGeneration = 0; // a new focus makes every earlier focus search stale
  private passes = 0; // a new run of the passes makes the earlier one stop after its sweep
  private moments: number[] = []; // the key moments, searched deeper
  private confirming = new Set<string>(); // the Greats' confirmations queued or running, by path key
  private era = 0; // another network starts a new era: results from an earlier one are dropped
  private pool: EnginePool;
  private id: string | null = null; // the game's id (game/store.ts), under which its branches are kept
  private nextOrder = 0;

  constructor(pool: EnginePool, moves: string[]) {
    this.pool = pool;
    this.moves = moves;
    this.analysis = Array(moves.length + 1).fill(undefined);
    this.reached = Array(moves.length).fill(0);
  }

  /** The game's positions that the sweep has searched, and the label pass. */
  get swept() { return this.reached.filter(v => v >= SWEEP_VISITS).length; }
  get labelled() { return this.reached.filter(v => v >= this.labelVisits).length; }

  /** Whether the search of the position at `path` stopped at the time limit, with the focus settings as they are. */
  stoppedByTime(path: string[]) {
    return this.timed[pathKey(path)] === `${this.focusVisits} ${this.focusSeconds}`;
  }

  /** The game as the review reads it. */
  data(players: ReviewData["players"]): ReviewData | null {
    if (!this.rulesReady) return null;
    const end = this.positions.at(-1)!.scores;
    // For each edge but the last, the position after the engine's second choice, which confirms a Great.
    const seconds = this.played.map((_, i) => (i + 1 < this.played.length ? this.secondAt(this.mainNames.slice(0, i)) : undefined));
    return { players, result: { blue: end[0], red: end[1] }, moves: this.played, positions: this.positions, analysis: this.analysis,
             seconds };
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

  /** The analysis of a position anywhere in the tree, or outside it (a Great's confirmation). */
  analysisOf(path: string[]): Analysis | undefined {
    const i = mainIndex(path, this.mainNames);
    if (i !== null) return this.analysis[i];
    const key = pathKey(path), node = this.branches[key];
    return node ? node.analysis : this.outside[key];
  }

  /** The analysis of the position after the engine's second choice at `path`, which confirms a Great (confirmGreats). */
  secondAt(path: string[]): Analysis | undefined {
    const second = this.analysisOf(path)?.candidates[1];
    return second ? this.analysisOf([...path, edgeName(second.edge)]) : undefined;
  }

  /** Confirms the Greats: where the played edge was the engine's first choice in a search to the label budget, and its
   *  second choice looks at least 10% of win chance worse. That second value rests on few visits (the search spends them
   *  on the first choice), while En Croissant's rule compares two equal searches. So the position after the second
   *  choice is searched to the label budget, as the position after the played edge was, and the review compares the two
   *  (KaTrain's "equalize" gives every candidate the top move's visits for the same reason). For the game's edges and
   *  the branch edges evaluated on request, not where the game ends after the edge. The page calls it as results come:
   *  a deeper search can change a position's second choice. */
  confirmGreats() {
    const check = (before: string[], edge: Edge | null, mover: Player, over: boolean) => {
      const a = this.analysisOf(before), first = a?.candidates[0];
      if (!over && a && a.visits >= this.labelVisits && first && edge && sameEdge(first.edge, edge) && onlyEdge(a, mover))
        this.confirmGreat(before);
    };
    for (let i = 0; i + 1 < this.played.length; i++) check(this.mainNames.slice(0, i), this.played[i].edge, this.played[i].player, false);
    for (const [key, node] of Object.entries(this.branches))
      if (node.judged) check(key.split(" ").slice(0, -1), node.move.edge, node.move.player, !!node.position.over);
  }

  private confirmGreat(path: string[]) {
    const second = this.analysisOf(path)?.candidates[1];
    if (!second || !this.engineReady || this.paused) return;
    const after = [...path, edgeName(second.edge)], key = pathKey(after);
    if (this.confirming.has(key) || (this.analysisOf(after)?.visits ?? 0) >= this.labelVisits) return;
    this.confirming.add(key);
    this.search(after, this.labelVisits, PRIORITY.label, "confirm", { early: LABEL_VISITS })
      .catch(this.fail).finally(() => this.confirming.delete(key));
  }

  /** Adds a line from the start to the tree: the positions it adds come from the rules. They are searched only when the
   *  player looks at them, so that a line played to show something costs no search. Keeps the game's branches in the
   *  browser, unless `keep` is false. */
  async addLine(line: string[], keep = true) {
    const path = [...line]; // a plain array, to keep in the browser
    let k = path.length;
    while (k > 0 && !this.known(path.slice(0, k))) k--;
    if (k === path.length) return;
    const { positions, cuts } = await describeGame(this.pool.rules, [...this.engineMoves(path.slice(0, k)), ...path.slice(k)], k);
    const next = { ...this.branches };
    for (let j = 1; j < positions.length; j++) {
      const m = path[k + j - 1], cut = cuts[j - 1], p = path.slice(0, k + j);
      if (pathKey(p) in next) continue; // added meanwhile
      next[pathKey(p)] = {
        position: boardPosition(positions[j]), order: this.nextOrder++,
        move: { player: positions[j - 1].mover === "b" ? 0 : 1, edge: m === "pass" ? null : parseEdge(m), cut: cut === null ? null : parseEdge(cut) },
      };
    }
    this.branches = next;
    if (keep) await this.keepBranches();
  }

  /** Evaluates a branch move's quality on request: searches the positions before and after it to the label budget, so
   *  that it can be judged as the game's moves are. A branch's moves are not judged unless asked: a line played only to
   *  show something should cost no search. */
  async judge(path: string[]) {
    const key = pathKey(path), node = this.branches[key];
    if (!node) return;
    this.branches = { ...this.branches, [key]: { ...node, judged: true } };
    this.judgeSearches(path);
    await this.keepBranches();
  }

  private judgeSearches(path: string[]) {
    if (!this.engineReady) return; // the sweep starts them
    for (const p of [path.slice(0, -1), path])
      if (this.searchable(p)) this.search(p, this.labelVisits, PRIORITY.judge, "judge", { early: LABEL_VISITS }).catch(this.fail);
  }

  /** Deletes a branch node and every position after it (Lichess's "Delete from here"). */
  async deleteFrom(path: string[]) {
    const key = pathKey(path);
    if (!(key in this.branches)) return;
    this.branches = Object.fromEntries(Object.entries(this.branches).filter(([k]) => k !== key && !k.startsWith(`${key} `)));
    await this.keepBranches();
  }

  /** Promotes a branch one step (Lichess's "Promote variation", ui/lib/src/tree promoteAt): the nearest branch node on
   *  the path that is not the first of its parent's branches becomes the first. The game's own move stays before them. */
  async promote(path: string[]) {
    for (let k = path.length; k > 0; k--) {
      const node = this.branches[pathKey(path.slice(0, k))];
      if (!node) return; // on the game's line: nothing above to promote
      const parent = pathKey(path.slice(0, k - 1));
      const siblings = Object.entries(this.branches).filter(([s]) => parentKey(s) === parent);
      const first = Math.min(...siblings.map(([, n]) => n.order));
      if (node.order > first) {
        this.branches = { ...this.branches, [pathKey(path.slice(0, k))]: { ...node, order: first - 1 } };
        await this.keepBranches();
        return;
      }
    }
  }

  /** The rules of a position anywhere in the tree, for the player's own moves: the legal edges and the mover's nodes. */
  async rulesAt(path: string[]): Promise<EdgeRules> {
    const { reply } = await this.pool.rules.describe({ moves: this.engineMoves(path) });
    return { legal: reply.legal.filter(m => m.includes("-")).map(parseEdge), nodes: reply.nodes[reply.mover].map(parsePoint) };
  }

  /** Keeps the game's branches in the browser: each node's key and order. */
  private async keepBranches() {
    if (!this.id) return;
    const nodes = Object.entries(this.branches).map(([k, n]): [string, number] | [string, number, 1] =>
      (n.judged ? [k, n.order, 1] : [k, n.order]));
    await dbPut(STORES.branches, this.id, { version: 2, nodes } satisfies KeptBranches);
  }

  /** The game's branches kept from an earlier visit. A node that the rules refuse is dropped. */
  private async loadBranches() {
    try {
      this.id = await gameId(this.moves);
    } catch {
      return; // no hashing here (an insecure page): the branches last for this visit only
    }
    const kept = await dbGet<KeptBranches>(STORES.branches, this.id);
    const nodes = !kept ? [] : kept.version === 1 ? kept.lines.map((l, i): [string, number] => [pathKey(l), i]) : kept.nodes;
    // Shorter paths first, so that each adds one position; then each node takes its kept order.
    for (const [key] of [...nodes].sort((a, b) => a[0].length - b[0].length)) {
      try {
        await this.addLine(key.split(" "), false);
      } catch {
        // the node is dropped
      }
    }
    const next = { ...this.branches };
    for (const [key, order, judged] of nodes) if (next[key]) next[key] = { ...next[key], order, ...(judged ? { judged: true } : {}) };
    this.branches = next;
    this.nextOrder = Math.max(0, ...Object.values(next).map(n => n.order + 1));
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

  /** The sweep, then the label pass, for the positions that lack them: a position already searched that far is
   *  skipped. Call after start() and once the pool has a network, and again to take the work up after a change (the
   *  engine on again, another label budget, another network). The branch moves evaluated on request are searched too. */
  async sweep() {
    this.engineReady = true;
    const run = ++this.passes;
    for (const [key, node] of Object.entries(this.branches)) if (node.judged) this.judgeSearches(key.split(" ")); // kept from a visit
    const n = this.moves.length;
    const pass = (visits: number, priority: number, tag: string) =>
      Promise.all(Array.from({ length: n }, (_, i) =>
        this.search(this.mainNames.slice(0, i), visits, priority, tag, { early: LABEL_VISITS }).then(met => {
          if (met && visits > this.reached[i]) this.reached = this.reached.with(i, visits);
        }).catch(this.fail)));
    await pass(SWEEP_VISITS, PRIORITY.sweep, "sweep");
    if (run !== this.passes) return; // a later run took over
    await pass(this.labelVisits, PRIORITY.label, "label");
  }

  /** Turns the engine off or on. Off: the searches stop, none starts, and what they found stays. On: the work not done
   *  starts again, and the page focuses the position on screen again. */
  setPaused(paused: boolean) {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      this.dropFocus();
      this.pool.halt();
    } else if (this.engineReady) {
      void this.sweep();
      this.deepen(this.moments);
    }
  }

  /** The label pass's budget (the review's depth). The passes run again for it, and the label searches
   *  still waiting for the old budget are dropped. */
  setReview(visits: number) {
    if (visits === this.labelVisits) return;
    this.labelVisits = visits;
    this.pool.cancel(t => t === "label" || t === "judge" || t === "confirm");
    if (this.engineReady && !this.paused) void this.sweep();
  }

  /** The search of the position on screen: to `visits`, for at most `seconds`. A change ends the running focus, and
   *  the page focuses again with the new settings. */
  setDepth(visits: number, seconds: number | null) {
    if (visits === this.focusVisits && seconds === this.focusSeconds) return;
    this.focusVisits = visits;
    this.focusSeconds = seconds;
    this.dropFocus();
  }

  /** Drops the analysis before another network takes over: every result came from the old one. The searches stop, and
   *  results that still arrive from them are dropped. The engine is not ready again until sweep(). */
  dropAnalysis() {
    this.era++;
    this.dropFocus();
    this.pool.halt();
    this.engineReady = false;
    this.analysis = Array(this.moves.length + 1).fill(undefined);
    this.branches = Object.fromEntries(Object.entries(this.branches).map(([k, n]) => [k, { ...n, analysis: undefined }]));
    this.outside = {};
    this.reached = Array(this.moves.length).fill(0);
    this.timed = {};
    this.moments = [];
  }

  /** Moves the work to another pool, already started (another network, after dropAnalysis). The old pool ends. */
  usePool(pool: EnginePool) {
    const old = this.pool;
    this.pool = pool;
    old.terminate();
  }

  /** Searches the position deeper, in slices, showing the results as they come, to the focus settings' visits or time
   *  limit (KaTrain's max_visits and max_time: whichever comes first). One position at a time. */
  focus(path: string[]) {
    const key = pathKey(path);
    if (!this.engineReady || this.paused || !this.searchable(path)) return;
    if (this.focusing === key) return;
    const generation = this.dropFocus();
    const visits = this.focusVisits, seconds = this.focusSeconds, settings = `${visits} ${seconds}`;
    if ((this.analysisOf(path)?.visits ?? 0) >= visits || this.timed[key] === settings) return;
    this.focusing = key;
    this.search(path, visits, PRIORITY.focus, "focus", {
      sliced: true, seconds, wanted: () => generation === this.focusGeneration,
      ontime: () => { this.timed = { ...this.timed, [key]: settings }; },
    })
      .catch(this.fail)
      .finally(() => { if (generation === this.focusGeneration) this.focusing = null; });
  }

  /** Ends the focus: an earlier focus is stale. Stops its search if it runs, and drops it if it waits. A search still
   *  reading the cache reaches the queue only after this, so it also checks its generation before it starts. */
  private dropFocus() {
    const generation = ++this.focusGeneration;
    this.stopFocus?.();
    this.stopFocus = null;
    this.pool.cancel(t => t === "focus");
    this.focusing = null;
    return generation;
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
    this.moments = indices;
    for (const i of indices) this.search(this.mainNames.slice(0, i), DEEP_VISITS, PRIORITY.moment, "moment", { sliced: true }).catch(this.fail);
  }

  /** Keeps an engine error for the page. A task cancelled before it ran, or a worker ended for another pool, is not one. */
  private fail = (e: unknown) => {
    if (!(e instanceof Cancelled) && !(e instanceof Stopped)) this.error = errorText(e);
  };

  /** Searches the position at `path` to `visits`, or takes the result from the cache. True when the position has met
   *  the budget: searched, cached, or held deeper already. False when no search ran to its end: the engine is off, the
   *  search stopped (at its time limit, for the engine off, or to give way), or it is no longer wanted (a stale focus).
   *  Options: `sliced` searches in slices, which show their results as they come and can stop; `seconds` is a sliced
   *  search's time limit, and `ontime` runs when it stops there. `early` shows the result at that many visits too
   *  (slices of that size, which do not stop), so that a deep label search shows a label from 256 visits on. */
  private async search(path: string[], visits: number, priority: number, tag: string, options: {
    sliced?: boolean; wanted?: () => boolean; seconds?: number | null; ontime?: () => void; early?: number;
  } = {}): Promise<boolean> {
    const { sliced = false, wanted = () => true, seconds = null, ontime, early } = options;
    const slice = sliced ? SLICE_VISITS : early && early < visits ? early : null;
    const era = this.era, pool = this.pool, moves = this.engineMoves(path);
    const key = analysisKey(pool.version!.build, pool.model!.sha256, moves, visits);
    const held = () => this.analysisOf(path)?.visits ?? 0;
    const keep = (a: Analysis) => { if (era === this.era) this.keep(path, a); };
    if (held() >= visits) return true;
    const cached = await cacheGet<Analysis>(key);
    if (era !== this.era) return false;
    if (cached) { keep(cached); return true; }
    if (held() >= visits) return true;
    if (this.paused || !wanted()) return false;
    return pool.run(priority, tag, async (engine, onStop) => {
      if (held() >= visits) return true;
      if (this.paused || !wanted() || era !== this.era) return false;
      const run = engine.analyse({ moves, maxVisits: visits, includePVVisits: true, ...(slice ? { slice: { visits: slice } } : {}) },
                                 r => keep(toAnalysis(r)));
      if (sliced) onStop(run.stop); // the pool may stop it to give way, and runs it again later
      if (tag === "focus") this.stopFocus = run.stop;
      // The time limit counts from the search's start, not from its wait in the queue. A search in slices takes no
      // maxTime (the protocol), so the page stops it.
      let late = false;
      const timer = sliced && seconds !== null ? setTimeout(() => { late = true; run.stop(); }, seconds * 1000) : undefined;
      const t = await run.done.finally(() => clearTimeout(timer));
      const a = toAnalysis(t.reply);
      keep(a);
      if (late && era === this.era) ontime?.();
      if (t.reply.terminated) return false;
      if (a.visits >= visits && era === this.era) await cachePut(key, a);
      return true;
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
    else this.outside = { ...this.outside, [key]: a };
  }
}
