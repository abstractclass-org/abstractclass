<script lang="ts" module>
  import Swatch from "#lib/ui/Swatch.svelte";
  import PlayerCard, { AREA_DOT, playerBox, playerName, playerNumbers, stripBox, stripRow } from "./PlayerCard.svelte";
  import PlayerRow from "./PlayerRow.svelte";
  import PlayerCardSkeleton, { BONE } from "./PlayerCardSkeleton.svelte";
  import ShareBar from "#lib/ui/ShareBar.svelte";
  import Icon from "#lib/ui/Icon.svelte";
  import StepBar from "#lib/ui/StepBar.svelte";
  import { intoView, pageScrollTop } from "#lib/pageScroll.ts";
  import { MOVE_HERE, MOVE_HOVER, MOVE_LIST, MOVE_TEXT, TURN_NUMBER, TURN_REM, keepInView, moveButton, turnRow } from "./moveList.ts";
  import { PLAYER_NAME, chartMarks, listed, type Analysis, type BranchNode, type Edge, type LineStep, type Player, type Position } from "./enclosure.ts";
  import type { EdgeRules } from "#lib/board/edgeInput.svelte.ts";
  import type { MapState, ThreatCost, ThreatState } from "@abstractclass/analysis/analysis.svelte.ts";

  /** The review in progress: what the engine does now, and the passes as parts of one bar, each with its share of the
   *  work (by visits) and how much of it is done (0 to 1). `waiting`: no work runs (the engine is off). `maps`: the
   *  review is done, and the bar shows the map pass alone (design 30): the review's counts are final. */
  export interface ReviewProgress { text: string; parts: { share: number; done: number }[]; waiting?: boolean; maps?: boolean }
  /** Why a game reviewed before is reviewed again: the engine or its network was updated (store.ts, reviewAgainWhy).
   *  `text` shows under the progress. The dialog, with `title` and `body`, says it once when `dialog` is set. */
  export interface ReviewAgain { title: string; text: string; body: string; dialog: boolean }
  /** A review by an earlier engine shown as it was (design 20): `text` says when and with what, and `onagain` reviews
   *  the game with the site's engine. Until then nothing is searched, and no move or branch changes. */
  export interface ReviewSnapshot { text: string; onagain: () => void }
  /** The Analysis board's form of the view (design 21): its main line's moves evaluated on request, by path key, and
   *  "Make main line". No report, no chart, no progress: the review's columns give way to the board and its moves. */
  export interface BoardForm { judged: Record<string, true>; onmain: (path: string[]) => void }
  /** The analysis behind the view (GameAnalysis): its branches, an engine error, the position searched for the player,
   *  the rules and the results the view asks for, and the changes of the tree. */
  export interface ReviewGame {
    error: string;
    branches: Record<string, BranchNode>; // the branches' positions, by path key (tree.ts), in the order added
    focusing: string | null; // the path key of the position searched for the player, while it runs
    engineReady: boolean; // the engine's network is loaded: the searches can start
    rulesAt(path: string[]): Promise<EdgeRules>; // a position's legal edges and mover's nodes, for the player's moves
    secondAt(path: string[]): Analysis | undefined; // the position after the engine's second choice, which confirms a Great
    otherAt(path: string[], turn: (Edge | null)[]): Analysis | undefined; // the same for a turn
    earlierAt(path: string[], mover: Player): Analysis | undefined; // before the opponent's last turn, which a Great must gain on
    awaitsGreat(key: string): boolean; // the move into this path key waits for the searches of its Great
    turnKeys(path: string[]): string[]; // the branch moves that evaluating this move's quality judges
    pending(path: string[]): boolean; // the review's own searches can still change this position's analysis
    stoppedByTime(path: string[]): boolean; // the position's search stopped at its time limit
    lineSteps(path: string[], line: Edge[]): Promise<LineStep[]>; // a line's edges played: cuts, regions (the rules)
    deleteFrom(path: string[]): Promise<void>; // deletes a branch node and what follows it
    promote(path: string[]): Promise<void>; // promotes a branch one step among the branches from its fork
    judge(path: string[]): Promise<void>; // evaluates a branch move's quality: searches its two positions
    mapAt(path: string[]): number[] | undefined; // a position's ownership: its result's, or the map added to it (design 30)
    hasNoMap(path: string[]): boolean; // the position gets no map: the engine did not search it (the game ends there)
    // The state of a position's map: there, its search runs, it waits for the engine, none can come, or none is asked
    mapState(path: string[]): MapState;
    passMaps(on: boolean, from: string[]): void; // the map pass: the game's missing maps while the map is on (design 30)
    labelled: number; // the positions that the label pass has searched
    passCount: number; // the positions that the review's passes search
    // Adds a map to these positions where they have none, in their order: of the tree, or of a line from it
    askOwnership(paths: string[][]): void;
    // The threat (Lichess's "Show threat"): the search of the position after a pass by the side to move here, or none
    askThreat(path: string[] | null): void;
    threatAt(path: string[]): Analysis | undefined; // the analysis of the position after the pass
    passedAt(path: string[]): Position | undefined; // the position after the pass, from the rules
    threatState(path: string[]): ThreatState; // its search runs, waits, is done, or cannot come
    // What the pass costs the side to move, against the position's result with the threat's settings
    threatCost(path: string[]): ThreatCost | undefined;
  }

  // The numbers' formats, made once: a formatter is costly to make, and the move list and the tables format many numbers
  // at each result.
  const WHOLE = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
  const ONE_DIGIT = new Intl.NumberFormat("en", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  /** Points in at most 5 characters: "105", or "1.2k" from 1,000 on. */
  const shortPoints = (a: number) => (a >= 999.5 ? `${(a / 1000).toFixed(1)}k` : `${Math.round(a)}`);

  /** Three columns from Lichess's width for them (its $x-large, 1,260 pixels): the summary gets its own column, and the
   *  Report is no longer a tab. */
  export const WIDE = "min-width: 1260px";
  /** One column below 800 pixels (Lichess's $small), as the style below has it: the analysis under the board. */
  const ONE_COLUMN = "(max-width: 799px)";
  const PANEL = "min-w-0 px-4 py-3 bg-panel border border-line rounded-md";
  /** The note under the progress while the review has work to run (design 06, item 7): a browser gives a hidden tab's
   *  processes the lowest priority (Chromium on Windows: the Idle class and power throttling), so a review there can be
   *  slower when other programs use the processor (decisions/product.md, "A review in a hidden tab"). Text that a
   *  player follows: strict Simplified Technical English. The title says why. Where the line is cut, as with a larger
   *  text size, the title gives the line in full before the reason (hiddenTabCut). */
  const HIDDEN_TAB = { text: "A review in a hidden tab can be slower.",
                       title: "When you cannot see this tab, the browser can give the review less processor time." };
  /** The words while the engine's network loads (design 06, item 7): the review's line and the engine header's line say
   *  the same. Text that a player follows: strict Simplified Technical English. */
  export const NETWORK_LOADS = "Loading the engine's network…";
  export { reviewSkeleton };

  /** The skeleton's row above the board sets --strip, as the review's row does (stripHeight): the board's size takes
   *  the row's height from the window's. */
  function measureStrip(main: HTMLElement) {
    const row = main.querySelector<HTMLElement>("[data-strip]");
    if (!row) return;
    const watch = new ResizeObserver(() => main.style.setProperty("--strip", `calc(${row.offsetHeight}px + 0.5rem)`));
    watch.observe(row);
    return () => watch.disconnect();
  }
</script>

<script lang="ts">
  // The review of one game (docs/research/01-ux-survey.md, section 8): a Report (chess.com's Highlights) and free analysis
  // (Lichess). Learning from the mistakes is to come back as a mode of the analysis (decisions/open-items.md). The
  // review may be partial while the engine works: an edge with no label yet shows none. The layout is design 06 (docs/design/06-review-layout.md): the board fills the window's height,
  // with the summary on its left from 1,260 pixels (Lichess's three columns), and the analysis on its right.
  import { ContextMenu, Dialog, Switch, Tabs } from "bits-ui";
  import { untrack, type ComponentProps, type Snippet } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";
  import { CUSTOM_REVIEW, DEPTHS, NETWORKS, REVIEW_PRESETS, networkMB, networkName, offersNetwork, TIME_LIMITS, maxWorkers,
           nearestStep, type EngineSettings, type GpuMode, type OwnSettings, type ReviewDepth }
    from "#lib/analysis/engineSettings.ts";
  import { gpuStatusText, type GpuStatus } from "@abstractclass/analysis/gpu.svelte.ts";
  import Board, { type BoardCandidate, type BoardLineEdge, type BoardMark } from "#lib/board/Board.svelte";
  import { BRUSH_KEYS, type BoardNote } from "#lib/board/notes.ts";
  import { EdgeInput } from "#lib/board/edgeInput.svelte.ts";
  import { parseEdge } from "#lib/engine/notation.ts";
  import { SIDE_BG, SIDE_BORDER, SIDE_TEXT } from "#lib/ui/side.ts";
  import AdvantageChart from "./AdvantageChart.svelte";
  import DifficultyChart from "./DifficultyChart.svelte";
  import { loadDisplay, saveDisplay, type Display } from "./display.ts";
  import { askOrder, changeMap, differenceMap, differenceReading, drawnBoard, mapStep, occupancy, ownershipMap, pointReading,
           valueText } from "./ownership.ts";
  import { pointName } from "#lib/engine/notation.ts";
  import { playMove, preload } from "#lib/sound.ts";
  import SettingChoice from "#lib/ui/SettingChoice.svelte";
  import SettingToggle from "#lib/ui/SettingToggle.svelte";
  import SoundSettings from "#lib/ui/SoundSettings.svelte";
  import { SETTINGS_HEAD, SWITCH, SWITCH_THUMB, settingId } from "#lib/ui/settings.ts";
  import ExportMenu from "#lib/ExportMenu.svelte";
  import type { ExportItem, ExportKind, ExportResult } from "#lib/game/reviewFile.ts";
  import Glyph from "./Glyph.svelte";
  import LabelBadge from "./LabelBadge.svelte";
  import { LINE_STEP_MS, LineDrawing } from "./lineDrawing.svelte.ts";
  import BookTable from "#lib/book/BookTable.svelte";
  import { BookPlace, siteBook } from "#lib/book/place.svelte.ts";
  import type { GameMove } from "#lib/book/rows.ts";
  import { bestMoveSentence, moveSentence } from "#lib/book/sentences.ts";
  import { EARLY_ACCESS } from "#lib/edition.ts";
  import { imageCaption, imageLine, imageName, lineFrames } from "./lineImage.ts";
  import { animatedBoardImage, boardImage, copyPng } from "#lib/board/boardImage.ts";
  import { download } from "#lib/game/reviewFile.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import Toast from "#lib/ui/Toast.svelte";
  import {
    edgeName, endingText, fmtScore, moveName, moveNotation, opensTurn, turnFromCount, sameEdge, shortNote, turnShortNote, HARD_NOTE, complexity, isHard, turnComplexity, likelyEdges, HARD, METER_GROUPS, turnCost, judgeTurn, judgeBranchEdge, valuesAfter, resultWin, moverWin, costText, pct, shownCandidates, distinctCandidates, rankOf, twinsOf, lineMovers, threatTurn, enoughVisits, trustedLine, type Candidate, type EdgeReview, LABELS, LABEL_TEXT, LABEL_GLYPH, type Label, type Review, type Unit, type Move, type TurnJudgment, type TurnReview,
  } from "./enclosure.ts";
  import { branchChildren, branchLine, branchRows, mainIndex, nextFork, pathKey, prefixKeys, prevFork, sharedLength, siblingLine, treeLines, withLine,
           type BranchRow } from "@abstractclass/analysis/tree.ts";

  interface Props {
    R: Review;
    progress?: ReviewProgress | null; // the review in progress, or null when it is complete
    game?: ReviewGame; // the analysis behind the view
    deepVisits?: number; // the budget of the position on screen: its search bar is full at this many visits
    deeperPositions?: number; // positions with a result deeper than the review's: by the Depth, or an older review
    again?: ReviewAgain | null; // why a game reviewed before is reviewed again, when the site's engine changed
    snapshot?: ReviewSnapshot | null; // a review by an earlier engine, shown as it was (design 20)
    board?: BoardForm | null; // the Analysis board (design 21)
    start?: string[]; // the position to open at: its path (the start when none)
    exportItems?: ExportItem[]; // the Export menu's entries (reviewFile.ts, reviewExports)
    tools?: Snippet; // the Analysis board's New menu, beside Export (design 21)
    siteLink?: { href: string; host: string } | null; // the game's own page, from its record's Site tag
    ownSettings?: OwnSettings["from"]; // the game keeps its own network and depth, and where from (engineSettings.ts)
    onfeature?: (name: string) => void; // a feature used (design 17): the page counts its first use in each review
    onposition?: (path: string[]) => void; // the position on screen changed: its path in the game's tree
    onplay?: (path: string[]) => Promise<void>; // adds a line from the start to the tree
    reviewVisits?: number; // the review's depth: a position searched less is a first estimate on the chart
    labelVisits?: number; // the label budget: a move is judged once both its positions have this many visits
    engine?: EngineSettings; // the engine's settings (design 09), shown in the settings panel
    onengine?: (change: Partial<EngineSettings>) => void; // a setting changed in the panel
    gpu?: { status: GpuStatus; downloadMB: string }; // what the GPU does in this review, and its first download (design 15)
    // Exports the review (design 13): the review file, or the annotated record copied or as a file, labelled by `unit`
    onexport?: (kind: ExportKind, unit: Unit) => Promise<ExportResult | void>;
    exportReady?: boolean; // the review is done: export only then (design 13)
  }
  let { R, progress = null, game, deepVisits = 0, onposition, onplay, labelVisits = 0, engine, onengine, gpu, reviewVisits = 0, onexport,
        exportReady = true, deeperPositions = 0, again = null, snapshot = null, board = null, start, exportItems, tools: pageTools, siteLink = null,
        ownSettings, onfeature }: Props = $props();
  const branches = $derived(game?.branches ?? {});
  const used = (name: string) => onfeature?.(name);
  const last = $derived(R.data.positions.length - 1);
  const TABLE_ROWS = 5; // the Analysis table shows this many rows and scrolls, so the move list under it does not move
  const ROW_EM = 1.9; // a table row's height, in em
  // Class lists used in several places.
  // A label's badge in the text. Its mark is 56% of the circle, as on the board (0.4 in 0.72), and bold, not extra bold,
  // because small text in heavy weights runs together.
  const MENU_ITEM = "menu-item data-disabled:opacity-50 data-disabled:cursor-default";
  const TAB = "flex-1 bg-transparent border-transparent border-b-2 border-b-line rounded-none data-[state=active]:border-b-accent data-[state=active]:font-semibold";

  type Stage = "highlights" | "analysis";
  let stage = $state<Stage>("highlights");
  // The place on screen: a path in the game's tree (tree.ts), the game's own moves or a branch (design 07).
  let path = $state<string[]>(untrack(() => start ?? []));
  let hover = $state<Edge | null>(null);
  const wide = new MediaQuery(WIDE);
  const threeCols = $derived(wide.current && !board); // the summary column: the review's
  const tabbed = $derived(!wide.current && !board); // the review's Report and Analysis as tabs, below 1,260 pixels
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
  // The labels of the player chosen in "Review for". The board labels the moves the player asked for, on both sides.
  const forSide = (p: Player) => !!board || display.reviewFor === "both" || (display.reviewFor === "blue") === (p === 0);
  let settingsOpen = $state(false);
  // The engine's settings (design 09) open under the engine header, from its gear, as Lichess's open from the gear in
  // its engine box: the header's values and its search bar stay in view while they change. The display settings take the
  // header's place, so one panel shows at a time.
  let engineOpen = $state(false);
  // The row above the board is one line high, or two in a narrow row: the board and the side columns take its height.
  // A bound value, not the skeleton's attachment (measureStrip): the style directives on the view's <main> write its
  // whole style attribute, which would drop a property that the attachment set.
  let stripHeight = $state(0);
  // The side columns end where the window ends, less the page's margin, but never above the board's bottom edge, so that
  // the step controls stay in view and the page fits the window. They are measured again whenever the board's column or
  // the page changes size, not only the window: the row above the board, measured after the first paint, or a bar of
  // the browser's own, move it too.
  let boardCol = $state<HTMLElement>(), boardWrap = $state<HTMLElement>();
  let sideHeight = $state<number | null>(null);
  function measureSide() {
    if (!boardCol) return;
    const col = boardCol.getBoundingClientRect();
    const margin = parseFloat(getComputedStyle(document.documentElement).fontSize); // the page's 1rem
    sideHeight = Math.max(col.bottom, window.innerHeight - pageScrollTop() - margin) - col.top;
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
  const mainKeys = $derived(prefixKeys(mainNames));
  const here = $derived(pathKey(path));
  const mainAt = $derived(mainIndex(path, mainNames)); // the place on the game's line, or null in a branch
  const pos = $derived(mainAt ?? sharedLength(path, mainNames)); // on the game's line: here, or where the branch leaves it
  const branchNode = $derived(mainAt === null ? branches[here] : undefined);
  const position = $derived(branchNode?.position ?? R.data.positions[pos]);
  // The game has ended here: only the rules end it. A game that ended early (a resignation, a forfeit) or a line that
  // stops (the Analysis board's, an unfinished game) has a search at its last position, as any position.
  const over = $derived(!!position.over);
  const analysis = $derived(over ? undefined : mainAt !== null ? R.data.analysis[mainAt] : branchNode?.analysis);
  // The position's complexity (model.ts), and its likely edges for the meter
  const difficulty = $derived(complexity(analysis, position.player));
  const meter = $derived(likelyEdges(analysis, position.player));
  const METER_WORDS = { good: "good or better", inaccuracy: "inaccuracy", mistake: "mistake", blunder: "blunder" } as const;
  const meterText = (m: NonNullable<typeof meter>) =>
    `Likely edges: ${METER_GROUPS.map(g => `${Math.round(100 * m[g])}% ${METER_WORDS[g]}`).join(" · ")}` +
    (m.unsearched >= 0.005 ? ` · ${Math.round(100 * m.unsearched)}% not searched` : "");
  // The difficulty line's tooltip and accessible name: the mark's meaning, the complexity in words, then the meter's
  // shares. None before the search gives the position's edges.
  const difficultyNote = $derived([
    isHard(difficulty) ? `${HARD_NOTE}.` : "",
    difficulty !== undefined ? `Difficulty ${costText(difficulty)}: the engine's likely edges lose ${pct(difficulty)} of win chance here`
      + ` on average. A position is hard from ${Math.round(100 * HARD)}%.` : "",
    meter ? meterText(meter) : "",
  ].filter(Boolean).join(" ") || undefined);
  const mover = $derived(position.player as Player);
  const lastPlayed = $derived(moveInto(path)); // the move that led here, in the game or a branch

  // The tree's children: the game's next move first, on its line, then the branches, in the order they were added.
  // Derived from the branches' keys in their order: a branch's search result changes neither.
  const branchOrder = $derived(Object.entries(branches).sort((a, b) => a[1].order - b[1].order).map(([k]) => k).join("\n"));
  const kids = $derived(branchChildren(branchOrder ? branchOrder.split("\n").map(k => k.split(" ")) : []));
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
  const turnCache = $derived.by(() => { void gamePositions; void branches; return new Map<string, { turn: number; first: boolean }>(); });
  function moveFrom(p: string[]): { turn: number; first: boolean } {
    const i = mainIndex(p, mainNames);
    if (i !== null && i < R.edges.length) return { turn: R.turnOf[i].number, first: opensTurn(R.turnOf[i], i) };
    if (!p.length) return turnFromCount(positionOf([])?.count ?? 0);
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
    return `${t.number}${opensTurn(t, index) ? "." : "..."} ${moveNotation(R.edges[index])}`;
  };
  // The move list explains these labels under their turn.
  const COMMENTED: Label[] = ["great", "mistake", "blunder"];

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

  // The opening book (design 32, items 3 and 8): its table in the candidates' place, with the switch "Book" or
  // "Candidates", off until the player turns it on, each page with its own kept choice (place.svelte.ts). Only in the
  // early edition, and only where the book's index loads: elsewhere the column stays as it was, with no switch. The
  // table's rows and the board's numbers point at each other (`book.pointed`), and the row pointed at draws its line as
  // a candidate's does. A book move played from the table is a branch, as any move that the player plays.
  // The game's move at the position on screen, for the table's row "Your game": the review's (beads abscls-tpaj.6).
  const bookGame: GameMove | null = null;
  // The notation of each position on the path from the start: the game's as far as the path follows it, then the
  // branch's nodes'
  const pathNotations = $derived.by(() => {
    const { start, keys } = branchLine(path, mainNames);
    return [...gamePositions.slice(0, start.length + 1), ...keys.map(k => branches[k]?.position)].map(p => p?.notation);
  });
  const openingBook = EARLY_ACCESS ? siteBook() : null;
  const book = openingBook && new BookPlace(openingBook, untrack(() => board) ? "board" : "review", () => pathNotations, () => bookGame);

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
  let listHover = $state<number | null>(null); // a new position starts with none of these (setPath)
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
  const play = (k: number) => { if (listLine) playPath([...path, ...listLine.slice(0, k + 1).map(edgeName)], "listed line played"); };
  /** Plays a line from the start: along the tree where it is there, as a new branch where it is not, then goes there.
   *  A snapshot plays along the tree alone, and its bar says why (nudge). `feature`: what the player used. `stepwise`:
   *  it goes there edge by edge, at the engine's line's pace (a trap and its refutation, design 32, item 7). */
  async function playPath(target: string[], feature: string, stepwise = false) {
    if (snapshot && mainIndex(target, mainNames) === null && !(pathKey(target) in branches)) { nudge(); return; }
    used(feature);
    if (onplay) await onplay(target);
    clearInterval(stepping);
    if (!stepwise || matchMedia("(prefers-reduced-motion: reduce)").matches || sharedLength(target, path) !== path.length) {
      setPath(target, true);
      return;
    }
    // Each step from the position on screen, while the player does not go elsewhere
    let k = path.length;
    const step = () => {
      if (k >= target.length || mainIndex(path, target) !== k) clearInterval(stepping);
      else setPath(target.slice(0, ++k), true);
    };
    step();
    stepping = setInterval(step, LINE_STEP_MS);
  }
  let stepping: ReturnType<typeof setInterval> | undefined;
  $effect(() => () => clearInterval(stepping));
  /** A move from the book's table or its number on the board: its edge, or a trap and its refutation, edge by edge. */
  function playBook(edges: string[]) {
    const trap = edges.length > 1;
    playPath([...path, ...edges], trap ? "book refutation played" : "book move played", trap);
  }
  let nudged = $state(false), nudgeTimer: ReturnType<typeof setTimeout> | undefined;
  function nudge() {
    nudged = true;
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => (nudged = false), 2500);
  }
  // Space plays the pinned candidate, or number 1 (Lichess's Space plays its best move): the book's, while the table
  // shows the book.
  function playCandidate() {
    if (book?.showsBook) { if (book.rows[0]) playBook([book.rows[0].move]); return; }
    const c = pinnedCandidate ?? analysis?.candidates[0];
    if (c) playPath([...path, edgeName(c.edge)], "candidate played");
  }

  // The player's own moves, always on (Lichess's analysis board): the puzzles' edge input, on the position's rules from
  // the engine. A move that is the game's goes along the game; another makes a branch.
  const input = new EdgeInput(edge => playPath([...path, edgeName(edge)], "own edge played"));
  // The player's notes on the board, by position, for this visit only (Lichess keeps an analysis board's shapes on each
  // position of its tree).
  let notesAt = $state<Record<string, BoardNote[]>>({});
  const knownRules = new Map<string, EdgeRules>();
  $effect(() => {
    const key = here, end = over;
    input.reset();
    input.rules = null;
    if (end || !game) return;
    const known = knownRules.get(key);
    if (known) { input.rules = known; return; }
    let current = true;
    game.rulesAt(key ? key.split(" ") : [])
      .then(r => { knownRules.set(key, r); if (current) input.rules = r; })
      .catch(() => {}); // without the rules, no own moves here
    return () => { current = false; };
  });

  // The board's line: the listed line up to the edge pointed at in the list, or the line of the candidate pointed at, or
  // of the pinned one. While the table shows the book, the line of the book's row pointed at.
  const lineEdges = $derived(book?.showsBook ? book.line : listHover !== null && listLine ? listLine.slice(0, listHover + 1)
    : hoverCandidate ? trusted(hoverCandidate) : pinnedCandidate ? trusted(pinnedCandidate) : null);
  // The board's numbers, and what pointing at one and clicking it do: the book's rows while the table shows the book,
  // else the engine's candidates.
  const numbers = $derived(book?.showsBook ? {
    candidates: book.candidates, highlight: book.highlight, point: (e: Edge | null) => book.point(e),
    click: (e: Edge) => playBook([edgeName(e)]), dblclick: undefined,
  } : {
    candidates, highlight: hover ?? pinnedCandidate?.edge ?? null, point: (e: Edge | null) => { hoverOnBoard = true; hover = e; },
    click: selectRank, dblclick: (e: Edge) => playPath([...path, edgeName(e)], "candidate played"),
  });

  // The threat (Lichess's "Show threat", its key x, the engine header's switch): the engine searches the position after
  // a pass by the side to move (GameAnalysis.askThreat), and the board draws the opponent's best turn from there, as it
  // draws the engine's line, in the opponent's colour. At a turn's start the pass forfeits the whole turn, and in its
  // middle the turn's second edge. The header shows the position's values after the pass, and what the pass costs the
  // player, in the units of a move's loss (design 10). A candidate pointed at or pinned shows its own line in its place.
  // For the visit only, as on Lichess. Its numbers are in warning triangles, so that it reads as a threat (Lichess draws
  // its threat as the one red arrow, and red is a player's colour here).
  let threatOn = $state(false);
  function toggleThreat() {
    threatOn = !threatOn;
    if (threatOn) used("threat shown");
  }
  const threatPath = $derived([...path, moveName(null)]);
  $effect(() => {
    const p = threatOn ? (here ? here.split(" ") : []) : null;
    untrack(() => game?.askThreat(p));
  });
  const threat = $derived(threatOn ? game?.threatAt(path) : undefined);
  const threatState = $derived<ThreatState | null>(threatOn && game ? game.threatState(path) : null);
  const passed = $derived(threatOn ? game?.passedAt(path) : undefined); // the position after the pass
  // The threat's line: the opponent's turn of the first choice's line after the pass (threatTurn)
  const threatEdges = $derived(threat?.candidates[0] && passed ? threatTurn(threat.candidates[0], passed) : null);
  // What the pass costs the player: the position's value less the value after the pass, from the player's side, in win
  // chance and in points (the lead), as a move's loss (design 10). Both from searches with the same settings
  // (GameAnalysis.threatCost), so that the size does not mix depths.
  const threatCost = $derived(threat && game?.threatCost(path));
  // The board shows the threat while no candidate's line shows: its line starts after the pass
  const threatShown = $derived(!lineEdges && !!threatEdges);
  const boardEdges = $derived(lineEdges ?? threatEdges);
  const line = $derived.by((): BoardLineEdge[] | null => {
    const from = lineEdges ? position : passed;
    if (!boardEdges || !from) return null;
    const movers = lineMovers(from, boardEdges.length);
    return boardEdges.map((edge, i) => ({ edge, player: movers[i], ...stepsNow?.[i] }));
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
    if (!game || key in stepsByLine || askedSteps.has(key)) return;
    askedSteps.add(key);
    game.lineSteps(start, edges).then(steps => (stepsByLine = { ...stepsByLine, [key]: steps })).catch(() => {});
  }
  type StepsHad = { at: string; edges: Edge[]; steps: LineStep[] };
  /** The last steps that came for the line that `line` gives (its start and edges), with the position on screen then:
   *  asked for once for each line (askSteps), and read by stepsOf. */
  function keptSteps(line: () => { start: string[]; edges: Edge[] } | null): { readonly had: StepsHad | null } {
    let had = $state<StepsHad | null>(null);
    const key = $derived.by(() => { const l = line(); return l ? lineKey(l.start, l.edges) : null; });
    $effect(() => {
      const k = key, steps = k ? stepsByLine[k] : undefined;
      if (!k) return;
      untrack(() => {
        const l = line()!;
        if (steps) had = { at: here, edges: l.edges, steps };
        else askSteps(l.start, l.edges);
      });
    });
    return { get had() { return had; } };
  }
  // The board's line in full (lineEdges is a part of it): the book's row's while the table shows the book, else the
  // listed line
  const lineStepsKept = keptSteps(() => {
    const edges = book?.showsBook ? book.line : listLine;
    return edges ? { start: path, edges } : null;
  });
  // The threat's, from the position after the pass
  const threatStepsKept = keptSteps(() => (threatEdges ? { start: threatPath, edges: threatEdges } : null));
  // The steps of a line from here, as far as it matches the line whose steps came (`had`). The search can lengthen or
  // change a line while it shows: until the new line's steps come, the steps of the edges it shares with the line
  // before stay.
  function stepsOf(edges: Edge[] | null, had: StepsHad | null): LineStep[] | null {
    if (!edges || !had || had.at !== here) return null;
    let k = 0;
    while (k < edges.length && k < had.edges.length && sameEdge(edges[k], had.edges[k])) k++;
    return had.steps.slice(0, k);
  }
  const stepsNow = $derived(stepsOf(boardEdges, lineEdges ? lineStepsKept.had : threatStepsKept.had));
  const listSteps = $derived(stepsOf(listLine, lineStepsKept.had));

  // The line as far as drawn (lineDrawing.svelte.ts): one edge at a time (the default, a display setting), or all at
  // once. Pointing at another candidate draws its line again; a line that the search lengthens goes on from the edges
  // drawn. Its edges as one string, so that the drawing goes on while the search sends the same line again.
  // The threat's line is drawn from the position after the pass.
  const lineText = $derived(boardEdges ? boardEdges.map(edgeName).join(" ") : null);
  const lineStart = $derived(lineEdges ? here : pathKey(threatPath));
  const lineDrawing = new LineDrawing();
  // The line pointed at in the list shows at once, as far as the edge pointed at.
  $effect(() => lineDrawing.draw(lineText === null ? null : lineStart, lineText ? lineText.split(" ") : [],
                                 !display.lineSteps || listHover !== null));
  const drawnLine = $derived(line && line.slice(0, Math.max(1, lineDrawing.shown)));

  // A branch's preview (design 07): pointing at a branch's move in the move list shows the branch's line on the board,
  // from the position where it leaves the game, up to the move (branchLine, tree.ts). A row that forks from another
  // branch shows the edges the two share too. It shows as the engine's line shows: its edges numbered, one at a time or
  // all at once (the same display setting), with the edges they cut and the regions they close, from the branch's own
  // positions. The rows of dots or pills look alike, and the board tells them apart. It ends when the pointer leaves.
  // The engine's line shown as a branch under a bad turn's note (bestLine): pointing at one of its edges previews it as a
  // branch's line, from where it leaves the game. Its cuts and regions come from the line's steps once the rules have
  // played it. A played move's preview: below.
  type Preview = { kind: "move"; index: number } | { kind: "branch"; path: string[] }
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
    const { start, keys } = branchLine(p.path, mainNames), from = positionOf(start);
    if (!from) return null;
    const { edges } = treeLine(keys.map(k => k.split(" ")));
    return edges.length ? { start, from, edges } : null;
  });
  // Pointing at a later move of the same line goes on from the edges drawn.
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
  // The area map (design 30), in its style (the display setting "Area map style"), on the points whose value is at
  // least the style's smallest value. Off on the review and on on the Analysis board by default, each page's own
  // setting. One rule: the map is the map of the position that the board shows. That is the position on screen, or,
  // while a line or a preview shows, the position after its last drawn edge: the engine's line steps with its drawing,
  // and a line drawn all at once, or pointed at in the list up to an edge, shows its last edge's. In Forecast vs board,
  // the board is the board as drawn (drawnBoard). A position's map is its result's, or else a map added to it
  // (askOwnership): a short search of the position, asked for while the map shows the line, in the order of drawing.
  // While the map of the edge drawn now is searched, the board keeps the latest map of the line before it (mapStep),
  // and the legend names the position that the map is from.
  // The styles' names, by what each compares, in the order of Shift+T
  const MAP_STYLE_NAME: Record<Display["mapStyle"], string> = { ownership: "Forecast", change: "Forecast vs board", difference: "After vs before" };
  const MAP_STYLES = Object.keys(MAP_STYLE_NAME) as Display["mapStyle"][];
  // The switch in the board's margin: off, or a style, one click for each. The style changes as often as the player
  // reads a position, so it is on the page, and on the keys: t shows or hides the map, and Shift+T goes to the next
  // style, which shows the map.
  const MAP_SWITCH = ["off", ...MAP_STYLES] as const;
  const mapPage = $derived<keyof Display["areaMap"]>(board ? "board" : "review"); // each page keeps its map on or off
  const mapOn = $derived(display.areaMap[mapPage]);
  function setMap(value: (typeof MAP_SWITCH)[number]) {
    if (value !== "off") display.mapStyle = value;
    display.areaMap[mapPage] = value !== "off";
  }
  const toggleMap = () => (display.areaMap[mapPage] = !mapOn);
  const nextMapStyle = () => setMap(MAP_STYLES[(MAP_STYLES.indexOf(display.mapStyle) + 1) % MAP_STYLES.length]);
  // The review's own work runs: its counts are partial. The map pass, after it, leaves them final.
  const reviewRuns = $derived(!!progress && !progress.maps);
  // The line that the board draws, from its start: its edges, the ones drawn so far, and how the legend names it
  // The threat's line starts after the pass, whose position is the board's own with the opponent to move.
  type MapLine = { kind: "here" | "line" | "threat" | "branch" | "move"; start: string[]; from: Position; all: BoardLineEdge[];
                   drawn: BoardLineEdge[] };
  const mapLine = $derived.by((): MapLine => {
    if (branchPreview && previewLine)
      return { kind: preview?.kind === "engine" ? "line" : "branch", start: branchPreview.start, from: branchPreview.from,
               all: branchPreview.edges, drawn: previewLine };
    if (movePreview) return { kind: "move", start: mainNames.slice(0, movePreview.index + 1), from: movePreview.position, all: [], drawn: [] };
    if (line && drawnLine) return threatShown ? { kind: "threat", start: threatPath, from: position, all: line, drawn: drawnLine }
      : { kind: "line", start: path, from: position, all: line, drawn: drawnLine };
    return { kind: "here", start: path, from: position, all: [], drawn: [] };
  });
  /** The path of the line's position after its edge `j` (0: its start). */
  const stepPath = (l: MapLine, j: number) => [...l.start, ...l.all.slice(0, j).map(e => edgeName(e.edge))];
  /** A position's map: the position on screen's from its analysis, which can be the search running now. */
  const mapOf = (p: string[]) => (pathKey(p) === here ? analysis?.ownership : undefined) ?? game?.mapAt(p);
  // The step of the line whose map shows: the drawn edge's, or the latest one before it while that is searched. A
  // number, then an array, so that a batch of results that changes neither redraws nothing.
  const drawnCount = $derived(mapLine.drawn.length);
  const shownStep = $derived(!mapOn ? null
    : mapStep(Array.from({ length: drawnCount + 1 }, (_, j) => mapOf(stepPath(mapLine, j))), drawnCount));
  const shownOwnership = $derived(shownStep === null ? undefined : mapOf(stepPath(mapLine, shownStep)));
  // The board that the map's step shows, for the change style and the point's numbers
  const mapBoard = $derived(shownStep === null ? null : drawnBoard(mapLine.from, mapLine.drawn.slice(0, shownStep)));
  // The difference style (KaTrain's loss grid, with the rises): two forecasts, before and after. While a line or a
  // branch's preview shows, its start against the step shown, for the player to move at its start. Else the last move
  // to the position shown, by the labels' unit (the turn that ends there, so far, or the edge), for its player. The
  // threat: the position before the pass against the step shown, for the player who passes, so that the map shows where
  // the forecast falls if the player passes.
  type DiffBase = { before: string[]; mover: Player; played: boolean };
  const diffBase = $derived.by((): DiffBase | null => {
    if (display.mapStyle !== "difference") return null;
    const l = mapLine;
    if (l.kind === "threat") return { before: path, mover: position.player, played: false };
    if (l.kind === "line" || l.kind === "branch") return { before: l.start, mover: l.from.player, played: false };
    const p = l.start, mover = p.length ? positionOf(p.slice(0, -1))?.player : undefined;
    if (mover === undefined) return null;
    let b = p.length - 1;
    if (unit === "turn") while (b > 0 && !moveFrom(p.slice(0, b)).first) b--;
    return { before: p.slice(0, b), mover, played: true };
  });
  const beforeMap = $derived(diffBase ? mapOf(diffBase.before) : undefined);
  // The point under the pointer, for its numbers, and each point's state on the board shown (occupancy): for the change
  // style, and for the numbers
  let mapPoint = $state.raw<[number, number] | null>(null);
  const pointing = $derived(mapPoint !== null);
  const boardNow = $derived(mapBoard && (display.mapStyle === "change" || pointing) ? occupancy(mapBoard) : null);
  const shownMap = $derived.by(() => {
    if (!shownOwnership) return null;
    const min = display.mapMin[display.mapStyle];
    if (display.mapStyle === "ownership") return ownershipMap(shownOwnership, min);
    if (display.mapStyle === "change") return boardNow && changeMap(shownOwnership, boardNow, min);
    return beforeMap && diffBase ? differenceMap(beforeMap, shownOwnership, diffBase.mover, min) : null;
  });
  $effect(() => {
    const l = mapLine, d = diffBase;
    const before = d && (d.played || l.kind === "threat") ? [d.before] : []; // else the line's start, its step 0
    const paths = mapOn ? [...askOrder(drawnCount, l.all.length).map(j => stepPath(l, j)), ...before] : [];
    untrack(() => game?.askOwnership(paths));
  });
  /** The legend's name of the position after the line's edge `j`: none for the position on screen. */
  function stepName(l: MapLine, j: number): string {
    if (l.kind === "move") return `After ${moveText(l.start.length - 1)}`;
    if (l.kind === "here") return "";
    if (l.kind === "threat") return j ? `After edge ${j} of the threat` : "After the pass";
    return j ? `After edge ${j} of the ${l.kind}` : `Before the ${l.kind}`;
  }
  /** The difference style's name of its two positions: the move or the turn, or the line's step against its start. */
  function diffName(l: MapLine, j: number, d: DiffBase): string {
    if (l.kind === "threat") return `${stepName(l, j)} vs before the pass`;
    if (!d.played) return j ? `${stepName(l, j)} vs before the ${l.kind}` : stepName(l, j);
    const p = l.start, from = moveFrom(p.slice(0, -1));
    return unit === "turn" ? `After turn ${from.turn} vs before it` : `After ${turnText(from)} ${p.at(-1)} vs before it`;
  }
  // The legend's start: the position that the map is from (in the difference style, its two positions), and the edge
  // drawn now while its map is searched (or has none: the game ends there)
  const mapPlace = $derived.by(() => {
    if (shownStep === null) return "";
    const name = diffBase ? diffName(mapLine, shownStep, diffBase) : stepName(mapLine, shownStep);
    if (shownStep === drawnCount || !game?.hasNoMap(stepPath(mapLine, drawnCount))) return name;
    return `${name} (edge ${drawnCount}: no map)`;
  });
  // The legend's lead, then each mark with its meaning: none for the forecast, whose shade says it all. A sign of the
  // difference style is in the colour of the side that the point moved toward: a fall toward the opponent.
  type LegendMark = { kind: "close" | "lose" | "fall" | "rise"; side?: Player; text: string };
  const mapLegend = $derived.by((): { lead: string; marks: LegendMark[] } => {
    if (display.mapStyle === "ownership")
      return { lead: `${mapPlace ? `${mapPlace}: who` : "Shade: who"} the engine expects to hold each point`, marks: [] };
    if (display.mapStyle === "change")
      return { lead: mapPlace ? `${mapPlace}, forecast vs board:` : "Forecast vs board:",
               marks: [{ kind: "close", text: "will be closed" }, { kind: "lose", text: "will be lost" }] };
    const mover = diffBase?.mover ?? 0, name = PLAYER_NAME[mover];
    return { lead: `${mapPlace}:`, marks: [{ kind: "fall", side: mover === 0 ? 1 : 0, text: `fell for ${name}` },
                                           { kind: "rise", side: mover, text: `rose for ${name}` }] };
  });
  // The map's work, always in the legend's slot while the map is on (design 30): for a line, how many of its positions
  // have their maps; for a position, whether its map waits for the engine (the review's searches run first), is
  // searched now, or cannot come. `busy`: work goes on, which the site's sign of work in progress shows (bar-glider).
  // Nothing when the map shown is the board's own and ready.
  // The note reads the map as the board does (mapOf): a map that shows is ready, whatever the analysis's state says.
  // A map that nothing asks for has no note: a note shows only a state that ends.
  const stateOf = (p: string[]): MapState => (mapOf(p) ? "ready" : game?.mapState(p) ?? "unasked");
  const mapWork = $derived.by((): { text: string; busy: boolean } | null => {
    if (!mapOn || !game) return null;
    const l = mapLine, n = l.all.length;
    const working = (st: MapState) => st === "waiting" || st === "searching";
    if (n) {
      const states = Array.from({ length: n }, (_, k) => stateOf(stepPath(l, k + 1)));
      const done = states.filter(st => st === "ready" || st === "none").length;
      // In the difference style, the forecast before too: the line's start, or the position before the threat's pass
      return { text: `Maps of the ${l.kind === "threat" ? "threat" : "line"}: ${done} of ${n}`,
               busy: states.some(working) || (!!diffBase && working(stateOf(diffBase.before))) };
    }
    // The difference style at the game's start: no move comes before it
    if (display.mapStyle === "difference" && !diffBase) return { text: "No map: the game starts here", busy: false };
    // A position: its map, and in the difference style the map before the move, which the board needs too
    const states = [l.start, ...(diffBase?.played ? [diffBase.before] : [])].map(stateOf);
    if (states.includes("searching")) return { text: "Map: searching", busy: true };
    if (states.includes("waiting")) return { text: "Map: waiting for the engine", busy: true };
    if (states[0] === "none") return { text: "No map: the game ends here", busy: false };
    if (states.includes("unavailable")) return { text: "No map saved: snapshots do no searches", busy: false };
    return null;
  });
  // The map pass, for an older review: while the map is on, once the review's passes are done (labelled). The
  // analysis starts it once, from the position on screen, and stops it when the map goes off.
  $effect(() => {
    const on = mapOn && !board && !snapshot && !!game && game.labelled >= game.passCount, from = path;
    untrack(() => game?.passMaps(on, from));
  });
  // The numbers of the point under the pointer while the map shows: the ownership, the state now and the change, or in
  // the difference style, the forecast before and after, and how it fell or rose for the player who moved
  const mapReading = $derived.by(() => {
    if (!mapPoint || !shownOwnership) return null;
    const i = mapPoint[1] * 19 + mapPoint[0];
    const reading = diffBase && beforeMap ? differenceReading(beforeMap[i], shownOwnership[i], diffBase.mover)
      : boardNow && pointReading(shownOwnership[i], boardNow[i]);
    return reading && `${pointName(...mapPoint)} · ${reading}`;
  });

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
    const key = pathKey(p), node = branches[key];
    if (!node?.judged || game?.awaitsGreat(key)) return null; // a Great's searches still run: "Evaluating…"
    const parent = p.slice(0, -1);
    return judgeBranchEdge(analysisAt(parent), valuesAfter(node.position, node.analysis, "lead", labelVisits), node.move.player,
                           node.move.edge, "lead", labelVisits, game?.secondAt(parent), game?.earlierAt(parent, node.move.player));
  }
  /** The move that leads to `p` (none at the start), and the analysis at `p`: the game's or a branch's. */
  function moveInto(p: string[]): Move | undefined {
    const i = mainIndex(p, mainNames);
    return !p.length ? undefined : i !== null ? moves[i - 1] : branches[pathKey(p)]?.move;
  }
  /** A line in the tree, by the path after each of its edges (the game's or a branch's), as a preview draws it: each
   *  edge with its mover, the edge that it cuts and the regions after it, and the position after the last. A pass (no
   *  edge) ends it. */
  function treeLine(paths: string[][]): { edges: BoardLineEdge[]; end?: Position } {
    const edges: BoardLineEdge[] = [];
    let end: Position | undefined;
    for (const p of paths) {
      const m = moveInto(p), after = positionOf(p);
      if (!m?.edge || !after) break;
      edges.push({ edge: m.edge, player: m.player, cut: m.cut, regions: after.regions });
      end = after;
    }
    return { edges, end };
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
  /** A move's word on its difficulty in its tooltip, where the engine searches only what the player looks at (a branch,
   *  the board): a hard position, or that a position before the move has no result yet. */
  const searchNote = (hard: boolean, before: (Analysis | undefined)[]) => (hard ? HARD_NOTE : before.some(a => !a) ? "Not searched yet" : "");
  /** A move's tooltip: its parts that have something to say, or none. */
  const tooltip = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" · ") || undefined;
  /** A branch move's ◆ (design 14) and its word, for the side reviewed, from the results of the positions before it: by
   *  edge, the move's own. By turn, at the move that ends the turn, the harder of the turn's, as a game turn's. Null
   *  where the move shows none. */
  function branchHardness(p: string[]): { hard: boolean; note: string } | null {
    const node = branches[pathKey(p)];
    if (!node || !forSide(node.move.player)) return null;
    const paths = unit === "edge" ? [p] : branchTurnPaths(p);
    if (!paths) return null;
    const before = paths.map(q => analysisAt(q.slice(0, -1)));
    const hard = isHard(turnComplexity(before.map(a => complexity(a, node.move.player))));
    return { hard, note: searchNote(hard, before) };
  }
  /** The turn that a branch move ends (design 10), by turn: its moves' paths, and its judgment (judgeTurn) once the player
   *  asked for its quality and its searches have the label budget. Null where the move does not end a turn, or where
   *  the turn was not asked for. */
  function branchTurnAt(p: string[]): { paths: string[][]; judgment: TurnJudgment | null } | null {
    const node = branches[pathKey(p)], paths = branchTurnPaths(p);
    if (!node || !paths) return null;
    if (!paths.every(q => mainIndex(q, mainNames) !== null || branches[pathKey(q)]?.judged)) return null;
    if (game?.awaitsGreat(pathKey(p))) return { paths, judgment: null }; // a Great's searches still run
    const parent = p.slice(0, -1), twice = paths.length > 1;
    const start = p.slice(0, twice ? -2 : -1), turn = paths.map(q => moveInto(q)?.edge ?? null);
    return { paths, judgment: judgeTurn(node.move.player, turn, analysisAt(start), twice ? analysisAt(parent) : undefined,
                                        valuesAfter(node.position, node.analysis, "lead", labelVisits), !!node.position.over,
                                        game?.otherAt(start, turn), twice ? game?.secondAt(parent) : undefined,
                                        game?.earlierAt(start, node.move.player), "lead", labelVisits) };
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
      return t.edges.flatMap(e => (e.edge ? [{ edge: e.edge, label, note, group: t.number, player: t.player }] : []));
    }
    if (unit === "turn") { // in a branch: the branch's turn that ends here, when it was asked for
      const bt = branchTurnAt(path), j = bt?.judgment;
      if (!bt || !j) return [];
      const note = `${LABEL_TEXT[j.label]}: ${costText(j.rawLoss, j.rawPoints)}`;
      return bt.paths.flatMap(q => { const m = moveInto(q); return m?.edge ? [{ edge: m.edge, label: j.label, note, group: 0, player: m.player }] : []; });
    }
    const out: (BoardMark & { player: Player })[] = [];
    let p = path;
    for (let k = 0; k < 2 && p.length; k++) { // a turn has at most two edges
      const i = mainIndex(p, mainNames), e = i !== null ? R.edges[i - 1] : null, move = e ?? moveInto(p);
      const edge = move?.edge ?? null, label = e ? e.label : branchLabel(p), player = move?.player ?? 0;
      if (edge && label) out.push({ edge, label, player,
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
    else { selectedRank = 1; pinned = false; forkPick = null; }
    path = p;
    hover = null;
    if (book) book.pointed = null;
    listHover = null;
    preview = null;
    if (display.sound && (sound || step) && p.length) void playMove(display.volume, display.moveSound, cutsAt(p));
  }
  /** Whether the move that leads to a place cuts an edge: the game's move, or a branch's (a played move's branch exists
   *  before its sound plays: playPath waits for it). */
  const cutsAt = (p: string[]) => !!moveInto(p)?.cut;
  $effect(() => { if (display.sound) preload(display.moveSound); });

  /** A network's name in the settings: "HedgeFund 0.2 Lite (6.5 MB)". Its parts hold no-break spaces, so that a narrow
   *  panel breaks the name only before the parenthesis. */
  const networkLabel = (id: string) => `${networkName(id).replaceAll(" ", "\u00a0")} (${networkMB(id)}\u00a0MB)`;
  // Lichess's move menu on a branch's move (ui/analyse/src/treeView/contextMenu.ts): "Promote variation" and "Delete
  // from here". In a review they are off on the game's own moves: the review is of the game, so its line stays first.
  // The Analysis board's main line has them, and "Make main line" for a branch (design 21). Every move has the submenu
  // "Generate image" (copyImage, saveImage).
  let menuPath = $state<string | null>(null); // the key of the move under the menu
  // A long press opens the menu, and in some browsers its release then clicks the move (Chromium's touch emulation does,
  // after 900 ms and after 1,500 ms). That click goes nowhere: it would move the position on screen under the menu, and
  // the image of a main line move ahead of it would show the position after the move. A later click, on a move or to
  // close the menu, works as before.
  let pressAt = 0, menuAt = 0; // when the move list's last press began, and when the menu opened (0: closed)
  const menuBranch = $derived(menuPath !== null && (board || menuPath in branches) ? menuPath : null); // a move the menu edits
  /** A branch can be promoted when a branch node on its path, from its end back, is not the first branch from its parent. */
  function canPromote(key: string | null): boolean {
    if (!key) return false;
    if (board) return key in branches;
    const p = key.split(" ");
    for (let k = p.length; k > 0; k--) {
      const sub = p.slice(0, k);
      if (!(pathKey(sub) in branches)) return false;
      if (pathKey(branchKids(sub.slice(0, -1))[0] ?? []) !== pathKey(sub)) return true;
    }
    return false;
  }
  // The image of a line (design 07, item 17; lineImage.ts): the board where the line of the move under the menu starts,
  // its edges numbered all at once with their cuts and regions, the player's notes there, and the caption. Copied, or
  // where the clipboard refuses an image, a note that says so and offers Save. The note's text is text that a player
  // follows: strict Simplified Technical English. The animated image is a GIF that plays the line one edge at a time,
  // each frame drawn as the static image is (lineFrames). It is saved only: the clipboard takes a PNG, and keeps only
  // its first frame.
  let imageNote = $state.raw<ComponentProps<typeof Toast> | null>(null);
  type LineImage = { file: Promise<Blob>; name: string; animated: boolean };
  /** The line of the image of the move `key` (imageLine): where it starts, and its edges as a preview draws them. */
  function imageTreeLine(key: string) {
    const { start, paths } = imageLine(key.split(" "), path, mainNames);
    return { start, ...treeLine(paths) };
  }
  function imageOf(key: string, animated = false): LineImage {
    const { start, edges, end } = imageTreeLine(key), from = positionOf(start);
    if (!from) return { file: Promise.reject(new Error("the position is not in the tree")), name: "", animated };
    const caption = imageCaption({ ...moveFrom(start), ...from }, end ?? null, edges.length);
    // Twice the board's size on screen, and at least 1,200 pixels wide.
    const width = Math.max(1200, Math.round(2 * (boardWrap?.getBoundingClientRect().width ?? 0)));
    const notes = $state.snapshot(notesAt[pathKey(start)] ?? []), cut = moveInto(start)?.cut ?? null;
    const layers = { ...$state.snapshot(display.layers), regions: true, candidates: false, marks: false };
    // The board with the line's first `k` edges.
    const props = (k: number) => ({ position: from, cut: k ? null : cut, line: edges.slice(0, k), notes, layers });
    const file = animated ? animatedBoardImage(lineFrames(edges.length).map(f => ({ props: props(f.edges), ms: f.ms })), caption, width)
      : boardImage(props(edges.length), caption, width);
    return { file, name: imageName(start, edges.length, animated), animated };
  }
  // The edges of the line that the menu's move gives: the animated image plays only a line of one edge or more.
  const menuLineEdges = $derived(menuPath === null ? 0 : imageTreeLine(menuPath).edges.length);
  const imageFailed = (e: unknown) => (imageNote = { text: `The site cannot make the image: ${errorText(e)}`, failed: true });
  function saveImage({ file, name, animated }: LineImage) {
    used(animated ? "animated image saved" : "image saved");
    imageNote = null;
    file.then(b => download(name, b, b.type), imageFailed);
  }
  function copyImage(key: string) {
    used("image copied");
    const image = imageOf(key);
    // The note with Save stays longer: the player reads it, then chooses.
    copyPng(image.file).then(copied => (imageNote = copied ? { text: "Image copied" }
      : { text: "This browser cannot copy an image. Save the image as a file.", failed: true, ms: 15000,
          action: { label: "Save image", onclick: () => saveImage(image) } }), imageFailed);
  }
  async function deleteFrom(key: string) {
    used("branch deleted");
    const p = key.split(" ");
    if (here === key || here.startsWith(`${key} `)) setPath(p.slice(0, -1)); // the place on screen goes too
    await game?.deleteFrom(p);
  }

  // At a fork, ↑ and ↓ pick the line that → follows (Lichess's fork.select): the board shows the picked edge.
  let forkPick = $state<number | null>(null); // none picked: → follows the first line
  const picked = $derived(forkPick === null ? undefined : childrenOf(path)[forkPick]);
  // The picked move is marked in the move list (a dashed outline) and brought into view.
  const pickedKey = $derived(picked ? pathKey(picked) : null);
  // A move's outlines are drawn inside its box (negative offsets): the move list's scroll area clips what is drawn outside
  // it, at the right column's edge.
  const PICKED = "picked outline-2 outline-dashed outline-accent -outline-offset-2";
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

  // The move list's rows come in the frame after the rest of the view, in a task of their own: with the rows in it, the
  // review's first frame was one long task, and a click during it waited (decisions/product.md, "The review's first
  // frame"). Until then the list shows grey bars. The rows wait only where the list's box keeps its size without them:
  // in two and three columns, where the box has a set height, and in the Analysis tab while it is hidden. Elsewhere
  // (the Analysis board in one column, ONE_COLUMN) the list's height follows its rows, and notes and branches make the
  // rows taller than the bars, so the step bar under the list would move: the rows come at once. A hidden page draws
  // no frame, so it draws the rows at once too. The rows' task has a mark in the browser's performance timeline
  // (`review:moves`), for measuring it.
  let rowsDrawn = $state(false);
  $effect(() => {
    const wait = untrack(() => !matchMedia(ONE_COLUMN).matches || (tabbed && stage !== "analysis"));
    if (document.hidden || !wait) { rowsDrawn = true; return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => (timer = setTimeout(() => { rowsDrawn = true; performance.mark("review:moves"); })));
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  });
  // The move list keeps the current move a fixed distance from its top (four rows), as the position changes, once its
  // rows are there.
  let movelist = $state<HTMLElement | null>(null);
  $effect(() => { void here; if (rowsDrawn) keepInView(movelist); });

  // The arrow keys step through the game, except in the controls that use them: fields, the tabs, the display menu.
  // So the move list's moves are not in the Tab order (tabindex -1), as on Lichess: a click still goes to a move.
  // The keys (the list on "?"): Lichess's (ui/analyse/src/keyboard.ts), with single keys beside its Shift keys from
  // other analysis tools. ← and → along the line (k and j, Lichess's); at a fork ↑ and ↓ pick the line that → follows,
  // elsewhere they go to the start and the end; the previous and the next fork by Shift + ← and →, b and n (KaTrain's b
  // goes back to the last branch point), [ and ], or Shift + k and j (Lichess's); the line before and after this one by
  // Shift + ↑ and ↓, or comma and period; Space plays the engine's choice; e or l turns the engine on or off (l is
  // Lichess's; e, for "engine", is the site's own: Lichess's e opens its opening explorer, which this site does not
  // have); x shows or hides the threat (Lichess's). Escape closes the settings, or cancels the edge that the player
  // started. Keys kept free for later: m and Shift + m (the next and the previous mistake, KaTrain's n), and Delete. The
  // controls' notes name no keys: the list does.
  let keysOpen = $state(false);
  let againOpen = $derived(!!again?.dialog); // closed by the player
  // Whether the hidden tab's note (HIDDEN_TAB) was cut when the pointer last came to it: the browser reads the title
  // after the pointer's arrival, so the title then gives the line in full.
  let hiddenTabCut = $state(false);
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
    else if ((key === "e" || key === "l") && engine && onengine) { if (snapshot) nudge(); else onengine({ on: !engine.on }); }
    else if (key === "t" && shift) nextMapStyle();
    else if (key === "t") toggleMap(); // KaTrain's key for its Territory
    else if (key === "x") toggleThreat(); // Lichess's key for its "Show threat"
    else if (key === "o" && book?.ready) book.toggle(); // the book's table or the candidates (design 32, item 9)
    else if ((key === "ArrowLeft" && shift) || key === "b" || key === "[" || (key === "k" && shift)) setPath(prevFork(path, childrenOf));
    else if ((key === "ArrowRight" && shift) || key === "n" || key === "]" || (key === "j" && shift)) setPath(nextFork(path, childrenOf));
    else if ((key === "ArrowUp" && shift) || key === ",") line(-1);
    else if ((key === "ArrowDown" && shift) || key === ".") line(1);
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
  // The list of keys, as Lichess's "?" list, and the clicks. The book's show where its table does.
  const BOOK_KEYS: [string[], string][] = [
    [["o"], "Show the book's moves or the engine's candidates"],
    [["Tab", "↑ / ↓", "Enter"], "Go into the book's table, go to a different row, and play its move. Escape goes back to the page"],
  ];
  const BOOK_CLICKS: [string, string][] = [["Click a book move, in the table or on the board", "Play it"]];
  const KEYS = $derived<[string[], string][]>([
    [["← / →", "k / j"], "Back and forward along the line on screen"],
    [["↑ / ↓"], "At a fork, pick the line that → follows. Elsewhere, the start and the line's end"],
    [["Shift + ← / →", "b / n", "[ / ]", "Shift + k / j"], "The previous and the next fork"],
    [["Shift + ↑ / ↓", ", / ."], "The line before and after this one, from the fork above"],
    [["Home / End"], "The start, and the line's end"],
    [["Space"], "Play the pinned candidate, or number 1"],
    [["e", "l"], "Turn the engine on or off"],
    [["x"], "Show or hide the threat: the opponent's best turn if you pass"],
    [["t"], "Show or hide the area map"],
    [["Shift + t"], `The area map's next style: ${MAP_STYLES.map(s => MAP_STYLE_NAME[s]).join(", ")}`],
    ...(book?.ready ? BOOK_KEYS : []),
    [["Escape"], "Close the settings, or cancel the edge that you started"],
    [["?"], "This list"],
  ]);
  const MOUSE = $derived<[string, string][]>([
    ...(book?.ready ? BOOK_CLICKS : []),
    ["Click a candidate", "Pin its line on the board. Click the candidate again to unpin it"],
    ["Double-click a candidate", "Play it"],
    ["Click a node, then a marked point", "Play your own edge"],
    ["Drag from a node to a marked point", "Play your own edge"],
    ["Right-click a point, or right-drag to another", "Draw a ring, or a line, as a note. Drawing it again removes it, and in another colour (below) changes its colour"],
    ["Click the board", "Clear the position's notes"],
    ["Right-click a branch's move", "Evaluate it, promote its branch, or delete from it"],
  ]);

  const scoreDiff = $derived(gamePositions.map(p => p.scores[0] - p.scores[1]));
  const areaDiff = $derived(gamePositions.map(p => (p.areas ? p.areas[0] - p.areas[1] : 0)));
  // The charts' marks: every turn or edge with a label that the move list shows, for the side reviewed (chartMarks).
  // And the Difficulty chart's bars: a turn's or an edge's complexity, for the side reviewed.
  const chartDots = $derived(chartMarks(R, unit, forSide));
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
  // The chart's score and area lines: the display settings say whether they show when the review opens, and the boxes in
  // the chart's legend show or hide them for the moment, without changing the settings. A change of a setting applies
  // again.
  let showScore = $derived(display.scoreLine);
  // The chart shown above the counts, as Lichess's tabs choose among its charts: the advantage, or the difficulty
  let chart = $state<"advantage" | "difficulty">("advantage");
  let showArea = $derived(display.areaLine);
  const ending = $derived(endingText(R.data)); // the game's outcome, by the rules or by the record (model.ts)
  const endedByRules = $derived(!!R.data.positions[last]?.over);
  const status = $derived.by(() => {
    // The position's own turn, in a branch and on the board: the turn as in the game.
    const turnHere = () => {
      const t = moveFrom(path), k = t.first ? 1 : 2;
      return `Turn ${t.turn} · ${PLAYER_NAME[mover]} to play, edge ${k} of ${k - 1 + position.movesLeft}`;
    };
    if (mainAt === null) return `A branch from edge ${pos + 1} · ${over ? "Game over" : turnHere()}`; // where it leaves the game
    if (board) {
      if (over) return `Game over · ${PLAYER_NAME[position.scores[0] > position.scores[1] ? 0 : 1]} won by ${Math.abs(position.scores[0] - position.scores[1]).toFixed(1)} points`;
      return `Edge ${(position.count ?? path.length) + 1} · ${turnHere()}`;
    }
    if (pos === last) return endedByRules ? `Game over · ${ending}` : `The record ends here · ${ending}`;
    const t = R.turnOf[pos];
    const k = t.edges.findIndex(e => e.index === pos) + 1;
    return `Edge ${pos + 1} of ${last} · Turn ${t.number} · ${PLAYER_NAME[mover]} to play, edge ${k} of ${t.edges.length}`;
  });
  const statusLine = $derived(
    branchPreview ? `Branch preview: ${branchPreview.edges.length} edge${branchPreview.edges.length > 1 ? "s" : ""}, numbered from ${
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
    const value = i === last && endedByRules ? `Result: ${sideText(s!, 1)}` : s === undefined ? "Not analyzed yet"
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
  // With the threat on, the header shows the threat's search, as Lichess's engine box shows its threat's.
  const shownSearch = $derived(threatOn ? threat : analysis);
  // The search stopped at its time limit
  const timedOut = $derived(!!game?.stoppedByTime(threatOn ? threatPath : path));
  // The position is searched for the player now, or its threat
  const searching = $derived(!!game && (threatOn ? threatState === "searching" : game.focusing === here));
  const searched = $derived(shownSearch && deepVisits ? (timedOut ? 1 : Math.min(1, shownSearch.visits / deepVisits)) : null);
  // The threat's line in the header's third row, in the place of the position's difficulty: what the pass costs the
  // player, or why it shows nothing. Text that a player follows: strict Simplified Technical English. `busy`: work goes
  // on, as the area map's note shows it.
  const threatNote = $derived.by((): { text: string; busy: boolean; title?: string } | null => {
    if (!threatState) return null;
    const name = PLAYER_NAME[mover];
    if (threatState === "none") return { text: over ? "No threat: the game is over" : "No threat: a pass ends the game", busy: false };
    if (threatState === "unavailable") return { text: "No threat saved: snapshots do no searches", busy: false };
    if (threatCost) return {
      text: `Threat to ${name}: ${costText(threatCost.win, threatCost.points)}`, busy: false,
      title: `What ${name} loses with a pass: the value now less the value after the pass.`
        + (threatEdges ? ` ${PLAYER_NAME[passed!.player]} then plays ${threatEdges.map(edgeName).join(" ")}.` : ""),
    };
    if (threatState === "searching") return { text: "Threat: searching", busy: true };
    if (threatState === "waiting") return { text: "Threat: waiting for the engine", busy: true };
    // The threat is there, and its size is not: a result with the threat's settings, of the position or of the threat's
    // position, is still to come (GameAnalysis.threatCost)
    if (threat && snapshot) return { text: "No threat size saved: snapshots do no searches", busy: false };
    if (threatState === "off" || (threat && engine && !engine.on)) return { text: "Threat: the engine is off", busy: false };
    if (threat) return { text: "Threat size: searching", busy: true };
    return null;
  });
  // The engine's network loads: no search of the position can start yet, so the header says so in the place of the
  // visits (design 06). A snapshot searches nothing (design 20).
  const waitsForNetwork = $derived(!!game && !snapshot && !game.engineReady);
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
  {#if game?.error}
    <p class="mb-2.5 text-sm text-blunder select-text" role="alert">Engine error: {game.error}</p>
  {:else if progress}
    <!-- One height for the review's slot, while it runs and once it is done, each line on one line: the report and the
         moves under it never move as the review goes (Cloudflare measured the page's layout shift). The second line
         says why the review runs again, or else, while it has work to run, that a hidden tab can make it slower. -->
    <div class="mb-2.5 h-[2.75rem]">
      <div class={["flex gap-0.5 h-1.5 rounded-[3px]", !progress.waiting && "bar-glider"]} role="progressbar" aria-label="The review" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow={Math.round(100 * progress.parts.reduce((s, p) => s + p.share * p.done, 0))}>
        {#each progress.parts as part, k (k)}
          <div class="bg-panel-2 rounded-[3px] overflow-hidden" style="flex: {part.share}">
            <div class="h-full bg-accent transition-[width] duration-200" style="width: {100 * part.done}%"></div>
          </div>
        {/each}
      </div>
      <p class="mt-1 text-xs text-muted truncate" title={progress.text}>{progress.text}</p>
      {#if again}<p class="mt-0.5 text-xs text-ink truncate" title={again.text}>{again.text}</p>
      {:else if !progress.waiting}<p class="mt-0.5 text-xs text-muted truncate"
          title={hiddenTabCut ? `${HIDDEN_TAB.text} ${HIDDEN_TAB.title}` : HIDDEN_TAB.title}
          onpointerenter={e => (hiddenTabCut = e.currentTarget.scrollWidth > e.currentTarget.clientWidth)}>{HIDDEN_TAB.text}</p>{/if}
    </div>
  {:else if !board && !snapshot}
    <div class="mb-2.5 h-[2.75rem]">
      <div class="h-1.5 rounded-[3px] bg-accent" role="progressbar" aria-label="The review" aria-valuemin="0"
           aria-valuemax="100" aria-valuenow="100"></div>
      <p class="mt-1 text-xs text-muted truncate">Review done: {reviewVisits.toLocaleString("en")} visits a move.</p>
    </div>
  {:else if snapshot}
    <!-- A snapshot (design 20): when and with what, and Review again. A move it cannot add brings out its second line. -->
    <div class={["mb-2.5 px-3 py-2 rounded-md bg-panel-2 text-xs border", nudged ? "border-accent" : "border-transparent"]} role="status">
      <div class="flex items-center gap-2">
        <p class="flex-1">{snapshot.text}</p>
        <button class="btn-primary flex-none px-3 py-0.5 text-xs" type="button" onclick={snapshot.onagain}>Review again</button>
      </div>
      <p class={["mt-1", nudged ? "text-ink" : "text-muted"]}>A snapshot: no searches and no new moves. Review again to explore.</p>
    </div>
  {/if}
{/snippet}

<!-- A player's name, side and score, in the row above the board (PlayerCard). While the engine's line shows, the area
     after its last drawn edge, in the accent colour. -->
{#snippet player(p: Player)}
  <PlayerCard player={p} name={p === 0 ? R.data.players.blue : R.data.players.red} tag={board ? null : PLAYER_NAME[p]} points={position.scores[p]}
              area={areas ? areas[p] : null} areaNote={lineAreas ? (threatShown ? "The area after the threat" : "The area after the engine's line") : null} toMove={!over && mover === p} />
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
        {@render lineBox("Score difference", "bg-score", "accent-score", () => showScore, v => (showScore = v))}
        {@render lineBox("Area difference", "bg-area", "accent-area", () => showArea, v => (showArea = v))}
      {/if}
    </p>
  </div>
  <div class="flex-1 min-h-0">
    {#if chart === "difficulty"}
      <DifficultyChart positions={gamePositions.length} current={pos} onjump={i => { used("chart jump"); go(i); }} dots={chartDots} bars={difficultyBars} />
    {:else}
    <AdvantageChart blueWin={R.blueWin} {scoreDiff} {areaDiff} current={pos} {showScore} {showArea}
           tip={chartTip} settled={chartSettled} onjump={i => { used("chart jump"); go(i); }} dots={chartDots}
           points={unit === "turn" ? [0, ...R.turns.map(t => t.end)] : undefined} />
    {/if}
  </div>
{/snippet}

{#snippet highlights()}
  <p class="mb-3 text-xs text-muted">Analyzed in your browser. Labels judge each move by the engine's win chance. ◆ marks a
    hard position. <a href="/how-reviews-work" target="_blank" rel="noopener noreferrer">How it works</a></p>
  <p class="mb-3.75">
    <strong>{ending}</strong>
    ({fmtScore(R.data.result.blue)} to {fmtScore(R.data.result.red)}{endedByRules ? "" : " on the board"}).
    {#if reviewRuns}The review is still running: the counts below are partial.{/if}
  </p>
  <!-- The game's own page, when its record's Site tag is an address (Lichess's way): back to the site it was played on. -->
  {#if siteLink}
    <p class="-mt-2 mb-3 text-sm"><a href={siteLink.href} target="_blank" rel="noopener noreferrer">View this game on {siteLink.host}</a></p>
  {/if}
  <!-- The positions searched deeper than the review by the position on screen's Depth (design 16), here or in the
       browser that a review file came from, and those that an older review searched at twice its depth: their results
       replace the review's, so this report follows them. The note names no cause: it has two. -->
  {#if deeperPositions}
    <p class="mb-3 text-xs text-muted">{deeperPositions} {deeperPositions === 1 ? "position was" : "positions were"} searched
      deeper than the review: the labels there, and this report, use the deeper searches.</p>
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
                   "[&_td+td]:whitespace-nowrap [&_td+td]:tabular-nums", reviewRuns && "[&_td+td]:italic [&_td+td]:text-muted"]}>
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

<!-- The engine's candidates: their table, and the line listed under it. -->
{#snippet engineTable()}
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
          <td class="italic text-muted" colspan="5">{k === 0 && !rows.length ? (over ? "The game is over." : "Not analyzed yet.") : ""}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  </div>
  {@render lineList()}
{/snippet}

<!-- The Analysis: the candidates table, or the book's table in its place, and the move list. -->
{#snippet analysisView()}
  {#if book?.ready}
    <!-- The book's table (design 32, items 3 and 8), with the switch in its title row: the engine's candidates under it
         when the player chooses them, and outside the book. While it shows the book, it takes at most a little over
         half the column, and scrolls, so that the move list keeps its room. -->
    <div class={["flex flex-col min-h-0", book.showsBook ? "flex-[0_1_auto] max-h-[55%] mb-3" : "flex-none"]}>
      <BookTable at={book.at} source={book.book.source} rows={book.rows} bind:show={book.show} bind:values={book.values}
                 bind:pointed={book.pointed} onplay={playBook} onretry={() => book.book.retry()}>
        {#snippet candidates()}{@render engineTable()}{/snippet}
        {#snippet outside()}
          {#if book.last >= 0}
            {@const to = path.slice(0, book.last)}
            <p class="mt-0.5 mb-1.5 text-xs text-muted">Last book position: turn {moveFrom(to).turn}.
              <button type="button" class="p-0 bg-transparent border-0 text-accent underline" onclick={() => setPath(to)}>Go there</button></p>
          {/if}
        {/snippet}
        {#snippet sentence(row, p)}
          <p class="text-sm">{row?.book ? moveSentence(p, row.book) : bestMoveSentence(p)}</p>
        {/snippet}
      </BookTable>
    </div>
  {:else}
    {@render engineTable()}
  {/if}
  <!-- A right-click, or a long press on a touch screen, anywhere in the move list opens the move menu (Bits UI's
       ContextMenu), not the browser's: on a branch's move with its actions. On the game's moves in a review, only the
       image's, since the game's line stays as it is and its moves are evaluated already. Elsewhere (the engine's line,
       a note) each action is off. -->
  <ContextMenu.Root onOpenChange={open => (menuAt = open ? performance.now() : 0)}>
  <ContextMenu.Trigger>
  {#snippet child({ props })}
  <!-- A click on a move does not focus it (Lichess's moves take no focus): the keys move through the game from the page,
       and a move kept in focus would show the browser's focus ring once a key is pressed, and take Space for itself. -->
  <div {...props} class={MOVE_LIST} bind:this={movelist}
       onpointerdowncapture={e => { pressAt = e.timeStamp; menuPath = (e.target as Element).closest<HTMLElement>("[data-path]")?.dataset.path ?? null; }}
       onclickcapture={e => { if (menuAt && pressAt < menuAt) { e.preventDefault(); e.stopPropagation(); } }}
       onmousedown={e => { if ((e.target as Element).closest("button")) e.preventDefault(); }}>
    {#if !rowsDrawn}
      <!-- Grey bars until the rows come (rowsDrawn), in one element for the frame they show: a bar for each turn, a
           turn's row apart (TURN_REM). -->
      <div class="w-[85%]" aria-hidden="true" style:height="{TURN_REM * R.turns.length}rem"
           style:background="repeating-linear-gradient(var(--panel-2) 0 0.75rem, transparent 0.75rem {TURN_REM}rem)"></div>
    {:else}
    {#each R.turns as t (t.number)}
      <!-- A turn's number, then its edges in two equal columns (Lichess's move list), each at least a move wide:
           with room to spare, the second edge starts halfway across. By turn, a last column judges the whole turn. -->
      <div class={turnRow(unit === "turn")}>
        <span class={TURN_NUMBER}>{t.number}.</span>
        {#if t.continued}<span class="px-[0.2rem] text-muted">…</span>{/if} <!-- its first edge was played before the start -->
        {#each t.edges as e (e.index)}
          {@const after = R.blueScore[e.index + 1]}
          {@const asked = !board || !!board.judged[mainKeys[e.index + 1]]} <!-- the board's moves: evaluated on request -->
          {@const judged = unit === "edge" && forSide(e.player) && asked ? (e.label ? `${LABEL_TEXT[e.label]}: ${costText(e.rawLoss, e.rawPoints)}` : "Not analyzed yet") : ""}
          {@const shown = forSide(e.player) ? e.label : null}
          <!-- On the board too, where the position has a result: from the complexity, as the board's `hard` is the record's,
               on the moves evaluated only (onlyJudged). -->
          {@const hard = forSide(e.player) && isHard(e.complexity)}
          <!-- A move fills its column. By edge, its label, the hard position's ◆ and its loss stand together at the
               column's right, as a turn's do at the turn's right, so that they line up down the list. The loss is
               last, where Lichess's move list has its evaluation: the mover's points lost, so that a number never needs
               a side to read. The lead after the move is in its note. The move's text has one width, so a column is never
               narrower than the widest move: the widest in the notation is 8 characters (D10-G10x), then by edge the
               label's slot (2.2 characters: a badge, or ?? as text). The loss: at most 5 characters (−1.2k), smaller and
               right-aligned. The font is monospaced, so ch is one character of the span's own size. Before the loss, by edge
               and by turn, a slot for a hard position's ◆ (design 14) on every row, marked or not: a mark never moves
               the label or widens the column. The ◆ marks the position before the move (by turn, the turn's harder),
               on the board too, wherever that position has a result: the board's tooltips say where it has none. -->
          <button data-path={mainKeys[e.index + 1]}
                  class={moveButton(e.player, mainAt === e.index + 1 ? MOVE_HERE : pickedKey === mainKeys[e.index + 1] ? PICKED : MOVE_HOVER)}
                  onclick={() => go(e.index + 1, true)} onmouseenter={() => startPreview({ kind: "move", index: e.index })} onmouseleave={endPreview} tabindex="-1"
                  title={tooltip(judged, after !== undefined ? `Lead: ${sideText(after, 1)}` : "", unit === "edge" && board ? searchNote(hard, [R.data.analysis[e.index]]) : "")}>
            <span class={MOVE_TEXT}>{moveNotation(e)}</span>
            {#if unit === "edge"}
              <span class="w-[2.2ch] ml-auto">{#if listed(shown)}{@render mark(shown)}{/if}</span>
              <span class="w-[1.2ch] text-[0.8em] text-muted text-center" title={hard ? HARD_NOTE : undefined}>{hard ? "◆" : ""}</span>
              <span class="w-[5ch] text-[0.78em] text-right text-muted tabular-nums">{forSide(e.player) ? lossShort(e) : ""}</span>
            {/if}
          </button>
        {/each}
        <!-- By turn: the turn's glyph and its loss, in the same font and sizes as an edge's by edge, and the turn's note
             with each edge's points. -->
        {#if unit === "turn" && forSide(t.player)}
          {@const hard = isHard(t.complexity)}
          <span class="col-start-4 flex items-baseline gap-1 px-[0.2rem] py-px font-mono text-[0.95em] whitespace-nowrap {SIDE_TEXT[t.player]}"
                title={tooltip(t.label ? `${LABEL_TEXT[t.label]}: ${turnCost(t)}` : board && !t.edges.every(e => board.judged[mainKeys[e.index + 1]]) ? "" : "Not analyzed yet",
                               board ? searchNote(hard, t.edges.map(e => R.data.analysis[e.index])) : "")}>
            <span class="w-[2.2ch]">{#if listed(t.label)}{@render mark(t.label)}{/if}</span>
            <span class="w-[1.2ch] text-[0.8em] text-muted text-center" title={hard ? HARD_NOTE : undefined}>{hard ? "◆" : ""}</span>
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
    {/if}
  </div>
  {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content class="z-10 min-w-48 menu-box">
      {#if board}
        {@const form = board}
        <ContextMenu.Item disabled={!menuPath || !(menuPath in branches)} onSelect={() => { if (menuPath) { used("main line made"); form.onmain(menuPath.split(" ")); } }}
                          class={MENU_ITEM}>Make main line</ContextMenu.Item>
      {/if}
      <ContextMenu.Item disabled={!!snapshot || !canPromote(menuBranch)} onSelect={() => { if (menuBranch) { used("branch promoted"); game?.promote(menuBranch.split(" ")); } }}
                        class={MENU_ITEM}>Promote variation</ContextMenu.Item>
      <ContextMenu.Item disabled={!!snapshot || !menuBranch || (game?.turnKeys(menuBranch.split(" ")) ?? [menuBranch]).every(k => !!branches[k]?.judged || !!board?.judged[k])}
                        onSelect={() => { if (menuBranch) { used("quality evaluated"); game?.judge(menuBranch.split(" ")); } }} class={MENU_ITEM}>Evaluate quality</ContextMenu.Item>
      <ContextMenu.Separator class="my-1 h-px bg-line" />
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger disabled={!menuPath} class="{MENU_ITEM} flex items-center justify-between gap-4 data-[state=open]:bg-panel">
          Generate image<span aria-hidden="true" class="text-muted">›</span>
        </ContextMenu.SubTrigger>
        <ContextMenu.SubContent class="z-10 min-w-36 menu-box" sideOffset={6}>
          <ContextMenu.Item onSelect={() => menuPath && copyImage(menuPath)} class={MENU_ITEM}>Copy static</ContextMenu.Item>
          <ContextMenu.Item onSelect={() => menuPath && saveImage(imageOf(menuPath))} class={MENU_ITEM}>Save static</ContextMenu.Item>
          {#if menuLineEdges}
            <ContextMenu.Item onSelect={() => menuPath && saveImage(imageOf(menuPath, true))} class={MENU_ITEM}>Save animated</ContextMenu.Item>
          {/if}
        </ContextMenu.SubContent>
      </ContextMenu.Sub>
      <ContextMenu.Separator class="my-1 h-px bg-line" />
      <ContextMenu.Item disabled={!!snapshot || !menuBranch} onSelect={() => menuBranch && deleteFrom(menuBranch)} class={MENU_ITEM}>Delete from here</ContextMenu.Item>
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
     (Lichess's way inside a variation). Pointing at a move shows its line on the board, from where it leaves the game, up
     to that move (branchPreview). -->
{#snippet branchGroup(rows: BranchRow[], engine: EngineBranch | null)}
  {@const lines = treeLines(rows)}
  {@const engineStart = engine ? pathKey(engine.paths[0]) : null}
  {#each rows as row, r (r)}
    {@const rule = (depth: number) => `${depth - 0.55}rem`}
    <!-- A row of the engine's line gleams as the progress bars do while its position's search can still change it (the
         review's passes, or the position on screen): its first choice can change,
         and its line grows. -->
    {@const gleams = !!engine && row.paths.some(p => engine.steps.has(pathKey(p))) && !!game?.pending(engine.search)}
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
        {@const hardness = branchHardness(p)}
        {#if node}
          {@render turnMark(t, k)}
          {#if display.branchForm === "text"}
            <button class={["mv px-[0.2rem] py-px bg-transparent border-0 whitespace-nowrap", SIDE_TEXT[node.move.player],
                            at ? "here bg-panel-2 outline outline-accent -outline-offset-1" : pickedKey === pathKey(p) ? PICKED
                            : "hover:bg-panel-2 hover:outline hover:outline-line hover:-outline-offset-1"]}
                    onclick={() => setPath(p, true)} onmouseenter={() => startPreview({ kind: "branch", path: p })} onmouseleave={endPreview} tabindex="-1"
                    data-path={pathKey(p)} title={tooltip(label ? LABEL_TEXT[label] : waiting ? "Evaluating…" : "", hardness?.note)}>{moveNotation(node.move)}</button>
          {:else}
            <button class={["mv flex p-[0.08em] bg-transparent border-0 rounded-full",
                            at ? "here outline-2 outline-accent" : pickedKey === pathKey(p) ? PICKED : "hover:outline hover:outline-ink"]}
                    onclick={() => setPath(p, true)} onmouseenter={() => startPreview({ kind: "branch", path: p })} onmouseleave={endPreview} tabindex="-1"
                    data-path={pathKey(p)} title={tooltip(`${turnText(t)} ${moveNotation(node.move)}`, label ? LABEL_TEXT[label] : waiting ? "evaluating…" : "", hardness?.note)}>
              {@render edgeShape(node.move.edge, node.move.player)}
            </button>
          {/if}
          {#if listed(label)}<span class="-ml-0.5 text-[0.9em]">{@render mark(label)}</span>
          {:else if waiting}<span class="-ml-0.5 text-[0.9em] text-muted animate-pulse motion-reduce:animate-none" title="Evaluating…">…</span>{/if}
          <!-- A hard position's ◆, small and muted as the move list's, with no slot of its own, as a branch's labels have
               none. -->
          {#if hardness?.hard}<span class="-ml-0.5 text-[0.8em] text-muted" title={HARD_NOTE}>◆</span>{/if}
        {:else if engine && step}
          {@render engineEdge(engine, p, step, k)}
        {/if}
      {/each}
    </div>
  {/each}
{/snippet}

<!-- A branch edge's turn number, before the row's first edge and each turn's first: every turn has its number. -->
{#snippet turnMark(t: { turn: number; first: boolean }, k: number)}
  {#if k === 0 || t.first}<span class={["text-muted text-[0.9em]", k > 0 && "ml-1"]}>{turnText(t)}</span>{/if}
{/snippet}

<!-- A branch edge without its notation: a pill along its direction, or a dot, in its mover's colour (the display
     setting). -->
{#snippet edgeShape(edge: Edge | null, player: Player)}
  {#if display.branchForm === "pills"}{@render edgePill(edge, player, false, null, "")}
  {:else}<span class={["block w-[0.85em] h-[0.85em] rounded-full", SIDE_BG[player]]}></span>{/if}
{/snippet}

<!-- An edge of the engine's best line that the player has not played (engineBranch): after candidate 1's badge, as a
     branch's edge, a little faded, so that it reads as the engine's and the player's own edges as theirs. It is not
     kept, and follows the search. Pointing at it previews the line up to it on the board, and a click plays the line up
     to there as a branch (as the listed line's click does), which then shows here as the player's own. -->
{#snippet engineEdge(engine: EngineBranch, p: string[], step: EngineStep, k: number)}
  {@const e = engine.line[step.k]}
  {@const note = `${turnText(step.turn)} ${edgeName(e)} · the engine's line · play it to here`}
  {@render turnMark(step.turn, k)}
  {#if display.branchForm === "text"}
    <button class={["mv px-[0.2rem] py-px bg-transparent border-0 whitespace-nowrap opacity-75 hover:opacity-100 hover:bg-panel-2", SIDE_TEXT[step.mover]]}
            onclick={() => playPath(p, "engine line played")} onmouseenter={() => startPreview({ kind: "engine", start: engine.start, line: engine.line, k: step.k })}
            onmouseleave={endPreview} tabindex="-1" title={note}>{edgeName(e)}</button>
  {:else}
    <button class="mv flex p-[0.08em] bg-transparent border-0 rounded-full opacity-75 hover:opacity-100 hover:outline hover:outline-ink"
            onclick={() => playPath(p, "engine line played")} onmouseenter={() => startPreview({ kind: "engine", start: engine.start, line: engine.line, k: step.k })}
            onmouseleave={endPreview} tabindex="-1" title={note}>
      {@render edgeShape(e, step.mover)}
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
  <div id="display-settings" role="region" aria-label="Display settings" class="flex flex-col flex-1 min-h-0" {@attach intoView}>
    <div class="flex items-center justify-between mb-1">
      <h2 class="font-semibold">Display settings</h2>
      <button class="px-2 py-0.5 text-sm" onclick={() => (settingsOpen = false)}>Done</button>
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto pr-1">
      <h3 class={SETTINGS_HEAD}>{board ? "Labels" : "Review"}</h3>
      {@render choice(board ? "Labels by" : "Review by", board ? "Each turn as a whole, or each edge: the labels and the move list's numbers. A turn's note gives its edges' points."
        : "Each turn as a whole, or each edge: the labels, the move list's numbers, the counts and the chart. A turn's note gives its edges' points.",
        [["turn", "Turn"], ["edge", "Edge"]], () => display.judge, v => (display.judge = v as Display["judge"]))}
      {#if !board}<!-- the board's labels are the moves asked for, on both sides -->
        {@render choice("Review for", "Both players, or one: the labels, numbers, notes and the engine's lines of that player's moves. The counts keep both.",
          [["both", "Both"], ["blue", "Blue"], ["red", "Red"]], () => display.reviewFor, v => (display.reviewFor = v as Display["reviewFor"]))}
      {/if}
      <h3 class={SETTINGS_HEAD}>Board</h3>
      {@render choice("Win chance", "A bar above the board, or a gauge beside it.",
        [["bar", "Top horizontal bar"], ["gauge", "Side vertical gauge"]], () => display.win, v => (display.win = v as "bar" | "gauge"))}
      {@render toggle("Candidates", "The engine's choices on the board, with their ranks.",
        () => display.layers.candidates, v => (display.layers.candidates = v))}
      {@render toggle("Move labels", "Move quality badges on the turn just played.",
        () => display.layers.marks, v => (display.layers.marks = v))}
      {@render toggle("Regions", "Shading on the areas each player encloses.",
        () => display.layers.regions, v => (display.layers.regions = v))}
      {@render toggle("Area map", "Shades or marks each point from the engine's forecast, in the style below. While a line or a preview shows, the map shows the position after its last drawn edge. The key t shows or hides the map.",
        () => mapOn, v => (display.areaMap[mapPage] = v))}
      {@render choice("Area map style", "Forecast: who the engine expects to hold each point, and how surely. Forecast vs board: what the engine expects to happen next, whoever moves. Dots show open area that a player will probably close. Hatching shows closed area that its owner will probably lose. After vs before: how the last move, or the line on the board, changed the forecast for the player who moved. A plus in that player's colour shows a rise. A minus in the opponent's colour shows a fall.",
        Object.entries(MAP_STYLE_NAME), () => display.mapStyle, v => (display.mapStyle = v as Display["mapStyle"]))}
      <div class="flex items-center justify-between gap-3 py-1.5">
        <div class="min-w-0">
          <label for="setting-map-min" class="text-sm font-medium">Smallest value marked</label>
          <p class="text-xs text-muted">{MAP_STYLE_NAME[display.mapStyle]}: from 0 to 1. At 0, the map marks every point that has a value. Hold the pointer over a point to see its numbers.</p>
        </div>
        <span class="text-sm tabular-nums">{valueText(display.mapMin[display.mapStyle])}</span>
        <input id="setting-map-min" type="range" min="0" max="100" step="5" value={display.mapMin[display.mapStyle]}
               oninput={e => (display.mapMin[display.mapStyle] = e.currentTarget.valueAsNumber)}
               class="w-28 flex-none accent-(--accent)" />
      </div>
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
      {@render toggle("Preview branches", "Pointing at a branch's move draws its line on the board, from where it leaves the main line, as the engine's line.",
        () => display.previewBranches, v => (display.previewBranches = v))}
      {@render choice("Branches and lines", "Each edge as a pill along its direction, a dot, or its notation. In the engine's line, the pills and dots carry the board's numbers.",
        [["pills", "Pills"], ["dots", "Dots"], ["text", "Notation"]], () => display.branchForm,
        v => (display.branchForm = v as Display["branchForm"]))}
      <SoundSettings sound={display.sound} moveSound={display.moveSound} volume={display.volume} set={v => Object.assign(display, v)} />
      <h3 class={SETTINGS_HEAD}>Keyboard</h3>
      <div class="flex items-start justify-between gap-3 py-1.5">
        <div class="min-w-0">
          <p class="text-sm font-medium">Keys and clicks</p>
          <p class="text-xs text-muted">The keys for moving through the game and its branches, and what the clicks do. The key t shows or hides the area map, and Shift + t goes to its next style. The key x shows or hides the threat.{book?.ready ? " The key o shows the book's moves or the engine's candidates." : ""}</p>
        </div>
        <button class="flex-none px-2 py-0.5 text-sm" onclick={() => (keysOpen = true)}>Show <kbd class="kbd">?</kbd></button>
      </div>
      {#if !board}<!-- the board has no chart -->
        <h3 class={SETTINGS_HEAD}>Advantage chart</h3>
        {@render toggle("Score line", "Shown when a review opens: the score difference after each edge, above the middle when Blue leads. Its box under the chart shows or hides it for the moment.",
          () => display.scoreLine, v => (display.scoreLine = v))}
        {@render toggle("Area line", "Shown when a review opens: the difference of the areas each player encloses, above the middle when Blue's is larger. Its box under the chart shows or hides it for the moment.",
          () => display.areaLine, v => (display.areaLine = v))}
      {/if}
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
        <!-- A game's network off the menu (an earlier one, which the site still ships): the Network setting has none
             chosen, so the note names it. -->
        <p class="mb-1.5 text-xs text-muted">{#if ownSettings === "mark"}This game keeps the network and depth per move of
          its last review, so that the review opens as the engine made it. A change of the depth here applies to this game
          only.
          {:else}This game came with a network and depth per move, from a review file or a shared link. It keeps them, so
          that its review stays the one it came with. A change of them here applies to this game only.{/if}
          {#if !offersNetwork(e.network)}Its network, {networkName(e.network)}, is an earlier one, and the Network setting
            does not offer it. Choose a network there to review the game again with it.{/if}</p>
      {/if}
      <h3 class={SETTINGS_HEAD}>Position on screen</h3>
      {@render visitsSteps("Depth", board ? "How far to search it." : "How far to search it. Deeper than the review, it also updates the review there: the labels and the report.",
        DEPTHS, () => e.visits, v => set({ visits: v }))}
      {@render steps("Time limit", "Stop sooner if this runs out.", TIME_LIMITS.length, () => TIME_LIMITS.indexOf(e.seconds),
        k => set({ seconds: TIME_LIMITS[k] }), k => (TIME_LIMITS[k] === null ? "None" : `${TIME_LIMITS[k]} s`))}
      <!-- On the board, the review's depth sets only how deep "Evaluate quality" searches (design 21). -->
      <h3 class={SETTINGS_HEAD}>{board ? "Evaluate quality" : "Game review"}</h3>
      {@render choice(board ? "Depth" : "Depth per move",
        `${board ? "How far it searches the positions before and after the move. " : ""}Lite: ${REVIEW_PRESETS.lite} visits. Standard: ${REVIEW_PRESETS.standard.toLocaleString("en")}, surer labels in twice the time.`,
        [["lite", "Lite"], ["standard", "Standard"], ["custom", "Custom"]], () => e.review, v => set({ review: v as ReviewDepth }))}
      {#if e.review === "custom"}
        {@render visitsSteps("Custom", "", CUSTOM_REVIEW, () => e.customReview, v => set({ customReview: v }))}
      {/if}
      <h3 class={SETTINGS_HEAD}>Engine</h3>
      {@render choice("Network", `Lite has ${NETWORKS[0].params} parameters, the other ${NETWORKS[1].params}: stronger per visit but about 3× slower. A change ${board ? "searches the positions again" : "reviews the game again"}. A network downloads once, and the browser keeps it.`,
        NETWORKS.map(n => [n.id, networkLabel(n.id)]), () => e.network, v => set({ network: v }))}
      {@render steps("Workers", "Positions searched at the same time. Each worker uses more of your computer's memory. Use only as many workers as your computer's memory can hold.", maxWorkers(),
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

<!-- A line of the Advantage chart that the reader can show or hide, in the chart's legend: its box, its colour, its name. -->
{#snippet lineBox(name: string, swatch: string, tint: string, get: () => boolean, set: (v: boolean) => void)}
  <label class="inline-flex items-center gap-1 select-none">
    <input type="checkbox" class="size-3 m-0 flex-none cursor-pointer {tint}" checked={get()} onchange={e => set(e.currentTarget.checked)} />
    <span class="inline-block w-[1.2em] h-0.5 {swatch}"></span> {name}
  </label>
{/snippet}

<!-- A setting that is on or off: its name and what it does, and a switch at the right. -->
{#snippet toggle(label: string, help: string, get: () => boolean, set: (v: boolean) => void)}<SettingToggle {label} {help} {get} {set} />{/snippet}

<!-- A choice of a few: its name and what it does, then the options side by side. -->
{#snippet choice(label: string, help: string, options: [string, string][], get: () => string, set: (v: string) => void)}<SettingChoice {label} {help} {options} {get} {set} />{/snippet}

<!-- The review's skeleton (Nielsen Norman Group's skeleton screen), while the engine's rules read the game: the layout
     of the review below, with its columns, the board and the charts at their sizes, and grey bars for the text. The
     review then takes its place, part for part. `three`: the summary's own column (WIDE). `gauge`: the win chance as a
     gauge (display.ts). `players`: their names. `board`: the Analysis board's form, with no chart, its sides for
     names, and its own line while the engine's rules set the board up (design 21). -->
{#snippet reviewSkeleton(three: boolean, gauge: boolean, players: { blue: string; red: string }, board: boolean)}
  <main class={["review select-none", three && "wide", board && "board-form", gauge && "gauge-mode"]} aria-busy="true"
        {@attach measureStrip}
        style:--side-h="max(var(--column), calc(100vh - var(--site-header) - 2rem))">
    {#if three}
      <aside class="summary-col {PANEL} flex flex-col overflow-hidden">
        {@render skeletonHead()}
        {#each [90, 70, 80] as w (w)}<div class="h-3 mb-2.5 {BONE}" style:width="{w}%"></div>{/each}
        <div class="h-5 mt-3 mb-4 w-3/4 {BONE}"></div>
        {#each Array(8) as _, k (k)}<div class="h-4 mb-2.5 {BONE}"></div>{/each}
      </aside>
    {/if}
    <section class="board-col">
      <div class={["mb-2 ml-(--gauge-w)", stripBox(gauge)]} data-strip>
        <div class={stripRow(gauge)}>
          <PlayerCardSkeleton player={0} name={players.blue} tag={board ? null : PLAYER_NAME[0]} />
          {#if gauge}<div></div>{:else}<div class="h-[1.15rem] {BONE}"></div>{/if}
          <PlayerCardSkeleton player={1} name={players.red} tag={board ? null : PLAYER_NAME[1]} />
        </div>
      </div>
      <div class="flex">
        {#if gauge}<div class="flex-none self-stretch w-4 mr-1.5 {BONE}"></div>{/if}
        <!-- The empty board: its colour and its points, where the board draws them. -->
        <div class="board-wrap relative aspect-square rounded overflow-hidden bg-board"><div class="board-points"></div></div>
      </div>
      {#if !board}
        <div class="chart-area flex flex-col ml-(--gauge-w)">
          <div class="h-3 w-48 mb-1.5 {BONE}"></div>
          <div class="flex-1 {BONE}"></div>
        </div>
      {/if}
    </section>
    <section class="side {PANEL} flex flex-col overflow-hidden">
      {#if board}<p class="mb-2 text-xs text-muted truncate" role="status">Setting up the board with the engine's rules…</p>
      {:else if !three}{@render skeletonHead()}{/if}
      <div class="h-5 mb-2 {BONE}"></div>
      <div class="h-3 mb-3 w-2/3 {BONE}"></div>
      {#each Array(5) as _, k (k)}<div class="h-5 mb-1.5 {BONE}"></div>{/each}
      <div class="movelist flex-1 min-h-0 mt-2 pt-3 border-t border-line overflow-hidden">
        {#each Array(24) as _, k (k)}<div class="h-4 mb-3 {BONE}" style:width="{k % 3 === 2 ? 55 : 85}%"></div>{/each}
      </div>
      <!-- The step bar, where the review's is: on a phone, fixed to the bottom of the window (StepBar). -->
      <div class="step-dock mt-1.5 pt-1.5 border-t border-line">
        <div class="h-3 mb-2 w-1/2 {BONE}"></div>
        <div class="h-7 {BONE}"></div>
      </div>
    </section>
  </main>
{/snippet}

<!-- The skeleton's head: the review's progress slot, empty, and what the page does. -->
{#snippet skeletonHead()}
  <div class="mb-2.5 h-[2.75rem]">
    <div class="h-1.5 rounded-[3px] bg-panel-2"></div>
    <p class="mt-1 text-xs text-muted truncate" role="status">Reading the game with the engine's rules…</p>
  </div>
{/snippet}

<!-- The page's text is a tool's, not a document's: it takes no selection, so the pointer stays an arrow over it. An
     engine error can be selected, to be copied. -->
<main class={["review select-none", threeCols && "wide", board && "board-form", display.win === "gauge" && "gauge-mode"]} style:--side-h={sideHeight ? `${sideHeight}px` : undefined}
      style:--strip={stripHeight ? `calc(${stripHeight}px + 0.5rem)` : null}>
  {#if threeCols}
    <aside class="summary-col {PANEL} flex flex-col overflow-y-auto">
      {@render panelHead()}
      {@render highlights()}
    </aside>
  {/if}

  <section class="board-col" bind:this={boardCol}>
    <!-- The players face each other left and right, as they start: Blue at A10-D10, Red at Q10-T10. The win-chance bar
         is between them. With the gauge, the row keeps the players, and starts after the gauge, at the board's edge. -->
    <div class={["mb-2 ml-(--gauge-w)", stripBox(display.win === "gauge")]} bind:offsetHeight={stripHeight}>
    <PlayerRow gauge={display.win === "gauge"} label={display.win === "bar" ? "Players, scores and win chance" : "Players and scores"}>
      {#snippet blue()}{@render player(0)}{/snippet}
      {#snippet red()}{@render player(1)}{/snippet}
      {#snippet bar()}
        <ShareBar share={blueWin} labels={[pct(blueWin), pct(1 - blueWin)]} empty="not analyzed yet" title="Win chance from the engine's search" />
      {/snippet}
    </PlayerRow>
    </div>
    <div class="flex">
      {#if display.win === "gauge"}
        <ShareBar upright share={blueWin} labels={[pct(blueWin), pct(1 - blueWin)]}
                  title={Number.isNaN(blueWin) ? "Win chance: not analyzed yet" : `Blue's win chance ${pct(blueWin)}`} />
      {/if}
      <div class="board-wrap relative rounded overflow-hidden" bind:this={boardWrap}>
        <!-- While a branch's preview shows, the board is at the row's start, with the row as its line; while a played
             move's shows, at the position after it. Nothing of the position on screen: no candidates, labels or own
             moves. -->
        <Board
          position={branchPreview?.from ?? movePreview?.position ?? position}
          cut={branchPreview ? null : movePreview ? movePreview.move.cut : lastPlayed?.cut ?? null}
          candidates={previewing ? [] : numbers.candidates}
          highlight={previewing ? null : numbers.highlight}
          line={branchPreview ? previewLine : movePreview ? null : drawnLine}
          lineShape={!previewing && threatShown ? "triangle" : "circle"}
          oncandidateclick={numbers.click}
          oncandidatedblclick={numbers.dblclick}
          pending={input.pending}
          ends={input.ends}
          active={input.active}
          onpoint={input.rules && !previewing ? input.click : undefined}
          onlyActive
          preview={line || previewing ? null : hover ?? (picked ? parseEdge(picked.at(-1)!) : null)}
          previewPlayer={mover}
          marks={previewing ? [] : marks}
          layers={display.layers}
          areaMap={shownMap}
          onpointat={p => (mapPoint = p)}
          oncandidate={numbers.point}
          notes={previewing ? [] : notesAt[here] ?? []}
          onnotes={previewing ? undefined : n => { if (n.length > (notesAt[here]?.length ?? 0)) used("note drawn"); notesAt[here] = n; }}
        />
        <!-- The board's empty margin above its top row (design 30): the area map's switch, then its legend. The switch:
             off or one of the three styles, one click for each, on both pages. Its buttons take no focus from the page,
             whose keys step through the game. The legend, in one line: what the map shows, the position that the map
             is from while a line or a preview shows (mapPlace), and in the change and difference styles each mark's
             look. The point under the pointer shows its numbers there in its place. A text too long for the width ends
             in an ellipsis. -->
        <div class="map-margin absolute inset-x-0 top-0 flex items-center gap-2 px-1 pointer-events-none">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div role="radiogroup" aria-label="Area map style" tabindex="-1" onmousedown={e => e.preventDefault()}
               class="map-switch flex flex-none h-4/5 max-h-6 p-px gap-px rounded border border-line bg-panel-2 pointer-events-auto">
            {#each MAP_SWITCH as value (value)}
              {@const on = value === "off" ? !mapOn : mapOn && display.mapStyle === value}
              {@const name = value === "off" ? "Area map off" : MAP_STYLE_NAME[value]}
              <button role="radio" aria-checked={on} aria-label={name} title={name} tabindex={on ? 0 : -1}
                      class={["h-full aspect-square p-0.5 border-0 rounded-sm", on ? "bg-accent text-on-accent" : "bg-transparent text-muted hover:text-ink"]}
                      onclick={() => setMap(value)}>
                <svg class="size-full" viewBox="0 0 1 1" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="0.1" stroke-linecap="round">
                  {#if value === "off"}
                    <circle cx="0.5" cy="0.5" r="0.32" /><path d="M0.27 0.73L0.73 0.27" />
                  {:else if value === "ownership"}
                    <rect x="0.15" y="0.15" width="0.7" height="0.7" rx="0.08" /><path d="M0.15 0.15H0.85L0.15 0.85Z" fill="currentColor" stroke="none" />
                  {:else if value === "change"}
                    {#each [0.3, 0.7] as x (x)}{#each [0.3, 0.7] as y (y)}<circle cx={x} cy={y} r="0.1" fill="currentColor" stroke="none" />{/each}{/each}
                  {:else}
                    <path d="M0.5 0.12V0.48M0.32 0.3H0.68M0.32 0.75H0.68" />
                  {/if}
                </svg>
              </button>
            {/each}
          </div>
        {#if mapWork && !mapReading}
          <span class={["flex-none px-1.5 py-px rounded bg-panel-2 text-xs text-muted whitespace-nowrap", mapWork.busy && "bar-glider"]}
                role="status">{mapWork.text}</span>
        {/if}
        {#if shownMap}
          <div class="map-legend flex flex-1 min-w-0 justify-center items-center gap-3 pr-1 text-xs text-muted whitespace-nowrap overflow-hidden" aria-label="Area map">
            {#if mapReading}
              <span>{mapReading}</span>
            {:else}
              <span class="min-w-0 truncate">{mapLegend.lead}</span>
              {#each mapLegend.marks as m (m.kind)}
                <span class="inline-flex flex-none items-center gap-1">
                  <svg class="size-3" viewBox="0 0 1 1" aria-hidden="true">
                    {#if m.kind === "close"}
                      {#each [0.25, 0.75] as x (x)}{#each [0.25, 0.75] as y (y)}<circle cx={x} cy={y} r="0.11" fill="currentColor" />{/each}{/each}
                    {:else if m.kind === "lose"}
                      {#each [-0.4, 0, 0.4, 0.8] as d (d)}<line x1={d} y1="1" x2={d + 1} y2="0" stroke="currentColor" stroke-width="0.1" />{/each}
                    {:else}
                      <path d={m.kind === "fall" ? "M0.15 0.5H0.85" : "M0.5 0.15V0.85M0.15 0.5H0.85"} stroke-width="0.16" stroke-linecap="round"
                            style:stroke={m.side === 0 ? "var(--blue)" : "var(--red)"} />
                    {/if}
                  </svg>{m.text}
                </span>
              {/each}
            {/if}
          </div>
        {/if}
        </div>
      </div>
    </div>
    {#if !board}<div class="chart-area flex flex-col ml-(--gauge-w)">{@render charts()}</div>{/if}
  </section>

  <section class="side {PANEL} flex flex-col">
    {#if !threeCols}
      {@render panelHead()}
    {/if}
    {#if settingsOpen}
      {@render settingsPanel()}
    {:else}
    <!-- The position's engine header, as Lichess's engine box: a line with the engine's switch (the l key too), the
         search's progress and visits, and the engine settings' gear, and under it the values, across the column. -->
    <div class="mb-1.5">
      <div class="flex items-center gap-2">
        {#if engine && onengine && snapshot}
          <!-- A snapshot searches nothing (design 20): its switch shows off and does not move, and a click on it lights the
               snapshot's bar. A disabled switch takes no click, so its wrapper does; the e and l keys do the same. -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span class="flex-none inline-flex cursor-not-allowed" onclick={nudge}>
            <Switch.Root checked={false} disabled aria-label="Engine" title="Engine off: this review is a snapshot"
                         class={[SWITCH, "pointer-events-none opacity-60"]}>
              <Switch.Thumb class={SWITCH_THUMB} />
            </Switch.Root>
          </span>
        {:else if engine && onengine}
          {@const set = onengine}
          <Switch.Root checked={engine.on} onCheckedChange={v => set({ on: v })} aria-label="Engine" title="Engine on or off"
                       class={SWITCH}>
            <Switch.Thumb class={SWITCH_THUMB} />
          </Switch.Root>
        {/if}
        <div class={["flex-1 h-[3px] rounded-sm overflow-hidden bg-panel-2", searching && "bar-glider"]} role="progressbar"
             aria-label={threatOn ? "The threat's search" : "This position's search"} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(100 * (searched ?? 0))}>
          {#if searched !== null}<div class="h-full bg-accent transition-[width] duration-200" style="width: {100 * searched}%"></div>{/if}
        </div>
        <!-- The words and the visits are two elements: the visits that replace the words are new, and move nothing. -->
        {#if waitsForNetwork}<span class="text-xs text-muted whitespace-nowrap">{NETWORK_LOADS}</span>
        {:else if shownSearch}<span class="text-xs text-muted tabular-nums whitespace-nowrap">{shownSearch.visits.toLocaleString("en")}{searched !== null && searched < 1 ? ` of ${deepVisits.toLocaleString("en")}` : ""} visits{timedOut ? " · time limit" : ""}</span>{/if}
        <!-- The threat's switch (Lichess's "Show threat" in its engine box, the key x), before the gear. A snapshot shows a
             threat only where the store has it: the switch's note says why. -->
        {#if game}
          <button class="flex-none px-1.5 py-0 aria-pressed:border-accent aria-pressed:text-accent" aria-pressed={threatOn}
                  aria-label="Show threat" title={snapshot ? "Show threat: a snapshot shows only a threat that was saved. Snapshots do no searches."
                    : "Show threat: the opponent's best turn if you pass"}
                  onclick={toggleThreat}>
            <svg class="inline-block size-[1em] align-[-0.125em]" viewBox="0 0 1 1" aria-hidden="true" fill="none" stroke="currentColor"
                 stroke-width="0.09" stroke-linecap="round">
              <circle cx="0.5" cy="0.5" r="0.3" /><path d="M0.5 0.05V0.32M0.5 0.68V0.95M0.05 0.5H0.32M0.68 0.5H0.95" />
            </svg>
          </button>
        {/if}
        {#if engine && onengine}
          <button class="flex-none px-1.5 py-0 aria-expanded:border-accent aria-expanded:text-accent" aria-label="Engine settings"
                  title="Engine settings" aria-expanded={engineOpen} aria-controls="engine-settings"
                  onclick={() => (engineOpen = !engineOpen)}>⚙</button>
        {/if}
      </div>
      <p class="mt-1 text-xs text-muted tabular-nums">
        {#if threatOn}
          <!-- The threat's values: the position after the pass, as Lichess's engine box shows its threat's evaluation. -->
          {#if threat?.lead !== undefined}
            If {PLAYER_NAME[mover]} passes: margin
            <strong class="text-ink">{sideText(threat.margin!, 0, "0")} ± {Math.round(threat.spread!)}</strong>
            · lead {sideText(threat.lead, 0, "0")}
          {:else}If {PLAYER_NAME[mover]} passes: not analyzed yet{/if}
        {:else if analysis?.lead !== undefined}
          <!-- Who is ahead, with the side named, as everywhere on the page. -->
          Expected final margin
          <strong class="text-ink">{sideText(analysis.margin!, 0, "0")} ± {Math.round(analysis.spread!)}</strong>
          · lead {sideText(analysis.lead, 0, "0")}
        {:else if over}
          Final margin <strong class="text-ink">{sideText(position.scores[0] - position.scores[1], 1, "0")}</strong>
        {:else}Not analyzed yet{/if}
      </p>
      {#if !engineOpen && threatOn}
        <!-- With the threat on, the third row gives what the pass costs, in the units of a move's loss (design 10), or
             why no threat shows. -->
        <p class={["h-4 mt-1 text-xs text-muted tabular-nums truncate", threatNote?.busy && "bar-glider"]} role="status"
           title={threatNote?.title}>{threatNote?.text ?? ""}</p>
      {:else if !engineOpen}
        <!-- The position's difficulty (design 14), in one row: a hard position's ◆, in a slot as wide as the move list's,
             the network's likely edges, and the complexity as a loss, as the notes write losses. The likely edges are a
             meter, as Maia's Blunder Meter shows a human's likely moves: the prior of the searched edges by the group of
             their loss, in the labels' colours. The rest of the bar, the panel's grey, is the prior of the edges the
             search did not visit. The number has the width of the longest (−99.9%), so that the meter keeps its width
             from one position to the next. Until the search gives the position's edges, the row keeps its height (an
             empty slot, the grey bar, no number): the table under it does not move. The engine settings cover it: it
             says nothing about them. -->
        <div class="flex items-center gap-1.5 h-4 mt-1 text-xs text-muted tabular-nums" role={difficultyNote ? "img" : undefined}
             aria-label={difficultyNote} aria-hidden={!difficultyNote} title={difficultyNote}>
          <span class="w-[1.2ch] text-center text-ink">{isHard(difficulty) ? "◆" : ""}</span>
          <div class="flex flex-1 h-1.5 rounded-full overflow-hidden bg-panel-2">
            {#if meter}{#each METER_GROUPS as g (g)}<span class="h-full" style:width="{100 * meter[g]}%" style:background="var(--{g}-fill)"></span>{/each}{/if}
          </div>
          <span class="w-[6.5ch] text-right whitespace-nowrap">{difficulty !== undefined ? costText(difficulty) : ""}</span>
        </div>
      {/if}
    </div>
    {#if engineOpen && engine && onengine}
      {@render engineSettingsPanel(engine, onengine)}
    {:else if !tabbed}
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

    <!-- The step controls and the display settings' button, at the bottom of the analysis column (Lichess's place), in
         the bar that Practice shares (StepBar), under the status line. On a phone the bar is fixed to the bottom of the
         window, the status line with it: it says what an edge on the board needs next. -->
    <StepBar class="mt-1.5 pt-1.5 border-t border-line" onfirst={() => setPath([])} onback={back} onforward={forward} onlast={toEnd}>
      {#snippet above()}<p class="mb-1.5 text-xs text-muted truncate" title={statusLine}>{statusLine}</p>{/snippet}
      {#snippet tools()}
        {@render pageTools?.()}
        <!-- Export (design 13): the review file, with the engine's results, or the annotated record. -->
        {#if onexport}<ExportMenu icon run={kind => onexport(kind, display.judge)} ready={exportReady} items={exportItems}
                                  why={snapshot ? "Review again to export: this review used an earlier engine." : "Export once the review is done."} />{/if}
        <!-- The menu button (Lichess's ☰ in the same place) opens the display settings in the analysis's place, and
             closes them. The gear is the engine's, in the engine header. -->
        <button class="btn-icon aria-expanded:border-accent aria-expanded:text-accent" aria-label="Display settings" title="Display settings"
                aria-expanded={settingsOpen} aria-controls="display-settings"
                onclick={() => { settingsOpen = !settingsOpen; engineOpen = false; }}><Icon name="menu" /></button>
      {/snippet}
    </StepBar>
  </section>

  <!-- Why the review runs again (ReviewAgain): a dialog when the review starts, once in a visit. The line under the
       progress says it while the review runs. -->
  <Dialog.Root bind:open={againOpen}>
    <Dialog.Portal>
      <Dialog.Overlay class="dialog-overlay" />
      <Dialog.Content class="dialog-box w-[min(94vw,28rem)]">
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
      <Dialog.Overlay class="dialog-overlay" />
      <Dialog.Content class="dialog-box w-[min(94vw,34rem)] max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-2">
          <Dialog.Title class="font-semibold">Keys and clicks</Dialog.Title>
          <Dialog.Close class="px-2 py-0.5 text-sm">Close</Dialog.Close>
        </div>
        <table class="help-table text-sm">
          <tbody>
            {#each KEYS as [keys, what] (what)}
              <tr>
                <td class="pr-3 w-[45%]"><span class="flex flex-wrap gap-1">{#each keys as k (k)}<kbd class="kbd">{k}</kbd>{/each}</span></td>
                <td>{what}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <table class="help-table text-sm mt-3">
          <tbody>
            {#each MOUSE as [how, what] (how)}
              <tr><td class="pr-3 w-[45%] text-muted">{how}</td><td>{what}</td></tr>
            {/each}
          </tbody>
        </table>
        <!-- The notes' colours and the keys held while drawing, each with its colour's stroke -->
        <h3 class="mt-3 mb-1 text-sm font-semibold">Note colours</h3>
        <table class="help-table text-sm">
          <tbody>
            {#each BRUSH_KEYS as [brush, keys] (brush)}
              <tr>
                <td class="pr-3 w-[45%]"><span class="inline-flex items-center gap-2"><span class="inline-block w-5 h-1 rounded-full"
                  style:background="var(--note-{brush})"></span>{brush[0].toUpperCase() + brush.slice(1)}</span></td>
                <td>{#if !keys.length}<span class="text-muted">No key</span>{:else}<span class="flex flex-wrap items-center gap-1">
                  <!-- Keys held together joined by +, a group's other keys by "or", in brackets beside another group -->
                  {#each keys as group, g (g)}{#if g}<span class="text-muted">+</span>{/if}{#if keys.length > 1 && group.length > 1}<span
                    class="text-muted">(</span>{/if}{#each group as k, i (k)}{#if i}<span class="text-muted">or</span>{/if}<kbd
                    class="kbd">{k}</kbd>{/each}{#if keys.length > 1 && group.length > 1}<span class="text-muted">)</span>{/if}{/each}</span>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>

  <!-- What the move menu's image did (copyImage): copied, or why not, with Save where the clipboard refuses it. -->
  {#if imageNote}<Toast {...imageNote} onclose={() => (imageNote = null)} />{/if}
</main>

<style>
  /* Design 06. The board's size is the smaller of the window's height (less the site's header, the bar above the
     board and a margin) and the width left after the other columns at their least (Lichess's uniboard). The columns:
     Lichess's side column (250 to 350 pixels) and an analysis column wider than its 240 to 400, for the five-column
     candidates table. The rest of the page's styles are Tailwind classes in the markup. */
  .review {
    --gap: 1.25rem;
    --row-gap: 0.8rem;
    /* The row above the board, with its margin (0.5rem), until the page measures it: two lines (--strip-2: 2.8125rem, a
       name over its numbers, and the margin), or three in a narrow row (PlayerCard: the area under the points), where
       the board is at most --wrap-at wide (PlayerCard's container queries). The board's width that decides it is the
       one with two lines (--board-2, from --tall-2): with three, the board is smaller still, so the row stays narrow.
       The chart takes more than its least only where the width limits the board, so that width is the smaller of the
       width left and the height less the chart's least. An override of --tall or --board needs its own of --tall-2 or
       --board-2. A measured row of other lines' heights (another font) changes the board's size after its first frame
       (a layout shift). The clamp is a step: the third line's height (1.375rem) where the board is --wrap-at wide or
       less (0.005 pixels, less than a layout unit, keeps the width of --wrap-at itself on that side), else none. The
       difference times 10,000 reaches one end of the clamp or the other, except within 0.0022 pixels of the step. */
    --wrap-at: 27.5rem;
    --strip-2: 3.3125rem;
    --tall-2: calc(100vh - var(--site-header) - var(--strip-2) - 2rem);
    --board-2: min(calc(var(--tall-2) - var(--chart-gap) - var(--chart-min)), var(--broad));
    --strip: calc(var(--strip-2) + clamp(0px, calc((var(--wrap-at) + 0.005px - var(--board-2)) * 10000), 1.375rem));
    --gauge-w: 0px;
    --summary-min: 250px;
    --summary-max: 350px;
    --side-min: 364px; /* the move list by edge in Fira Code: 321 pixels of rows in 325 (design 06) */
    --side-max: 460px;
    --others: calc(var(--side-min) + var(--gap));
    /* The height and the width the board could have, then the charts' area under it: at least --chart-min, and what
       the width leaves of the height, up to --chart-max. The board then takes the rest of the height, or its width. */
    --tall: calc(100vh - var(--site-header) - var(--strip) - 2rem);
    /* The page area's width (its container, which leaves out its scroll bar's room), less the page's padding, and 20
       pixels that the side columns share: the room a scroll bar took before the area kept its own. */
    --broad: calc(100cqw - var(--others) - var(--gauge-w) - 2rem - 20px);
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
  .review.gauge-mode { --gauge-w: 1.375rem; --wrap-at: 21.25rem; } /* the gauge (w-4) and its margin (mr-1.5) */
  .review.wide {
    --others: calc(var(--summary-min) + var(--side-min) + 2 * var(--gap));
    grid-template-columns: minmax(var(--summary-min), var(--summary-max)) calc(var(--board) + var(--gauge-w))
      minmax(var(--side-min), var(--side-max));
    grid-template-areas: "summary board side";
  }
  .summary-col { grid-area: summary; max-height: var(--column); }
  .board-col { grid-area: board; }
  .board-wrap { width: var(--board); flex: none; }
  /* The margin's row is the board's margin above its top row: 1.3 of the board's 20.6 units. */
  .map-margin { height: calc(100% * 1.3 / 20.6); }
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
      --board: calc(100cqw - 2rem - var(--gauge-w));
      --board-2: var(--board);
      --chart: 8rem;
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: "board" "side";
    }
    .side { height: auto; }
    .movelist { max-height: 22rem; }
    .board-wrap { width: auto; flex: 1; min-width: 0; } /* the column's width, whatever the scroll bar takes */
  }
  /* The Analysis board has no chart: the board takes its height (design 21). */
  .review.board-form { --chart: 0px; --chart-min: 0px; --chart-gap: 0px; }
</style>
