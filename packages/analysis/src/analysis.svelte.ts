// The analysis of one game in the browser, on KaTrain's schedule (core/game.py, analyze_all_nodes and analyze_extra):
// 1. the rules first: every position from the engine's rules in one request (describe_game), so the board works
//    before the network loads;
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
// The game is a tree (tree.ts): the player can add branches, and a branch's positions are searched as the game's
// are, when the player looks at them. A game's branches are kept in the browser (kept.ts), as Lichess keeps its
// analysis tree (ui/analyse/src/idbTree.ts).
//
// The Analysis board (design 21) is the same analysis in its board form: its main line is the player's and changes
// (setMain), its moves have labels only where the player asks (judge), and no pass runs: the engine searches the
// position on screen and the moves evaluated.
//
// The analysis is every game's (design 29): the game (game.ts) gives the positions from the engine's fields, the moves
// played, a move's name, the rules for the player's moves and a line's steps. `G` is the game's types.
import { toAnalysis } from "./reply.ts";
import { positionQuery } from "@abstractclass/engine/protocol.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import { BOARD_ID, branchNodes, keptNode, type KeptNode, type KeptBoard, type KeptBranches } from "./kept.ts";
import type { Game, GameTypes, Player } from "./game.ts";
import { earlierIndex, equalDepth, keepsGain, moverWin, onlyEdge, otherCandidate, sameMove, secondChoice, type Analysis,
         type Candidate, type GameEnding, type ReviewData } from "./model.ts";
import { ONLY_EDGE_GAP } from "./labels.ts";
import { lastMove, mainIndex, parentKey, pathKey, prefixKeys } from "./tree.ts";
import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
import { keepStorage } from "@abstractclass/storage/persist.ts";
import { DEEP_VISITS, LABEL_VISITS, MAP_SLICE, MAP_VISITS, SWEEP_VISITS, analysisKey, keyMoves, cacheGetAtLeast, cachePut, mapGet, mapPut,
         warmCache } from "./cache.ts";
import { Stopped } from "@abstractclass/engine/client.ts";
import { nextTask } from "@abstractclass/engine/channel.ts";
import { Cancelled, type EnginePool } from "@abstractclass/engine/pool.ts";

/** The key moments' depth: twice the review's depth, one step of its doublings deeper, so that the moments that matter
 *  most get a surer search at every review depth (Lite's 512 gives 1,024, the reference of the labels' measurement). */
export const momentVisits = (reviewVisits: number) => 2 * reviewVisits;
const SLICE_VISITS = 32;
// The searches' results are applied together, at most this often: their results so far and their final results, with
// what a search's end changes (the passes' progress, its mark). With every worker and the GPU's 16 searches posting a
// slice, results come tens of times a second, the sweep's searches end one after another, and each change of the
// analysis runs the review again.
export const BATCH_MS = 100;
// A branch edge's evaluation, asked for in its menu, comes after the position on screen and before the rest. The
// ownership that the board shows comes just after the position on screen (askOwnership).
const PRIORITY = { focus: 10, ownership: 9, judge: 7, moment: 5, label: 2, sweep: 1, mapPass: 0 };

/** A position in a branch: the board, the move that led to it, its analysis once searched, its place among the
 *  branches from its parent (the lower first), and whether the player asked for the move's quality. */
export interface BranchNode<G extends GameTypes> {
  position: G["position"]; move: G["played"]; analysis?: Analysis<G["move"]>; order: number; judged?: boolean;
}


export class GameAnalysis<G extends GameTypes> {
  moves: string[];
  mainNames: string[] = []; // the game's moves as the tree names them (the game's moveName), once the rules ran
  mainKeys: string[] = [""]; // the path key of each position of the game: the first i moves
  // Raw state: these arrays are replaced, never changed in place, so the page reads plain objects, not proxies.
  positions = $state.raw<G["position"][]>([]);
  played = $state.raw<G["played"][]>([]);
  analysis = $state.raw<(Analysis<G["move"]> | undefined)[]>([]);
  branches = $state.raw<Record<string, BranchNode<G>>>({}); // by path key
  // Positions outside the tree, by path key: the positions after the engine's second choice, searched to confirm a
  // Great (confirmGreat).
  outside = $state.raw<Record<string, Analysis<G["move"]>>>({});
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
  // For each position, by path key, the visits of the deepest result that the store has: a result read from it, or a
  // search's final result, whose write comes before its batch. Only such a result meets a search's budget, and the
  // review's counts read it, so that they read the same as the store. A search's results so far do not: when the search
  // stops before its end (the player moves on, its time limit, the engine off), the store never gets them.
  private stored = $state.raw<Record<string, number>>({});
  private stopFocus: (() => void) | null = null;
  private focusGeneration = 0; // a new focus makes every earlier focus search stale
  private passes = 0; // a new run of the passes, or another network, makes the earlier one stop after its sweep
  private pauses = 0; // how many times the engine went off (deepen)
  moments = $state.raw<number[]>([]); // the key moments' positions, searched deeper after the label pass
  private deepening = new Set<string>(); // their searches queued or running, by position and visits
  // The same searches by position, with each one's visits, until the batch after each one's end (pending).
  private deepSearches = $state.raw<Record<string, number[]>>({});
  // Every position and visits that the key moments' searches were asked for, until another network (momentChecks).
  private deepAsked = $state.raw<Record<string, true>>({});
  private confirming = new Set<string>(); // the Greats' confirmations queued or running, by path key
  // The positions whose search runs now, by path key, with each search's visits: their analysis can still change (the
  // page's gleam on a line)
  private running = $state.raw<Record<string, number[]>>({});
  // The maps added to positions without one, by path key (askOwnership, Hedge School's design 30): a position whose
  // result was stored before the ownership, and the position after a candidate, for the candidate's map. From the
  // store, or from a short search of the position alone, which the store then keeps. They never replace a result.
  private ownership = $state.raw<Record<string, number[]>>({});
  // The maps being added, by path key: their search waits for the engine, or runs (the area map's state)
  private mapWork = $state.raw<Record<string, "waiting" | "searching">>({});
  private mapPassOn = $state(false); // the map pass runs (passMaps)
  // What the page asked for last: the maps (askOwnership) and the pass (passMaps). A call that comes before the engine
  // is ready, or while it is off, does its work once the engine is ready or on again (askAgain).
  private askedPaths: string[][] = [];
  private passWanted: { on: boolean; from: string[] } = { on: false, from: [] };
  private mapPassLeft = 0; // its tasks that have not ended
  private mapless = $state.raw(new Set<string>()); // the positions of a line that the engine did not search: an ended game
  private ownershipWanted = new Set<string>(); // the positions asked for last: a search queued for another one is skipped
  private era = 0; // another network starts a new era: results from an earlier one are dropped
  private pool: EnginePool;
  private stalePool = false; // the pool still has the old network: from dropAnalysis until usePool gives the next pool
  private readonly game: Game<G>;
  private readonly id: string; // the game's id in the site's store, under which its branches are kept, or the board's
  private nextOrder = 0;
  readonly board: boolean; // the Analysis board's form (design 21)
  readonly startPosition: string | null; // the board's set-up start, in the notation: the standard start when null
  // The board's main-line moves that the player asked to evaluate, by path key: only these have labels. A branch node
  // keeps its own flag (judged).
  judgedMain = $state.raw<Record<string, true>>({});
  // The batch (BATCH_MS): the results that wait for it, the deepest for each position by path key, and what runs once
  // it has applied them.
  private batch = new Map<string, { path: string[]; visits: number; analysis: () => Analysis<G["move"]> }>();
  private batchSteps: (() => void)[] = [];
  private batchTimer?: ReturnType<typeof setTimeout>;

  /** The analysis of the moves `moves` of `game`, from `startPosition` (the board's set-up start), whose tree is kept
   *  under `id`: the game's id (the site's store), or BOARD_ID for the Analysis board, which takes the board's form. */
  constructor(game: Game<G>, pool: EnginePool, moves: string[], id: string, startPosition: string | null = null) {
    this.game = game;
    this.pool = pool;
    this.moves = moves;
    this.id = id;
    this.board = id === BOARD_ID;
    this.startPosition = startPosition;
    this.analysis = Array(moves.length + 1).fill(undefined);
  }

  /** The positions that the passes search: each before a move, and the end where the game is not over (an unfinished
   *  game), so that its last move gets a label. */
  get passCount() { return this.moves.length + (this.positions.at(-1)?.over === false ? 1 : 0); }

  /** The game's positions that the sweep has searched, and the label pass: whose result in the store has their budget.
   *  The end too, where the game is not over (passCount). */
  get swept() { return this.storedCount(SWEEP_VISITS); }
  get labelled() { return this.storedCount(this.labelVisits); }
  private storedCount(visits: number) { return this.mainKeys.filter(k => this.storedAt(k) >= visits).length; }

  /** Whether the review's own work can still change the analysis at `path`: a search of it runs now to the visits that
   *  it shows or more (a shallower result does not replace it, keep), or the label pass or the key moments' deeper
   *  search has yet to reach those visits. */
  pending(path: string[]): boolean {
    const shown = this.analysisOf(path)?.visits ?? 0;
    if (this.running[pathKey(path)]?.some(visits => visits >= shown)) return true;
    const i = mainIndex(path, this.mainNames);
    if (this.board || i === null || i >= this.passCount || this.paused || !this.engineReady) return false;
    // A key moment, or a position whose search for earlier key moments runs, waits for the key moments' depth.
    return shown < this.labelVisits || ((this.moments.includes(i) || !!this.deepSearches[i]) && shown < momentVisits(this.labelVisits));
  }

  /** Whether the search of the position at `path` stopped at the time limit, with the focus settings as they are. */
  stoppedByTime(path: string[]) {
    return this.timed[pathKey(path)] === `${this.focusVisits} ${this.focusSeconds}`;
  }

  /** The game as the review reads it. */
  data(players: ReviewData<G>["players"], ending?: GameEnding): ReviewData<G> | null {
    if (!this.rulesReady) return null;
    const end = this.positions.at(-1)!.scores;
    // For each edge but the last, the position after the engine's second choice, which confirms a Great. For each turn
    // but the last, the position after its other candidate, which confirms a Great by turn.
    const after = (i: number, c: Candidate<G["move"]> | undefined) => (c ? this.analysisAfter(i, this.game.moveName(c.edge)) : undefined);
    const seconds = this.played.map((_, i) => (i + 1 < this.played.length ? after(i, secondChoice(this.analysis[i])) : undefined));
    const others = this.played.map((_, i) => {
      const turn = this.turnAt(i);
      return turn && i + turn.length < this.played.length ? after(i, otherCandidate(this.game, this.analysis[i], turn)) : undefined;
    });
    return { players, result: { blue: end[0], red: end[1] }, moves: this.played, positions: this.positions, analysis: this.analysis,
             seconds, others, ...(ending ? { ending } : {}) };
  }

  /** The game's edges of the turn that starts with edge `i`, or undefined when no turn starts there. */
  private turnAt(i: number): (G["move"] | null)[] | undefined {
    const m = this.played[i];
    if (!m || (i > 0 && this.played[i - 1].player === m.player)) return undefined;
    const next = this.played[i + 1];
    return next && next.player === m.player ? [m.edge, next.edge] : [m.edge];
  }

  /** The analysis of the position after the turn's other candidate at `path` (otherCandidate), which confirms a Great by
   *  turn. */
  otherAt(path: string[], turn: (G["move"] | null)[]): Analysis<G["move"]> | undefined {
    const other = otherCandidate(this.game, this.analysisOf(path), turn);
    return other ? this.analysisOf([...path, this.game.moveName(other.edge)]) : undefined;
  }

  /** The analysis of the position before the opponent's last turn, for a move of `mover` from the position at `path`
   *  (model.ts, keepsGain and earlierIndex), on the path's line: the game's or a branch's. */
  earlierAt(path: string[], mover: Player): Analysis<G["move"]> | undefined {
    const k = earlierIndex(j => this.moveInto(path.slice(0, j))!.player, path.length, mover,
                           this.game.turn(this.positions[0]?.count ?? 0).first);
    return k === undefined ? undefined : this.analysisOf(path.slice(0, k));
  }

  /** Describes every position (the rules, no network), and adds the game's branches kept from an earlier visit. */
  async start() {
    const kept = this.board ? null : dbGet<KeptBranches>(STORES.branches, this.id); // read while the rules answer
    try {
      const described = (await this.pool.rules.describeGame<G["fields"]>(this.query([], this.moves))).reply.positions;
      const positions = described.map(d => this.game.position(d));
      this.played = this.moves.map((m, i) => this.game.played(m, described[i], described[i + 1]));
      this.positions = positions;
      this.mainNames = this.played.map(m => this.game.moveName(m.edge));
      this.mainKeys = prefixKeys(this.mainNames);
      this.rulesReady = true;
    } catch (e) {
      this.error = errorText(e);
      return;
    }
    if (kept) await this.addNodes(branchNodes((await kept) ?? null)); // the board's come from its page (loadBoard)
  }

  /** The analysis of the position after the move `name` from the game's position `i`, with no path built: the review
   *  asks it for every position at each result. */
  private analysisAfter(i: number, name: string): Analysis<G["move"]> | undefined {
    if (name === this.mainNames[i]) return this.analysis[i + 1];
    const key = i ? `${this.mainKeys[i]} ${name}` : name;
    return this.branches[key]?.analysis ?? this.outside[key];
  }

  /** The analysis of a position anywhere in the tree, or outside it (a Great's confirmation). */
  analysisOf(path: string[]): Analysis<G["move"]> | undefined {
    const i = mainIndex(path, this.mainNames);
    if (i !== null) return this.analysis[i];
    const key = pathKey(path), node = this.branches[key];
    return node ? node.analysis : this.outside[key];
  }

  /** The analysis of the position after the engine's second choice at `path`, which confirms a Great (confirmGreats). */
  secondAt(path: string[]): Analysis<G["move"]> | undefined {
    const second = secondChoice(this.analysisOf(path));
    return second ? this.analysisOf([...path, this.game.moveName(second.edge)]) : undefined;
  }

  /** Confirms the Greats: where the played edge was the engine's first choice in a search to the label budget, its
   *  second choice looks at least 10% of win chance worse, and the first choice keeps what the opponent's last turn gave
   *  (keepsGain, from results that the passes have already). That second value rests on few visits (the search spends them
   *  on the first choice), while En Croissant's rule compares two equal searches. So the position after the second
   *  choice is searched to the label budget, as the position after the played edge was, and the review compares the two
   *  (KaTrain's "equalize" gives every candidate the top move's visits for the same reason). For the game's edges and
   *  the branch edges evaluated on request, not where the game ends after the edge. A turn of the game asks for one more
   *  search when its first choice is one of its edges: the position after its other candidate (otherCandidate), which
   *  is the second choice unless that is the turn's other edge. The page calls it as results come: a deeper search can
   *  change a position's second choice. */
  confirmGreats() {
    for (const t of this.greatTargets) this.confirmGreat(t.path, t.candidate, t.depth);
  }

  /** The searches that the Greats ask for (confirmGreats): at each place, the candidate whose position confirms or
   *  refutes the gap. Derived once for each change of the analysis: the page reads it twice at each result. A game
   *  position's path is built only where it has a target. */
  // Each target has its depth: as deep as the position after the played move or turn, which the confirmation's
  // position is compared with (equalDepth: the player may have searched that position deeper). A move that does not
  // keep what the opponent's last turn gave (keepsGain) cannot be Great, so it asks for none.
  private greatTargets = $derived.by(() => {
    const out: { path: string[]; candidate: Candidate<G["move"]>; depth: number }[] = [];
    const depth = (after: () => string[]) => equalDepth(this.labelVisits, this.analysisOf(after())?.visits);
    const keeps = (a: Analysis<G["move"]> | undefined, path: string[], mover: Player) =>
      keepsGain(a, this.earlierAt(path, mover), mover, this.labelVisits);
    // `gain`: the search whose first choice must keep the gain. An edge's own, or for a turn's middle, the turn's start.
    const check = (a: Analysis<G["move"]> | undefined, before: () => string[], edge: G["move"] | null, mover: Player, over: boolean,
                   gain = a) => {
      const first = a?.candidates[0];
      if (!over && a && a.visits >= this.labelVisits && first && edge != null && sameMove(this.game, a, first.edge, edge) && onlyEdge(a, mover)
          && keeps(gain, before(), mover))
        out.push({ path: before(), candidate: secondChoice(a)!, depth: depth(() => [...before(), this.game.moveName(edge)]) });
    };
    const asked = (i: number) => !this.board || !!this.judgedMain[this.mainKeys[i + 1]]; // the board's: judged only
    for (let i = 0; i + 1 < this.played.length; i++)
      if (asked(i)) check(this.analysis[i], () => this.mainNames.slice(0, i), this.played[i].edge, this.played[i].player, false);
    for (const [key, node] of Object.entries(this.branches)) {
      if (!node.judged) continue;
      const before = key.split(" ").slice(0, -1);
      check(this.analysisOf(before), () => before, node.move.edge, node.move.player, !!node.position.over);
    }
    const checkTurn = (a: Analysis<G["move"]> | undefined, path: () => string[], turn: (G["move"] | null)[], mover: Player) => {
      const first = a?.candidates[0];
      if (!a || a.visits < this.labelVisits || !first || !turn.some(e => e != null && sameMove(this.game, a, e, first.edge))) return;
      const other = otherCandidate(this.game, a, turn);
      if (!other || moverWin(first.blueWin, mover) - moverWin(other.blueWin, mover) < ONLY_EDGE_GAP || !keeps(a, path(), mover)) return;
      out.push({ path: path(), candidate: other, depth: depth(() => [...path(), ...turn.map(e => this.game.moveName(e))]) });
      // A turn of two needs the search from its middle too (judgeTurn). Its second edge asks for that search only where the
      // middle's first choice keeps the gain, and the turn reads the gain at its start.
      if (turn.length > 1) {
        const middle = [...path(), this.game.moveName(turn[0])];
        check(this.analysisOf(middle), () => middle, turn[1], mover, false, a);
      }
    };
    for (let i = 0; i < this.played.length; i++) {
      const turn = this.turnAt(i);
      if (turn && i + turn.length < this.played.length && asked(i))
        checkTurn(this.analysis[i], () => this.mainNames.slice(0, i), turn, this.played[i].player);
    }
    // A branch's turns judged on request: each judged branch move that ends a turn, with its turn's edge before it.
    for (const [key, node] of Object.entries(this.branches)) {
      if (!node.judged || node.position.over || node.position.player === node.move.player) continue;
      const path = key.split(" "), before = this.moveInto(path.slice(0, -1));
      const twice = !!before && before.player === node.move.player, start = path.slice(0, twice ? -2 : -1);
      checkTurn(this.analysisOf(start), () => start, twice ? [before!.edge, node.move.edge] : [node.move.edge], node.move.player);
    }
    return out;
  });

  /** The Greats' confirmations as the review's last step: how many searches the analysis asks for so far, and how many
   *  of them have a result of their depth in the store (stored). */
  get greatChecks(): { total: number; done: number } {
    const after = new Map<string, number>(); // the depth for each position, by path key
    for (const t of this.greatTargets) {
      const key = pathKey([...t.path, this.game.moveName(t.candidate.edge)]);
      after.set(key, Math.max(t.depth, after.get(key) ?? 0));
    }
    const done = [...after].filter(([key, depth]) => this.storedAt(key) >= depth).length;
    return { total: after.size, done };
  }

  /** The key moments' deeper searches as the review's step: the positions `moments` (the key moments that the review
   *  reads now, which the page has before the label pass ends and `deepen` takes them) and every position that the key
   *  moments' searches were asked for at the key moments' depth, and how many of them have a result of that depth in
   *  the store (stored). A search's results so far change the labels, and with them the key moments (design 16), so a
   *  position can leave them while its search runs. The step waits for that search: its result is stored only at its
   *  end, so a Review done before it would leave the store without it, and the next visit's key moments would have it
   *  again. When the search ends with no result (the engine off, an engine error), the step still waits for its
   *  position, which `deepen` asks for again. And the step's count does not go back when the key moments change. */
  momentChecks(moments: number[]): { total: number; done: number } {
    const depth = momentVisits(this.labelVisits);
    const positions = new Set([...moments, ...this.askedAt(depth)]);
    return { total: positions.size, done: [...positions].filter(i => this.storedAt(this.mainKeys[i]) >= depth).length };
  }

  /** The game's positions that the key moments' searches were asked for at `visits`, until another network. */
  private askedAt(visits: number): number[] {
    return Object.keys(this.deepAsked).map(k => k.split(" ").map(Number)).filter(([, v]) => v === visits).map(([i]) => i);
  }

  /** The review from the browser's store alone, with no search (an export away from the review page, design 13): each
   *  position that the passes search and each of the branches, at the label budget or deeper, or the sweep's where that
   *  is all there is, then the positions that confirm the Greats. The board reads the same: each position of its main
   *  line and of its variations, though no pass searches them. Its labels stay on the moves evaluated (design 21): the
   *  other moves take their positions' results only, which mark the hard positions (design 14). Call after start(),
   *  and loadBoard() for the board. `search` and `model` name the engine whose results to read. A position counts as
   *  searched that far (swept, labelled, the key moments' and the Greats' steps), as the passes count it when they find
   *  the result in the store: a review opened again is complete before the engine's network loads. */
  async fromStore(search: string, model: string) {
    const take = async (path: string[]) => {
      const moves = this.keyMovesOf(path);
      const a = (await cacheGetAtLeast<Analysis<G["move"]>>(search, model, moves, this.labelVisits))
        ?? (await cacheGetAtLeast<Analysis<G["move"]>>(search, model, moves, SWEEP_VISITS));
      if (a) this.keepStored(path, a);
    };
    const paths = [...Array.from({ length: this.passCount }, (_, i) => this.mainNames.slice(0, i)), ...Object.keys(this.branches).map(k => k.split(" "))];
    await warmCache(search, model, paths.map(p => this.keyMovesOf(p)), SWEEP_VISITS); // one read of the store for them all
    await Promise.all(paths.map(take));
    // After the rest: they follow the results.
    await Promise.all(this.greatTargets.map(t => take([...t.path, this.game.moveName(t.candidate.edge)])));
  }

  /** Keeps a result that the store has (stored). */
  private keepStored(path: string[], a: Analysis<G["move"]>) {
    this.keep(path, a);
    this.noteStored(pathKey(path), a.visits);
  }

  /** Notes that the store has a result of `visits` for the position whose path key is `key`, when that is more than it
   *  had. */
  private noteStored(key: string, visits: number) {
    if (visits > this.storedAt(key)) this.stored = { ...this.stored, [key]: visits };
  }

  /** The visits of the deepest result that the store has for the position whose path key is `key` (stored). */
  private storedAt(key: string) { return this.stored[key] ?? 0; }

  /** Whether a search of the position at `path` to `visits` has nothing to add: the store has a result that deep, and
   *  the analysis holds it. A node that the player deleted and played again holds none: its search reads the store. */
  private searched(path: string[], visits: number) {
    return this.storedAt(pathKey(path)) >= visits && (this.analysisOf(path)?.visits ?? 0) >= visits;
  }

  /** Searches the position after `candidate` at `path` to the label budget, to confirm a Great. */
  private confirmGreat(path: string[], candidate: Candidate<G["move"]> | undefined, depth: number) {
    if (!candidate || !this.engineReady || this.paused) return;
    const after = [...path, this.game.moveName(candidate.edge)], key = `${pathKey(after)}|${depth}`;
    if (this.confirming.has(key) || this.searched(after, depth)) return;
    this.confirming.add(key);
    this.search(after, depth, PRIORITY.label, "confirm", { early: LABEL_VISITS })
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
    const { positions } = (await this.pool.rules.describeGame<G["fields"]>(this.query(path.slice(0, k), path.slice(k)), k)).reply;
    const next = { ...this.branches };
    for (let j = 1; j < positions.length; j++) {
      const m = path[k + j - 1], p = path.slice(0, k + j);
      if (pathKey(p) in next) continue; // added meanwhile
      next[pathKey(p)] = {
        position: this.game.position(positions[j]), order: this.nextOrder++, move: this.game.played(m, positions[j - 1], positions[j]),
      };
    }
    this.branches = next;
    if (keep) await this.keepBranches();
  }

  /** Evaluates the quality of a branch move's turn on request: every branch move of the turn (turnKeys) is judged, and
   *  the positions before and after each are searched to the label budget, so that the turn and each of its edges can
   *  be judged as the game's are (design 10). A branch's moves are not judged unless asked: a line played only to show
   *  something should cost no search. */
  async judge(path: string[]) {
    const keys = this.turnKeys(path);
    if (!keys.length) return;
    const next = { ...this.branches }, main = { ...this.judgedMain };
    for (const k of keys) if (k in next) next[k] = { ...next[k], judged: true }; else main[k] = true; // the board's main line
    this.branches = next;
    this.judgedMain = main;
    for (const k of keys) this.judgeSearches(k.split(" "));
    await this.keepBranches();
  }

  /** The branch moves of the turn of the move at `path`: the move, its turn's edge before it, and, when it begins a turn
   *  of two, every next move of the same player (each makes a turn with it). The game's moves are judged already. On
   *  the board, the main line's moves are judged on request too. */
  turnKeys(path: string[]): string[] {
    const nodes = this.board ? this.treeNodes() : this.branches;
    const key = pathKey(path), node = nodes[key];
    if (!node) return [];
    const parent = path.slice(0, -1), before = this.moveInto(parent), keys = [key];
    if (before && before.player === node.move.player) {
      if (pathKey(parent) in nodes) keys.push(pathKey(parent));
    } else {
      for (const [k, n] of Object.entries(nodes)) if (parentKey(k) === key && n.move.player === node.move.player) keys.push(k);
    }
    return keys;
  }

  /** The move that leads to `path`: the game's or a branch's (none at the start). */
  private moveInto(path: string[]): G["played"] | undefined {
    if (!path.length) return undefined;
    const i = mainIndex(path, this.mainNames);
    return i !== null ? this.played[i - 1] : this.branches[pathKey(path)]?.move;
  }

  /** The positions that judge the move into `path`: before it and after it. */
  private judging(path: string[]) {
    return [path.slice(0, -1), path];
  }

  private judgeSearches(path: string[]) {
    if (!this.engineReady) return; // the sweep starts them
    for (const p of this.judging(path))
      if (this.searchable(p)) this.search(p, this.labelVisits, PRIORITY.judge, "judge", { early: LABEL_VISITS }).catch(this.fail);
  }

  /** Deletes a branch node and every position after it (Lichess's "Delete from here"). */
  async deleteFrom(path: string[]) {
    const key = pathKey(path);
    if (this.board) { // the main line too: it ends before the move, or goes on along the next line from there
      const all = this.treeNodes();
      if (!(key in all)) return;
      const kept = Object.fromEntries(Object.entries(all).filter(([k]) => k !== key && !k.startsWith(`${key} `)));
      this.reindex(kept, mainIndex(path, this.mainNames) !== null ? path.slice(0, -1) : this.mainNames);
      await this.keepBranches();
      return;
    }
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
      // On the board, a variation from the main line becomes the main line (Lichess's promotion to the main line).
      if (this.board && mainIndex(path.slice(0, k - 1), this.mainNames) !== null) { await this.setMain(path); return; }
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

  /** The rules of a position anywhere in the tree, for the player's own moves (Enclosure's: the legal edges and the
   *  mover's nodes). */
  async rulesAt(path: string[]): Promise<G["rules"]> {
    const { reply } = await this.pool.rules.describe<G["described"]>(this.query(path));
    return this.game.rules(reply);
  }

  /** Keeps the game's branches in the browser: each node's key and order. Not for a game deleted meanwhile (in the
   *  Review tab, in another tab): its branches would come back with a later import of the game. */
  private async keepBranches() {
    if (this.board) {
      await dbPut(STORES.branches, this.id, this.keptBoard());
      void keepStorage(); // the board's analysis is the player's too
      return;
    }
    if (!(await dbGet(STORES.games, this.id))) return;
    const nodes = Object.entries(this.branches).map(([k, n]) => keptNode(k, n.order, n.judged));
    await dbPut(STORES.branches, this.id, { version: 2, nodes } satisfies KeptBranches);
  }

  /** Adds kept nodes to the tree: the game's from an earlier visit, or the board's. A node that the rules refuse is
   *  dropped. */
  private async addNodes(nodes: KeptNode[]) {
    // Each leaf's line adds the nodes before it too, with one call of the rules. Where the rules refuse a move of a line,
    // the nodes before it are added one at a time, and the rest of the line is dropped. Then each node takes its order.
    const keys = nodes.map(n => n[0]);
    for (const leaf of keys.filter(k => !keys.some(o => o.startsWith(`${k} `)))) {
      try {
        await this.addLine(leaf.split(" "), false);
      } catch {
        for (const k of keys.filter(o => leaf.startsWith(`${o} `)).sort((a, b) => a.length - b.length)) {
          try { await this.addLine(k.split(" "), false); } catch { break; }
        }
      }
    }
    const next = { ...this.branches };
    for (const [key, order, judged] of nodes) if (next[key]) next[key] = { ...next[key], order, ...(judged ? { judged: true } : {}) };
    this.branches = next;
    this.nextOrder = Math.max(0, ...Object.values(next).map(n => n.order + 1));
  }

  /** Board: the tree kept in the browser, or brought by a link or a record (design 21): its nodes, then its main line.
   *  Call after start(). A node that the rules refuse is dropped, with the rest of its line, and the main line stops
   *  before it. */
  async loadBoard(kept: KeptBoard) {
    await this.addNodes(kept.nodes);
    const main: string[] = [];
    for (const m of kept.main) {
      if (!([...main, m].join(" ") in this.branches)) break;
      main.push(m);
    }
    this.reindex(this.treeNodes(), main);
  }

  /** Board: the tree as the browser keeps it: every node, the main line's too, and the main line. */
  keptBoard(): KeptBoard {
    const nodes = Object.entries(this.treeNodes()).map(([k, n]) => keptNode(k, n.order, n.judged));
    return { version: 2, nodes, main: [...this.mainNames], ...(this.startPosition ? { start: this.startPosition } : {}) };
  }

  /** Board: the engine is ready once the pool has a network (the board's sweep). No pass runs: the engine searches the
   *  position on screen (focus) and the moves evaluated, whose searches start again here (after another network, or the
   *  engine on). */
  private ready() {
    this.engineReady = true;
    for (const k of this.judgedKeys()) this.judgeSearches(k.split(" "));
    this.askAgain(); // the maps asked for before
  }

  /** Board: the moves evaluated, by their path keys: the main line's and the branches'. */
  private judgedKeys(): string[] {
    return [...Object.keys(this.judgedMain), ...Object.entries(this.branches).filter(([, n]) => n.judged).map(([k]) => k)];
  }

  /** Board: plays a line from the start. A line that goes on from the main line's end makes it longer, as on Lichess's
   *  board. Another new line is a variation. */
  async playLine(path: string[]) {
    const n = this.mainNames.length, longer = path.length > n && mainIndex(path.slice(0, n), this.mainNames) === n;
    await this.addLine(path, false);
    if (longer) this.reindex(this.treeNodes(), this.mainNames); // the main end's only child: its new line
    await this.keepBranches();
  }

  /** Board: Lichess's "Make main line": the line through `path` becomes the main line, and the main line from where they
   *  part becomes a variation, the first there. */
  async setMain(path: string[]) {
    this.reindex(this.treeNodes(), path);
    await this.keepBranches();
  }

  /** Board: every node of the tree by path key, the main line's moves as nodes too, each before its siblings. */
  private treeNodes(): Record<string, BranchNode<G>> {
    const nodes: Record<string, BranchNode<G>> = { ...this.branches };
    const least = new Map<string, number>(); // the least order of the branches from each position, 0 or lower
    for (const [k, n] of Object.entries(this.branches)) least.set(parentKey(k), Math.min(least.get(parentKey(k)) ?? 0, n.order));
    for (let i = 1; i < this.positions.length; i++) {
      const key = this.mainKeys[i], first = least.get(parentKey(key)) ?? 0;
      nodes[key] = { position: this.positions[i], move: this.played[i - 1], order: first - 1,
                     ...(this.analysis[i] ? { analysis: this.analysis[i] } : {}), ...(this.judgedMain[key] ? { judged: true } : {}) };
    }
    return nodes;
  }

  /** Board: makes `main`, a line of `nodes`, the main line, carried on along each position's first node to its end, and
   *  the other nodes the variations. Every position is a node already: nothing is asked of the rules or searched. */
  private reindex(nodes: Record<string, BranchNode<G>>, main: string[]) {
    const first = new Map<string, string>(); // each position's first node, by the position's key
    for (const [k, n] of Object.entries(nodes)) {
      const at = parentKey(k), had = first.get(at);
      if (had === undefined || n.order < nodes[had].order) first.set(at, k);
    }
    const line = [...main];
    for (let next = first.get(pathKey(line)); next !== undefined; next = first.get(next)) line.push(lastMove(next));
    const rest = { ...nodes }, positions = [this.positions[0]], played: G["played"][] = [], analysis = [this.analysis[0]];
    const judged: Record<string, true> = {}, keys = prefixKeys(line).slice(1);
    for (const key of keys) {
      const node = rest[key];
      positions.push(node.position);
      played.push(node.move);
      analysis.push(node.analysis);
      if (node.judged) judged[key] = true;
      delete rest[key];
    }
    this.moves = line;
    this.mainNames = [...line];
    this.mainKeys = ["", ...keys];
    this.positions = positions;
    this.played = played;
    this.analysis = analysis;
    this.judgedMain = judged;
    this.branches = rest;
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
  /** A query's position: the moves for a path, then `more`, from the board's set-up start when it has one. */
  private query(path: string[], more: string[] = []) {
    return positionQuery(this.startPosition, [...this.engineMoves(path), ...more]);
  }
  /** The moves part of a path's stored results' key, which names the set-up start too (cache.ts, keyMoves). */
  private keyMovesOf(path: string[]): string[] {
    return keyMoves(this.startPosition, this.engineMoves(path));
  }

  /** A position the engine can search: on the game's line before its end, or a branch node where the game goes on. */
  private searchable(path: string[]) {
    const i = mainIndex(path, this.mainNames);
    if (i !== null) return i < this.moves.length || !this.positions[i]?.over;
    const node = this.branches[pathKey(path)];
    return !!node && !node.position.over;
  }

  /** The sweep, then the label pass, for the positions that lack them: a position whose result in the store is that
   *  deep is skipped. Call after start() and once the pool has a network, and again to take the work up after a change
   *  (the engine on again, another label budget, another network). The branch moves evaluated on request are searched
   *  too. On the board, it makes the engine ready (ready), and no pass runs. After dropAnalysis, it does nothing until
   *  usePool gives the next pool. The batch with the label pass's last result comes without its timer: the key
   *  moments wait for it. */
  async sweep() {
    if (this.stalePool) return;
    if (this.board) { this.ready(); return; }
    this.engineReady = true;
    this.askAgain(); // the maps and the map pass asked for before the engine was ready, or while it was off
    const run = ++this.passes;
    for (const [key, node] of Object.entries(this.branches)) if (node.judged) this.judgeSearches(key.split(" ")); // kept from a visit
    const n = this.passCount;
    const pass = (visits: number, priority: number, tag: string) =>
      Promise.all(Array.from({ length: n }, (_, i) =>
        this.search(this.mainNames.slice(0, i), visits, priority, tag, { early: LABEL_VISITS }).catch(this.fail)));
    await pass(SWEEP_VISITS, PRIORITY.sweep, "sweep");
    if (run !== this.passes) return; // a later run took over, or another network
    await pass(this.labelVisits, PRIORITY.label, "label");
    // The key moments wait for the batch with the label pass's last result. That batch comes without its timer, though
    // searches wait in the pool's queue (the Greats' confirmations): in a task of its own, once the pool has taken its
    // next search (search).
    await nextTask();
    if (run === this.passes) this.applyBatch();
  }

  /** Turns the engine off or on. Off: the searches stop, none starts, and what they found stays. On: the work not done
   *  starts again, and the page focuses the position on screen again. */
  setPaused(paused: boolean) {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      this.pauses++;
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

  /** Drops the analysis before another network takes over: every result came from the old one. The searches and the
   *  run of the passes stop, and results that still arrive from them are dropped. The engine is not ready again until
   *  usePool() and sweep(). */
  dropAnalysis() {
    this.era++;
    this.passes++;
    this.stalePool = true;
    this.dropFocus();
    this.pool.halt();
    this.engineReady = false;
    // The batch ends with the era: its results are dropped, and what waits for them runs now, before the reset below.
    this.batch.clear();
    this.applyBatch();
    this.analysis = Array(this.moves.length + 1).fill(undefined);
    this.branches = Object.fromEntries(Object.entries(this.branches).map(([k, n]) => [k, { ...n, analysis: undefined }]));
    this.outside = {};
    this.ownership = {};
    this.mapless = new Set();
    this.mapWork = {};
    this.mapPassOn = false;
    this.mapPassLeft = 0;
    this.stored = {};
    this.timed = {};
    this.moments = [];
    this.deepAsked = {};
  }

  /** Moves the work to another pool, already started (another network, after dropAnalysis). The old pool ends. */
  usePool(pool: EnginePool) {
    const old = this.pool;
    this.pool = pool;
    this.stalePool = false;
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
      .finally(() => this.afterBatch(() => { if (generation === this.focusGeneration) this.focusing = null; }));
  }

  /** A position's map (Hedge School's design 30): its result's ownership, or else the map added to it (askOwnership). */
  mapAt(path: string[]): number[] | undefined {
    return this.analysisOf(path)?.ownership ?? this.ownership[pathKey(path)];
  }
  /** Whether a position gets no map: the engine did not search it (the game ends there). */
  hasNoMap(path: string[]): boolean {
    return this.mapless.has(pathKey(path));
  }
  /** The longest start of a path that the tree holds: the position where a line leaves the tree. */
  private knownPrefix(path: string[]): string[] {
    let k = path.length;
    while (k > 0 && !this.known(path.slice(0, k))) k--;
    return path.slice(0, k);
  }

  /** Does again what the page asked for last: its maps, and the map pass. Once the engine is ready or on again, and
   *  for a map that its task gave up. */
  private askAgain() {
    this.askOwnership(this.askedPaths);
    if (this.passWanted.on) this.passMaps(true, this.passWanted.from);
  }

  /** The state of a position's map, for the area map's legend: there (`ready`), its search runs (`searching`), it
   *  waits for the engine (`waiting`: its search waits behind the review's searches, or the position's own result is
   *  still to come), none can come (`none`: the game ends there), or nothing asks for it (`unasked`). */
  mapState(path: string[]): "ready" | "searching" | "waiting" | "none" | "unasked" {
    if (this.mapAt(path)) return "ready";
    const key = pathKey(path);
    if (this.mapless.has(key)) return "none";
    if (this.mapWork[key]) return this.mapWork[key];
    if (this.known(path) && this.searchable(path) && !this.analysisOf(path)) return "waiting"; // its own search comes
    // Asked for while the engine is not ready or off: it is asked for again then (askAgain)
    const idle = !this.engineReady || this.paused || this.stalePool;
    return idle && this.ownershipWanted.has(key) ? "waiting" : "unasked";
  }

  /** Adds a map to these positions, which the area map shows, where they have none (mapAt): to a position of the tree
   *  whose result has none (stored before the ownership), and to a position of a line from the tree (after a
   *  candidate, or after an edge of the engine's line or of a preview). The map stored for it, or else a short search
   *  of the position alone (MAP_VISITS), after the position on screen's, whose map the store then keeps (cache.ts,
   *  mapPut). The result itself stays as it is. A position of the tree with no result yet waits for its own search,
   *  which asks for the ownership. A search queued for a position that the page no longer asks for starts and ends at
   *  once. */
  askOwnership(paths: string[][]) {
    this.askedPaths = paths;
    this.ownershipWanted = new Set(paths.map(pathKey));
    if (!this.engineReady || this.paused || this.stalePool) return;
    for (const path of paths) {
      const key = pathKey(path), inTree = this.known(path);
      if (this.mapAt(path) || this.mapWork[key] || this.mapless.has(key)) continue;
      if (inTree ? !this.searchable(path) || !this.analysisOf(path) : !this.searchable(this.knownPrefix(path))) continue;
      this.addMap(path, PRIORITY.ownership, "ownership", () => this.ownershipWanted.has(key), false);
    }
  }

  /** The map pass (Hedge School's design 30): while the area map is on (`on`), once the review's passes are done, the
   *  maps of the game's positions that have none, from the position on screen (`from`) to the game's end, then back
   *  to its start, stored as the maps that askOwnership adds. At the lowest priority, in slices, so that the pool stops
   *  a search of it at once for any search for the player, and runs it again later. Off stops it. */
  passMaps(on: boolean, from: string[]) {
    this.passWanted = { on, from };
    if (!on) {
      if (!this.mapPassOn) return;
      this.mapPassOn = false;
      this.pool.cancel(t => t === "mappass");
      this.mapPassLeft = 0;
      return;
    }
    if (this.mapPassOn || this.board || !this.engineReady || this.paused || this.stalePool) return;
    const n = this.passCount;
    if (this.labelled < n) return; // the review's passes first
    const at = Math.min(mainIndex(this.knownPrefix(from), this.mainNames) ?? 0, n - 1);
    const order = [...Array.from({ length: n - at }, (_, k) => at + k), ...Array.from({ length: at }, (_, k) => at - 1 - k)];
    const missing = order.map(i => this.mainNames.slice(0, i))
      .filter(p => !this.mapAt(p) && !this.mapless.has(pathKey(p)) && !this.mapWork[pathKey(p)]);
    if (!missing.length) return;
    this.mapPassOn = true;
    this.mapPassLeft = missing.length;
    for (const p of missing) this.addMap(p, PRIORITY.mapPass, "mappass", () => this.mapPassOn, true, () => {
      if (--this.mapPassLeft <= 0) this.mapPassOn = false;
    });
  }
  /** The map pass's progress while it runs: the game's positions, and those that have their map (or can have none).
   *  Null when it does not run. */
  get mapPass(): { total: number; done: number } | null {
    if (!this.mapPassOn) return null;
    const n = this.passCount, paths = Array.from({ length: n }, (_, i) => this.mainNames.slice(0, i));
    return { total: n, done: paths.filter(p => this.mapAt(p) || this.mapless.has(pathKey(p))).length };
  }

  /** Adds the map of the position at `path`: the store's, or a short search's, which the store then keeps. `wanted`
   *  says whether the page still wants it when its search starts. `sliced`: in slices, which the pool can stop to give
   *  way; a stopped search keeps nothing, and the pool runs it again. `ended` runs when it ends, however it ends. */
  private addMap(path: string[], priority: number, tag: string, wanted: () => boolean, sliced: boolean, ended?: () => void) {
    const key = pathKey(path), inTree = this.known(path);
    const era = this.era, pool = this.pool, query = this.query(path), keyed = this.keyMovesOf(path);
    const mark = (state: "waiting" | "searching") => { if (era === this.era) this.mapWork = { ...this.mapWork, [key]: state }; };
    const keep = (ownership: number[]) => { if (era === this.era) this.ownership = { ...this.ownership, [key]: ownership }; };
    mark("waiting");
    let tried = false; // the store or a search answered, or the search failed: else the map may be asked for again
    void (async () => {
      const stored = await mapGet(pool.search!, pool.model!.sha256, keyed);
      if (stored) { tried = true; keep(stored.ownership); return; }
      await pool.run(priority, tag, async (engine, onStop) => {
        if (era !== this.era || !wanted()) return;
        mark("searching");
        const run = engine.analyse({ ...query, maxVisits: MAP_VISITS, includeOwnership: true,
                                     ...(sliced ? { slice: { visits: MAP_SLICE } } : {}) });
        if (sliced) onStop(run.stop);
        const { reply } = await run.done;
        if (reply.terminated) { mark("waiting"); return; } // stopped to give way: the pool runs it again
        tried = true;
        const { ownership } = toAnalysis(this.game, reply);
        if (era !== this.era || !ownership) return;
        keep(ownership);
        await mapPut(pool.search!, pool.model!.sha256, keyed, { ownership, visits: reply.rootInfo.visits, source: "short search" });
      });
    })()
      // A position after a candidate can end the game, and the engine searches no ended position: it has no map
      .catch(e => {
        if (e instanceof Cancelled || e instanceof Stopped) return;
        tried = true;
        if (inTree) this.fail(e);
        else this.mapless = new Set(this.mapless).add(key);
      })
      .finally(() => {
        if (era === this.era && this.mapWork[key]) {
          const rest = { ...this.mapWork };
          delete rest[key];
          this.mapWork = rest;
        }
        ended?.();
        // Every map that the page asks for comes, or is asked for again: one that its task gave up without a try (the
        // map pass stopped while it held the position, or a search that the page did not want when it started) and
        // that the page wants now
        if (era === this.era && !tried && this.ownershipWanted.has(key) && !this.mapAt(path)) queueMicrotask(() => this.askAgain());
      });
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

  /** Each edge of a line from the position at `path`, played: what the board draws after it (the game's step:
   *  Enclosure's is the edge it cuts, and the regions and areas after it). The rules, no network. */
  async lineSteps(path: string[], line: G["move"][]): Promise<G["step"][]> {
    const query = this.query(path, line.map(m => this.game.moveName(m)));
    const { positions } = (await this.pool.rules.describeGame<G["fields"]>(query, path.length)).reply;
    return positions.slice(1).map(p => this.game.step(p));
  }

  /** Searches these positions deeper, after the focus and before the sweep. The page calls it again when the key
   *  moments change (another label, another review depth), and the engine on calls it: a position whose search is
   *  queued or done is not asked again. A position asked for before at this depth whose search ended with no result in
   *  the store (the engine off, an engine error) is asked for again, though it is no key moment now: the key moments'
   *  step waits for it (momentChecks). A search that the engine off stopped can end after the engine is on again: it
   *  then asks again itself. */
  deepen(indices: number[]) {
    this.moments = indices;
    const visits = momentVisits(this.labelVisits), pauses = this.pauses;
    const again = this.askedAt(visits).filter(i => this.storedAt(this.mainKeys[i]) < visits);
    for (const i of new Set([...indices, ...again])) {
      const key = `${i} ${visits}`;
      if (this.deepening.has(key)) continue;
      this.deepening.add(key);
      if (!this.deepAsked[key]) this.deepAsked = { ...this.deepAsked, [key]: true };
      this.markRunning("deepSearches", i, visits, this.search(this.mainNames.slice(0, i), visits, PRIORITY.moment, "moment", { sliced: true })
        .catch(this.fail).finally(() => {
          this.deepening.delete(key);
          // The engine went off and on again before the search ended: the engine on did not ask for it again then.
          if (pauses !== this.pauses && !this.paused && this.engineReady) this.deepen(this.moments);
        }));
    }
  }

  /** Keeps an engine error for the page. A task cancelled before it ran, or a worker ended for another pool, is not one. */
  private fail = (e: unknown) => {
    if (!(e instanceof Cancelled) && !(e instanceof Stopped)) this.error = errorText(e);
  };

  /** Searches the position at `path` to `visits`, or takes the result from the cache. The budget is met only by a
   *  result that the store has (stored), once the analysis holds it (searched): then no search runs. A search's final
   *  result meets it in the batch that shows that result, after its write. A search that stops before its end does
   *  not: the engine off, its time limit, or a stale focus. Nor do another search's results so far, which the store may
   *  never get.
   *  Options: `sliced` searches in slices, which show their results as they come and can stop; `seconds` is a sliced
   *  search's time limit, and `ontime` runs when it stops there. `early` shows the result at that many visits too
   *  (slices of that size, which do not stop), so that a deep label search shows a label from 256 visits on. */
  private async search(path: string[], visits: number, priority: number, tag: string, options: {
    sliced?: boolean; wanted?: () => boolean; seconds?: number | null; ontime?: () => void; early?: number;
  } = {}): Promise<void> {
    const { sliced = false, wanted = () => true, seconds = null, ontime, early } = options;
    const slice = sliced ? SLICE_VISITS : early && early < visits ? early : null;
    const era = this.era, pool = this.pool, query = this.query(path), keyed = this.keyMovesOf(path);
    const key = analysisKey(pool.search!, pool.model!.sha256, keyed, visits);
    const at = pathKey(path), met = () => this.searched(path, visits);
    if (met()) return;
    const cached = await cacheGetAtLeast<Analysis<G["move"]>>(pool.search!, pool.model!.sha256, keyed, visits);
    if (era !== this.era) return;
    if (cached) { this.keepStored(path, cached); return; }
    if (met() || this.paused || !wanted()) return;
    // The engine takes its next search when this one ends: the result's write and its batch (shown) follow without it.
    // So the task gives `shown` back in an object: a task that gave the promise itself would wait for it.
    const ended = await pool.run(priority, tag, async (engine, onStop) => {
      if (met() || this.paused || !wanted() || era !== this.era) return;
      // The time limit counts from the search's start in the worker, not from its wait in the queue. The worker keeps
      // it, and ends the search at the end of the slice in which it passes (channel.ts, searchInSlices): a timer of the
      // page would run late in a hidden tab (decisions/product.md, "A review in a hidden tab"). Every search asks for
      // the ownership of each point, so that a stored review has the area map whatever the display settings (Hedge
      // School's design 30). A candidate's map comes from a short search when it is pointed at (askOwnership).
      const run = engine.analyse({ ...query, maxVisits: visits, includePVVisits: true, includeOwnership: true,
                                   ...(slice ? { slice: { visits: slice } } : {}) },
                                 r => { if (era === this.era) this.toBatch(path, r.rootInfo.visits, () => toAnalysis(this.game, r)); },
                                 sliced && seconds !== null ? seconds * 1000 : undefined);
      if (sliced) onStop(run.stop); // the pool may stop it to give way, and runs it again later
      if (tag === "focus") this.stopFocus = run.stop;
      const shown = run.done.then(async t => {
        const a = toAnalysis(this.game, t.reply), final = !t.reply.terminated && a.visits >= visits;
        if (era !== this.era) return;
        // The write first: the result and the passes' progress show only once it is stored, so that the game's mark
        // (markReviewed) comes after every result it covers. The end of the search's marks (markRunning, focus) then
        // follows in microtasks, before the batch.
        if (final) await cachePut(key, a);
        if (era !== this.era) return;
        this.toBatch(path, a.visits, () => a);
        this.afterBatch(() => { if (t.late) ontime?.(); if (final) this.noteStored(at, a.visits); });
        // The next step waits for this batch: the key moments wait for the label pass's last result, and Review done
        // for the last of all. With no search waiting in the pool's queue, an engine can be free for that step, though
        // a focus or another search still runs. So the batch then comes in a task of its own, once the pool has taken
        // its next search, if any. While a search waits, every engine is busy, and the batch keeps its timer, but for
        // the label pass's last result (sweep). That timer runs late in a hidden tab: about once a second, and later
        // once the page's timers have used up their share of the processor (decisions/product.md, "A review in a
        // hidden tab").
        void nextTask().then(() => { if (!pool.waiting) this.applyBatch(); });
      });
      this.markRunning("running", at, visits, shown);
      await run.done;
      return { shown };
    });
    // The batch of the last run (pool.run). A run that the pool stopped to give way shows its own result alone.
    await ended?.shown;
  }

  /** Notes the search of the position `key` to `visits` in `field` until the batch after `search` ends: its search
   *  runs, its result's write follows, and the batch shows the result. `running` notes a search that runs now, by path
   *  key, and `deepSearches` a key moment's search from its queue on, by the game's position (pending). */
  private markRunning(field: "running" | "deepSearches", key: string | number, visits: number, search: Promise<unknown>) {
    this[field] = { ...this[field], [key]: [...(this[field][key] ?? []), visits] };
    const end = () => this.afterBatch(() => {
      const { [key]: all = [], ...rest } = this[field], left = all.toSpliced(all.indexOf(visits), 1);
      this[field] = left.length ? { ...rest, [key]: left } : rest;
    });
    search.then(end, end);
  }

  /** Keeps a result for the batch: the deepest for each position, so that a search's final result is not replaced by a
   *  shallower result of another search of the position, and the latest of equal depth. `analysis` runs only when the
   *  batch applies it, so that a search's results so far that a later slice replaced cost nothing. */
  private toBatch(path: string[], visits: number, analysis: () => Analysis<G["move"]>) {
    const key = pathKey(path);
    if (visits >= (this.batch.get(key)?.visits ?? 0)) this.batch.set(key, { path, visits, analysis });
    this.scheduleBatch();
  }

  /** Runs `step` in the next batch, after its results are applied: what a search's end changes shows with its result. */
  private afterBatch(step: () => void) {
    this.batchSteps.push(step);
    this.scheduleBatch();
  }

  private scheduleBatch() {
    this.batchTimer ??= setTimeout(() => this.applyBatch(), BATCH_MS);
  }

  /** Applies the batch's results, then runs what waits for them, in one task: the review runs once for all of them. */
  private applyBatch() {
    clearTimeout(this.batchTimer);
    this.batchTimer = undefined;
    const results = this.batch, steps = this.batchSteps;
    this.batch = new Map();
    this.batchSteps = [];
    for (const r of results.values()) this.keep(r.path, r.analysis());
    for (const step of steps) step();
  }

  /** Keeps the deeper of the analysis held and the new one. */
  private keep(path: string[], a: Analysis<G["move"]>) {
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
