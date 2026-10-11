<script lang="ts" module>
  /** The review in progress: what the engine does now, and the passes as parts of one bar, each with its share of the
   *  work (by visits) and how much of it is done (0 to 1). `waiting`: no work runs (the engine is off). */
  export interface ReviewProgress { text: string; parts: { share: number; done: number }[]; waiting?: boolean }
</script>

<script lang="ts">
  // The review of one game (docs/research/01-ux-survey.md, section 8): Highlights (chess.com) and free analysis
  // (Lichess). Learning from the mistakes is to come back as a mode of the analysis (decisions/open-items.md). The
  // review may be partial while the engine works: an edge with no label yet shows none. The layout is design 06 (docs/design/06-review-layout.md): the board fills the window's height,
  // with the summary on its left from 1,260 pixels (Lichess's three columns), and the analysis on its right.
  import { ContextMenu, Dialog, RadioGroup, Switch, Tabs } from "bits-ui";
  import { untrack } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";
  import type { BranchNode } from "#lib/analysis/game.svelte.ts";
  import { CUSTOM_REVIEW, DEPTHS, NETWORKS, REVIEW_PRESETS, TIME_LIMITS, maxWorkers, nearestStep, type EngineSettings,
           type ReviewDepth }
    from "#lib/analysis/engineSettings.ts";
  import Board, { type BoardCandidate, type BoardLineEdge, type BoardMark } from "#lib/board/Board.svelte";
  import { EdgeInput, type EdgeRules } from "#lib/board/edgeInput.svelte.ts";
  import { parseEdge } from "#lib/engine/notation.ts";
  import Swatch from "#lib/ui/Swatch.svelte";
  import { SIDE_TEXT } from "#lib/ui/side.ts";
  import AdvantageChart from "./AdvantageChart.svelte";
  import { loadDisplay, saveDisplay, type Display } from "./display.ts";
  import { playMove, preload } from "#lib/sound.ts";
  import Glyph from "./Glyph.svelte";
  import {
    explain, edgeName, moveName, moveNotation, sameEdge, shortNote, judgeBranchEdge, valuesAfter, moverWin, moverScore, largest, lossText, lossPhrase, pct, shownCandidates, lineMovers, enoughVisits, trustedLine, type Analysis, type Candidate, type LineStep, LABELS, LABEL_TEXT, LABEL_GLYPH, PLAYER_NAME, type Edge, type Label, type Player, type Position, type Review,
  } from "./model.ts";
  import { branchChildren, branchRows, mainIndex, nextFork, pathKey, prevFork, sharedLength, siblingLine } from "./tree.ts";

  interface Props {
    R: Review;
    progress?: ReviewProgress | null; // the review in progress, or null when it is complete
    problem?: string; // an engine error
    deepVisits?: number; // the budget of the position on screen: its search bar is full at this many visits
    onposition?: (path: string[]) => void; // the position on screen changed: its path in the game's tree
    lineSteps?: (path: string[], line: Edge[]) => Promise<LineStep[]>; // a line's edges played: cuts, regions (the rules)
    branches?: Record<string, BranchNode>; // the branches' positions, by path key (tree.ts), in the order added
    onplay?: (path: string[]) => Promise<void>; // adds a line from the start to the tree
    rulesAt?: (path: string[]) => Promise<EdgeRules>; // a position's legal edges and mover's nodes, for the player's moves
    secondAt?: (path: string[]) => Analysis | undefined; // the position after the engine's second choice, which confirms a Great
    reviewVisits?: number; // the review's depth: a position searched less is a first estimate on the chart
    ondelete?: (path: string[]) => Promise<void>; // deletes a branch node and what follows it
    onpromote?: (path: string[]) => Promise<void>; // promotes a branch one step among the branches from its fork
    onjudge?: (path: string[]) => Promise<void>; // evaluates a branch move's quality: searches its two positions
    labelVisits?: number; // the label budget: a move is judged once both its positions have this many visits
    searching?: boolean; // the position on screen is being searched now
    timedOut?: boolean; // the position on screen's search stopped at its time limit
    engine?: EngineSettings; // the engine's settings (design 09), shown in the settings panel
    onengine?: (change: Partial<EngineSettings>) => void; // a setting changed in the panel
  }
  let { R, progress = null, problem = "", deepVisits = 0, onposition, lineSteps, branches = {}, onplay, rulesAt, ondelete,
        onpromote, onjudge, labelVisits = 0, searching = false, timedOut = false, engine, onengine, secondAt, reviewVisits = 0 }: Props = $props();
  const last = $derived(R.data.positions.length - 1);
  const TABLE_ROWS = 5; // the Analysis table shows this many rows and scrolls, so the move list under it does not move
  const ROW_EM = 1.9; // a table row's height, in em
  const GAUGE_TEXT_PX = 40; // the length of a side's part of the gauge that has room for its percentage, written up
  // Class lists used in several places.
  const PANEL = "min-w-0 px-4 py-3 bg-panel border border-line rounded-md";
  // A label's badge in the text. Its mark is 56% of the circle, as on the board (0.4 in 0.72), and bold, not extra bold,
  // because small text in heavy weights runs together.
  const BADGE = "inline-flex items-center justify-center min-w-[1.8em] h-[1.8em] px-[0.2em] rounded-full text-[0.64em] font-bold text-on-badge";
  const GAUGE_TEXT = "absolute left-1/2 -translate-x-1/2 rotate-180 [writing-mode:vertical-rl] text-[0.6rem] leading-none font-semibold tracking-[0.1em] text-white tabular-nums";
  const MENU_ITEM = "px-2.5 py-1.5 rounded cursor-pointer outline-none data-highlighted:bg-panel data-disabled:opacity-50 data-disabled:cursor-default";
  const KBD = "inline-block min-w-[1.6em] px-1 py-px rounded border border-line bg-panel font-mono text-[0.85em] text-center leading-tight";
  const SETTINGS_HEAD = "mt-2 first:mt-0 pb-0.5 text-xs font-semibold uppercase tracking-wide text-muted border-b border-line";
  const TAB = "flex-1 bg-transparent border-transparent border-b-2 border-b-line rounded-none data-[state=active]:border-b-accent data-[state=active]:font-semibold";

  type Stage = "highlights" | "analysis";
  let stage = $state<Stage>("highlights");
  // The place on screen: a path in the game's tree (tree.ts), the game's own moves or a branch (design 07).
  let path = $state<string[]>([]);
  let hover = $state<Edge | null>(null);
  // Three columns from Lichess's width for them (its $x-large, 1,260 pixels): the summary gets its own column, and
  // Highlights is no longer a tab.
  const wide = new MediaQuery("min-width: 1260px");
  // The display settings, kept in this browser (display.ts). They open in the analysis column, in the place of the
  // analysis (Lichess's analysis menu takes the move list's place), so that the board shows each change.
  const display = $state(loadDisplay());
  $effect(() => saveDisplay($state.snapshot(display)));
  let settingsOpen = $state(false);
  // The engine's settings (design 09) open under the engine header, from its gear, as Lichess's open from the gear in
  // its engine box: the header's values and its search bar stay in view while they change. The display settings take the
  // header's place, so one panel shows at a time.
  let engineOpen = $state(false);
  let gaugeHeight = $state(0);
  // The row above the board is one line high, or two in a narrow row: the board and the side columns take its height.
  let stripHeight = $state(0);
  // The side columns reach down to the Advantage chart's bottom edge when the whole chart is in the window, so that
  // the columns end on one line. When the board fills the window's height, the chart is below the fold: the side
  // columns then keep the board's height, so that the step controls stay in view. The chart's place depends only on
  // the board's column, so reaching down does not move it. The chart's place is measured again whenever the board's
  // column or the page changes size, not only the window: the row above the board, measured after the first paint, or
  // a bar of the browser's own, move it too.
  let chartBox = $state<HTMLElement>();
  let boardCol = $state<HTMLElement>();
  let reach = $state(false);
  $effect(() => {
    void innerWidth.current; void wide.current; void display.win;
    const height = innerHeight.current;
    if (!chartBox || !boardCol || height === undefined) return;
    const measure = () => { reach = chartBox!.getBoundingClientRect().bottom + window.scrollY <= window.innerHeight; };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(boardCol);
    watch.observe(document.body);
    return () => watch.disconnect();
  });
  const mainNames = $derived(R.data.moves.map(m => moveName(m.edge)));
  const here = $derived(pathKey(path));
  const mainAt = $derived(mainIndex(path, mainNames)); // the place on the game's line, or null in a branch
  const pos = $derived(mainAt ?? sharedLength(path, mainNames)); // on the game's line: here, or where the branch leaves it
  const branchNode = $derived(mainAt === null ? branches[here] : undefined);
  const position = $derived(branchNode?.position ?? R.data.positions[pos]);
  const over = $derived(mainAt !== null ? mainAt === last : !!position.over); // the game has ended here
  const analysis = $derived(over ? undefined : mainAt !== null ? R.data.analysis[mainAt] : branchNode?.analysis);
  const mover = $derived(position.player as Player);
  const lastMove = $derived(mainAt !== null && mainAt > 0 ? R.edges[mainAt - 1] : null); // the game's last move here
  const lastPlayed = $derived(branchNode?.move ?? lastMove); // the move that led here, in the game or a branch

  // The tree's children: the game's next move first, on its line, then the branches, in the order they were added.
  const kids = $derived(branchChildren(Object.entries(branches).sort((a, b) => a[1].order - b[1].order).map(([k]) => k.split(" "))));
  const branchKids = (p: string[]) => kids.get(pathKey(p)) ?? [];
  function childrenOf(p: string[]): string[][] {
    const i = mainIndex(p, mainNames);
    return [...(i !== null && i < mainNames.length ? [[...p, mainNames[i]]] : []), ...branchKids(p)];
  }
  const positionOf = (p: string[]): Position | undefined => {
    const i = mainIndex(p, mainNames);
    return i !== null ? R.data.positions[i] : branches[pathKey(p)]?.position;
  };
  // The turn of the move from a place, and whether it is the turn's first edge: the game's own turns on its line, and in
  // a branch the turn goes on while the same player moves.
  const turnCache = $derived.by(() => { void R; void branches; return new Map<string, { turn: number; first: boolean }>(); });
  function moveFrom(p: string[]): { turn: number; first: boolean } {
    const i = mainIndex(p, mainNames);
    if (i !== null && i < R.edges.length) return { turn: R.turnOf[i].number, first: R.turnOf[i].edges[0].index === i };
    if (!p.length) return { turn: 1, first: true };
    const key = pathKey(p), known = turnCache.get(key);
    if (known) return known;
    const parent = p.slice(0, -1), up = moveFrom(parent);
    const first = positionOf(p)?.player !== positionOf(parent)?.player;
    const t = { turn: up.turn + (first ? 1 : 0), first };
    turnCache.set(key, t);
    return t;
  }
  /** The turns of edges played one after another from a place, by who plays them. */
  function turnsFrom(p: string[], players: Player[]): { turn: number; first: boolean }[] {
    const out: { turn: number; first: boolean }[] = [];
    players.forEach((pl, k) => {
      if (k === 0) { out.push(moveFrom(p)); return; }
      const first = pl !== players[k - 1];
      out.push({ turn: out[k - 1].turn + (first ? 1 : 0), first });
    });
    return out;
  }
  const turnText = (t: { turn: number; first: boolean }) => `${t.turn}${t.first ? "." : "..."}`;
  /** A move in the record's notation with its turn: "12. L10-N11", and "12... N11-Q10" for a turn's second edge. */
  const moveText = (index: number) => {
    const t = R.turnOf[index];
    return `${t.number}${t.edges[0].index === index ? "." : "..."} ${moveNotation(R.edges[index])}`;
  };
  // The move list and the chart show only these labels, to stay quiet. The board shows every label.
  const LISTED: Label[] = ["great", "inaccuracy", "mistake", "blunder"];
  const listed = (l: Label | null): l is Label => !!l && LISTED.includes(l);
  // The move list explains these labels under their turn.
  const COMMENTED: Label[] = ["great", "mistake", "blunder"];

  const pts = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x))}`;
  const fmtScore = (s: number) => Math.round(s).toLocaleString("en");
  const signed = (x: number, text: string) => `${x < 0 ? "−" : "+"}${text}`;
  // A candidate's row, tinted by Blue's win chance after it: blue when it favours Blue, red when it favours Red. The
  // tint is a diverging scale in equal steps per side, not a continuous one: steps are easier to tell apart than shades.
  // The steps start at chess.com's win-chance bands (labels.ts: 2%, 5%, 10%, 20%), here as the distance from 50%, so
  // that they are narrow near 50%, where small differences matter. Under 2% from 50%, no tint.
  const TINT_STEPS: [number, number][] = [[0.02, 14], [0.05, 24], [0.10, 34], [0.20, 44]]; // [from, strength in percent]
  function rowTint(blueWin: number) {
    const d = Math.abs(blueWin - 0.5);
    const step = TINT_STEPS.findLast(([from]) => d >= from);
    return step ? `background: color-mix(in srgb, var(${blueWin > 0.5 ? "--blue" : "--red"}) ${step[1]}%, transparent)` : "";
  }

  // The engine's candidates on the board (model.ts), each with its note: number 1's own values, and the others'
  // difference from number 1 ("vs 1"), even when it is 0. A candidate after number 1 in the engine's order can be better
  // than it, by a little: its difference is then positive.
  const candidates = $derived<BoardCandidate[]>(shownCandidates(analysis, mover).map(({ c, rank, gap, gapPts }) => ({
    edge: c.edge, rank,
    note: rank === 1 ? `${pct(moverWin(c.blueWin, mover))}${c.lead !== undefined ? ` · ${pts(moverScore(c.lead, mover))} pts` : ""}`
      : `vs 1: ${signed(-gap, pct(Math.abs(gap)))}${gapPts !== undefined ? ` · ${signed(-gapPts, `${Math.abs(Math.round(gapPts))} pts`)}` : ""}`,
  })));

  // The engine's line from the candidate pointed at, on the board or in the table (KaTrain's and Lizzie's way): its
  // first LINE_EDGES edges, each with its mover. Only for a candidate with enough visits (the board's rule), and only as
  // far as the search trusts it (trustedLine): the line of a barely searched move means little. A line needs an edge
  // after the candidate.
  const LINE_EDGES = 6; // three turns of two edges
  const shownLine = (c: Candidate): Edge[] | null => {
    if (!analysis || !enoughVisits(analysis, c)) return null;
    const edges = trustedLine(c).slice(0, LINE_EDGES);
    return edges.length >= 2 ? edges : null;
  };
  const hoverCandidate = $derived(hover && analysis ? analysis.candidates.find(c => sameEdge(c.edge, hover!)) : undefined);

  // The line listed under the table (Lichess lists the engine's line under its header, one line by default): the line
  // of the candidate pointed at, or else of the selected one, number 1 or the candidate last clicked (in the table or
  // on the board). So the pointer can go from a row to its line. Pointing at an edge of the list draws the line up to it on the board, all at once, and a
  // click plays the line up to it as a branch (Lichess's playUciList).
  // A click on a candidate, in the table or on the board, selects and pins it: its line stays on the board, and goes on
  // drawing, when the pointer leaves. A second click unpins it.
  let selectedRank = $state(1);
  let pinned = $state(false);
  let listHover = $state<number | null>(null);
  $effect(() => { void here; selectedRank = 1; pinned = false; listHover = null; forkPick = 0; forkPicked = false; });
  function pick(rank: number) {
    if (pinned && selectedRank === rank) pinned = false;
    else { selectedRank = rank; pinned = true; }
  }
  const selectedCandidate = $derived(analysis?.candidates[selectedRank - 1]);
  const pinnedCandidate = $derived(pinned ? selectedCandidate : undefined);
  const listCandidate = $derived(hoverCandidate ?? selectedCandidate);
  const listRank = $derived(listCandidate && analysis ? analysis.candidates.indexOf(listCandidate) + 1 : 0);
  const listLine = $derived.by((): Edge[] | null => {
    if (!listCandidate || !analysis || !enoughVisits(analysis, listCandidate)) return null;
    const edges = trustedLine(listCandidate);
    return edges.length >= 2 ? edges : null;
  });
  const listTurns = $derived(listLine ? turnsFrom(path, lineMovers(position, listLine.length)) : []);
  const selectRank = (edge: Edge) => {
    const k = analysis?.candidates.findIndex(c => sameEdge(c.edge, edge)) ?? -1;
    if (k >= 0) pick(k + 1);
  };
  // How far the listed line follows the tree from here: its edges played in the game, or in a branch.
  const listKnown = $derived.by((): ("game" | "branch")[] => {
    const out: ("game" | "branch")[] = [];
    let p = path;
    for (const e of listLine ?? []) {
      p = [...p, edgeName(e)];
      if (mainIndex(p, mainNames) !== null) out.push("game");
      else if (pathKey(p) in branches) out.push("branch");
      else break;
    }
    return out;
  });
  const play = (k: number) => { if (listLine) playPath([...path, ...listLine.slice(0, k + 1).map(edgeName)]); };
  /** Plays a line from the start: along the tree where it is there, as a new branch where it is not, then goes there. */
  async function playPath(target: string[]) {
    if (onplay) await onplay(target);
    setPath(target, true);
  }
  // Space plays the pinned candidate, or number 1 (Lichess's Space plays its best move).
  function playCandidate() {
    const c = pinnedCandidate ?? analysis?.candidates[0];
    if (c) playPath([...path, edgeName(c.edge)]);
  }

  // The player's own moves, always on (Lichess's analysis board): the puzzles' edge input, on the position's rules from
  // the engine. A move that is the game's goes along the game; another makes a branch.
  const input = new EdgeInput(edge => playPath([...path, edgeName(edge)]));
  const knownRules = new Map<string, EdgeRules>();
  $effect(() => {
    const key = here, end = over;
    input.reset();
    input.rules = null;
    if (end || !rulesAt) return;
    const known = knownRules.get(key);
    if (known) { input.rules = known; return; }
    let current = true;
    rulesAt(key ? key.split(" ") : [])
      .then(r => { knownRules.set(key, r); if (current) input.rules = r; })
      .catch(() => {}); // without the rules, no own moves here
    return () => { current = false; };
  });

  // The board's line: the listed line up to the edge pointed at in the list, or the line of the candidate pointed at, or
  // of the pinned one.
  const lineEdges = $derived(listHover !== null && listLine ? listLine.slice(0, listHover + 1)
    : hoverCandidate ? shownLine(hoverCandidate) : pinnedCandidate ? shownLine(pinnedCandidate) : null);
  const lineKey = $derived(lineEdges ? `${here}|${lineEdges.map(edgeName).join(" ")}` : null);
  const line = $derived.by((): BoardLineEdge[] | null => {
    if (!lineEdges) return null;
    const movers = lineMovers(position, LINE_EDGES);
    return lineEdges.map((edge, i) => ({ edge, player: movers[i], ...stepsNow?.[i] }));
  });

  // The listed line's edges played, from the engine's rules, asked once for each line: the edge each one cuts, and the
  // regions and areas after it. The board's line is a part of the listed line, so their steps are the same. The board
  // shows the cut edges cut, and the regions as they become.
  const knownSteps = new Map<string, LineStep[]>();
  let lineStepsHad = $state<{ at: string; edges: Edge[]; steps: LineStep[] } | null>(null);
  const listKey = $derived(listLine ? `${here}|${listLine.map(edgeName).join(" ")}` : null);
  $effect(() => {
    const key = listKey;
    if (!key) return;
    const [at, names] = key.split("|");
    const edges = names.split(" ").map(parseEdge);
    const known = knownSteps.get(key);
    if (known) { lineStepsHad = { at, edges, steps: known }; return; }
    if (!lineSteps) return;
    let current = true;
    lineSteps(at ? at.split(" ") : [], edges)
      .then(steps => { knownSteps.set(key, steps); if (current) lineStepsHad = { at, edges, steps }; })
      .catch(() => {}); // without them, the line still shows
    return () => { current = false; };
  });
  // The steps of a line from here, as far as it matches the line whose steps came. The search can lengthen or change a
  // line while it shows: until the new line's steps come, the steps of the edges it shares with the line before stay.
  function stepsOf(edges: Edge[] | null): LineStep[] | null {
    const had = lineStepsHad;
    if (!edges || !had || had.at !== here) return null;
    let k = 0;
    while (k < edges.length && k < had.edges.length && sameEdge(edges[k], had.edges[k])) k++;
    return had.steps.slice(0, k);
  }
  const stepsNow = $derived(stepsOf(lineEdges));
  const listSteps = $derived(stepsOf(listLine));

  // The line as far as drawn: animated (the default, a display setting), its first edge, then one more every
  // LINE_STEP_MS, as KaTrain draws a line (its anim_pv_time), staying drawn at its end; or static, all at once. Pointing
  // at another candidate animates its line again. When the search lengthens the line, the drawn edges stay and the
  // drawing goes on. With reduced motion asked for, the line is static.
  const LINE_STEP_MS = 500;
  let lineShown = $state(0);
  let drawnKey = ""; // the position and the edges drawn so far: not state, so that each step does not restart the drawing
  $effect(() => {
    const key = lineKey;
    const [at, names] = key ? key.split("|") : ["", ""];
    const n = names ? names.split(" ").length : 0;
    const show = (k: number) => { lineShown = k; drawnKey = key ? `${at}|${names.split(" ").slice(0, k).join(" ")}` : ""; };
    // The line pointed at in the list shows at once, as far as the edge pointed at.
    if (!key || !display.lineSteps || listHover !== null || n <= 1
        || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show(n);
      return;
    }
    const kept = drawnKey && `${key} `.startsWith(`${drawnKey} `) ? drawnKey.split("|")[1].split(" ").length : 1;
    show(Math.min(kept, n));
    if (kept >= n) return;
    const timer = setInterval(() => { show(lineShown + 1); if (lineShown >= n) clearInterval(timer); }, LINE_STEP_MS);
    return () => clearInterval(timer);
  });
  const drawnLine = $derived(line && line.slice(0, Math.max(1, lineShown)));

  // A branch's preview (design 07): pointing at a move of a branch's row in the move list shows the row on the board,
  // from the position where the row starts, as the engine's line shows: its edges numbered, one at a time or all at
  // once (the same display setting), with the edges they cut and the regions they close, from the branch's own
  // positions. The rows of dots or pills look alike, and the board tells them apart. It ends when the pointer leaves.
  let branchHover = $state<{ row: string[][]; k: number } | null>(null);
  const branchPreview = $derived.by(() => {
    if (!branchHover || !display.previewBranches) return null;
    const { row, k } = branchHover, start = row[0].slice(0, -1), from = positionOf(start);
    if (!from) return null;
    const edges: BoardLineEdge[] = [];
    for (const p of row.slice(0, k + 1)) {
      const node = branches[pathKey(p)];
      if (!node?.move.edge) break;
      edges.push({ edge: node.move.edge, player: node.move.player, cut: node.move.cut, regions: node.position.regions });
    }
    return { key: `${pathKey(start)}|${row.slice(0, k + 1).map(p => p.at(-1)).join(" ")}`, start, from, edges };
  });
  const previewKey = $derived(branchPreview?.key ?? null);
  let previewShown = $state(0);
  let previewDrawn = ""; // the row's start and the edges drawn so far, as drawnKey for the engine's line
  $effect(() => {
    const key = previewKey;
    const n = untrack(() => branchPreview?.edges.length ?? 0);
    const show = (k: number) => { previewShown = k; previewDrawn = key ? keyUpTo(key, k) : ""; };
    if (!key || !display.lineSteps || n <= 1 || matchMedia("(prefers-reduced-motion: reduce)").matches) { show(n); return; }
    // Pointing at a later move of the same row goes on from the edges drawn.
    const kept = previewDrawn && `${key} `.startsWith(`${previewDrawn} `) ? Math.max(1, keyLength(previewDrawn)) : 1;
    show(Math.min(kept, n));
    if (kept >= n) return;
    const timer = setInterval(() => { show(previewShown + 1); if (previewShown >= n) clearInterval(timer); }, LINE_STEP_MS);
    return () => clearInterval(timer);
  });
  // A preview's key is the row's start and its edges ("start|e1 e2 …"): the part up to k edges, and the edges' count.
  const keyUpTo = (key: string, k: number) => { const [s, e] = key.split("|"); return `${s}|${e.split(" ").slice(0, k).join(" ")}`; };
  const keyLength = (key: string) => key.split("|")[1].split(" ").filter(Boolean).length;
  const previewLine = $derived(branchPreview && branchPreview.edges.slice(0, Math.max(1, previewShown)));
  // A played move's preview: pointing at one of the game's moves in the move list shows the position after it, with the
  // move as the last edge. Not Lichess's (its move list has none; it shows a small board only for a move of an engine
  // line, ui/lib/src/ceval/view/main.ts): the board tells apart the moves that the list shows as text. It ends when the
  // pointer leaves the move list, so that the board does not flicker between moves.
  let moveHover = $state<number | null>(null);
  const movePreview = $derived(moveHover === null || moveHover + 1 === mainAt || !display.previewMoves ? null
    : { index: moveHover, position: R.data.positions[moveHover + 1], move: R.data.moves[moveHover] });
  // Either preview: the board shows nothing of the position on screen.
  const previewing = $derived(!!branchPreview || !!movePreview);
  // A preview starts when the pointer comes onto a move and ends a moment after it leaves the move (PREVIEW_END_MS),
  // so that the pointer can cross the gap to the next move without the board going back between them. Each preview is
  // a display setting (Move list).
  const PREVIEW_END_MS = 120;
  let previewEnd: ReturnType<typeof setTimeout> | undefined;
  function previewMove(i: number) {
    clearTimeout(previewEnd);
    branchHover = null;
    moveHover = i;
  }
  function previewBranch(row: string[][], k: number) {
    clearTimeout(previewEnd);
    moveHover = null;
    branchHover = { row, k };
  }
  function endPreview() {
    clearTimeout(previewEnd);
    previewEnd = setTimeout(() => { moveHover = null; branchHover = null; }, PREVIEW_END_MS);
  }
  // The areas in the players' tags: now, or, while a line shows, after its last drawn edge (from the rules).
  const lineAreas = $derived(drawnLine ? stepsNow?.[drawnLine.length - 1]?.areas ?? null : null);
  const areas = $derived(lineAreas ?? position.areas);

  // The table: every candidate, in the engine's order, in a box of TABLE_ROWS rows that scrolls. The rows on the board
  // have their number in a badge, as the board draws it.
  const onBoard = $derived(new Set(candidates.map(c => c.rank)));
  let tableBox = $state<HTMLElement | null>(null);
  // A new position starts the table at its top.
  $effect(() => { void here; if (tableBox) tableBox.scrollTop = 0; });
  // A candidate pointed at on the board brings its row into view, below the header. A row pointed at in the table does
  // not move it: a table that scrolls under the pointer moves the row away from it.
  let hoverOnBoard = false;
  $effect(() => {
    void hover;
    const row = tableBox?.querySelector<HTMLElement>("tr.lit");
    if (!tableBox || !row || !hoverOnBoard) return;
    const head = tableBox.querySelector("thead")!.getBoundingClientRect().height;
    const r = row.getBoundingClientRect(), at = r.top - tableBox.getBoundingClientRect().top + tableBox.scrollTop;
    const top = at - head, bottom = at + r.height - tableBox.clientHeight;
    if (tableBox.scrollTop > top) tableBox.scrollTop = top;
    else if (tableBox.scrollTop < bottom) tableBox.scrollTop = bottom;
  });

  // A branch move's label, when the player asked for its quality (its menu's "Evaluate move quality"): judged as the
  // game's moves are, once its two positions have the label budget. Other branch moves have none: a line played to show
  // something should cost no search (design 07).
  function branchLabel(p: string[]): Label | null {
    const node = branches[pathKey(p)];
    if (!node?.judged) return null;
    const parent = p.slice(0, -1), i = mainIndex(parent, mainNames);
    const before = i !== null ? R.data.analysis[i] : branches[pathKey(parent)]?.analysis;
    return judgeBranchEdge(before, valuesAfter(node.position, node.analysis, "lead", labelVisits), node.move.player,
                           node.move.edge, "lead", labelVisits, secondAt?.(parent));
  }
  // Label badges on the edges of the turn just played, as far as the current position: the game's, and a branch's that
  // were evaluated.
  const marks = $derived.by((): BoardMark[] => {
    const out: BoardMark[] = [];
    let p = path;
    for (let k = 0; k < 2 && p.length; k++) { // a turn has at most two edges
      const i = mainIndex(p, mainNames), e = i !== null ? R.edges[i - 1] : null;
      const edge = e ? e.edge : branches[pathKey(p)]?.move.edge ?? null, label = e ? e.label : branchLabel(p);
      if (edge && label) out.push({ edge, label, glyph: LABEL_GLYPH[label] });
      if (moveFrom(p.slice(0, -1)).first) break; // the turn began with this edge
      p = p.slice(0, -1);
    }
    return out;
  });

  // A move's sound (design 08), a crayon stroke: a step one move on plays it, from any key or button, and so does a move
  // played or clicked in the move list or in Biggest mistakes. Other jumps (back, the start and the end, the chart, the
  // fork keys) are silent, and so is a click on the place already on screen: the board does not change.
  function setPath(p: string[], sound = false) {
    const step = p.length === path.length + 1 && sharedLength(p, path) === path.length;
    if (pathKey(p) === here) sound = false;
    path = p;
    hover = null;
    listHover = null;
    branchHover = null;
    moveHover = null;
    if (display.sound && (sound || step) && p.length) void playMove(display.volume);
  }
  $effect(() => { if (display.sound) preload(); });
  // Lichess's move menu on a branch's move (ui/analyse/src/treeView/contextMenu.ts): "Promote variation" and "Delete
  // from here". The game's own moves have no menu: the review is of the game, so its line stays first ("Make main line"
  // is for an analysis board, later).
  let menuPath = $state<string | null>(null); // the key of the branch move under the menu
  /** A branch can be promoted when a branch node on its path, from its end back, is not the first branch from its parent. */
  function canPromote(key: string | null): boolean {
    if (!key) return false;
    const p = key.split(" ");
    for (let k = p.length; k > 0; k--) {
      const sub = p.slice(0, k);
      if (!(pathKey(sub) in branches)) return false;
      if (pathKey(branchKids(sub.slice(0, -1))[0] ?? []) !== pathKey(sub)) return true;
    }
    return false;
  }
  async function deleteFrom(key: string) {
    const p = key.split(" ");
    if (here === key || here.startsWith(`${key} `)) setPath(p.slice(0, -1)); // the place on screen goes too
    await ondelete?.(p);
  }

  // At a fork, ↑ and ↓ pick the line that → follows (Lichess's fork.select): the board shows the picked edge.
  let forkPick = $state(0);
  let forkPicked = $state(false);
  const picked = $derived(forkPicked ? childrenOf(path)[forkPick] : undefined);
  // The picked move is marked in the move list (a dashed outline) and brought into view.
  const pickedKey = $derived(picked ? pathKey(picked) : null);
  const PICKED = "picked outline-2 outline-dashed outline-accent";
  $effect(() => { if (pickedKey) movelist?.querySelector(".picked")?.scrollIntoView({ block: "nearest" }); });
  /** Goes to a position on the game's line. */
  const go = (p: number, sound = false) => setPath(mainNames.slice(0, Math.max(0, Math.min(last, p))), sound);
  // Along the line on screen, as Lichess's arrows: back to the parent, forward to the first child (the game's move on
  // its line), and to the line's end.
  const back = () => { if (path.length) setPath(path.slice(0, -1)); };
  const forward = () => { const kids = childrenOf(path), next = kids[forkPick] ?? kids[0]; if (next) setPath(next); };
  function toEnd() {
    let p = path;
    for (let next = childrenOf(p)[0]; next; next = childrenOf(p)[0]) p = next;
    setPath(p);
  }
  /** Shows a move in the analysis: the position after it, where the move list explains it (Lichess's summary jumps to
   *  the move itself, nextGlyphSymbol in ui/analyse/src/nodeFinder.ts). */
  function showMove(index: number) {
    stage = "analysis";
    go(index + 1, true); // a move clicked, as in the move list: its sound plays
  }
  $effect(() => onposition?.(path));

  // The move list keeps the current move a fixed distance from its top (four rows), as the position changes.
  let movelist = $state<HTMLElement | null>(null);
  const SCROLL_ROWS = 4;
  $effect(() => {
    void here;
    if (!movelist) return;
    const move = movelist.querySelector<HTMLElement>(".mv.here");
    if (!move) { movelist.scrollTop = 0; return; }
    const top = move.getBoundingClientRect().top - movelist.getBoundingClientRect().top + movelist.scrollTop;
    movelist.scrollTop = top - SCROLL_ROWS * move.offsetHeight;
  });

  // The arrow keys step through the game, except in the controls that use them: fields, the tabs, the display menu.
  // So the move list's moves are not in the Tab order (tabindex -1), as on Lichess: a click still goes to a move.
  // The keys (the list on "?"): Lichess's (ui/analyse/src/keyboard.ts), with single keys beside its Shift keys from
  // other analysis tools. ← and → along the line (k and j, Lichess's); at a fork ↑ and ↓ pick the line that → follows,
  // elsewhere they go to the start and the end; the previous and the next fork by Shift + ← and →, b and n (KaTrain's b
  // goes back to the last branch point), [ and ], or Shift + k and j (Lichess's); the line before and after this one by
  // Shift + ↑ and ↓, x and c (En Croissant's), or comma and period; Space plays the engine's choice; l turns the engine
  // on or off (Lichess's). Escape closes the settings, or drops an edge begun. Keys kept free for later: m and Shift + m (the next and the previous mistake,
  // KaTrain's n), and Delete.
  let keysOpen = $state(false);
  function onkeydown(ev: KeyboardEvent) {
    if (ev.defaultPrevented || ev.target instanceof HTMLInputElement || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === "Escape") {
      if (settingsOpen) settingsOpen = false;
      else if (engineOpen) engineOpen = false;
      else if (input.pending) input.reset();
      else return;
      ev.preventDefault();
      return;
    }
    const target = ev.target instanceof Element ? ev.target : null;
    if (target?.closest('[role="tablist"], [role="dialog"], [role="radiogroup"], [role="menu"]')) return;
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key, shift = ev.shiftKey;
    const kids = childrenOf(path);
    const line = (step: 1 | -1) => { const l = siblingLine(path, childrenOf, step); if (l) setPath(l); };
    if (key === "?" || (key === "/" && shift)) keysOpen = !keysOpen;
    else if (key === "l" && engine && onengine) onengine({ on: !engine.on });
    else if ((key === "ArrowLeft" && shift) || key === "b" || key === "[" || (key === "k" && shift)) setPath(prevFork(path, childrenOf));
    else if ((key === "ArrowRight" && shift) || key === "n" || key === "]" || (key === "j" && shift)) setPath(nextFork(path, childrenOf));
    else if ((key === "ArrowUp" && shift) || key === "x" || key === ",") line(-1);
    else if ((key === "ArrowDown" && shift) || key === "c" || key === ".") line(1);
    else if (key === "ArrowLeft" || key === "k") back();
    else if (key === "ArrowRight" || key === "j") forward();
    else if (key === "ArrowUp" || key === "ArrowDown") {
      const step = key === "ArrowUp" ? -1 : 1;
      if (kids.length > 1) { forkPick = (forkPick + step + kids.length) % kids.length; forkPicked = true; }
      else if (step < 0) setPath([]);
      else toEnd();
    }
    else if (key === "Home") setPath([]);
    else if (key === "End") toEnd();
    else if (key === " " && !target?.closest('button, [role="switch"], [role="radio"], [role="tab"]')) playCandidate();
    else return;
    ev.preventDefault();
  }
  // The list of keys, as Lichess's "?" list.
  const KEYS: [string[], string][] = [
    [["← / →", "k / j"], "Back and forward along the line on screen"],
    [["↑ / ↓"], "At a fork, pick the line that → follows. Elsewhere, the start and the line's end"],
    [["Shift + ← / →", "b / n", "[ / ]", "Shift + k / j"], "The previous and the next fork"],
    [["Shift + ↑ / ↓", "x / c", ", / ."], "The line before and after this one, from the fork above"],
    [["Home / End"], "The start, and the line's end"],
    [["Space"], "Play the pinned candidate, or number 1"],
    [["l"], "Turn the engine on or off"],
    [["Escape"], "Close the settings, or drop an edge begun"],
    [["?"], "This list"],
  ];
  const MOUSE: [string, string][] = [
    ["Click a candidate", "Pin its line on the board; click again to unpin it"],
    ["Double-click a candidate", "Play it"],
    ["Click a node, then a marked point", "Play your own edge"],
    ["Right-click a branch's move", "Evaluate it, promote its branch, or delete from it"],
  ];

  const scoreDiff = $derived(R.data.positions.map(p => p.scores[0] - p.scores[1]));
  const winner = $derived<Player>(R.data.result.blue > R.data.result.red ? 0 : 1);
  const margin = $derived(Math.abs(R.data.result.blue - R.data.result.red));
  const biggest = $derived(largest(R.mistakes, 1)[0]);
  const status = $derived.by(() => {
    if (mainAt === null) {
      // In a branch: where it leaves the game, and the turn as in the game.
      if (over) return `A branch from edge ${pos + 1} · Game over`;
      const t = moveFrom(path), k = t.first ? 1 : 2;
      return `A branch from edge ${pos + 1} · Turn ${t.turn} · ${PLAYER_NAME[mover]} to play, edge ${k} of ${k - 1 + position.movesLeft}`;
    }
    if (pos === last) return `Game over · ${PLAYER_NAME[winner]} won by ${margin.toFixed(1)} points`;
    const t = R.turnOf[pos];
    const k = t.edges.findIndex(e => e.index === pos) + 1;
    return `Edge ${pos + 1} of ${last} · Turn ${t.number} · ${PLAYER_NAME[mover]} to play, edge ${k} of ${t.edges.length}`;
  });
  const statusLine = $derived(
    branchPreview ? `Branch preview: ${branchPreview.edges.length} edge${branchPreview.edges.length > 1 ? "s" : ""} from ${
      branchPreview.start.length ? `the position after edge ${branchPreview.start.length}` : "the start"}. Click to go there.`
    : movePreview ? `Preview: the position after edge ${movePreview.index + 1}, ${moveText(movePreview.index)}. Click to go there.`
    : input.refused === "start" ? `Start an edge at one of ${PLAYER_NAME[mover]}'s nodes.`
    : input.refused === "end" ? `Finish the edge at a marked point, or click another of ${PLAYER_NAME[mover]}'s nodes.`
    : input.pending ? "Now the edge's second point: a marked point."
    : status);
  const endWin = (p: Position) => (p.scores[0] > p.scores[1] ? 1 : p.scores[0] < p.scores[1] ? 0 : 0.5);
  const blueWin = $derived(mainAt !== null ? R.blueWin[mainAt] : over ? endWin(position) : analysis?.blueWin ?? NaN);
  // The chart's hover, as Lichess's: the move that led to the position and its label, then one number. The number is
  // the engine's lead, which KaTrain's graph plots (B+n) and from which the points lost come.
  // The move list's number after each move: the engine's lead in the position after it, from Blue's side, as Lichess
  // shows its evaluation there (+0.3). Whole points, signed, and thousands as "k", so it never needs more than five
  // characters (+1.2k). After the last move, the result.
  function leadShort(blue: number | undefined): string {
    if (blue === undefined) return "";
    const a = Math.abs(blue);
    const text = a >= 999.5 ? `${(a / 1000).toFixed(1)}k` : `${Math.round(a)}`;
    return text === "0" ? "0" : `${blue > 0 ? "+" : "−"}${text}`;
  }
  const sideText = (blue: number, digits = 0) => {
    const v = Number(Math.abs(blue).toFixed(digits));
    return v === 0 ? "even" : `${PLAYER_NAME[blue > 0 ? 0 : 1]} +${v.toLocaleString("en")}`;
  };
  const chartTips = $derived(R.data.positions.map((_, i) => {
    const e = i > 0 ? R.edges[i - 1] : null;
    const title = e ? `${moveText(e.index)}${listed(e.label) ? ` · ${LABEL_TEXT[e.label]}` : ""}` : "The start";
    const s = R.blueScore[i];
    const value = i === last ? `Result: ${sideText(s!, 1)}` : s === undefined ? "Not analysed yet"
      : `Lead: ${sideText(s)}${chartSettled[i] ? "" : " · first estimate"}`;
    return { title, value };
  }));
  // The positions whose search has the review's depth (or the end, whose value is the result): the chart draws the rest
  // as a first estimate.
  const chartSettled = $derived(R.data.positions.map((_, i) => i === last || (R.data.analysis[i]?.visits ?? 0) >= reviewVisits));
  const chartRough = $derived(R.blueWin.some((v, i) => !Number.isNaN(v) && !chartSettled[i]));
  // The position's search, as Lichess shows its depth: the bar fills to the budget and stays full when the search ends.
  // A search stopped at its time limit has ended too: its bar is full (Lichess fills its bar by time).
  const searched = $derived(analysis && deepVisits ? (timedOut ? 1 : Math.min(1, analysis.visits / deepVisits)) : null);
  // A slider's place while it moves, by its id: the setting changes when it is let go, so that a drag does not restart
  // the workers or the search at each step.
  let drafts = $state<Record<string, number>>({});
</script>

<svelte:window {onkeydown} />

<!-- The top of the side panel: the review's progress or an engine error. -->
{#snippet panelHead()}
  {#if problem}
    <p class="mb-2.5 text-sm text-blunder" role="alert">Engine error: {problem}</p>
  {:else if progress}
    <div class="mb-2.5">
      <div class={["flex gap-0.5 h-1.5 rounded-[3px]", !progress.waiting && "bar-glider"]} role="progressbar" aria-label="The review" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow={Math.round(100 * progress.parts.reduce((s, p) => s + p.share * p.done, 0))}>
        {#each progress.parts as part, k (k)}
          <div class="bg-panel-2 rounded-[3px] overflow-hidden" style="flex: {part.share}">
            <div class="h-full bg-accent transition-[width] duration-200" style="width: {100 * part.done}%"></div>
          </div>
        {/each}
      </div>
      <p class="mt-1 text-xs text-muted">{progress.text}</p>
    </div>
  {/if}
{/snippet}

<!-- A player's name, side and score, in the row above the board, facing the other player. -->
{#snippet player(p: Player)}
  <!-- One line where the row has room. In a narrower row (design 06), two lines: the numbers under the name. In the
       narrowest, three: the points, then the area. The widths are the row's own (container queries), set by the widest
       numbers of a game (points in thousands): with the bar, where it keeps its 6rem; with the gauge, where the two tags
       meet. -->
  <div class={["flex items-baseline gap-x-1.5 px-1.5 py-0.5 rounded min-w-0 max-w-64",
               "@max-[38rem]/bar:flex-col @max-[38rem]/bar:leading-tight @max-[32rem]/gauge:flex-col @max-[32rem]/gauge:leading-tight",
               p === 0 ? "@max-[38rem]/bar:items-start @max-[32rem]/gauge:items-start"
                       : "flex-row-reverse @max-[38rem]/bar:items-end @max-[32rem]/gauge:items-end",
               !over && mover === p && "bg-panel-2 shadow-[inset_0_-2px_0_var(--last)]"]}>
    <span class={["flex items-baseline gap-1.5 min-w-0 max-w-full", p === 1 && "flex-row-reverse"]}>
      <Swatch player={p} />
      <span class="font-semibold truncate">{p === 0 ? R.data.players.blue : R.data.players.red}</span>
      <span class="text-xs text-muted">{PLAYER_NAME[p]}</span>
    </span>
    <!-- The points so far, and the area enclosed now, which each turn's end adds to the points. While the engine's line
         shows, the area after its last drawn edge, in the accent colour. -->
    <span class={["flex items-baseline gap-x-1 text-sm text-muted tabular-nums whitespace-nowrap",
                  "@max-[27.5rem]/bar:flex-col @max-[21.25rem]/gauge:flex-col",
                  p === 1 && "@max-[27.5rem]/bar:items-end @max-[21.25rem]/gauge:items-end"]}>
      <span><strong class="text-[1.1em] text-ink">{fmtScore(position.scores[p])}</strong> points</span>
      {#if areas}
        <span class="@max-[27.5rem]/bar:hidden @max-[21.25rem]/gauge:hidden" aria-hidden="true">·</span>
        <span><strong class={["text-[1.1em]", lineAreas ? "text-accent" : "text-ink"]}
                      title={lineAreas ? "The area after the engine's line" : "The area enclosed now, added at the turn's end"}>{fmtScore(areas[p])}</strong> area</span>
      {/if}
    </span>
  </div>
{/snippet}

{#snippet highlights()}
  <p class="mb-3 text-xs text-muted">A bot game, analysed in your browser. The label bands are placeholders until they are fitted to
    Enclosure.</p>
  <p class="mb-3.75">
    <strong>{PLAYER_NAME[winner]} won by {margin.toFixed(1)} points</strong>
    ({fmtScore(R.data.result.blue)} to {fmtScore(R.data.result.red)}).
    {#if progress}The review is still running: the counts and the mistakes below are partial.{/if}
    {#if biggest}The largest mistake came at edge {biggest.index + 1}: {explain(biggest)}{/if}
  </p>
  <!-- The number columns are as wide as their content, and the labels take the rest. -->
  <table class="w-full text-sm">
    <thead>
      <tr class="[&>th]:pb-1 [&>th+th]:pl-3 [&>th]:font-semibold [&>th]:text-right [&>th]:whitespace-nowrap">
        <th></th>
        <th><Swatch player={0} /> Blue</th>
        <th><Swatch player={1} /> Red</th>
      </tr>
    </thead>
    <tbody class={["[&_td]:py-0.5 [&_td]:border-t [&_td]:border-line [&_td+td]:w-px [&_td+td]:pl-3 [&_td+td]:text-right",
                   "[&_td+td]:whitespace-nowrap [&_td+td]:tabular-nums", progress && "[&_td+td]:italic [&_td+td]:text-muted"]}>
      <tr class="text-[1.1em] font-bold">
        <td>Accuracy</td>
        {#each R.summary as s, p (p)}<td>{Number.isNaN(s.accuracy) ? "–" : s.accuracy.toFixed(1)}</td>{/each}
      </tr>
      <tr>
        <td title="Points lost an edge, on average">Avg pts lost</td>
        {#each R.summary as s, p (p)}<td>{s.meanPointsLost?.toFixed(1) ?? "–"}</td>{/each}
      </tr>
      {#each LABELS as l (l)}
        <tr>
          <td><span class={BADGE} style:background="var(--{l})"><Glyph glyph={LABEL_GLYPH[l]} /></span> {LABEL_TEXT[l]}</td>
          {#each R.summary as s, p (p)}<td>{s.counts[l]}</td>{/each}
        </tr>
      {/each}
    </tbody>
  </table>
  <h3 class="mt-4 mb-1 font-bold">Biggest mistakes{#if progress} <span class="ml-1.5 text-sm font-normal text-muted">so far</span>{/if}</h3>
  <ol class="mb-3.5 pl-5 list-decimal">
    {#each R.keyMoments as m (m.index)}
      <li>
        <!-- As a move in the move list: the whole row is the button, with the points lost at its right edge. -->
        <button class="flex items-baseline gap-1.5 w-full px-[0.2rem] py-0.5 text-left bg-transparent border-0 hover:bg-panel-2 hover:outline hover:outline-line"
                onclick={() => showMove(m.index)}>
          <span class={BADGE} style:background="var(--{m.label})"><Glyph glyph={LABEL_GLYPH[m.label!]} /></span>
          <span class="font-mono text-[0.95em] {SIDE_TEXT[m.player]}">{moveText(m.index)}</span>
          <span class="ml-auto text-sm text-muted tabular-nums whitespace-nowrap" title="Lost {lossPhrase(m)}">{lossText(m)}</span>
        </button>
      </li>
    {/each}
  </ol>
{/snippet}

<!-- The Analysis: the candidates table and the move list. -->
{#snippet analysisView()}
  {@const rows = (analysis?.candidates ?? []).map((c, k) => ({ c, rank: k + 1 }))}
  <!-- The table's box: a fixed height (from TABLE_ROWS), a scroll bar when there are more rows, and room for the
       scroll bar kept at all times, so that the columns do not move when it appears. Fixed columns: the table
       keeps its layout from position to position. Each fits its widest content (a two-digit rank, the header
       "Blue wins", a lead of four digits, five-digit visits), and the space left goes to the edge column. When
       that column is narrower than the longest edge name (7 characters, about 4.4em), the name's text gets
       smaller instead of being cut: its cell is a size container, and the text is at most 22% of its width. Below
       70% of its size the text would be hard to read, so the name is cut there. -->
  <div class="flex-none mb-3 overflow-y-auto [scrollbar-gutter:stable] text-sm" bind:this={tableBox}
       style="height: {(TABLE_ROWS + 1) * ROW_EM}em; --row: {ROW_EM}em">
  <table class="w-full table-fixed [&_:is(th,td)]:px-1 [&_:is(th,td)]:py-0.5 [&_:is(th,td)]:border-b [&_:is(th,td)]:border-line [&_:is(th,td)]:truncate">
    <colgroup><col class="w-7" /><col /><col class="w-18" /><col class="w-12" /><col class="w-12" /></colgroup>
    <thead>
      <tr class="[&>th]:sticky [&>th]:top-0 [&>th]:z-1 [&>th]:h-(--row) [&>th]:bg-panel [&>th]:text-left [&>th]:font-medium [&>th]:text-muted">
        <th>#</th><th>Edge</th><th>{PLAYER_NAME[mover]} wins</th><th>Lead</th><th>Visits</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as { c, rank } (rank)}
        <tr class={["h-(--row)", rank === 1 && "font-semibold", !!hover && sameEdge(c.edge, hover) && "lit outline outline-accent -outline-offset-1",
                    pinned && rank === selectedRank && "shadow-[inset_3px_0_0_var(--accent)]"]}
            style={rowTint(c.blueWin)} onmouseenter={() => { hoverOnBoard = false; hover = c.edge; }} onmouseleave={() => (hover = null)}
            onclick={() => pick(rank)}
            title={analysis && !shownLine(c) ? "Too few visits to show the engine's line" : undefined}>
          <!-- A candidate on the board has its number in a badge, as the board draws it. The others have a plain number. -->
          <td><span class={["inline-flex items-center justify-center min-w-[1.3em] h-[1.3em] px-[0.2em] rounded-[0.3em] text-[0.8em] font-bold leading-none",
                            onBoard.has(rank) ? `${rank === 1 ? "bg-engine" : "bg-candidate"} text-on-badge` : "text-muted"]}
                    title={onBoard.has(rank) ? "On the board" : undefined}>{@render digits(rank)}</span></td>
          <td><div class="@container truncate"><span class="text-[clamp(0.7em,22cqi,1em)]">{edgeName(c.edge)}</span></div></td>
          <td>{pct(moverWin(c.blueWin, mover))}</td>
          <td>{c.lead !== undefined ? pts(moverScore(c.lead, mover)) : "–"}</td><td>{c.visits}</td>
        </tr>
      {/each}
      {#each Array.from({ length: Math.max(0, TABLE_ROWS - rows.length) }, (_, k) => k) as k (k)}
        <tr class="h-(--row)">
          <td class="italic text-muted" colspan="5">{k === 0 && !rows.length ? (over ? "The game is over." : "Not analysed yet.") : ""}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  </div>
  {@render lineList()}
  <!-- A right-click, or a long press on a touch screen, on a branch's move opens its menu (Bits UI's ContextMenu). On the
       game's moves the trigger is off, and the browser's own menu opens. -->
  <ContextMenu.Root>
  <ContextMenu.Trigger disabled={!menuPath}>
  {#snippet child({ props })}
  <div {...props} class="movelist flex-1 min-h-0 overflow-y-auto pt-1.5 text-sm border-t border-line" bind:this={movelist}
       onpointerdowncapture={e => (menuPath = (e.target as Element).closest<HTMLElement>("[data-path]")?.dataset.path ?? null)}>
    {#each R.turns as t (t.number)}
      <!-- A turn's number, then its edges in two equal columns (Lichess's move list), each at least a move wide:
           with room to spare, the second edge starts halfway across. -->
      <div class="grid grid-cols-[2.2rem_repeat(2,minmax(max-content,1fr))] items-baseline gap-x-1">
        <span class="text-muted tabular-nums">{t.number}.</span>
        {#each t.edges as e (e.index)}
          {@const after = R.blueScore[e.index + 1]}
          <!-- A move fills its column, and its lead is at the column's right edge (Lichess's move list). The move's
               text has one width, so a column is never narrower than the widest move: the widest in the notation
               is 10 characters, an edge with two-digit rows and the cut mark (D10-G10x, 8) and the widest glyph
               (??, 2), then the glyph's margin. The lead: at most 5 characters (+1.2k), smaller and right-aligned.
               The font is monospaced, so ch is one character of the span's own size. -->
          <button class={["mv flex items-baseline gap-1 px-[0.2rem] py-px font-mono text-[0.95em] text-left whitespace-nowrap bg-transparent border-0",
                          SIDE_TEXT[e.player], mainAt === e.index + 1 ? "here bg-panel-2 outline outline-accent"
                          : pickedKey === pathKey(mainNames.slice(0, e.index + 1)) ? PICKED : "hover:bg-panel-2 hover:outline hover:outline-line"]}
                  onclick={() => go(e.index + 1, true)} onmouseenter={() => previewMove(e.index)} onmouseleave={endPreview} tabindex="-1"
                  title={[e.label ? LABEL_TEXT[e.label] : "Not analysed yet", after !== undefined ? sideText(after) : ""].filter(Boolean).join(" · ")}>
            <span class="w-[calc(10ch+0.15em)]">{moveNotation(e)}{#if listed(e.label)}<span class="ml-[0.15em] font-extrabold" style:color="var(--{e.label})"><Glyph glyph={LABEL_GLYPH[e.label]} /></span>{/if}</span>
            <span class="w-[5ch] ml-auto text-[0.78em] text-right text-muted tabular-nums">{leadShort(after)}</span>
          </button>
        {/each}
      </div>
      <!-- One line for each note, and a note said twice in a turn once (a turn of two Great edges). -->
      {#if display.notes}
        {#each [...new Set(t.edges.filter(e => !!e.label && COMMENTED.includes(e.label)).map(shortNote))] as note (note)}
          <div class="mb-1 ml-10 text-sm text-muted truncate" title={note}>{note}</div>
        {/each}
      {/if}
      <!-- The branches from this turn's positions, after its comments (Lichess's column view). -->
      {#each t.edges as e (e.index)}
        {#each branchKids(mainNames.slice(0, e.index)) as first (pathKey(first))}
          {@render branch(first)}
        {/each}
      {/each}
    {/each}
  </div>
  {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content class="z-10 min-w-48 p-1 bg-panel-2 border border-muted/50 rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.4)] text-sm">
      <ContextMenu.Item disabled={!canPromote(menuPath)} onSelect={() => menuPath && onpromote?.(menuPath.split(" "))}
                        class={MENU_ITEM}>Promote variation</ContextMenu.Item>
      <ContextMenu.Item disabled={!menuPath || !!branches[menuPath]?.judged} onSelect={() => menuPath && onjudge?.(menuPath.split(" "))}
                        class={MENU_ITEM}>Evaluate move quality</ContextMenu.Item>
      <ContextMenu.Separator class="my-1 h-px bg-line" />
      <ContextMenu.Item onSelect={() => menuPath && deleteFrom(menuPath)} class={MENU_ITEM}>Delete from here</ContextMenu.Item>
    </ContextMenu.Content>
  </ContextMenu.Portal>
  </ContextMenu.Root>
{/snippet}

<!-- A number centred in its badge: the inner block is trimmed to the digits' height (cap height to baseline), so that
     flex centring centres the digits in any font. Without text-box (Firefox for now), a line box of the font's size
     sets them within a quarter pixel. -->
{#snippet digits(n: number)}
  <span class="block [text-box:trim-both_cap_alphabetic]">{n}</span>
{/snippet}

<!-- An edge of the listed line: a circle in its mover's colour with its number, as the board numbers the line (Go's
     way). Hollow when the edge is already in the tree: played in the game, or in a branch. -->
{#snippet edgeCircle(n: number, player: Player, hollow: boolean, cls: string)}
  <span class={["inline-flex items-center justify-center min-w-[1.55em] h-[1.55em] px-[0.15em] rounded-full font-sans text-[0.75em] font-bold leading-none",
                hollow ? `border-2 ${player === 0 ? "border-blue text-blue" : "border-red text-red"}` : `text-white ${player === 0 ? "bg-blue" : "bg-red"}`,
                cls]}>{@render digits(n)}</span>
{/snippet}

<!-- An edge as a pill along its direction: a capsule in its mover's colour at the edge's own slope on the board (rows
     count from the bottom, so the screen's angle is atan2(-dy, dx)), every pill the same length. No published tool
     shows an edge's direction in a move list: this form is the site's own (design 07). A capsule is never taller than
     its length at any angle, so every pill has one height and a row stays even. Its box is as wide as the pill turned,
     so a steep pill takes little width. A pass has no edge: a round dot. With a number (the listed line), the number
     stands upright at the pill's centre, a disc as wide as the pill, so it is always on the pill's colour. Hollow when
     the edge is already in the tree, as the circles are. -->
{#snippet edgePill(edge: Edge | null, player: Player, hollow: boolean, n: number | null, cls: string)}
  {@const turn = edge ? Math.atan2(edge[1] - edge[3], edge[2] - edge[0]) : 0}
  {@const thick = n === null ? 44 : 66}
  {@const long = edge ? 100 : thick}
  {@const wide = (long - thick) * Math.abs(Math.cos(turn)) + thick}
  {@const stroke = hollow ? 9 : 0}
  <span class={["relative inline-flex flex-none items-center justify-center",
                n === null ? "h-[1.15em]" : "h-[2.1em] font-sans text-[0.75em] font-bold leading-none",
                hollow ? SIDE_TEXT[player] : "text-white", cls]} style:width="{(wide / 100) * (n === null ? 1.15 : 2.1)}em">
    <!-- Not clipped: the pill's ends touch the box, and a clip at a fraction of a pixel flattens a round end. -->
    <svg class={["absolute inset-0 size-full overflow-visible", SIDE_TEXT[player]]} viewBox="{-wide / 2} -50 {wide} 100"
         aria-hidden="true">
      <rect x={(stroke - long) / 2} y={(stroke - thick) / 2} width={long - stroke} height={thick - stroke}
            rx={(thick - stroke) / 2} transform="rotate({(turn * 180) / Math.PI})"
            fill={hollow ? "none" : "currentColor"} stroke={hollow ? "currentColor" : "none"} stroke-width={stroke} />
    </svg>
    {#if n !== null}<span class="relative">{@render digits(n)}</span>{/if}
  </span>
{/snippet}

<!-- A branch in the move list, from its first move: its rows (tree.ts), indented by depth, each with a rule on its left.
     Every turn has its number, as in the record. Without notation, an edge is a dot in its mover's colour (Go tools
     show a variation without names): the turn numbers place it, so the dots carry no numbers of their own. Where a
     branch forks again, its continuations follow, one step further in (Lichess's way inside a variation). Pointing at a
     move shows its row on the board up to that move (branchPreview). -->
{#snippet branch(first: string[])}
  {#each branchRows(first, branchKids) as row, r (r)}
    <div class={["flex flex-wrap items-center gap-y-0.5 my-0.5 pl-1.5 border-l-2 border-line font-mono text-[0.95em]",
                 display.branchForm === "text" ? "gap-x-1" : "gap-x-0.5"]}
         style:margin-left="{1.2 + row.depth}rem">
      {#each row.paths as p, k (pathKey(p))}
        {@const node = branches[pathKey(p)]}
        {@const t = moveFrom(p.slice(0, -1))}
        {@const at = pathKey(p) === here}
        {@const label = branchLabel(p)}
        {@const waiting = !!node?.judged && !label}
        {#if node}
          {#if k === 0 || t.first}<span class={["text-muted text-[0.9em]", k > 0 && "ml-1"]}>{turnText(t)}</span>{/if}
          {#if display.branchForm === "text"}
            <button class={["mv px-[0.2rem] py-px bg-transparent border-0 whitespace-nowrap", SIDE_TEXT[node.move.player],
                            at ? "here bg-panel-2 outline outline-accent" : pickedKey === pathKey(p) ? PICKED
                            : "hover:bg-panel-2 hover:outline hover:outline-line"]}
                    onclick={() => setPath(p, true)} onmouseenter={() => previewBranch(row.paths, k)} onmouseleave={endPreview} tabindex="-1"
                    data-path={pathKey(p)} title={label ? LABEL_TEXT[label] : waiting ? "Evaluating…" : undefined}>{moveNotation(node.move)}</button>
          {:else}
            <button class={["mv flex p-[0.08em] bg-transparent border-0 rounded-full",
                            at ? "here outline-2 outline-accent" : pickedKey === pathKey(p) ? PICKED : "hover:outline hover:outline-ink"]}
                    onclick={() => setPath(p, true)} onmouseenter={() => previewBranch(row.paths, k)} onmouseleave={endPreview} tabindex="-1"
                    data-path={pathKey(p)} title="{turnText(t)} {moveNotation(node.move)}{label ? ` · ${LABEL_TEXT[label]}` : waiting ? ' · evaluating…' : ''}">
              {#if display.branchForm === "pills"}{@render edgePill(node.move.edge, node.move.player, false, null, "")}
              {:else}<span class={["block w-[0.85em] h-[0.85em] rounded-full", node.move.player === 0 ? "bg-blue" : "bg-red"]}></span>{/if}
            </button>
          {/if}
          {#if listed(label)}<span class="-ml-0.5 text-[0.9em] font-extrabold" style:color="var(--{label})"><Glyph glyph={LABEL_GLYPH[label]} /></span>
          {:else if waiting}<span class="-ml-0.5 text-[0.9em] text-muted animate-pulse motion-reduce:animate-none" title="Evaluating…">…</span>{/if}
        {/if}
      {/each}
    </div>
  {/each}
{/snippet}

<!-- The engine's line under the table: the candidate's badge, then its edges. Pointing at an edge draws the line up to
     it on the board, and a click plays the line up to it as a branch. The edges already in the tree (the game's own
     moves or a branch's) show as such, since a click goes along them and the branch starts after them. -->
{#snippet lineList()}
  <div class="flex-none h-[3.6em] mb-2 overflow-y-auto text-sm" role="group" aria-label="The engine's line"
       onmouseleave={() => (listHover = null)}>
    {#if listLine}
      <div class={["flex flex-wrap items-center gap-y-0.5", display.branchForm === "text" ? "gap-x-1" : "gap-x-0.5"]}>
        <span class={["inline-flex items-center justify-center min-w-[1.3em] h-[1.3em] mr-1 px-[0.2em] rounded-[0.3em] text-[0.8em] font-bold leading-none",
                      onBoard.has(listRank) ? `${listRank === 1 ? "bg-engine" : "bg-candidate"} text-on-badge` : "text-muted"]}
              title="The engine's line from candidate {listRank}">{@render digits(listRank)}</span>
        {#each listLine as e, k (k)}
          {@const t = listTurns[k]}
          {@const player = lineMovers(position, k + 1)[k]}
          {@const name = `${edgeName(e)}${listSteps?.[k]?.cut ? "x" : ""}`}
          {@const known = listKnown[k]}
          {@const where = known === "game" ? " · played in the game" : known === "branch" ? " · in a branch" : ""}
          {#if display.branchForm === "text"}
            {#if k === 0 || t.first}<span class="text-muted text-[0.9em]">{turnText(t)}</span>{/if}
            <button class={["px-[0.2rem] py-px font-mono text-[0.95em] bg-transparent border-0 whitespace-nowrap", SIDE_TEXT[player],
                            known && "underline decoration-dotted underline-offset-3",
                            listHover !== null && k <= listHover ? "bg-panel-2" : "hover:bg-panel-2"]}
                    onmouseenter={() => (listHover = k)} onclick={() => play(k)} tabindex="-1"
                    title="{name}{where} · play the line to here">{name}</button>
          {:else}
            {@const shade = listHover !== null && k <= listHover ? "" : "opacity-70 hover:opacity-100"}
            {#if k > 0 && t.first}<span class="w-1"></span>{/if}
            <button class="flex p-0 bg-transparent border-0 rounded-full" onmouseenter={() => (listHover = k)} onclick={() => play(k)}
                    tabindex="-1" title="{turnText(t)} {name}{where} · play the line to here">
              {#if display.branchForm === "pills"}{@render edgePill(e, player, !!known, k + 1, shade)}
              {:else}{@render edgeCircle(k + 1, player, !!known, shade)}{/if}
            </button>
          {/if}
        {/each}
      </div>
    {:else if listCandidate}
      <p class="italic text-muted">Too few visits to show the engine's line from candidate {listRank}.</p>
    {/if}
  </div>
{/snippet}

<!-- The display settings, grouped by where they show (Lichess groups its analysis settings so: Board, Move list), each
     with a line that says what it does. On and off is a switch, a choice of two is a pair of buttons (Bits UI's Switch
     and RadioGroup: their roles, focus and keys). -->
{#snippet settingsPanel()}
  <div id="display-settings" role="region" aria-label="Display settings" class="flex flex-col flex-1 min-h-0">
    <div class="flex items-center justify-between mb-1">
      <h2 class="font-semibold">Display settings</h2>
      <button class="px-2 py-0.5 text-sm" onclick={() => (settingsOpen = false)}>Done</button>
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto pr-1">
      <h3 class={SETTINGS_HEAD}>Board</h3>
      {@render choice("Win chance", "A bar above the board, or a gauge beside it.",
        [["bar", "Top horizontal bar"], ["gauge", "Side vertical gauge"]], () => display.win, v => (display.win = v as "bar" | "gauge"))}
      {@render toggle("Candidates", "The engine's choices on the board, with their ranks.",
        () => display.layers.candidates, v => (display.layers.candidates = v))}
      {@render toggle("Move labels", "Move quality badges on the turn just played.",
        () => display.layers.marks, v => (display.layers.marks = v))}
      {@render toggle("Regions", "Shading on the areas each player encloses.",
        () => display.layers.regions, v => (display.layers.regions = v))}
      {@render toggle("Protected edges", "The edges the opponent cannot cut on the next turn.",
        () => display.layers.protected, v => (display.layers.protected = v))}
      {@render choice("Lines on the board", "The engine's line and a branch's preview: one edge at a time, or all at once.",
        [["animated", "Animated"], ["static", "Static"]], () => (display.lineSteps ? "animated" : "static"),
        v => (display.lineSteps = v === "animated"))}
      <h3 class={SETTINGS_HEAD}>Move list</h3>
      {@render toggle("Notes on the key edges", "A line under Great edges, Mistakes, and Blunders.",
        () => display.notes, v => (display.notes = v))}
      {@render toggle("Preview played moves", "Pointing at a move of the game shows the position after it on the board.",
        () => display.previewMoves, v => (display.previewMoves = v))}
      {@render toggle("Preview branches", "Pointing at a branch's move draws its row on the board, as the engine's line.",
        () => display.previewBranches, v => (display.previewBranches = v))}
      {@render choice("Branches and lines", "Each edge as a pill along its direction, a dot, or its notation. In the engine's line, the pills and dots carry the board's numbers.",
        [["pills", "Pills"], ["dots", "Dots"], ["text", "Notation"]], () => display.branchForm,
        v => (display.branchForm = v as Display["branchForm"]))}
      <h3 class={SETTINGS_HEAD}>Sound</h3>
      {@render toggle("Move sounds", "A crayon stroke, for each edge played or stepped through.",
        () => display.sound, v => (display.sound = v))}
      <div class="flex items-center justify-between gap-3 py-1.5">
        <label for="setting-volume" class={["text-sm font-medium", !display.sound && "text-muted"]}>Volume</label>
        <input id="setting-volume" type="range" min="0" max="1" step="0.05" bind:value={display.volume} disabled={!display.sound}
               onchange={() => playMove(display.volume)}
               class="w-36 accent-(--accent) disabled:opacity-50" />
      </div>
      <h3 class={SETTINGS_HEAD}>Keyboard</h3>
      <div class="flex items-start justify-between gap-3 py-1.5">
        <div class="min-w-0">
          <p class="text-sm font-medium">Keys and clicks</p>
          <p class="text-xs text-muted">The keys for moving through the game and its branches, and what the clicks do.</p>
        </div>
        <button class="flex-none px-2 py-0.5 text-sm" onclick={() => (keysOpen = true)}>Show <kbd class={KBD}>?</kbd></button>
      </div>
      <h3 class={SETTINGS_HEAD}>Advantage chart</h3>
      {@render toggle("Score so far", "A second line: the score difference after each edge (Blue − Red).",
        () => display.scoreLine, v => (display.scoreLine = v))}
    </div>
  </div>
{/snippet}

<!-- The engine's settings (design 09), grouped by what they search: the position on screen, the game's review, and the
     engine itself. Each has one short line of help. A value in steps is a slider, as in Lichess's engine settings. -->
{#snippet engineSettingsPanel(e: EngineSettings, set: (change: Partial<EngineSettings>) => void)}
  {@const memory = NETWORKS.find(n => n.id === e.network)?.memoryMB ?? NETWORKS[0].memoryMB}
  <div id="engine-settings" role="region" aria-label="Engine settings" class="flex flex-col flex-1 min-h-0">
    <h2 class="font-semibold mb-1">Engine settings</h2>
    <div class="flex-1 min-h-0 overflow-y-auto pr-1">
      <h3 class={SETTINGS_HEAD}>Position on screen</h3>
      {@render visitsSteps("Depth", "How far to search it.", DEPTHS, () => e.visits, v => set({ visits: v }))}
      {@render steps("Time limit", "Stop sooner if this runs out.", TIME_LIMITS.length, () => TIME_LIMITS.indexOf(e.seconds),
        k => set({ seconds: TIME_LIMITS[k] }), k => (TIME_LIMITS[k] === null ? "None" : `${TIME_LIMITS[k]} s`))}
      <h3 class={SETTINGS_HEAD}>Game review</h3>
      {@render choice("Depth per move",
        `Lite: ${REVIEW_PRESETS.lite} visits. Standard: ${REVIEW_PRESETS.standard.toLocaleString("en")}, surer labels in twice the time.`,
        [["lite", "Lite"], ["standard", "Standard"], ["custom", "Custom"]], () => e.review, v => set({ review: v as ReviewDepth }))}
      {#if e.review === "custom"}
        {@render visitsSteps("Custom", "", CUSTOM_REVIEW, () => e.customReview, v => set({ customReview: v }))}
      {/if}
      <h3 class={SETTINGS_HEAD}>Engine</h3>
      {@render choice("Network", "The larger is stronger per visit but about 3× slower. A change reviews the game again.",
        NETWORKS.map(n => [n.id, `${n.params} parameters`]), () => e.network, v => set({ network: v }))}
      {@render steps("Workers", `Positions searched at the same time. Each uses about ${memory} MB.`, maxWorkers(),
        () => e.workers - 1, k => set({ workers: k + 1 }), k => `${k + 1} of ${maxWorkers()}`)}
      <!-- Done after the last setting, away from the gear that opened it (the display settings' Done is at their top,
           away from their ☰). -->
      <div class="flex justify-end mt-2 mb-1">
        <button class="px-2 py-0.5 text-sm" onclick={() => (engineOpen = false)}>Done</button>
      </div>
    </div>
  </div>
{/snippet}

<!-- A value in steps: its name and value, what it does, and a slider over the steps (Lichess's engine settings). The
     value shows as the slider moves, and the setting changes when it is let go. -->
{#snippet steps(label: string, help: string, count: number, get: () => number, set: (k: number) => void, text: (k: number) => string)}
  {@const id = `setting-${label.replace(/\W+/g, "-").toLowerCase()}`}
  {@const k = drafts[id] ?? get()}
  <div class="py-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <label for={id} class="text-sm font-medium">{label}</label>
      <span class="text-sm tabular-nums">{text(k)}</span>
    </div>
    {#if help}<p class="text-xs text-muted">{help}</p>{/if}
    <input {id} type="range" min="0" max={count - 1} step="1" value={k} aria-valuetext={text(k)}
           oninput={ev => (drafts[id] = +ev.currentTarget.value)}
           onchange={ev => { set(+ev.currentTarget.value); delete drafts[id]; }}
           class="w-full mt-1 accent-(--accent)" />
  </div>
{/snippet}

<!-- A number of visits: a slider over doublings, and a box that takes any whole number in their range. The slider shows
     the doubling nearest a typed number. The setting changes when the slider is let go or the box is left. -->
{#snippet visitsSteps(label: string, help: string, steps: number[], get: () => number, set: (visits: number) => void)}
  {@const id = `setting-${label.replace(/\W+/g, "-").toLowerCase()}`}
  {@const k = drafts[id] ?? nearestStep(steps, get())}
  {@const visits = drafts[id] === undefined ? get() : steps[k]}
  <div class="py-1.5">
    <div class="flex items-center justify-between gap-3">
      <label for="{id}-visits" class="text-sm font-medium">{label}</label>
      <span class="text-sm">
        <input id="{id}-visits" type="number" min={steps[0]} max={steps.at(-1)} step="1" value={visits}
               class="w-[4.5rem] text-right tabular-nums"
               onchange={ev => {
                 const t = ev.currentTarget, v = t.valueAsNumber;
                 const kept = Number.isFinite(v) ? Math.min(steps.at(-1)!, Math.max(steps[0], Math.round(v))) : get();
                 t.value = String(kept);
                 set(kept);
               }} />
        visits
      </span>
    </div>
    {#if help}<p class="text-xs text-muted">{help}</p>{/if}
    <input {id} type="range" min="0" max={steps.length - 1} step="1" value={k} aria-label={label}
           aria-valuetext={`${visits.toLocaleString("en")} visits`}
           oninput={ev => (drafts[id] = +ev.currentTarget.value)}
           onchange={ev => { set(steps[+ev.currentTarget.value]); delete drafts[id]; }}
           class="w-full mt-1 accent-(--accent)" />
  </div>
{/snippet}

<!-- A setting that is on or off: its name and what it does, and a switch at the right. -->
{#snippet toggle(label: string, help: string, get: () => boolean, set: (v: boolean) => void)}
  {@const id = `setting-${label.replace(/\W+/g, "-").toLowerCase()}`}
  <div class="flex items-start justify-between gap-3 py-1.5">
    <div class="min-w-0">
      <label for={id} class="text-sm font-medium cursor-pointer">{label}</label>
      <p class="text-xs text-muted">{help}</p>
    </div>
    <Switch.Root {id} checked={get()} onCheckedChange={set}
                 class="flex-none inline-flex items-center w-9 h-5 mt-0.5 p-0 rounded-full border border-line bg-panel-2 transition-colors
                        data-[state=checked]:bg-accent data-[state=checked]:border-accent">
      <Switch.Thumb class="block size-3.5 rounded-full bg-ink transition-transform translate-x-0.5 data-[state=checked]:translate-x-[1.1rem] data-[state=checked]:bg-on-badge" />
    </Switch.Root>
  </div>
{/snippet}

<!-- A choice of a few: its name and what it does, then the options side by side. -->
{#snippet choice(label: string, help: string, options: [string, string][], get: () => string, set: (v: string) => void)}
  <div class="py-1.5">
    <p class="text-sm font-medium">{label}</p>
    <p class="mb-1 text-xs text-muted">{help}</p>
    <RadioGroup.Root value={get()} onValueChange={set} orientation="horizontal" aria-label={label}
                     style="grid-template-columns: repeat({options.length}, minmax(0, 1fr))"
                     class="grid gap-0.5 p-0.5 rounded-md border border-line bg-panel-2">
      {#each options as [value, text] (value)}
        <RadioGroup.Item {value} class="px-2 py-1 text-sm rounded border-0 bg-transparent hover:bg-panel
                                        data-[state=checked]:bg-accent data-[state=checked]:text-on-badge data-[state=checked]:font-medium">{text}</RadioGroup.Item>
      {/each}
    </RadioGroup.Root>
  </div>
{/snippet}

<main class={["review", wide.current && "wide", display.win === "gauge" && "gauge-mode", reach && "reach"]}
      style:--strip={stripHeight ? `calc(${stripHeight}px + 0.5rem)` : null}>
  {#if wide.current}
    <aside class="summary-col {PANEL} overflow-y-auto">
      {@render panelHead()}
      {@render highlights()}
    </aside>
  {/if}

  <section class="board-col" bind:this={boardCol}>
    <!-- The players face each other left and right, as they start: Blue at A10-D10, Red at Q10-T10. The win-chance bar
         is between them. With the gauge, the row keeps the players, and starts after the gauge, at the board's edge. -->
    <div class={["mb-2 ml-(--gauge-w)", display.win === "bar" ? "@container/bar" : "@container/gauge"]} bind:offsetHeight={stripHeight}>
    <div class={["grid items-center gap-2 h-[1.6rem] @max-[38rem]/bar:h-auto @max-[32rem]/gauge:h-auto",
                 display.win === "bar" ? "grid-cols-[auto_minmax(6rem,1fr)_auto]" : "grid-cols-[auto_1fr_auto]"]}
         aria-label={display.win === "bar" ? "Players, scores and win chance" : "Players and scores"}>
      {@render player(0)}
      {#if display.win === "bar"}
        <div class={["flex h-[1.15rem] rounded-[3px] overflow-hidden", Number.isNaN(blueWin) ? "items-center justify-center bg-panel-2" : "bg-red"]}
             title="Win chance from the engine's search">
          {#if !Number.isNaN(blueWin)}
            <div class="flex items-center pl-1.5 text-xs font-bold text-white bg-blue transition-[width] duration-200" style="width: {100 * blueWin}%">
              {#if blueWin >= 0.12}<span>{pct(blueWin)}</span>{/if}
            </div>
            <div class="flex flex-1 items-center justify-end pr-1.5 text-xs font-bold text-white bg-red">
              {#if blueWin <= 0.88}<span>{pct(1 - blueWin)}</span>{/if}
            </div>
          {:else}
            <span class="text-xs text-muted">not analysed yet</span>
          {/if}
        </div>
      {:else}
        <div></div>
      {/if}
      {@render player(1)}
    </div>
    </div>
    <div class="flex">
      {#if display.win === "gauge"}
        <!-- Lichess's and chess.com's gauge: Blue's share from the bottom. -->
        <div class={["relative flex flex-col-reverse flex-none self-stretch w-4 mr-1.5 rounded-[3px] overflow-hidden", Number.isNaN(blueWin) ? "bg-panel-2" : "bg-red"]}
             role="img" aria-label={Number.isNaN(blueWin) ? "Win chance: not analysed yet" : `Blue's win chance ${pct(blueWin)}`}
             bind:clientHeight={gaugeHeight}>
          {#if !Number.isNaN(blueWin)}
            <div class="bg-blue transition-[height] duration-200" style="height: {100 * blueWin}%"></div>
            <!-- Each side's share at its own end, inside the gauge, as the bar shows them at its ends. Small and written
                 up the gauge, so that the gauge can be narrow. -->
            {#if (1 - blueWin) * gaugeHeight >= GAUGE_TEXT_PX}<span class="{GAUGE_TEXT} top-1.25">{pct(1 - blueWin)}</span>{/if}
            {#if blueWin * gaugeHeight >= GAUGE_TEXT_PX}<span class="{GAUGE_TEXT} bottom-1.25">{pct(blueWin)}</span>{/if}
          {/if}
        </div>
      {/if}
      <div class="board-wrap rounded overflow-hidden">
        <!-- While a branch's preview shows, the board is at the row's start, with the row as its line; while a played
             move's shows, at the position after it. Nothing of the position on screen: no candidates, labels or own
             moves. -->
        <Board
          position={branchPreview?.from ?? movePreview?.position ?? position}
          lastEdge={branchPreview ? null : movePreview ? movePreview.move.edge : lastPlayed?.edge ?? null}
          cut={branchPreview ? null : movePreview ? movePreview.move.cut : lastPlayed?.cut ?? null}
          candidates={previewing ? [] : candidates}
          highlight={previewing ? null : hover ?? pinnedCandidate?.edge ?? null}
          line={branchPreview ? previewLine : movePreview ? null : drawnLine}
          oncandidateclick={selectRank}
          oncandidatedblclick={e => playPath([...path, edgeName(e)])}
          pending={input.pending}
          ends={input.ends}
          active={input.active}
          onpoint={input.rules && !previewing ? input.click : undefined}
          onlyActive
          preview={line || previewing ? null : hover ?? (picked ? parseEdge(picked.at(-1)!) : null)}
          previewPlayer={mover}
          marks={previewing ? [] : marks}
          layers={display.layers}
          oncandidate={e => { hoverOnBoard = true; hover = e; }}
        />
      </div>
    </div>
  </section>

  <section class="side {PANEL} flex flex-col">
    {#if !wide.current}
      {@render panelHead()}
    {/if}
    {#if settingsOpen}
      {@render settingsPanel()}
    {:else}
    <!-- The position's engine header, as Lichess's engine box: a line with the engine's switch (the l key too), the
         search's progress and visits, and the engine settings' gear, and under it the values, across the column. -->
    <div class="mb-1.5">
      <div class="flex items-center gap-2">
        {#if engine && onengine}
          {@const set = onengine}
          <Switch.Root checked={engine.on} onCheckedChange={v => set({ on: v })} aria-label="Engine" title="Engine on or off (l)"
                       class="flex-none inline-flex items-center w-9 h-5 p-0 rounded-full border border-line bg-panel-2 transition-colors
                              data-[state=checked]:bg-accent data-[state=checked]:border-accent">
            <Switch.Thumb class="block size-3.5 rounded-full bg-ink transition-transform translate-x-0.5 data-[state=checked]:translate-x-[1.1rem] data-[state=checked]:bg-on-badge" />
          </Switch.Root>
        {/if}
        <div class={["flex-1 h-[3px] rounded-sm overflow-hidden bg-panel-2", searching && "bar-glider"]} role="progressbar"
             aria-label="This position's search" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(100 * (searched ?? 0))}>
          {#if searched !== null}<div class="h-full bg-accent transition-[width] duration-200" style="width: {100 * searched}%"></div>{/if}
        </div>
        {#if analysis}<span class="text-xs text-muted tabular-nums whitespace-nowrap">{analysis.visits.toLocaleString("en")}{searched !== null && searched < 1 ? ` of ${deepVisits.toLocaleString("en")}` : ""} visits{timedOut ? " · time limit" : ""}</span>{/if}
        {#if engine && onengine}
          <button class="flex-none px-1.5 py-0 aria-expanded:border-accent aria-expanded:text-accent" aria-label="Engine settings"
                  title="Engine settings" aria-expanded={engineOpen} aria-controls="engine-settings"
                  onclick={() => (engineOpen = !engineOpen)}>⚙</button>
        {/if}
      </div>
      <p class="mt-1 text-xs text-muted tabular-nums">
        {#if analysis?.lead !== undefined}
          Expected final margin
          <strong class="text-ink">{pts(analysis.margin!)} ± {Math.round(analysis.spread!)}</strong> for Blue · lead {pts(analysis.lead)}
        {:else if over}
          Final margin <strong class="text-ink">{pts(position.scores[0] - position.scores[1])}</strong> for Blue
        {:else}Not analysed yet{/if}
      </p>
    </div>
    {#if engineOpen && engine && onengine}
      {@render engineSettingsPanel(engine, onengine)}
    {:else if wide.current}
      <div class="flex flex-col flex-1 min-h-0 overflow-hidden">{@render analysisView()}</div>
    {:else}
      <!-- Below 1,260 pixels the Highlights and the Analysis share this column, as tabs. Bits UI gives them the tab
           roles, the arrow keys and the focus. -->
      <Tabs.Root value={stage} onValueChange={v => (stage = v as Stage)} class="flex flex-col flex-1 min-h-0">
        <Tabs.List class="flex gap-1 mb-2">
          <Tabs.Trigger value="highlights" class={TAB}>Highlights</Tabs.Trigger>
          <Tabs.Trigger value="analysis" class={TAB}>Analysis</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="highlights" class="flex-1 min-h-0 overflow-y-auto">{@render highlights()}</Tabs.Content>
        <Tabs.Content value="analysis" class="flex flex-col flex-1 min-h-0 overflow-hidden">{@render analysisView()}</Tabs.Content>
      </Tabs.Root>
    {/if}
    {/if}

    <!-- The step controls and the display settings' button, at the bottom of the analysis column (Lichess's place). -->
    <div class="mt-1.5 pt-1.5 border-t border-line">
      <p class="mb-1.5 text-xs text-muted truncate" title={statusLine}>{statusLine}</p>
      <div class="flex items-center justify-between">
        <div class="flex gap-1">
          <button onclick={() => setPath([])} aria-label="First">⏮</button>
          <button onclick={back} aria-label="Back">◀</button>
          <button onclick={forward} aria-label="Forward">▶</button>
          <button onclick={toEnd} aria-label="Last">⏭</button>
        </div>
        <!-- The menu button (Lichess's ☰ in the same place) opens the display settings in the analysis's place, and
             closes them. The gear is the engine's, in the engine header. -->
        <button class="aria-expanded:border-accent aria-expanded:text-accent" aria-label="Display settings" title="Display settings"
                aria-expanded={settingsOpen} aria-controls="display-settings"
                onclick={() => { settingsOpen = !settingsOpen; engineOpen = false; }}>☰</button>
      </div>
    </div>
  </section>

  <!-- The list of keys and clicks: a Bits UI dialog (its focus, Escape and outside click). -->
  <Dialog.Root bind:open={keysOpen}>
    <Dialog.Portal>
      <Dialog.Overlay class="fixed inset-0 z-20 bg-[rgb(0_0_0/0.45)]" />
      <Dialog.Content class="fixed z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(94vw,34rem)] max-h-[90vh] overflow-y-auto
                             px-5 py-4 bg-panel-2 border border-muted/50 rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.4)]">
        <div class="flex items-center justify-between mb-2">
          <Dialog.Title class="font-semibold">Keys and clicks</Dialog.Title>
          <Dialog.Close class="px-2 py-0.5 text-sm">Close</Dialog.Close>
        </div>
        <table class="w-full text-sm [&_td]:py-1 [&_td]:align-top [&_tr+tr_td]:border-t [&_tr+tr_td]:border-line">
          <tbody>
            {#each KEYS as [keys, what] (what)}
              <tr>
                <td class="pr-3 w-[45%]"><span class="flex flex-wrap gap-1">{#each keys as k (k)}<kbd class={KBD}>{k}</kbd>{/each}</span></td>
                <td>{what}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <table class="w-full mt-3 text-sm [&_td]:py-1 [&_td]:align-top [&_tr+tr_td]:border-t [&_tr+tr_td]:border-line">
          <tbody>
            {#each MOUSE as [how, what] (how)}
              <tr><td class="pr-3 w-[45%] text-muted">{how}</td><td>{what}</td></tr>
            {/each}
          </tbody>
        </table>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>

  <section class="under">
    <div bind:this={chartBox}>
      <AdvantageChart blueWin={R.blueWin} {scoreDiff} current={pos} showScore={display.scoreLine} tips={chartTips}
             settled={chartSettled} moments={R.keyMoments.map(m => ({ index: m.index, label: m.label! }))} onjump={go} />
    </div>
    <p class="flex flex-wrap items-center gap-2.5 my-3.75 text-xs text-muted">
      <strong>Advantage chart</strong>
      <span class="inline-block w-[1.2em] h-0.5 bg-ink"></span> Blue's win chance
      {#if chartRough}<span class="inline-block w-[1.2em] border-t-[1.5px] border-dashed border-ink opacity-55"></span>
        First estimate, refined as the review runs{/if}
      {#if display.scoreLine}<span class="inline-block w-[1.2em] h-0.5 bg-accent"></span> Score so far (Blue − Red){/if}
    </p>
  </section>
</main>

<style>
  /* Design 06. The board's size is the smaller of the window's height (less the site's header, the bar above the
     board and a margin) and the width left after the other columns at their least (Lichess's uniboard). The columns:
     Lichess's side column (250 to 350 pixels) and an analysis column wider than its 240 to 400, for the five-column
     candidates table. The rest of the page's styles are Tailwind classes in the markup. */
  .review {
    --gap: 1.25rem;
    --row-gap: 0.8rem;
    --chart: 7.5rem; /* the Advantage chart's height (h-30 in AdvantageChart.svelte) */
    --strip: 2.1rem; /* the row above the board, with its margin: its one-line height until the page measures it */
    --gauge-w: 0px;
    --summary-min: 250px;
    --summary-max: 350px;
    --side-min: 340px;
    --side-max: 460px;
    --others: calc(var(--side-min) + var(--gap));
    --board: min(
      calc(100vh - var(--site-header) - var(--strip) - 2rem),
      calc(100vw - var(--others) - var(--gauge-w) - 2rem - 20px) /* the page's padding and a scroll bar */
    );
    display: grid;
    grid-template-columns: calc(var(--board) + var(--gauge-w)) minmax(var(--side-min), var(--side-max));
    grid-template-areas: "board side" "under .";
    gap: var(--row-gap) var(--gap);
    justify-content: center;
    align-items: start;
    margin: 1rem auto;
    padding: 0 1rem;
  }
  .review.gauge-mode { --gauge-w: 1.375rem; } /* the gauge (w-4) and its margin (mr-1.5) */
  .review.wide {
    --others: calc(var(--summary-min) + var(--side-min) + 2 * var(--gap));
    grid-template-columns: minmax(var(--summary-min), var(--summary-max)) calc(var(--board) + var(--gauge-w))
      minmax(var(--side-min), var(--side-max));
    grid-template-areas: "summary board side" ". under .";
  }
  .summary-col { grid-area: summary; max-height: calc(var(--strip) + var(--board)); }
  .board-col { grid-area: board; }
  .board-wrap { width: var(--board); flex: none; }
  /* The analysis column is as high as the board's column; the move list takes what is left. */
  .side { grid-area: side; height: calc(var(--strip) + var(--board)); }
  .under { grid-area: under; min-width: 0; }
  /* With the whole chart in the window (reach, set in the script), the side columns span the chart's row too, and end
     at the chart's bottom edge. Their height is set, so they do not make the rows taller. */
  @media (min-width: 800px) {
    .review.reach { grid-template-areas: "board side" "under side"; }
    .review.wide.reach { grid-template-areas: "summary board side" "summary under side"; }
    .review.reach .side, .review.reach .summary-col {
      height: calc(var(--strip) + var(--board) + var(--row-gap) + var(--chart));
      max-height: none;
    }
  }
  /* One column below 800 pixels (Lichess's $small): the board as wide as the window, then the analysis. */
  @media (max-width: 799px) {
    .review, .review.wide {
      --board: calc(100vw - 2rem - var(--gauge-w));
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: "board" "side" "under";
    }
    .side { height: auto; }
    .movelist { max-height: 22rem; }
    .board-wrap { width: auto; flex: 1; min-width: 0; } /* the column's width, whatever the scroll bar takes */
  }
</style>
