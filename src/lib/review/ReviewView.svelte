<script lang="ts" module>
  /** The review in progress: what the engine does now, and the passes as parts of one bar, each with its share of the
   *  work (by visits) and how much of it is done (0 to 1). `waiting`: no work runs (the engine is off). */
  export interface ReviewProgress { text: string; parts: { share: number; done: number }[]; waiting?: boolean }
  /** Why a game reviewed before is reviewed again: the engine or its network was updated (store.ts, reviewAgainWhy).
   *  `text` shows under the progress. The dialog, with `title` and `body`, says it once when `dialog` is set. */
  export interface ReviewAgain { title: string; text: string; body: string; dialog: boolean }

  // The numbers' formats, made once: a formatter is costly to make, and the move list and the tables format many numbers
  // at each result.
  const WHOLE = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
  const ONE_DIGIT = new Intl.NumberFormat("en", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  /** Points in at most 5 characters: "105", or "1.2k" from 1,000 on. */
  const shortPoints = (a: number) => (a >= 999.5 ? `${(a / 1000).toFixed(1)}k` : `${Math.round(a)}`);
</script>

<script lang="ts">
  // The review of one game (docs/research/01-ux-survey.md, section 8): a Report (chess.com's Highlights) and free analysis
  // (Lichess). Learning from the mistakes is to come back as a mode of the analysis (decisions/open-items.md). The
  // review may be partial while the engine works: an edge with no label yet shows none. The layout is design 06 (docs/design/06-review-layout.md): the board fills the window's height,
  // with the summary on its left from 1,260 pixels (Lichess's three columns), and the analysis on its right.
  import { ContextMenu, Dialog, RadioGroup, Switch, Tabs } from "bits-ui";
  import { untrack } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";
  import type { BranchNode } from "#lib/analysis/game.svelte.ts";
  import { CUSTOM_REVIEW, DEPTHS, NETWORKS, REVIEW_PRESETS, networkMB, networkName, TIME_LIMITS, maxWorkers, nearestStep, type EngineSettings,
           type GpuMode, type ReviewDepth }
    from "#lib/analysis/engineSettings.ts";
  import { gpuStatusText, type GpuStatus } from "#lib/analysis/gpu.svelte.ts";
  import Board, { type BoardCandidate, type BoardLineEdge, type BoardMark } from "#lib/board/Board.svelte";
  import { BRUSH_KEYS, type BoardNote } from "#lib/board/notes.ts";
  import { EdgeInput, type EdgeRules } from "#lib/board/edgeInput.svelte.ts";
  import { parseEdge } from "#lib/engine/notation.ts";
  import Swatch from "#lib/ui/Swatch.svelte";
  import { SIDE_BG, SIDE_BORDER, SIDE_TEXT } from "#lib/ui/side.ts";
  import AdvantageChart from "./AdvantageChart.svelte";
  import DifficultyChart from "./DifficultyChart.svelte";
  import { loadDisplay, saveDisplay, type Display } from "./display.ts";
  import { MOVE_SOUND_NAMES, playMove, preload } from "#lib/sound.ts";
  import ExportMenu from "#lib/ExportMenu.svelte";
  import type { ExportKind, ExportResult } from "#lib/game/reviewFile.ts";
  import Glyph from "./Glyph.svelte";
  import LabelBadge from "./LabelBadge.svelte";
  import { LineDrawing } from "./lineDrawing.svelte.ts";
  import {
    edgeName, moveName, moveNotation, sameEdge, shortNote, turnShortNote, HARD_NOTE, complexity, likelyEdges, HARD, METER_GROUPS, turnCost, judgeTurn, judgeBranchEdge, valuesAfter, resultWin, moverWin, costText, pct, shownCandidates, distinctCandidates, rankOf, twinsOf, lineMovers, enoughVisits, trustedLine, type Analysis, type Candidate, type EdgeReview, type LineStep, LABELS, LABEL_TEXT, LABEL_GLYPH, PLAYER_NAME, type Edge, type Label, type Player, type Position, type Review, type Unit, type Move, type TurnJudgment, type TurnReview,
  } from "./model.ts";
  import { branchChildren, branchRows, mainIndex, nextFork, pathKey, prevFork, sharedLength, siblingLine, treeLines, withLine, type BranchRow } from "./tree.ts";

  interface Props {
    R: Review;
    progress?: ReviewProgress | null; // the review in progress, or null when it is complete
    problem?: string; // an engine error
    deepVisits?: number; // the budget of the position on screen: its search bar is full at this many visits
    deeperPositions?: number; // the game's positions searched deeper than the review asked, where the player looked
    again?: ReviewAgain | null; // why a game reviewed before is reviewed again, when the site's engine changed
    partner?: string | null; // the partner site the game came from by its link, which takes its review back (design 18)
    siteLink?: { href: string; host: string } | null; // the game's own page, from its record's Site tag
    ownSettings?: boolean; // the game keeps the network and depth it came with (store.ts, `settings`)
    onfeature?: (name: string) => void; // a feature used (design 17): the page counts its first use in each review
    onposition?: (path: string[]) => void; // the position on screen changed: its path in the game's tree
    lineSteps?: (path: string[], line: Edge[]) => Promise<LineStep[]>; // a line's edges played: cuts, regions (the rules)
    branches?: Record<string, BranchNode>; // the branches' positions, by path key (tree.ts), in the order added
    onplay?: (path: string[]) => Promise<void>; // adds a line from the start to the tree
    rulesAt?: (path: string[]) => Promise<EdgeRules>; // a position's legal edges and mover's nodes, for the player's moves
    secondAt?: (path: string[]) => Analysis | undefined; // the position after the engine's second choice, which confirms a Great
    otherAt?: (path: string[], turn: (Edge | null)[]) => Analysis | undefined; // the same for a turn (GameAnalysis.otherAt)
    turnKeys?: (path: string[]) => string[]; // the branch moves that evaluating this move's quality judges
    pendingAt?: (path: string[]) => boolean; // the review's own searches can still change this position's analysis
    reviewVisits?: number; // the review's depth: a position searched less is a first estimate on the chart
    ondelete?: (path: string[]) => Promise<void>; // deletes a branch node and what follows it
    onpromote?: (path: string[]) => Promise<void>; // promotes a branch one step among the branches from its fork
    onjudge?: (path: string[]) => Promise<void>; // evaluates a branch move's quality: searches its two positions
    labelVisits?: number; // the label budget: a move is judged once both its positions have this many visits
    searching?: boolean; // the position on screen is being searched now
    timedOut?: boolean; // the position on screen's search stopped at its time limit
    engine?: EngineSettings; // the engine's settings (design 09), shown in the settings panel
    onengine?: (change: Partial<EngineSettings>) => void; // a setting changed in the panel
    gpu?: { status: GpuStatus; downloadMB: string }; // what the GPU does in this review, and its first download (design 15)
    // Exports the review (design 13): the review file, or the annotated record copied or as a file, labelled by `unit`
    onexport?: (kind: ExportKind, unit: Unit) => Promise<ExportResult | void>;
    exportReady?: boolean; // the review is done: export only then (design 13)
  }
  let { R, progress = null, problem = "", deepVisits = 0, onposition, lineSteps, branches = {}, onplay, rulesAt, ondelete,
        onpromote, onjudge, labelVisits = 0, searching = false, timedOut = false, engine, onengine, gpu, secondAt, otherAt, turnKeys, pendingAt, reviewVisits = 0, onexport, exportReady = true, deeperPositions = 0, again = null, partner = null, siteLink = null, ownSettings = false, onfeature }: Props = $props();
  const used = (name: string) => onfeature?.(name);
  const last = $derived(R.data.positions.length - 1);
  const TABLE_ROWS = 5; // the Analysis table shows this many rows and scrolls, so the move list under it does not move
  const ROW_EM = 1.9; // a table row's height, in em
  const GAUGE_TEXT_PX = 40; // the length of a side's part of the gauge that has room for its percentage, written up
  // Class lists used in several places.
  const PANEL = "min-w-0 px-4 py-3 bg-panel border border-line rounded-md";
  // A label's badge in the text. Its mark is 56% of the circle, as on the board (0.4 in 0.72), and bold, not extra bold,
  // because small text in heavy weights runs together.
  const GAUGE_TEXT = "absolute left-1/2 -translate-x-1/2 rotate-180 [writing-mode:vertical-rl] text-[0.6rem] leading-none font-semibold tracking-[0.1em] text-white tabular-nums";
  const MENU_ITEM = "px-2.5 py-1.5 rounded cursor-pointer outline-none data-highlighted:bg-panel data-disabled:opacity-50 data-disabled:cursor-default";
  const KBD = "inline-block min-w-[1.6em] px-1 py-px rounded border border-line bg-panel font-mono text-[0.85em] text-center leading-tight";
  const SETTINGS_HEAD = "mt-2 first:mt-0 pb-0.5 text-xs font-semibold uppercase tracking-wide text-muted border-b border-line";
  const TAB = "flex-1 bg-transparent border-transparent border-b-2 border-b-line rounded-none data-[state=active]:border-b-accent data-[state=active]:font-semibold";
  const SWITCH = "flex-none inline-flex items-center w-9 h-5 p-0 rounded-full border border-line bg-panel-2 transition-colors data-[state=checked]:bg-accent data-[state=checked]:border-accent";
  const SWITCH_THUMB = "block size-3.5 rounded-full bg-ink transition-transform translate-x-0.5 data-[state=checked]:translate-x-[1.1rem] data-[state=checked]:bg-on-badge";
  const HELP_TABLE = "w-full text-sm [&_td]:py-1 [&_td]:align-top [&_tr+tr_td]:border-t [&_tr+tr_td]:border-line";

  type Stage = "highlights" | "analysis";
  let stage = $state<Stage>("highlights");
  // The place on screen: a path in the game's tree (tree.ts), the game's own moves or a branch (design 07).
  let path = $state<string[]>([]);
  let hover = $state<Edge | null>(null);
  // Three columns from Lichess's width for them (its $x-large, 1,260 pixels): the summary gets its own column, and
  // the Report is no longer a tab.
  const wide = new MediaQuery("min-width: 1260px");
  // The display settings, kept in this browser (display.ts). They open in the analysis column, in the place of the
  // analysis (Lichess's analysis menu takes the move list's place), so that the board shows each change.
  const display = $state(loadDisplay());
  // Each change of a display setting is kept, and counted by its name (design 17): not the settings as they load.
  let shownDisplay = $state.snapshot(display);
  $effect(() => {
    const now = $state.snapshot(display);
    saveDisplay(now);
    const was = shownDisplay;
    for (const k of Object.keys(now) as (keyof typeof now)[]) if (JSON.stringify(now[k]) !== JSON.stringify(was[k])) used(`display ${k}`);
    shownDisplay = now;
  });
  // What the labels judge (design 10): each turn as a whole, or each edge. It sets the labels' unit in the move list, on
  // the board, in the counts and on the chart.
  const unit = $derived<Unit>(display.judge);
  // Whose moves the review explains ("Review for"): both, or one player. The other's moves show without labels, numbers,
  // notes or the engine's lines, on the board and on the chart too. The counts keep both players.
  const forSide = (p: Player) => display.reviewFor === "both" || (display.reviewFor === "blue") === (p === 0);
  let settingsOpen = $state(false);
  // The engine's settings (design 09) open under the engine header, from its gear, as Lichess's open from the gear in
  // its engine box: the header's values and its search bar stay in view while they change. The display settings take the
  // header's place, so one panel shows at a time.
  let engineOpen = $state(false);
  let gaugeHeight = $state(0);
  // The row above the board is one line high, or two in a narrow row: the board and the side columns take its height.
  let stripHeight = $state(0);
  // The side columns end where the window ends, less the page's margin, but never above the board's bottom edge, so that
  // the step controls stay in view and the page fits the window. They are measured again whenever the board's column or
  // the page changes size, not only the window: the row above the board, measured after the first paint, or a bar of
  // the browser's own, move it too.
  let boardCol = $state<HTMLElement>();
  let sideHeight = $state<number | null>(null);
  function measureSide() {
    if (!boardCol) return;
    const col = boardCol.getBoundingClientRect();
    const margin = parseFloat(getComputedStyle(document.documentElement).fontSize); // the page's 1rem
    sideHeight = Math.max(col.bottom, window.innerHeight - window.scrollY - margin) - col.top;
  }
  $effect(() => {
    if (!boardCol) return;
    const watch = new ResizeObserver(measureSide);
    watch.observe(boardCol);
    watch.observe(document.body);
    return () => watch.disconnect();
  });
  $effect(() => { void innerWidth.current; void innerHeight.current; void wide.current; void display.win; measureSide(); });
  // The game's moves and positions: the same arrays from one result to the next, so that what is derived from them is
  // not derived again at each result.
  const moves = $derived(R.data.moves);
  const gamePositions = $derived(R.data.positions);
  const mainNames = $derived(moves.map(m => moveName(m.edge)));
  // The path key of each position of the game: the first i moves.
  const mainKeys = $derived(mainNames.reduce((keys, name) => [...keys, keys.length > 1 ? `${keys.at(-1)} ${name}` : name], [""]));
  const here = $derived(pathKey(path));
  const mainAt = $derived(mainIndex(path, mainNames)); // the place on the game's line, or null in a branch
  const pos = $derived(mainAt ?? sharedLength(path, mainNames)); // on the game's line: here, or where the branch leaves it
  const branchNode = $derived(mainAt === null ? branches[here] : undefined);
  const position = $derived(branchNode?.position ?? R.data.positions[pos]);
  const over = $derived(mainAt !== null ? mainAt === last : !!position.over); // the game has ended here
  const analysis = $derived(over ? undefined : mainAt !== null ? R.data.analysis[mainAt] : branchNode?.analysis);
  // The position's complexity (model.ts) when it is hard, and its likely edges for the meter
  const hardHere = $derived.by(() => { const c = complexity(analysis, position.player); return c !== undefined && c >= HARD ? c : undefined; });
  const meter = $derived(likelyEdges(analysis, position.player));
  const METER_WORDS = { good: "good or better", inaccuracy: "inaccuracy", mistake: "mistake", blunder: "blunder" } as const;
  const meterText = (m: NonNullable<typeof meter>) =>
    `Likely edges: ${METER_GROUPS.map(g => `${Math.round(100 * m[g])}% ${METER_WORDS[g]}`).join(" · ")}` +
    (m.unsearched >= 0.005 ? ` · ${Math.round(100 * m.unsearched)}% not searched` : "");
  const mover = $derived(position.player as Player);
  const lastPlayed = $derived(moveInto(path)); // the move that led here, in the game or a branch

  // The tree's children: the game's next move first, on its line, then the branches, in the order they were added.
  // Derived from the branches' keys in their order: a branch's search result changes neither.
  const branchOrder = $derived(Object.entries(branches).sort((a, b) => a[1].order - b[1].order).map(([k]) => k).join("\n"));
  const kids = $derived(branchChildren(branchOrder ? branchOrder.split("\n").map(k => k.split(" ")) : []));
  const kidsAt = (key: string) => kids.get(key) ?? [];
  const branchKids = (p: string[]) => kidsAt(pathKey(p));
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
  const turnCache = $derived.by(() => { void gamePositions; void branches; return new Map<string, { turn: number; first: boolean }>(); });
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

  const fmtScore = (s: number) => WHOLE.format(Math.round(s));
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

  // The engine's candidates on the board (model.ts), each with its note: number 1's own values, and the others' cost
  // against number 1 (costText), even when it is 0. A candidate after number 1 in the engine's order can be better than
  // it, by a little: its cost then has a plus. A symmetric twin is drawn too, with its move's rank and note: it is the
  // same move, and either edge can be played.
  const candidates = $derived<BoardCandidate[]>(shownCandidates(analysis, mover).flatMap(({ c, rank, gap, gapPts, twins }) => {
    const note = rank === 1 ? `${PLAYER_NAME[mover]} wins ${pct(moverWin(c.blueWin, mover))}${c.lead !== undefined ? ` · lead ${sideText(c.lead, 1, "0")}` : ""}`
      : costText(gap, gapPts);
    return [c, ...twins].map(x => ({ edge: x.edge, rank, note }));
  }));

  // The engine's line from the candidate pointed at, on the board or in the table (KaTrain's and Lizzie's way), each
  // edge with its mover. Only for a candidate with enough visits (the board's rule), and only as far as the search
  // trusts it (trustedLine): the line of a barely searched move means little. A line needs an edge after the candidate.
  const trusted = (c: Candidate): Edge[] | null => {
    if (!analysis || !enoughVisits(analysis, c)) return null;
    const edges = trustedLine(c);
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
  $effect(() => { void here; selectedRank = 1; pinned = false; listHover = null; forkPick = null; });
  function pick(rank: number) {
    if (pinned && selectedRank === rank) pinned = false;
    else { selectedRank = rank; pinned = true; }
  }
  // Ranks count the engine's distinct moves (rankOf): a symmetric twin has its move's rank.
  const selectedCandidate = $derived(analysis ? distinctCandidates(analysis)[selectedRank - 1] : undefined);
  const pinnedCandidate = $derived(pinned ? selectedCandidate : undefined);
  const listCandidate = $derived(hoverCandidate ?? selectedCandidate);
  const listRank = $derived(listCandidate && analysis ? rankOf(analysis, listCandidate.edge) : 0);
  const listLine = $derived(listCandidate ? trusted(listCandidate) : null);
  const listTurns = $derived(listLine ? turnsFrom(path, lineMovers(position, listLine.length)) : []);
  const selectRank = (edge: Edge) => {
    const k = rankOf(analysis, edge);
    if (k > 0) pick(k);
  };
  const hoverRank = $derived(hover ? rankOf(analysis, hover) : 0);
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
  const play = (k: number) => { if (listLine) { used("listed line played"); playPath([...path, ...listLine.slice(0, k + 1).map(edgeName)]); } };
  /** Plays a line from the start: along the tree where it is there, as a new branch where it is not, then goes there. */
  async function playPath(target: string[]) {
    if (onplay) await onplay(target);
    setPath(target, true);
  }
  // Space plays the pinned candidate, or number 1 (Lichess's Space plays its best move).
  function playCandidate() {
    const c = pinnedCandidate ?? analysis?.candidates[0];
    if (c) { used("candidate played"); playPath([...path, edgeName(c.edge)]); }
  }

  // The player's own moves, always on (Lichess's analysis board): the puzzles' edge input, on the position's rules from
  // the engine. A move that is the game's goes along the game; another makes a branch.
  const input = new EdgeInput(edge => { used("own edge played"); playPath([...path, edgeName(edge)]); });
  // The player's notes on the board, by position, for this visit only (Lichess keeps an analysis board's shapes on each
  // position of its tree).
  let notesAt = $state<Record<string, BoardNote[]>>({});
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
    : hoverCandidate ? trusted(hoverCandidate) : pinnedCandidate ? trusted(pinnedCandidate) : null);
  const line = $derived.by((): BoardLineEdge[] | null => {
    if (!lineEdges) return null;
    const movers = lineMovers(position, lineEdges.length);
    return lineEdges.map((edge, i) => ({ edge, player: movers[i], ...stepsNow?.[i] }));
  });

  // The listed line's edges played, from the engine's rules, asked once for each line: the edge each one cuts, and the
  // regions and areas after it. The board's line is a part of the listed line, so their steps are the same. The board
  // shows the cut edges cut, and the regions as they become.
  // The steps of each line that the rules played, by the line's start and edges (lineKey): asked once for each line.
  // Without them, a line still shows.
  let stepsByLine = $state.raw<Record<string, LineStep[]>>({});
  const askedSteps = new Set<string>();
  const lineKey = (start: string[], edges: Edge[]) => `${pathKey(start)}|${edges.map(edgeName).join(" ")}`;
  function askSteps(start: string[], edges: Edge[]) {
    const key = lineKey(start, edges);
    if (!lineSteps || key in stepsByLine || askedSteps.has(key)) return;
    askedSteps.add(key);
    lineSteps(start, edges).then(steps => (stepsByLine = { ...stepsByLine, [key]: steps })).catch(() => {});
  }
  let lineStepsHad = $state<{ at: string; edges: Edge[]; steps: LineStep[] } | null>(null);
  const listKey = $derived(listLine ? lineKey(path, listLine) : null);
  $effect(() => {
    const key = listKey, steps = key ? stepsByLine[key] : undefined;
    if (!key) return;
    untrack(() => {
      if (steps) lineStepsHad = { at: here, edges: listLine!, steps };
      else askSteps(path, listLine!);
    });
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

  // The line as far as drawn (lineDrawing.svelte.ts): one edge at a time (the default, a display setting), or all at
  // once. Pointing at another candidate draws its line again; a line that the search lengthens goes on from the edges
  // drawn. Its edges as one string, so that the drawing goes on while the search sends the same line again.
  const lineText = $derived(lineEdges ? lineEdges.map(edgeName).join(" ") : null);
  const lineDrawing = new LineDrawing();
  // The line pointed at in the list shows at once, as far as the edge pointed at.
  $effect(() => lineDrawing.draw(lineText === null ? null : here, lineText ? lineText.split(" ") : [],
                                 !display.lineSteps || listHover !== null));
  const drawnLine = $derived(line && line.slice(0, Math.max(1, lineDrawing.shown)));

  // A branch's preview (design 07): pointing at a move of a branch's row in the move list shows the row on the board,
  // from the position where the row starts, as the engine's line shows: its edges numbered, one at a time or all at
  // once (the same display setting), with the edges they cut and the regions they close, from the branch's own
  // positions. The rows of dots or pills look alike, and the board tells them apart. It ends when the pointer leaves.
  // The engine's line shown as a branch under a bad turn's note (bestLine): pointing at one of its edges previews it as a
  // branch's row, from the line's steps once the rules have played it. A played move's preview: below.
  type Preview = { kind: "move"; index: number } | { kind: "branch"; row: string[][]; k: number }
    | { kind: "engine"; start: string[]; line: Edge[]; k: number };
  let preview = $state<Preview | null>(null);
  $effect(() => { const p = preview; if (p?.kind === "engine") untrack(() => askSteps(p.start, p.line)); });
  const branchPreview = $derived.by(() => {
    const p = preview;
    if (!display.previewBranches || !p || p.kind === "move") return null;
    if (p.kind === "engine") {
      const { start, line, k } = p, from = positionOf(start);
      if (!from) return null;
      const steps = stepsByLine[lineKey(start, line)], movers = lineMovers(from, k + 1);
      const edges = line.slice(0, k + 1).map((edge, i): BoardLineEdge => ({ edge, player: movers[i], ...steps?.[i] }));
      return { start, from, edges };
    }
    const { row, k } = p, start = row[0].slice(0, -1), from = positionOf(start);
    if (!from) return null;
    const edges: BoardLineEdge[] = [];
    for (const q of row.slice(0, k + 1)) {
      const node = branches[pathKey(q)];
      if (!node?.move.edge) break;
      edges.push({ edge: node.move.edge, player: node.move.player, cut: node.move.cut, regions: node.position.regions });
    }
    return { start, from, edges };
  });
  // Pointing at a later move of the same row goes on from the edges drawn.
  const previewStart = $derived(branchPreview ? pathKey(branchPreview.start) : null);
  const previewText = $derived(branchPreview ? branchPreview.edges.map(e => edgeName(e.edge)).join(" ") : "");
  const previewDrawing = new LineDrawing();
  $effect(() => previewDrawing.draw(previewStart, previewText ? previewText.split(" ") : [], !display.lineSteps));
  const previewLine = $derived(branchPreview && branchPreview.edges.slice(0, Math.max(1, previewDrawing.shown)));
  // A played move's preview: pointing at one of the game's moves in the move list shows the position after it, with the
  // move as the last edge. Not Lichess's (its move list has none; it shows a small board only for a move of an engine
  // line, ui/lib/src/ceval/view/main.ts): the board tells apart the moves that the list shows as text. It ends when the
  // pointer leaves the move list, so that the board does not flicker between moves.
  const movePreview = $derived(preview?.kind !== "move" || preview.index + 1 === mainAt || !display.previewMoves ? null
    : { index: preview.index, position: gamePositions[preview.index + 1], move: moves[preview.index] });
  // Either preview: the board shows nothing of the position on screen.
  const previewing = $derived(!!branchPreview || !!movePreview);
  // A preview starts when the pointer comes onto a move and ends a moment after it leaves the move (PREVIEW_END_MS),
  // so that the pointer can cross the gap to the next move without the board going back between them. Each preview is
  // a display setting (Move list).
  const PREVIEW_END_MS = 120;
  let previewEnd: ReturnType<typeof setTimeout> | undefined;
  function startPreview(p: Preview) {
    clearTimeout(previewEnd);
    preview = p;
  }
  function endPreview() {
    clearTimeout(previewEnd);
    previewEnd = setTimeout(() => (preview = null), PREVIEW_END_MS);
  }
  // The engine's best line from a position, shown as a branch under a bad turn's note (Lichess shows the engine's line
  // after a mistake as a variation): its first choice's line, as far as the search trusts it (trustedLine, by visits).
  const bestLine = (start: string[]): Edge[] => {
    const first = analysisAt(start)?.candidates[0];
    return first ? trustedLine(first) : [];
  };
  // That line in the move list, from where it leaves the game, merged into the branches there (withLine, as Lichess's
  // computer lines are nodes of its tree): an edge the player has played shows as the branch's own, and the rest of the
  // line follows it, faded. The line follows the search, and the player's branches stay. When the line changes, a
  // branch off the new line shows as a branch of its own, and a branch on it merges into it.
  type EngineStep = { k: number; mover: Player; turn: { turn: number; first: boolean } };
  interface EngineBranch { search: string[]; start: string[]; line: Edge[]; paths: string[][]; steps: Map<string, EngineStep> }
  function engineBranch(search: string[]): EngineBranch | null {
    const best = bestLine(search);
    let m = 0;
    while (m < best.length && mainNames[search.length + m] === edgeName(best[m])) m++;
    const start = mainNames.slice(0, search.length + m), line = best.slice(m), from = positionOf(start);
    if (!line.length || !from) return null;
    const movers = lineMovers(from, line.length), turns = turnsFrom(start, movers);
    const paths = line.map((_, k) => [...start, ...line.slice(0, k + 1).map(edgeName)]);
    return { search, start, line, paths, steps: new Map(paths.map((p, k) => [pathKey(p), { k, mover: movers[k], turn: turns[k] }])) };
  }
  const bad = (l: Label | null) => l === "mistake" || l === "blunder";
  /** A turn's branches, a group for each of its edges: the lines from the position before the edge. Under a Mistake's
   *  or a Blunder's note, the engine's best line from where it started (by turn, from the turn's start) joins the
   *  group where it leaves the game, first. A line that leaves the game after the turn shows nowhere: the engine
   *  played the turn as the player did. */
  function turnGroups(t: TurnReview): { rows: BranchRow[]; engine: EngineBranch | null }[] {
    const engines = new Map<number, EngineBranch>();
    if (display.notes) for (const e of t.edges) {
      if (!forSide(e.player) || !(unit === "turn" ? e.index === t.start && bad(t.label) : bad(e.label))) continue;
      const engine = engineBranch(mainNames.slice(0, e.index));
      if (engine && !engines.has(engine.start.length)) engines.set(engine.start.length, engine);
    }
    return t.edges.map(e => {
      const engine = engines.get(e.index) ?? null, kidsOf = engine ? withLine(branchKids, engine.paths) : branchKids;
      return { rows: kidsOf(mainNames.slice(0, e.index)).flatMap(first => branchRows(first, kidsOf)), engine };
    });
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

  // A branch move's label, when the player asked for its quality (its menu's "Evaluate quality"): judged as the game's
  // moves are, once its two positions have the label budget. Other branch moves have none: a line played to show
  // something should cost no search (design 07).
  function branchLabel(p: string[]): Label | null {
    const node = branches[pathKey(p)];
    if (!node?.judged) return null;
    const parent = p.slice(0, -1);
    return judgeBranchEdge(analysisAt(parent), valuesAfter(node.position, node.analysis, "lead", labelVisits), node.move.player,
                           node.move.edge, "lead", labelVisits, secondAt?.(parent));
  }
  /** The move that leads to `p` (none at the start), and the analysis at `p`: the game's or a branch's. */
  function moveInto(p: string[]): Move | undefined {
    const i = mainIndex(p, mainNames);
    return !p.length ? undefined : i !== null ? moves[i - 1] : branches[pathKey(p)]?.move;
  }
  function analysisAt(p: string[]): Analysis | undefined {
    const i = mainIndex(p, mainNames);
    return i !== null ? R.data.analysis[i] : branches[pathKey(p)]?.analysis;
  }
  /** The paths of the turn that a branch move ends, or null where the turn goes on after it. */
  function branchTurnPaths(p: string[]): string[][] | null {
    const node = branches[pathKey(p)];
    if (!node || (!node.position.over && node.position.player === node.move.player)) return null;
    const parent = p.slice(0, -1), before = moveInto(parent);
    return before && before.player === node.move.player ? [parent, p] : [p];
  }
  /** The turn that a branch move ends (design 10), by turn: its moves' paths, and its judgment (judgeTurn) once the player
   *  asked for its quality and its searches have the label budget. Null where the move does not end a turn, or where
   *  the turn was not asked for. */
  function branchTurnAt(p: string[]): { paths: string[][]; judgment: TurnJudgment | null } | null {
    const node = branches[pathKey(p)], paths = branchTurnPaths(p);
    if (!node || !paths) return null;
    const parent = p.slice(0, -1), twice = paths.length > 1;
    if (!paths.every(q => mainIndex(q, mainNames) !== null || branches[pathKey(q)]?.judged)) return null;
    const start = p.slice(0, twice ? -2 : -1), turn = paths.map(q => moveInto(q)?.edge ?? null);
    return { paths, judgment: judgeTurn(node.move.player, turn, analysisAt(start), twice ? analysisAt(parent) : undefined,
                                        valuesAfter(node.position, node.analysis, "lead", labelVisits), !!node.position.over,
                                        otherAt?.(start, turn), twice ? secondAt?.(parent) : undefined, "lead", labelVisits) };
  }
  // By turn, on the game's line, the turn that ends here: the turn just played, whole. In its middle, none.
  const endedTurn = $derived(unit === "turn" && mainAt !== null && mainAt > 0 && R.turnOf[mainAt - 1].end === mainAt
    ? R.turnOf[mainAt - 1] : null);
  // Label badges on the turn just played, as far as the current position, each with its note. By turn, the turn's badge
  // on both its edges, one label (design 10), once the turn has ended. By edge, each edge's badge: the game's, and a
  // branch's that were evaluated (a branch's edges are judged one by one, on request, whatever the unit).
  const marks = $derived.by((): BoardMark[] => marksHere().filter(m => forSide(m.player)).map(({ player, ...m }) => m));
  function marksHere(): (BoardMark & { player: Player })[] {
    if (unit === "turn" && mainAt !== null) {
      const t = endedTurn, label = t?.label;
      if (!t || !label) return [];
      const note = `${LABEL_TEXT[label]}: ${turnCost(t)}`;
      return t.edges.flatMap(e => (e.edge ? [{ edge: e.edge, label, glyph: LABEL_GLYPH[label], note, group: t.number, player: t.player }] : []));
    }
    if (unit === "turn") { // in a branch: the branch's turn that ends here, when it was asked for
      const bt = branchTurnAt(path), j = bt?.judgment;
      if (!bt || !j) return [];
      const note = `${LABEL_TEXT[j.label]}: ${costText(j.rawLoss, j.rawPoints)}`;
      return bt.paths.flatMap(q => { const m = moveInto(q); return m?.edge ? [{ edge: m.edge, label: j.label, glyph: LABEL_GLYPH[j.label], note, group: 0, player: m.player }] : []; });
    }
    const out: (BoardMark & { player: Player })[] = [];
    let p = path;
    for (let k = 0; k < 2 && p.length; k++) { // a turn has at most two edges
      const i = mainIndex(p, mainNames), e = i !== null ? R.edges[i - 1] : null, move = e ?? moveInto(p);
      const edge = move?.edge ?? null, label = e ? e.label : branchLabel(p), player = move?.player ?? 0;
      if (edge && label) out.push({ edge, label, glyph: LABEL_GLYPH[label], player,
                                    note: e ? `${LABEL_TEXT[label]}: ${costText(e.rawLoss, e.rawPoints)}` : LABEL_TEXT[label] });
      if (moveFrom(p.slice(0, -1)).first) break; // the turn began with this edge
      p = p.slice(0, -1);
    }
    return out;
  }

  // A move's sound (design 08), a button or a pencil stroke, and another for an edge that cuts: a step one move on plays
  // it, from any key or button, and so does a move played or clicked in the move list. Other jumps (back, the start and
  // the end, the chart, the fork keys) are silent, and so is a click on the place already on screen: the board does not
  // change.
  function setPath(p: string[], sound = false) {
    const step = p.length === path.length + 1 && sharedLength(p, path) === path.length;
    if (pathKey(p) === here) sound = false;
    path = p;
    hover = null;
    listHover = null;
    preview = null;
    if (display.sound && (sound || step) && p.length) void playMove(display.volume, display.moveSound, cutsAt(p));
  }
  /** Whether the move that leads to a place cuts an edge: the game's move, or a branch's (a played move's branch exists
   *  before its sound plays: playPath waits for it). */
  const cutsAt = (p: string[]) => !!moveInto(p)?.cut;
  $effect(() => { if (display.sound) preload(display.moveSound); });
  const SOUND_CHOICES = Object.entries(MOVE_SOUND_NAMES) as [string, string][];

  /** A network's name in the settings: "HedgeFund 0.1 Lite (6.5 MB)". Its parts hold no-break spaces, so that a narrow
   *  panel breaks the name only before the parenthesis. */
  const networkLabel = (id: string) => `${networkName(id).replaceAll(" ", "\u00a0")} (${networkMB(id)}\u00a0MB)`;
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
    used("branch deleted");
    const p = key.split(" ");
    if (here === key || here.startsWith(`${key} `)) setPath(p.slice(0, -1)); // the place on screen goes too
    await ondelete?.(p);
  }

  // At a fork, ↑ and ↓ pick the line that → follows (Lichess's fork.select): the board shows the picked edge.
  let forkPick = $state<number | null>(null); // none picked: → follows the first line
  const picked = $derived(forkPick === null ? undefined : childrenOf(path)[forkPick]);
  // The picked move is marked in the move list (a dashed outline) and brought into view.
  const pickedKey = $derived(picked ? pathKey(picked) : null);
  const PICKED = "picked outline-2 outline-dashed outline-accent";
  $effect(() => { if (pickedKey) movelist?.querySelector(".picked")?.scrollIntoView({ block: "nearest" }); });
  /** Goes to a position on the game's line. */
  const go = (p: number, sound = false) => setPath(mainNames.slice(0, Math.max(0, Math.min(last, p))), sound);
  // Along the line on screen, as Lichess's arrows: back to the parent, forward to the first child (the game's move on
  // its line), and to the line's end.
  const back = () => { if (path.length) setPath(path.slice(0, -1)); };
  const forward = () => { const kids = childrenOf(path), next = kids[forkPick ?? 0] ?? kids[0]; if (next) setPath(next); };
  function toEnd() {
    let p = path;
    for (let next = childrenOf(p)[0]; next; next = childrenOf(p)[0]) p = next;
    setPath(p);
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
  // Shift + ↑ and ↓, x and c (En Croissant's), or comma and period; Space plays the engine's choice; e or l turns the
  // engine on or off (l is Lichess's; e, for "engine", is the site's own: Lichess's e opens its opening explorer, which
  // this site does not have). Escape closes the settings, or drops an edge begun. Keys kept free for later: m and
  // Shift + m (the next and the previous mistake, KaTrain's n), and Delete. The controls' notes name no keys: the list
  // does.
  let keysOpen = $state(false);
  let againOpen = $state(false);
  $effect(() => { if (again?.dialog) untrack(() => (againOpen = true)); });
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
    if (key === "?" || (key === "/" && shift)) { keysOpen = !keysOpen; used("keys list"); }
    else if ((key === "e" || key === "l") && engine && onengine) onengine({ on: !engine.on });
    else if ((key === "ArrowLeft" && shift) || key === "b" || key === "[" || (key === "k" && shift)) setPath(prevFork(path, childrenOf));
    else if ((key === "ArrowRight" && shift) || key === "n" || key === "]" || (key === "j" && shift)) setPath(nextFork(path, childrenOf));
    else if ((key === "ArrowUp" && shift) || key === "x" || key === ",") line(-1);
    else if ((key === "ArrowDown" && shift) || key === "c" || key === ".") line(1);
    else if (key === "ArrowLeft" || key === "k") back();
    else if (key === "ArrowRight" || key === "j") forward();
    else if (key === "ArrowUp" || key === "ArrowDown") {
      const step = key === "ArrowUp" ? -1 : 1;
      if (kids.length > 1) forkPick = ((forkPick ?? 0) + step + kids.length) % kids.length;
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
    [["e", "l"], "Turn the engine on or off"],
    [["Escape"], "Close the settings, or drop an edge begun"],
    [["?"], "This list"],
  ];
  const MOUSE: [string, string][] = [
    ["Click a candidate", "Pin its line on the board; click again to unpin it"],
    ["Double-click a candidate", "Play it"],
    ["Click a node, then a marked point", "Play your own edge"],
    ["Drag from a node to a marked point", "Play your own edge"],
    ["Right-click a point, or right-drag to another", "Draw a ring, or a line, as a note. Drawing it again removes it, and in another colour (below) changes its colour"],
    ["Click the board", "Clear the position's notes"],
    ["Right-click a branch's move", "Evaluate it, promote its branch, or delete from it"],
  ];

  const scoreDiff = $derived(gamePositions.map(p => p.scores[0] - p.scores[1]));
  const areaDiff = $derived(gamePositions.map(p => (p.areas ? p.areas[0] - p.areas[1] : 0)));
  // The charts' key moments, and the Difficulty chart's bars: a turn's or an edge's complexity, for the side reviewed.
  const chartMoments = $derived(R.keyMoments[unit].filter(m => forSide(R.edges[m.first].player)).map(m => ({ index: m.last, label: m.label })));
  const difficultyBars = $derived((unit === "turn"
    ? R.turns.map(t => ({ from: t.start, to: t.end, c: t.complexity, hard: t.hard, player: t.player,
                          title: `${t.number}. ${PLAYER_NAME[t.player]} to play`, played: t.edges.map(moveNotation).join(" ") }))
    : R.edges.map(e => {
        const t = R.turnOf[e.index], k = e.index - t.start;
        return { from: e.index, to: e.index + 1, c: e.complexity, hard: e.hard, player: e.player, played: moveNotation(e),
                 title: `${t.number}. ${PLAYER_NAME[e.player]} to play${t.edges.length > 1 ? `, edge ${k + 1}` : ""}` };
      }))
    .flatMap(({ player, c, played, ...b }) => (c !== undefined && forSide(player)
      ? [{ ...b, c, details: [`Played ${played}`, ...(b.hard ? [HARD_NOTE] : [])] }] : [])));
  /** A setting's id, from its label. */
  const settingId = (label: string) => `setting-${label.replace(/\W+/g, "-").toLowerCase()}`;
  // The chart's score and area lines: the display settings say whether they show when the review opens, and the boxes in
  // the chart's legend show or hide them for the moment, without changing the settings. A change of a setting applies
  // again.
  let showScore = $derived(display.scoreLine);
  // The chart shown above the counts, as Lichess's tabs choose among its charts: the advantage, or the difficulty
  let chart = $state<"advantage" | "difficulty">("advantage");
  let showArea = $derived(display.areaLine);
  const winner = $derived<Player>(R.data.result.blue > R.data.result.red ? 0 : 1);
  const margin = $derived(Math.abs(R.data.result.blue - R.data.result.red));
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
  const blueWin = $derived(mainAt !== null ? R.blueWin[mainAt] : over ? resultWin(position.scores[0] - position.scores[1])
    : analysis?.blueWin ?? NaN);
  // The chart's hover, as Lichess's: the move that led to the position and its label, then one number. The number is
  // the engine's lead, which KaTrain's graph plots (B+n) and from which the points lost come. Under it, the score and the
  // area of the lines shown: the lines are scaled and have no axis, so their numbers are only here.
  // A turn's or an edge's loss in the move list: the mover's points lost, in at most 5 characters (−1.2k), or the win
  // chance lost when the analysis has no scores. Nothing until it is judged.
  function lossShort(e: Pick<EdgeReview, "label" | "loss" | "pointsLost">): string {
    if (!e.label) return "";
    if (e.pointsLost === undefined) return `−${Math.round(100 * e.loss)}%`;
    const text = shortPoints(e.pointsLost);
    return text === "0" ? "0" : `−${text}`;
  }
  // Who is ahead, from Blue's value: the side ahead named, and a number never below 0 ("Red +105"), whoever is to move
  // (Go writes "B+3.5"). Even: "even" in a sentence, "0" among numbers. In short, from 1,000 on: "Red +1.2k".
  const sideText = (blue: number, digits = 0, even = "even") => {
    const v = Number(Math.abs(blue).toFixed(digits));
    return v === 0 ? even : `${PLAYER_NAME[blue > 0 ? 0 : 1]} +${(digits ? ONE_DIGIT : WHOLE).format(v)}`;
  };
  const sideShort = (blue: number) =>
    Math.abs(blue) >= 999.5 ? `${PLAYER_NAME[blue > 0 ? 0 : 1]} +${shortPoints(Math.abs(blue))}` : sideText(blue, 0, "0");
  // Made for the position pointed at only: the chart asks for one note at a time.
  function chartTip(i: number) {
    const e = i > 0 ? R.edges[i - 1] : null, t = e ? R.turnOf[e.index] : null;
    // By turn, the chart shows the turns' ends only: the turn whole, with its label.
    const label = !e || !forSide(e.player) ? null : unit === "edge" ? e.label : t?.label ?? null;
    const move = !e ? "" : unit === "edge" ? moveText(e.index) : `${t!.number}. ${t!.edges.map(moveNotation).join(" ")}`;
    const title = e ? `${move}${listed(label) ? ` [${LABEL_TEXT[label]}]` : ""}` : "The start";
    const s = R.blueScore[i];
    const value = i === last ? `Result: ${sideText(s!, 1)}` : s === undefined ? "Not analysed yet"
      : `Lead: ${sideText(s, 1)}${chartSettled[i] ? "" : " · first estimate"}`;
    const details = [showScore && i !== last && `Score: ${sideText(scoreDiff[i], 1)}`,
                     showArea && `Area: ${sideText(areaDiff[i], 1)}`].filter(d => d !== false);
    return { title, value, details };
  }
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

<!-- A label in the move list and the branches, in the form the display settings choose: a badge, or its mark in the
     label's colour. -->
{#snippet mark(label: Label)}
  {#if display.marks === "badges"}<LabelBadge {label} />
  {:else}<span class="font-extrabold" style:color="var(--{label})"><Glyph glyph={LABEL_GLYPH[label]} /></span>{/if}
{/snippet}

<!-- The top of the side panel: the review's progress or an engine error. -->
{#snippet panelHead()}
  {#if problem}
    <p class="mb-2.5 text-sm text-blunder select-text" role="alert">Engine error: {problem}</p>
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
      {#if again}<p class="mt-1 text-xs text-ink">{again.text}</p>{/if}
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

<!-- The charts under the board (design 06), as Lichess has its chart: always in view, the board a little smaller for it.
     The area is as high as the page lets it be (--chart): short where the board fills the window's height, taller
     where the board's width leaves room. A row of the tabs, which choose the chart as Lichess's tabs choose among its
     charts, and of the shown chart's legend, then the chart, which takes the rest of the area's height. -->
{#snippet charts()}
  <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-1 text-xs">
    <div class="flex gap-3" role="group" aria-label="Chart">
      {#each [["advantage", "Advantage"], ["difficulty", "Difficulty"]] as [key, name] (key)}
        <button class={["px-0 py-0.5 bg-transparent border-0 border-b-2 rounded-none",
                        chart === key ? "border-accent text-ink font-semibold" : "border-transparent text-muted hover:text-ink"]}
                aria-pressed={chart === key} onclick={() => { chart = key as typeof chart; used(`chart ${key}`); }}>{name}</button>
      {/each}
    </div>
    <!-- A click on a box does not focus it, so that the arrow keys still step through the moves (the key handler
         leaves the keys to a focused input). The Tab key still reaches the boxes. -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <p class="flex flex-wrap items-center gap-x-3 gap-y-0.5 ml-auto text-muted" onmousedown={e => e.preventDefault()}>
      {#if chart === "difficulty"}
        <span class="inline-flex items-center gap-1"><span class="inline-block size-2.5 bg-ink"></span> Hard position</span>
        <span class="inline-flex items-center gap-1"><span class="inline-block size-2.5 bg-muted/50"></span> Easier</span>
      {:else}
        <span class="inline-flex items-center gap-1"><span class="inline-block w-[1.2em] h-0.5 bg-ink"></span> Win chance for Blue</span>
        {#if chartRough}<span class="inline-flex items-center gap-1" title="Refined as the review runs">
          <span class="inline-block w-[1.2em] h-0.5 flex-none bg-ink opacity-35"></span> Win chance, first estimate</span>{/if}
        {@render lineBox("Score difference", "bg-accent", "accent-accent", () => showScore, v => (showScore = v))}
        {@render lineBox("Area difference", "bg-area", "accent-area", () => showArea, v => (showArea = v))}
      {/if}
    </p>
  </div>
  <div class="flex-1 min-h-0">
    {#if chart === "difficulty"}
      <DifficultyChart positions={gamePositions.length} current={pos} onjump={i => { used("chart jump"); go(i); }} moments={chartMoments} bars={difficultyBars} />
    {:else}
    <AdvantageChart blueWin={R.blueWin} {scoreDiff} {areaDiff} current={pos} {showScore} {showArea}
           tip={chartTip} settled={chartSettled} onjump={i => { used("chart jump"); go(i); }} moments={chartMoments}
           points={unit === "turn" ? [0, ...R.turns.map(t => t.end)] : undefined} />
    {/if}
  </div>
{/snippet}

{#snippet highlights()}
  <p class="mb-3 text-xs text-muted">Analysed in your browser. Labels judge each move by the engine's win chance. ◆ marks a
    hard position.</p>
  <p class="mb-3.75">
    <strong>{PLAYER_NAME[winner]} won by {margin.toFixed(1)} points</strong>
    ({fmtScore(R.data.result.blue)} to {fmtScore(R.data.result.red)}).
    {#if progress}The review is still running: the counts below are partial.{/if}
  </p>
  <!-- The game's own page, when its record's Site tag is an address (Lichess's way): back to the site it was played on. -->
  {#if siteLink}
    <p class="-mt-2 mb-3 text-sm"><a href={siteLink.href} target="_blank" rel="noopener noreferrer">View this game on {siteLink.host}</a></p>
  {/if}
  <!-- The positions searched deeper than the review by the position on screen's Depth (design 16), here or in the
       browser that a review file came from: their results replace the review's, so this report follows them. -->
  {#if deeperPositions}
    <p class="mb-3 text-xs text-muted">{deeperPositions} {deeperPositions === 1 ? "position was" : "positions were"} searched
      deeper than the review, by the Depth of the position on screen: the labels there, and this report, use the deeper
      searches.</p>
  {/if}
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
        {#each R.summary[unit] as s, p (p)}<td>{Number.isNaN(s.accuracy) ? "–" : s.accuracy.toFixed(1)}</td>{/each}
      </tr>
      <tr>
        <td title="Points lost a {unit}, on average">Avg pts lost</td>
        {#each R.summary[unit] as s, p (p)}<td>{s.meanPointsLost?.toFixed(1) ?? "–"}</td>{/each}
      </tr>
      {#each LABELS as l (l)}
        <tr>
          <td><LabelBadge label={l} /> {LABEL_TEXT[l]}</td>
          {#each R.summary[unit] as s, p (p)}<td>{s.counts[l]}</td>{/each}
        </tr>
      {/each}
    </tbody>
  </table>
{/snippet}

<!-- The Analysis: the candidates table and the move list. -->
{#snippet analysisView()}
  <!-- One row for each distinct move: a symmetric twin, the same move with the same numbers, is named in its row's
       mirror mark. The row is the searched edge: pointing at it lights that edge and draws its line. The name has a
       slot as wide as the widest edge (M13-O16: 4 em in the first row's semibold), so the marks line up in a column.
       In em, not ch: a ch of the semibold first row is wider than the other rows'. -->
  {@const rows = analysis ? distinctCandidates(analysis).map((c, k) => ({ c, rank: k + 1, twins: twinsOf(analysis, c) })) : []}
  <!-- The table's box: a fixed height (from TABLE_ROWS), a scroll bar when there are more rows, and room for the
       scroll bar kept at all times, so that the columns do not move when it appears. Fixed columns: the table
       keeps its layout from position to position. Each fits its widest content (a two-digit rank, the header
       "Blue wins", a lead with its side, "Blue +999" or "Blue +1.2k", five-digit visits), and the space left goes to
       the edge column. When that column is narrower than the longest edge name (7 characters, about 4.4em), the
       name's text gets smaller instead of being cut: its cell is a size container, and the text is at most 22% of its
       width. Below 70% of its size the text would be hard to read, so the name is cut there. -->
  <div class="flex-none mb-3 overflow-y-auto [scrollbar-gutter:stable] text-sm" bind:this={tableBox}
       style="height: {(TABLE_ROWS + 1) * ROW_EM}em; --row: {ROW_EM}em">
  <table class="w-full table-fixed [&_:is(th,td)]:px-1 [&_:is(th,td)]:py-0.5 [&_:is(th,td)]:border-b [&_:is(th,td)]:border-line [&_:is(th,td)]:truncate">
    <colgroup><col class="w-7" /><col /><col class="w-18" /><col class="w-19" /><col class="w-12" /></colgroup>
    <thead>
      <tr class="[&>th]:sticky [&>th]:top-0 [&>th]:z-1 [&>th]:h-(--row) [&>th]:bg-panel [&>th]:text-left [&>th]:font-medium [&>th]:text-muted">
        <th>#</th><th>Edge</th><th>{PLAYER_NAME[mover]} wins</th><th>Lead</th><th>Visits</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as { c, rank, twins } (rank)}
        <tr class={["h-(--row)", rank === 1 && "font-semibold", hoverRank === rank && "lit outline outline-accent -outline-offset-1",
                    pinned && rank === selectedRank && "shadow-[inset_3px_0_0_var(--accent)]"]}
            style={rowTint(c.blueWin)} onmouseenter={() => { hoverOnBoard = false; hover = c.edge; }} onmouseleave={() => (hover = null)}
            onclick={() => pick(rank)}
            title={analysis && !trusted(c) ? "Too few visits to show the engine's line" : undefined}>
          <!-- A candidate on the board has its number in a badge, as the board draws it. The others have a plain number. -->
          <td>{@render rankBadge(rank, onBoard.has(rank) ? "On the board" : undefined)}</td>
          <td><div class="@container flex items-center gap-1 min-w-0"><span class="flex-none w-[4.1em] truncate text-[clamp(0.7em,22cqi,1em)]">{edgeName(c.edge)}</span>{#if twins.length}<span
                class="flex-none leading-none font-normal text-muted" title="Mirror: {twins.map(t => edgeName(t.edge)).join(', ')}">⇅</span>{/if}</div></td>
          <td>{pct(moverWin(c.blueWin, mover))}</td>
          <td>{c.lead !== undefined ? sideShort(c.lead) : "–"}</td><td>{c.visits}</td>
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
  <!-- A right-click, or a long press on a touch screen, anywhere in the move list opens the move menu (Bits UI's
       ContextMenu), not the browser's: on a branch's move with its actions, and elsewhere (the game's moves, the
       engine's line, a note) with each action off, since the game's line stays as it is and its moves are evaluated
       already. -->
  <ContextMenu.Root>
  <ContextMenu.Trigger>
  {#snippet child({ props })}
  <!-- A click on a move does not focus it (Lichess's moves take no focus): the keys move through the game from the page,
       and a move kept in focus would show the browser's focus ring once a key is pressed, and take Space for itself. -->
  <div {...props} class="movelist flex-1 min-h-0 overflow-y-auto pt-1.5 text-sm border-t border-line" bind:this={movelist}
       onpointerdowncapture={e => (menuPath = (e.target as Element).closest<HTMLElement>("[data-path]")?.dataset.path ?? null)}
       onmousedown={e => { if ((e.target as Element).closest("button")) e.preventDefault(); }}>
    {#each R.turns as t (t.number)}
      <!-- A turn's number, then its edges in two equal columns (Lichess's move list), each at least a move wide:
           with room to spare, the second edge starts halfway across. By turn, a last column judges the whole turn. -->
      <div class={["grid items-baseline gap-x-1", unit === "turn" ? "grid-cols-[2.2rem_repeat(2,minmax(max-content,1fr))_auto]"
                   : "grid-cols-[2.2rem_repeat(2,minmax(max-content,1fr))]"]}>
        <span class="text-muted tabular-nums">{t.number}.</span>
        {#each t.edges as e (e.index)}
          {@const after = R.blueScore[e.index + 1]}
          {@const judged = unit === "edge" && forSide(e.player) ? (e.label ? `${LABEL_TEXT[e.label]}: ${costText(e.rawLoss, e.rawPoints)}` : "Not analysed yet") : ""}
          {@const shown = forSide(e.player) ? e.label : null}
          <!-- A move fills its column. By edge, its label, the hard position's ◆ and its loss stand together at the
               column's right, as a turn's do at the turn's right, so that they line up down the list. The loss is
               last, where Lichess's move list has its evaluation: the mover's points lost, so that a number never needs
               a side to read. The lead after the move is in its note. The move's text has one width, so a column is never
               narrower than the widest move: the widest in the notation is 8 characters (D10-G10x), then by edge the
               label's slot (2.2 characters: a badge, or ?? as text). The loss: at most 5 characters (−1.2k), smaller and
               right-aligned. The font is monospaced, so ch is one character of the span's own size. Before the loss, by edge
               and by turn, a slot for a hard position's ◆ (design 14) on every row, marked or not: a mark never moves
               the label or widens the column. -->
          <button class={["mv flex items-baseline gap-1 px-[0.2rem] py-px font-mono text-[0.95em] text-left whitespace-nowrap bg-transparent border-0",
                          SIDE_TEXT[e.player], mainAt === e.index + 1 ? "here bg-panel-2 outline outline-accent"
                          : pickedKey === mainKeys[e.index + 1] ? PICKED : "hover:bg-panel-2 hover:outline hover:outline-line"]}
                  onclick={() => go(e.index + 1, true)} onmouseenter={() => startPreview({ kind: "move", index: e.index })} onmouseleave={endPreview} tabindex="-1"
                  title={[judged, after !== undefined ? `Lead: ${sideText(after, 1)}` : ""].filter(Boolean).join(" · ")}>
            {#if unit === "edge"}
              <span class="w-[8ch]">{moveNotation(e)}</span>
              <span class="w-[2.2ch] ml-auto">{#if listed(shown)}{@render mark(shown)}{/if}</span>
              <span class="w-[1.2ch] text-[0.8em] text-muted text-center" title={e.hard && forSide(e.player) ? HARD_NOTE : undefined}>{e.hard && forSide(e.player) ? "◆" : ""}</span>
              <span class="w-[5ch] text-[0.78em] text-right text-muted tabular-nums">{forSide(e.player) ? lossShort(e) : ""}</span>
            {:else}
              <span class="w-[8ch]">{moveNotation(e)}</span>
            {/if}
          </button>
        {/each}
        <!-- By turn: the turn's glyph and its loss, in the same font and sizes as an edge's by edge, and the turn's note
             with each edge's points. -->
        {#if unit === "turn" && forSide(t.player)}
          <span class="col-start-4 flex items-baseline gap-1 px-[0.2rem] py-px font-mono text-[0.95em] whitespace-nowrap {SIDE_TEXT[t.player]}"
                title={t.label ? `${LABEL_TEXT[t.label]}: ${turnCost(t)}` : "Not analysed yet"}>
            <span class="w-[2.2ch]">{#if listed(t.label)}{@render mark(t.label)}{/if}</span>
            <span class="w-[1.2ch] text-[0.8em] text-muted text-center" title={t.hard ? HARD_NOTE : undefined}>{t.hard ? "◆" : ""}</span>
            <span class="w-[5ch] ml-auto text-[0.78em] text-right text-muted tabular-nums">{lossShort(t)}</span>
          </span>
        {/if}
      </div>
      <!-- Under the turn, its notes and its branches in one band across the move list (Lichess's column view, its
           "interrupt"): a faint background and a rule above and below tie them to the turn, and they start at the
           list's left, so that a branch's row has the list's whole width. One line for each note, and a note said
           twice in a turn once (a turn of two Great edges). By turn, the turn's. Then the branches from the turn's
           positions, the lines from one position under one rule, and under a Mistake's or a Blunder's note, the
           engine's best line among them (turnGroups). -->
      {@const notes = !display.notes ? [] : unit === "turn" ? (t.label && COMMENTED.includes(t.label) && forSide(t.player) ? [turnShortNote(t)] : [])
        : [...new Set(t.edges.filter(e => !!e.label && COMMENTED.includes(e.label) && forSide(e.player)).map(shortNote))]}
      {@const groups = turnGroups(t)}
      {#if notes.length || groups.some(g => g.rows.length)}
        <div class="my-1 py-1 bg-panel-2/50 border-y border-line">
          {#each notes as note (note)}
            <div class="mb-0.5 px-2 text-sm text-muted truncate" title={note}>{note}</div>
          {/each}
          {#each groups as g, k (k)}{@render branchGroup(g.rows, g.engine)}{/each}
        </div>
      {/if}
    {/each}
  </div>
  {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content class="z-10 min-w-48 p-1 bg-panel-2 border border-muted/50 rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.4)] text-sm">
      <ContextMenu.Item disabled={!canPromote(menuPath)} onSelect={() => { if (menuPath) { used("branch promoted"); onpromote?.(menuPath.split(" ")); } }}
                        class={MENU_ITEM}>Promote variation</ContextMenu.Item>
      <ContextMenu.Item disabled={!menuPath || (turnKeys?.(menuPath.split(" ")) ?? [menuPath]).every(k => !!branches[k]?.judged)}
                        onSelect={() => { if (menuPath) { used("quality evaluated"); onjudge?.(menuPath.split(" ")); } }} class={MENU_ITEM}>Evaluate quality</ContextMenu.Item>
      <ContextMenu.Separator class="my-1 h-px bg-line" />
      <ContextMenu.Item disabled={!menuPath} onSelect={() => menuPath && deleteFrom(menuPath)} class={MENU_ITEM}>Delete from here</ContextMenu.Item>
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

<!-- A candidate's number: in a badge where the board draws the candidate (number 1 in the engine's colour), else plain.
     `drawn`: in a badge whatever the board shows. -->
{#snippet rankBadge(rank: number, title: string | undefined, cls = "", drawn = false)}
  <span class={["inline-flex items-center justify-center min-w-[1.3em] h-[1.3em] px-[0.2em] rounded-[0.3em] text-[0.8em] font-bold leading-none", cls,
                drawn || onBoard.has(rank) ? `${rank === 1 ? "bg-engine" : "bg-candidate"} text-on-badge` : "text-muted"]}
        {title}>{@render digits(rank)}</span>
{/snippet}

<!-- An edge of the listed line: a circle in its mover's colour with its number, as the board numbers the line (Go's
     way). Hollow when the edge is already in the tree: played in the game, or in a branch. -->
{#snippet edgeCircle(n: number, player: Player, hollow: boolean, cls: string)}
  <span class={["inline-flex items-center justify-center min-w-[1.55em] h-[1.55em] px-[0.15em] rounded-full font-sans text-[0.75em] font-bold leading-none",
                hollow ? `border-2 ${SIDE_BORDER[player]} ${SIDE_TEXT[player]}` : `text-white ${SIDE_BG[player]}`,
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

<!-- The branches in the move list from one position: their rows (tree.ts), indented by depth, and Lichess's tree beside
     them (its column view): a rule from the fork down to its last line, with a tick to each line, and the rules of a
     shallower fork passing the lines nested in it. Every turn has its number, as in the record. Without notation, an
     edge is a dot in its mover's colour (Go tools show a variation without names): the turn numbers place it, so the
     dots carry no numbers of their own. Where a branch forks again, its continuations follow, one step further in
     (Lichess's way inside a variation). Pointing at a move shows its row on the board up to that move (branchPreview). -->
{#snippet branchGroup(rows: BranchRow[], engine: EngineBranch | null)}
  {@const lines = treeLines(rows)}
  {@const engineStart = engine ? pathKey(engine.paths[0]) : null}
  {#each rows as row, r (r)}
    {@const rule = (depth: number) => `${depth - 0.55}rem`}
    <!-- A row of the engine's line gleams as the progress bars do while its position's search can still change it (the
         review's passes, the key moments searched deeper, or the position on screen): its first choice can change,
         and its line grows. -->
    {@const gleams = !!engine && row.paths.some(p => engine.steps.has(pathKey(p))) && !!pendingAt?.(engine.search)}
    <div class={["relative flex flex-wrap items-center gap-y-0.5 py-0.5 font-mono text-[0.95em]",
                 display.branchForm === "text" ? "gap-x-1" : "gap-x-0.5", gleams && "bar-glider"]}
         style:padding-left="calc({rule(row.depth)} + 0.65rem)">
      {#each lines[r].through as d (d)}
        <span class="absolute top-0 bottom-0 border-l-2 border-line" style:left={rule(d)} aria-hidden="true"></span>
      {/each}
      <span class={["absolute top-0 border-l-2 border-line", lines[r].last ? "h-[0.95em]" : "bottom-0"]}
            style:left={rule(row.depth)} aria-hidden="true"></span>
      <span class="absolute top-[0.95em] w-[0.5rem] border-t-2 border-line" style:left={rule(row.depth)} aria-hidden="true"></span>
      {#each row.paths as p, k (pathKey(p))}
        {@const node = branches[pathKey(p)]}
        {@const step = node ? null : engine?.steps.get(pathKey(p))}
        {#if pathKey(p) === engineStart}{@render rankBadge(1, "The engine's best line from here", "mr-0.5 font-sans", true)}{/if}
        {@const t = moveFrom(p.slice(0, -1))}
        {@const at = pathKey(p) === here}
        <!-- By turn, a turn's glyph after the move that ends it, once asked for (branchTurnAt). By edge, each edge's. -->
        {@const bt = unit === "turn" ? branchTurnAt(p) : null}
        {@const label = node && !forSide(node.move.player) ? null : unit === "edge" ? branchLabel(p) : bt?.judgment?.label ?? null}
        {@const waiting = unit === "edge" ? !!node?.judged && !label : !!bt && !bt.judgment}
        {#if node}
          {#if k === 0 || t.first}<span class={["text-muted text-[0.9em]", k > 0 && "ml-1"]}>{turnText(t)}</span>{/if}
          {#if display.branchForm === "text"}
            <button class={["mv px-[0.2rem] py-px bg-transparent border-0 whitespace-nowrap", SIDE_TEXT[node.move.player],
                            at ? "here bg-panel-2 outline outline-accent" : pickedKey === pathKey(p) ? PICKED
                            : "hover:bg-panel-2 hover:outline hover:outline-line"]}
                    onclick={() => setPath(p, true)} onmouseenter={() => startPreview({ kind: "branch", row: row.paths, k })} onmouseleave={endPreview} tabindex="-1"
                    data-path={pathKey(p)} title={label ? LABEL_TEXT[label] : waiting ? "Evaluating…" : undefined}>{moveNotation(node.move)}</button>
          {:else}
            <button class={["mv flex p-[0.08em] bg-transparent border-0 rounded-full",
                            at ? "here outline-2 outline-accent" : pickedKey === pathKey(p) ? PICKED : "hover:outline hover:outline-ink"]}
                    onclick={() => setPath(p, true)} onmouseenter={() => startPreview({ kind: "branch", row: row.paths, k })} onmouseleave={endPreview} tabindex="-1"
                    data-path={pathKey(p)} title="{turnText(t)} {moveNotation(node.move)}{label ? ` · ${LABEL_TEXT[label]}` : waiting ? ' · evaluating…' : ''}">
              {#if display.branchForm === "pills"}{@render edgePill(node.move.edge, node.move.player, false, null, "")}
              {:else}<span class={["block w-[0.85em] h-[0.85em] rounded-full", SIDE_BG[node.move.player]]}></span>{/if}
            </button>
          {/if}
          {#if listed(label)}<span class="-ml-0.5 text-[0.9em]">{@render mark(label)}</span>
          {:else if waiting}<span class="-ml-0.5 text-[0.9em] text-muted animate-pulse motion-reduce:animate-none" title="Evaluating…">…</span>{/if}
        {:else if engine && step}
          {@render engineEdge(engine, p, step, k)}
        {/if}
      {/each}
    </div>
  {/each}
{/snippet}

<!-- An edge of the engine's best line that the player has not played (engineBranch): after candidate 1's badge, as a
     branch's edge, a little faded, so that it reads as the engine's and the player's own edges as theirs. It is not
     kept, and follows the search. Pointing at it previews the line up to it on the board, and a click plays the line up
     to there as a branch (as the listed line's click does), which then shows here as the player's own. -->
{#snippet engineEdge(engine: EngineBranch, p: string[], step: EngineStep, k: number)}
  {@const e = engine.line[step.k]}
  {@const note = `${turnText(step.turn)} ${edgeName(e)} · the engine's line · play it to here`}
  {#if k === 0 || step.turn.first}<span class={["text-muted text-[0.9em]", k > 0 && "ml-1"]}>{turnText(step.turn)}</span>{/if}
  {#if display.branchForm === "text"}
    <button class={["mv px-[0.2rem] py-px bg-transparent border-0 whitespace-nowrap opacity-75 hover:opacity-100 hover:bg-panel-2", SIDE_TEXT[step.mover]]}
            onclick={() => { used("engine line played"); playPath(p); }} onmouseenter={() => startPreview({ kind: "engine", start: engine.start, line: engine.line, k: step.k })}
            onmouseleave={endPreview} tabindex="-1" title={note}>{edgeName(e)}</button>
  {:else}
    <button class="mv flex p-[0.08em] bg-transparent border-0 rounded-full opacity-75 hover:opacity-100 hover:outline hover:outline-ink"
            onclick={() => { used("engine line played"); playPath(p); }} onmouseenter={() => startPreview({ kind: "engine", start: engine.start, line: engine.line, k: step.k })}
            onmouseleave={endPreview} tabindex="-1" title={note}>
      {#if display.branchForm === "pills"}{@render edgePill(e, step.mover, false, null, "")}
      {:else}<span class={["block w-[0.85em] h-[0.85em] rounded-full", SIDE_BG[step.mover]]}></span>{/if}
    </button>
  {/if}
{/snippet}

<!-- The engine's line under the table: the candidate's badge, then its edges. Pointing at an edge draws the line up to
     it on the board, and a click plays the line up to it as a branch. The edges already in the tree (the game's own
     moves or a branch's) show as such, since a click goes along them and the branch starts after them. -->
{#snippet lineList()}
  <div class="flex-none h-[3.6em] mb-2 overflow-y-auto text-sm" role="group" aria-label="The engine's line"
       onmouseleave={() => (listHover = null)}>
    {#if listLine}
      <div class={["flex flex-wrap items-center gap-y-0.5", display.branchForm === "text" ? "gap-x-1" : "gap-x-0.5"]}>
        {@render rankBadge(listRank, `The engine's line from candidate ${listRank}`, "mr-1")}
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
      <h3 class={SETTINGS_HEAD}>Review</h3>
      {@render choice("Review by", "Each turn as a whole, or each edge: the labels, the move list's numbers, the counts and the chart. A turn's note gives its edges' points.",
        [["turn", "Turn"], ["edge", "Edge"]], () => display.judge, v => (display.judge = v as Display["judge"]))}
      {@render choice("Review for", "Both players, or one: the labels, numbers, notes and the engine's lines of that player's moves. The counts keep both.",
        [["both", "Both"], ["blue", "Blue"], ["red", "Red"]], () => display.reviewFor, v => (display.reviewFor = v as Display["reviewFor"]))}
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
      {@render choice("Move labels", "Each label as a badge, as in the report and on the board, or as its mark in the label's colour.",
        [["badges", "Badges"], ["text", "Text"]], () => display.marks, v => (display.marks = v as Display["marks"]))}
      {@render toggle("Notes on the key moves", "A line under each Great, Mistake and Blunder.",
        () => display.notes, v => (display.notes = v))}
      {@render toggle("Preview played moves", "Pointing at a move of the game shows the position after it on the board.",
        () => display.previewMoves, v => (display.previewMoves = v))}
      {@render toggle("Preview branches", "Pointing at a branch's move draws its row on the board, as the engine's line.",
        () => display.previewBranches, v => (display.previewBranches = v))}
      {@render choice("Branches and lines", "Each edge as a pill along its direction, a dot, or its notation. In the engine's line, the pills and dots carry the board's numbers.",
        [["pills", "Pills"], ["dots", "Dots"], ["text", "Notation"]], () => display.branchForm,
        v => (display.branchForm = v as Display["branchForm"]))}
      <h3 class={SETTINGS_HEAD}>Sound</h3>
      {@render toggle("Move sounds", "A sound for each edge played or stepped through.",
        () => display.sound, v => (display.sound = v))}
      {#if SOUND_CHOICES.length > 1}
        {@render choice("Sound", "The sound of a move.", SOUND_CHOICES, () => display.moveSound,
          v => { display.moveSound = v as Display["moveSound"]; if (display.sound) void playMove(display.volume, display.moveSound); })}
      {/if}
      <div class="flex items-center justify-between gap-3 py-1.5">
        <label for="setting-volume" class={["text-sm font-medium", !display.sound && "text-muted"]}>Volume</label>
        <input id="setting-volume" type="range" min="0" max="1" step="0.05" bind:value={display.volume} disabled={!display.sound}
               onchange={() => playMove(display.volume, display.moveSound)}
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
      {@render toggle("Score line", "Shown when a review opens: the score difference after each edge, above the middle when Blue leads. Its box under the chart shows or hides it for the moment.",
        () => display.scoreLine, v => (display.scoreLine = v))}
      {@render toggle("Area line", "Shown when a review opens: the difference of the areas each player encloses, above the middle when Blue's is larger. Its box under the chart shows or hides it for the moment.",
        () => display.areaLine, v => (display.areaLine = v))}
    </div>
  </div>
{/snippet}

<!-- The engine's settings (design 09), grouped by what they search: the position on screen, the game's review, and the
     engine itself. Each has one short line of help. A value in steps is a slider, as in Lichess's engine settings. -->
{#snippet engineSettingsPanel(e: EngineSettings, set: (change: Partial<EngineSettings>) => void)}
  <div id="engine-settings" role="region" aria-label="Engine settings" class="flex flex-col flex-1 min-h-0">
    <h2 class="font-semibold mb-1">Engine settings</h2>
    <div class="flex-1 min-h-0 overflow-y-auto pr-1">
      {#if ownSettings}
        <p class="mb-1.5 text-xs text-muted">This game keeps the network and depth per move it came with, from a review file or
          a shared link, so that its review is the one it came with. A change of them here changes this game's only.</p>
      {/if}
      <h3 class={SETTINGS_HEAD}>Position on screen</h3>
      {@render visitsSteps("Depth", "How far to search it. Deeper than the review, it also updates the review there: the labels and the report.",
        DEPTHS, () => e.visits, v => set({ visits: v }))}
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
      {@render choice("Network", `Lite has ${NETWORKS[0].params} parameters, the other ${NETWORKS[1].params}: stronger per visit but about 3× slower. A change reviews the game again. A network downloads once, and the browser keeps it.`,
        NETWORKS.map(n => [n.id, networkLabel(n.id)]), () => e.network, v => set({ network: v }))}
      {@render steps("Workers", "Positions searched at the same time. Each worker uses more of your computer's memory: mind how much it has.", maxWorkers(),
        () => e.workers - 1, k => set({ workers: k + 1 }), k => `${k + 1} of ${maxWorkers()}`)}
      {@render choice("GPU", `Many positions at once on the graphics card, with the workers. Auto tests it on first use, and keeps it where it is faster than a worker. Its first use downloads ${gpu?.downloadMB ?? "?"} MB. While it searches, it uses more memory, as the workers do.`,
        [["auto", "Auto"], ["on", "On"], ["off", "Off"]], () => e.gpu, v => set({ gpu: v as GpuMode }))}
      {#if gpu && gpuStatusText(gpu.status)}
        <p class="-mt-1 mb-1 text-xs text-muted" aria-live="polite">{gpuStatusText(gpu.status)}</p>
      {/if}
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
  {@const id = settingId(label)}
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
  {@const id = settingId(label)}
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
<!-- A line of the Advantage chart that the reader can show or hide, in the chart's legend: its box, its colour, its name. -->
{#snippet lineBox(name: string, swatch: string, tint: string, get: () => boolean, set: (v: boolean) => void)}
  <label class="inline-flex items-center gap-1 cursor-pointer select-none">
    <input type="checkbox" class="size-3 m-0 flex-none cursor-pointer {tint}" checked={get()} onchange={e => set(e.currentTarget.checked)} />
    <span class="inline-block w-[1.2em] h-0.5 {swatch}"></span> {name}
  </label>
{/snippet}

{#snippet toggle(label: string, help: string, get: () => boolean, set: (v: boolean) => void)}
  {@const id = settingId(label)}
  <div class="flex items-start justify-between gap-3 py-1.5">
    <div class="min-w-0">
      <label for={id} class="text-sm font-medium cursor-pointer">{label}</label>
      <p class="text-xs text-muted">{help}</p>
    </div>
    <Switch.Root {id} checked={get()} onCheckedChange={set} class="{SWITCH} mt-0.5">
      <Switch.Thumb class={SWITCH_THUMB} />
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

<!-- The page's text is a tool's, not a document's: it takes no selection, so the pointer stays an arrow over it. An
     engine error can be selected, to be copied. -->
<main class={["review select-none", wide.current && "wide", display.win === "gauge" && "gauge-mode"]} style:--side-h={sideHeight ? `${sideHeight}px` : undefined}
      style:--strip={stripHeight ? `calc(${stripHeight}px + 0.5rem)` : null}>
  {#if wide.current}
    <aside class="summary-col {PANEL} flex flex-col overflow-y-auto">
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
          lastTurn={branchPreview || movePreview ? [] : endedTurn ? endedTurn.edges.flatMap(e => (e.edge ? [e.edge] : []))
            : unit === "turn" && mainAt === null ? (branchTurnPaths(path) ?? []).flatMap(q => { const e = moveInto(q)?.edge; return e ? [e] : []; }) : []}
          cut={branchPreview ? null : movePreview ? movePreview.move.cut : lastPlayed?.cut ?? null}
          candidates={previewing ? [] : candidates}
          highlight={previewing ? null : hover ?? pinnedCandidate?.edge ?? null}
          line={branchPreview ? previewLine : movePreview ? null : drawnLine}
          oncandidateclick={selectRank}
          oncandidatedblclick={e => { used("candidate played"); playPath([...path, edgeName(e)]); }}
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
          notes={previewing ? [] : notesAt[here] ?? []}
          onnotes={previewing ? undefined : n => { if (n.length > (notesAt[here]?.length ?? 0)) used("note drawn"); notesAt[here] = n; }}
        />
      </div>
    </div>
    <div class="chart-area flex flex-col ml-(--gauge-w)">{@render charts()}</div>
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
          <Switch.Root checked={engine.on} onCheckedChange={v => set({ on: v })} aria-label="Engine" title="Engine on or off"
                       class={SWITCH}>
            <Switch.Thumb class={SWITCH_THUMB} />
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
          <!-- Who is ahead, with the side named, as everywhere on the page. -->
          Expected final margin
          <strong class="text-ink">{sideText(analysis.margin!, 0, "0")} ± {Math.round(analysis.spread!)}</strong>
          · lead {sideText(analysis.lead, 0, "0")}
          <!-- The mark alone, as in the move list: a word would wrap the line and move the table below it. -->
          {#if hardHere !== undefined}· <span class="text-ink" title={HARD_NOTE}>◆<span class="sr-only"> A hard
            position</span></span>{/if}
        {:else if over}
          Final margin <strong class="text-ink">{sideText(position.scores[0] - position.scores[1], 1, "0")}</strong>
        {:else}Not analysed yet{/if}
      </p>
      {#if meter && !engineOpen}
        <!-- The network's likely edges here (design 14), as Maia's Blunder Meter shows a human's likely moves: the prior
             of the searched edges by the group of their loss, in the labels' colours. The rest of the bar, the panel's
             grey, is the prior of the edges the search did not visit. The engine settings cover it: it says nothing
             about them. -->
        <div class="flex h-1.5 mt-1 rounded-full overflow-hidden bg-panel-2" role="img" aria-label={meterText(meter)} title={meterText(meter)}>
          {#each METER_GROUPS as g (g)}<span class="h-full" style:width="{100 * meter[g]}%" style:background="var(--{g}-fill)"></span>{/each}
        </div>
      {/if}
    </div>
    {#if engineOpen && engine && onengine}
      {@render engineSettingsPanel(engine, onengine)}
    {:else if wide.current}
      <div class="flex flex-col flex-1 min-h-0 overflow-hidden">{@render analysisView()}</div>
    {:else}
      <!-- Below 1,260 pixels the Report and the Analysis share this column, as tabs. Bits UI gives them the tab
           roles, the arrow keys and the focus. -->
      <Tabs.Root value={stage} onValueChange={v => (stage = v as Stage)} class="flex flex-col flex-1 min-h-0">
        <Tabs.List class="flex gap-1 mb-2">
          <Tabs.Trigger value="highlights" class={TAB}>Report</Tabs.Trigger>
          <Tabs.Trigger value="analysis" class={TAB}>Analysis</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="highlights" class="flex flex-col flex-1 min-h-0 overflow-y-auto">{@render highlights()}</Tabs.Content>
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
        <div class="flex items-center gap-1">
          <!-- Export (design 13): the review file, with the engine's results, or the annotated record. -->
          {#if onexport}<ExportMenu run={kind => onexport(kind, display.judge)} ready={exportReady} why="Export once the review is done." {partner} />{/if}
          <!-- The menu button (Lichess's ☰ in the same place) opens the display settings in the analysis's place, and
               closes them. The gear is the engine's, in the engine header. -->
          <button class="aria-expanded:border-accent aria-expanded:text-accent" aria-label="Display settings" title="Display settings"
                  aria-expanded={settingsOpen} aria-controls="display-settings"
                  onclick={() => { settingsOpen = !settingsOpen; engineOpen = false; }}>☰</button>
        </div>
      </div>
    </div>
  </section>

  <!-- Why the review runs again (ReviewAgain): a dialog when the review starts, once in a visit. The line under the
       progress says it while the review runs. -->
  <Dialog.Root bind:open={againOpen}>
    <Dialog.Portal>
      <Dialog.Overlay class="fixed inset-0 z-20 bg-[rgb(0_0_0/0.45)]" />
      <Dialog.Content class="fixed z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(94vw,28rem)]
                             px-5 py-4 bg-panel-2 border border-muted/50 rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.4)]">
        <Dialog.Title class="mb-2 font-semibold">{again?.title}</Dialog.Title>
        <Dialog.Description class="text-sm">
          <p>{again?.body}</p>
          <p class="mt-2 text-muted">The site keeps each result with the engine that found it. The new engine searches each
            position again, which takes about as long as the first review, and the labels can change a little.</p>
        </Dialog.Description>
        <div class="flex justify-end mt-4"><Dialog.Close class="btn-primary px-4 py-1 text-sm">OK</Dialog.Close></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>

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
        <table class={HELP_TABLE}>
          <tbody>
            {#each KEYS as [keys, what] (what)}
              <tr>
                <td class="pr-3 w-[45%]"><span class="flex flex-wrap gap-1">{#each keys as k (k)}<kbd class={KBD}>{k}</kbd>{/each}</span></td>
                <td>{what}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <table class="{HELP_TABLE} mt-3">
          <tbody>
            {#each MOUSE as [how, what] (how)}
              <tr><td class="pr-3 w-[45%] text-muted">{how}</td><td>{what}</td></tr>
            {/each}
          </tbody>
        </table>
        <!-- The notes' colours and the keys held while drawing, each with its colour's stroke -->
        <h3 class="mt-3 mb-1 text-sm font-semibold">Note colours</h3>
        <table class={HELP_TABLE}>
          <tbody>
            {#each BRUSH_KEYS as [brush, keys] (brush)}
              <tr>
                <td class="pr-3 w-[45%]"><span class="inline-flex items-center gap-2"><span class="inline-block w-5 h-1 rounded-full"
                  style:background="var(--note-{brush})"></span>{brush[0].toUpperCase() + brush.slice(1)}</span></td>
                <td>{#if !keys.length}<span class="text-muted">No key</span>{:else}<span class="flex flex-wrap items-center gap-1">
                  <!-- Keys held together joined by +, a group's other keys by "or", in brackets beside another group -->
                  {#each keys as group, g (g)}{#if g}<span class="text-muted">+</span>{/if}{#if keys.length > 1 && group.length > 1}<span
                    class="text-muted">(</span>{/if}{#each group as k, i (k)}{#if i}<span class="text-muted">or</span>{/if}<kbd
                    class={KBD}>{k}</kbd>{/each}{#if keys.length > 1 && group.length > 1}<span class="text-muted">)</span>{/if}{/each}</span>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>

</main>

<style>
  /* Design 06. The board's size is the smaller of the window's height (less the site's header, the bar above the
     board and a margin) and the width left after the other columns at their least (Lichess's uniboard). The columns:
     Lichess's side column (250 to 350 pixels) and an analysis column wider than its 240 to 400, for the five-column
     candidates table. The rest of the page's styles are Tailwind classes in the markup. */
  .review {
    --gap: 1.25rem;
    --row-gap: 0.8rem;
    --strip: 2.1rem; /* the row above the board, with its margin: its one-line height until the page measures it */
    --gauge-w: 0px;
    --summary-min: 250px;
    --summary-max: 350px;
    --side-min: 340px;
    --side-max: 460px;
    --others: calc(var(--side-min) + var(--gap));
    /* The height and the width the board could have, then the charts' area under it: at least --chart-min, and what
       the width leaves of the height, up to --chart-max. The board then takes the rest of the height, or its width. */
    --tall: calc(100vh - var(--site-header) - var(--strip) - 2rem);
    --broad: calc(100vw - var(--others) - var(--gauge-w) - 2rem - 20px); /* the page's padding and a scroll bar */
    --chart-min: 6rem;
    --chart-max: 12rem;
    --chart-gap: 0.5rem;
    --chart: clamp(var(--chart-min), calc(var(--tall) - var(--chart-gap) - var(--broad)), var(--chart-max));
    --board: min(calc(var(--tall) - var(--chart-gap) - var(--chart)), var(--broad));
    --column: calc(var(--strip) + var(--board) + var(--chart-gap) + var(--chart));
    display: grid;
    grid-template-columns: calc(var(--board) + var(--gauge-w)) minmax(var(--side-min), var(--side-max));
    grid-template-areas: "board side";
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
    grid-template-areas: "summary board side";
  }
  .summary-col { grid-area: summary; max-height: var(--column); }
  .board-col { grid-area: board; }
  .board-wrap { width: var(--board); flex: none; }
  .chart-area { height: var(--chart); margin-top: var(--chart-gap); }
  /* The analysis column is as high as the board's column; the move list takes what is left. */
  .side { grid-area: side; height: var(--column); }
  /* The side columns are as high as --side-h (set in the script): to the window's bottom, from the board's bottom edge
     at least. Their height is set, so they do not make the row taller. */
  @media (min-width: 800px) {
    .review .side, .review .summary-col { height: var(--side-h, var(--column)); max-height: none; }
  }
  /* One column below 800 pixels (Lichess's $small): the board as wide as the window, then the analysis. */
  @media (max-width: 799px) {
    .review, .review.wide {
      --board: calc(100vw - 2rem - var(--gauge-w));
      --chart: 8rem;
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: "board" "side";
    }
    .side { height: auto; }
    .movelist { max-height: 22rem; }
    .board-wrap { width: auto; flex: 1; min-width: 0; } /* the column's width, whatever the scroll bar takes */
  }
</style>
