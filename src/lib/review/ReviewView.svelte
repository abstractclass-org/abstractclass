<script lang="ts" module>
  /** The review in progress: what the engine does now, and the passes as parts of one bar, each with its share of the
   *  work (by visits) and how much of it is done (0 to 1). */
  export interface ReviewProgress { text: string; parts: { share: number; done: number }[] }
</script>

<script lang="ts">
  // The review of one game (docs/research/01-ux-survey.md, section 8): Highlights (chess.com) and free analysis
  // (Lichess). Learning from the mistakes is to come back as a mode of the analysis (decisions/open-items.md). The
  // review may be partial while the engine works: an edge with no label yet shows none. The layout is design 06 (docs/design/06-review-layout.md): the board fills the window's height,
  // with the summary on its left from 1,260 pixels (Lichess's three columns), and the analysis on its right.
  import { Popover, Tabs } from "bits-ui";
  import { MediaQuery } from "svelte/reactivity";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";
  import Board, { type BoardCandidate, type BoardLineEdge, type BoardMark } from "#lib/board/Board.svelte";
  import { parseEdge } from "#lib/engine/notation.ts";
  import Swatch from "#lib/ui/Swatch.svelte";
  import { SIDE_TEXT } from "#lib/ui/side.ts";
  import AdvantageChart from "./AdvantageChart.svelte";
  import { loadDisplay, saveDisplay } from "./display.ts";
  import Glyph from "./Glyph.svelte";
  import {
    explain, edgeName, moveNotation, sameEdge, moverWin, moverScore, largest, lossText, pct, shownCandidates, lineMovers, enoughVisits, trustedLine, type Candidate, type LineStep, LABELS, LABEL_TEXT, LABEL_GLYPH, PLAYER_NAME, type Edge, type Label, type Player, type Review,
  } from "./model.ts";

  interface Props {
    R: Review;
    progress?: ReviewProgress | null; // the review in progress, or null when it is complete
    problem?: string; // an engine error
    deepVisits?: number; // the budget of the position on screen: its search bar is full at this many visits
    onposition?: (pos: number) => void; // the position on screen changed
    lineSteps?: (pos: number, line: Edge[]) => Promise<LineStep[]>; // a line's edges played: cuts, regions (the rules)
  }
  let { R, progress = null, problem = "", deepVisits = 0, onposition, lineSteps }: Props = $props();
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
  const TAB = "flex-1 bg-transparent border-transparent border-b-2 border-b-line rounded-none data-[state=active]:border-b-accent data-[state=active]:font-semibold";

  type Stage = "highlights" | "analysis";
  let stage = $state<Stage>("highlights");
  let pos = $state(0);
  let hover = $state<Edge | null>(null);
  // Three columns from Lichess's width for them (its $x-large, 1,260 pixels): the summary gets its own column, and
  // Highlights is no longer a tab.
  const wide = new MediaQuery("min-width: 1260px");
  // The display settings, kept in this browser (display.ts). Their menu is a Bits UI popover.
  const display = $state(loadDisplay());
  $effect(() => saveDisplay($state.snapshot(display)));
  let gaugeHeight = $state(0);
  // The row above the board is one line high, or two in a narrow row: the board and the side columns take its height.
  let stripHeight = $state(0);
  // The side columns reach down to the Advantage chart's bottom edge when the whole chart is in the window, so that
  // the columns end on one line. When the board fills the window's height, the chart is below the fold: the side
  // columns then keep the board's height, so that the step controls stay in view. The chart's place depends only on
  // the board's column, so reaching down does not move it.
  let chartBox = $state<HTMLElement>();
  let reach = $state(false);
  $effect(() => {
    void innerWidth.current; void wide.current; void display.win;
    const height = innerHeight.current;
    if (chartBox && height !== undefined) reach = chartBox.getBoundingClientRect().bottom + window.scrollY <= height;
  });
  const position = $derived(R.data.positions[pos]);
  const analysis = $derived(pos < last ? R.data.analysis[pos] : undefined);
  const mover = $derived(position.player as Player);
  const lastMove = $derived(pos > 0 ? R.edges[pos - 1] : null);
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
  const lineEdges = $derived(hoverCandidate ? shownLine(hoverCandidate) : null);
  const lineKey = $derived(lineEdges ? `${pos}|${lineEdges.map(edgeName).join(" ")}` : null);
  const line = $derived.by((): BoardLineEdge[] | null => {
    if (!lineEdges) return null;
    const movers = lineMovers(position, LINE_EDGES);
    return lineEdges.map((edge, i) => ({ edge, player: movers[i], ...stepsNow?.[i] }));
  });

  // The line's edges played, from the engine's rules, asked once for each line: the edge each one cuts, and the regions
  // and areas after it. The board shows the cut edges cut, and the regions as they become.
  const knownSteps = new Map<string, LineStep[]>();
  let lineStepsHad = $state<{ key: string; steps: LineStep[] } | null>(null);
  $effect(() => {
    const key = lineKey;
    if (!key) return;
    const known = knownSteps.get(key);
    if (known) { lineStepsHad = { key, steps: known }; return; }
    if (!lineSteps) return;
    const [at, edges] = key.split("|");
    let current = true;
    lineSteps(Number(at), edges.split(" ").map(parseEdge))
      .then(steps => { knownSteps.set(key, steps); if (current) lineStepsHad = { key, steps }; })
      .catch(() => {}); // without them, the line still shows
    return () => { current = false; };
  });
  // The search can lengthen or change a line while it shows. Until the new line's steps come, the steps of the edges
  // that it shares with the line before stay.
  const stepsNow = $derived.by((): LineStep[] | null => {
    const had = lineStepsHad;
    if (!lineKey || !had) return null;
    if (had.key === lineKey) return had.steps;
    const [at, edges] = lineKey.split("|"), [hadAt, hadEdges] = had.key.split("|");
    if (at !== hadAt) return null;
    const a = edges.split(" "), b = hadEdges.split(" ");
    let k = 0;
    while (k < a.length && k < b.length && a[k] === b[k]) k++;
    return had.steps.slice(0, k);
  });

  // The line as far as drawn: animated (the default, a display setting), its first edge, then one more every
  // LINE_STEP_MS, as KaTrain draws a line (its anim_pv_time), staying drawn at its end; or static, all at once. A click
  // on the candidate, on the board or in the table, shows the whole line. Pointing at another candidate animates its
  // line again. When the search lengthens the line, the drawn edges stay and the drawing goes on. With reduced motion
  // asked for, the line is static.
  const LINE_STEP_MS = 500;
  let lineWhole = $state(false);
  let lineShown = $state(0);
  let drawnKey = ""; // the position and the edges drawn so far: not state, so that each step does not restart the drawing
  const lineOwner = $derived(lineEdges ? `${pos}|${edgeName(lineEdges[0])}` : null);
  $effect(() => { void lineOwner; lineWhole = false; });
  $effect(() => {
    const key = lineKey;
    const n = key ? key.split(" ").length : 0;
    const show = (k: number) => { lineShown = k; drawnKey = key ? key.split(" ").slice(0, k).join(" ") : ""; };
    if (!key || !display.lineSteps || lineWhole || n <= 1 || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show(n);
      return;
    }
    const kept = drawnKey && `${key} `.startsWith(`${drawnKey} `) ? drawnKey.split(" ").length : 1;
    show(Math.min(kept, n));
    if (kept >= n) return;
    const timer = setInterval(() => { show(lineShown + 1); if (lineShown >= n) clearInterval(timer); }, LINE_STEP_MS);
    return () => clearInterval(timer);
  });
  const drawnLine = $derived(line && line.slice(0, Math.max(1, lineShown)));
  // The areas in the players' tags: now, or, while a line shows, after its last drawn edge (from the rules).
  const lineAreas = $derived(drawnLine ? stepsNow?.[drawnLine.length - 1]?.areas ?? null : null);
  const areas = $derived(lineAreas ?? position.areas);

  // The table: every candidate, in the engine's order, in a box of TABLE_ROWS rows that scrolls. The rows on the board
  // have their number in a badge, as the board draws it.
  const onBoard = $derived(new Set(candidates.map(c => c.rank)));
  let tableBox = $state<HTMLElement | null>(null);
  // A new position starts the table at its top.
  $effect(() => { void pos; if (tableBox) tableBox.scrollTop = 0; });
  // A candidate pointed at on the board brings its row into view, below the header.
  $effect(() => {
    void hover;
    const row = tableBox?.querySelector<HTMLElement>("tr.lit");
    if (!tableBox || !row) return;
    const head = tableBox.querySelector("thead")!.getBoundingClientRect().height;
    const r = row.getBoundingClientRect(), at = r.top - tableBox.getBoundingClientRect().top + tableBox.scrollTop;
    const top = at - head, bottom = at + r.height - tableBox.clientHeight;
    if (tableBox.scrollTop > top) tableBox.scrollTop = top;
    else if (tableBox.scrollTop < bottom) tableBox.scrollTop = bottom;
  });

  // Label badges on the edges of the turn just played, as far as the current position.
  const marks = $derived.by((): BoardMark[] => {
    if (!lastMove) return [];
    return R.turnOf[lastMove.index].edges.filter(e => e.index < pos && e.label && e.edge)
      .map(e => ({ edge: e.edge!, label: e.label!, glyph: LABEL_GLYPH[e.label!] }));
  });

  function go(p: number) {
    pos = Math.max(0, Math.min(last, p));
    hover = null;
  }
  /** Shows a move in the analysis: the position after it, where the move list explains it (Lichess's summary jumps to
   *  the move itself, nextGlyphSymbol in ui/analyse/src/nodeFinder.ts). */
  function showMove(index: number) {
    stage = "analysis";
    go(index + 1);
  }
  $effect(() => onposition?.(pos));

  // The move list keeps the current move a fixed distance from its top (four rows), as the position changes.
  let movelist = $state<HTMLElement | null>(null);
  const SCROLL_ROWS = 4;
  $effect(() => {
    void pos;
    if (!movelist) return;
    const here = movelist.querySelector<HTMLElement>(".mv.here");
    if (!here) { movelist.scrollTop = 0; return; }
    const top = here.getBoundingClientRect().top - movelist.getBoundingClientRect().top + movelist.scrollTop;
    movelist.scrollTop = top - SCROLL_ROWS * here.offsetHeight;
  });

  // The arrow keys step through the game, except in the controls that use them: fields, the tabs, the display menu.
  // So the move list's moves are not in the Tab order (tabindex -1), as on Lichess: a click still goes to a move.
  function onkeydown(ev: KeyboardEvent) {
    if (ev.defaultPrevented || ev.target instanceof HTMLInputElement) return;
    if (ev.target instanceof Element && ev.target.closest('[role="tablist"], [role="dialog"]')) return;
    if (ev.key === "ArrowLeft") go(pos - 1);
    else if (ev.key === "ArrowRight") go(pos + 1);
    else if (ev.key === "Home") go(0);
    else if (ev.key === "End") go(last);
    else return;
    ev.preventDefault();
  }

  const scoreDiff = $derived(R.data.positions.map(p => p.scores[0] - p.scores[1]));
  const winner = $derived<Player>(R.data.result.blue > R.data.result.red ? 0 : 1);
  const margin = $derived(Math.abs(R.data.result.blue - R.data.result.red));
  const biggest = $derived(largest(R.mistakes, 1)[0]);
  const status = $derived.by(() => {
    if (pos === last) return `Game over · ${PLAYER_NAME[winner]} won by ${margin.toFixed(1)} points`;
    const t = R.turnOf[pos];
    const k = t.edges.findIndex(e => e.index === pos) + 1;
    return `Edge ${pos + 1} of ${last} · Turn ${t.number} · ${PLAYER_NAME[mover]} to play, edge ${k} of ${t.edges.length}`;
  });
  const blueWin = $derived(R.blueWin[pos]);
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
    const value = i === last ? `Result: ${sideText(s!, 1)}` : s === undefined ? "Not analysed yet" : `Lead: ${sideText(s)}`;
    return { title, value };
  }));
  // The position's search, as Lichess shows its depth: the bar fills to the budget and stays full when the search ends.
  const searched = $derived(analysis && deepVisits ? Math.min(1, analysis.visits / deepVisits) : null);
</script>

<svelte:window {onkeydown} />

<!-- The top of the side panel: the review's progress or an engine error. -->
{#snippet panelHead()}
  {#if problem}
    <p class="mb-2.5 text-sm text-blunder" role="alert">Engine error: {problem}</p>
  {:else if progress}
    <div class="mb-2.5">
      <div class="flex gap-0.5 h-1.5" role="progressbar" aria-label="The review" aria-valuemin="0" aria-valuemax="100"
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
               pos < last && mover === p && "bg-panel-2 shadow-[inset_0_-2px_0_var(--last)]"]}>
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
          <span class="ml-auto text-sm text-muted tabular-nums whitespace-nowrap">{lossText(m)}</span>
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
       style="height: {(TABLE_ROWS + 1) * ROW_EM + 0.2}em; --row: {ROW_EM}em">
  <table class="w-full table-fixed [&_:is(th,td)]:px-1 [&_:is(th,td)]:py-0.5 [&_:is(th,td)]:border-b [&_:is(th,td)]:border-line [&_:is(th,td)]:truncate">
    <colgroup><col class="w-7" /><col /><col class="w-18" /><col class="w-12" /><col class="w-12" /></colgroup>
    <thead>
      <tr class="[&>th]:sticky [&>th]:top-0 [&>th]:z-1 [&>th]:h-(--row) [&>th]:bg-panel [&>th]:text-left [&>th]:font-medium [&>th]:text-muted">
        <th>#</th><th>Edge</th><th>{PLAYER_NAME[mover]} wins</th><th>Lead</th><th>Visits</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as { c, rank } (rank)}
        <tr class={["h-(--row)", rank === 1 && "font-semibold", !!hover && sameEdge(c.edge, hover) && "lit outline outline-accent -outline-offset-1"]}
            style={rowTint(c.blueWin)} onmouseenter={() => (hover = c.edge)} onmouseleave={() => (hover = null)}
            onclick={() => (lineWhole = true)}
            title={analysis && !shownLine(c) ? "Too few visits to show the engine's line" : undefined}>
          <!-- A candidate on the board has its number in a badge, as the board draws it. The others have a plain number. -->
          <td><span class={["inline-flex items-center justify-center min-w-[1.3em] h-[1.3em] px-[0.2em] rounded-full text-[0.8em] font-bold",
                            onBoard.has(rank) ? `${rank === 1 ? "bg-engine" : "bg-candidate"} text-on-badge` : "text-muted"]}
                    title={onBoard.has(rank) ? "On the board" : undefined}>{rank}</span></td>
          <td><div class="@container truncate"><span class="text-[clamp(0.7em,22cqi,1em)]">{edgeName(c.edge)}</span></div></td>
          <td>{pct(moverWin(c.blueWin, mover))}</td>
          <td>{c.lead !== undefined ? pts(moverScore(c.lead, mover)) : "–"}</td><td>{c.visits}</td>
        </tr>
      {/each}
      {#each Array.from({ length: Math.max(0, TABLE_ROWS - rows.length) }, (_, k) => k) as k (k)}
        <tr class="h-(--row)">
          <td class="italic text-muted" colspan="5">{k === 0 && !rows.length ? (pos === last ? "The game is over." : "Not analysed yet.") : ""}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  </div>
  <div class="movelist flex-1 min-h-0 overflow-y-auto pt-1.5 text-sm border-t border-line" bind:this={movelist}>
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
                          SIDE_TEXT[e.player], pos === e.index + 1 ? "here bg-panel-2 outline outline-accent" : "hover:bg-panel-2 hover:outline hover:outline-line"]}
                  onclick={() => go(e.index + 1)} tabindex="-1"
                  title={[e.label ? LABEL_TEXT[e.label] : "Not analysed yet", after !== undefined ? sideText(after) : ""].filter(Boolean).join(" · ")}>
            <span class="w-[calc(10ch+0.15em)]">{moveNotation(e)}{#if listed(e.label)}<span class="ml-[0.15em] font-extrabold" style:color="var(--{e.label})"><Glyph glyph={LABEL_GLYPH[e.label]} /></span>{/if}</span>
            <span class="w-[5ch] ml-auto text-[0.78em] text-right text-muted tabular-nums">{leadShort(after)}</span>
          </button>
        {/each}
      </div>
      {#each t.edges.filter(e => !!e.label && COMMENTED.includes(e.label)) as e (e.index)}
        <div class="mt-0.5 mb-1.5 ml-10 text-sm text-muted">{explain(e)}</div>
      {/each}
    {/each}
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

  <section class="board-col">
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
        <Board
          {position}
          lastEdge={lastMove?.edge ?? null}
          cut={lastMove?.cut ?? null}
          {candidates}
          highlight={hover}
          line={drawnLine}
          oncandidateclick={() => (lineWhole = true)}
          preview={line ? null : hover}
          previewPlayer={mover}
          {marks}
          layers={display.layers}
          oncandidate={e => (hover = e)}
        />
      </div>
    </div>
  </section>

  <section class="side {PANEL} flex flex-col">
    {#if !wide.current}
      {@render panelHead()}
    {/if}
    <!-- The position's engine header, as Lichess's: its values, its visits, and its search's progress. -->
    <div class="mb-1.5">
      <p class="text-xs text-muted tabular-nums">
        {#if analysis?.lead !== undefined}
          Expected final margin
          <strong class="text-ink">{pts(analysis.margin!)} ± {Math.round(analysis.spread!)}</strong> for Blue · lead {pts(analysis.lead)}
        {:else if pos === last}
          Final margin <strong class="text-ink">{pts(R.data.result.blue - R.data.result.red)}</strong> for Blue
        {:else}Not analysed yet{/if}
      </p>
      <div class="flex items-center gap-2 mt-1">
        <div class={["flex-1 h-[3px] rounded-sm overflow-hidden", searched !== null && "bg-panel-2"]} role="progressbar"
             aria-label="This position's search" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(100 * (searched ?? 0))}>
          {#if searched !== null}<div class="h-full bg-accent transition-[width] duration-200" style="width: {100 * searched}%"></div>{/if}
        </div>
        <span class="text-xs text-muted tabular-nums whitespace-nowrap">{#if analysis}{analysis.visits.toLocaleString("en")}{searched !== null && searched < 1 ? ` of ${deepVisits.toLocaleString("en")}` : ""} visits{/if}</span>
      </div>
    </div>
    {#if wide.current}
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

    <!-- The step controls and the display menu, at the bottom of the analysis column (Lichess's place). -->
    <div class="mt-1.5 pt-1.5 border-t border-line">
      <p class="mb-1.5 text-xs text-muted truncate">{status}</p>
      <div class="flex items-center justify-between">
        <div class="flex gap-1">
          <button onclick={() => go(0)} aria-label="First">⏮</button>
          <button onclick={() => go(pos - 1)} aria-label="Back">◀</button>
          <button onclick={() => go(pos + 1)} aria-label="Forward">▶</button>
          <button onclick={() => go(last)} aria-label="Last">⏭</button>
        </div>
        <!-- A Bits UI popover: it moves the focus into the menu and back to the button, and closes on Escape or a click
             outside it. -->
        <Popover.Root>
          <Popover.Trigger class="aria-expanded:border-accent aria-expanded:text-accent" aria-label="Display settings">⚙</Popover.Trigger>
          <Popover.Content side="top" align="end" sideOffset={6} role="dialog" aria-label="Display settings"
                           class="z-5 w-60 px-3 py-2.5 bg-panel-2 border border-muted/50 rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.4)]
                                  [&_fieldset]:grid [&_fieldset]:gap-1 [&_fieldset]:mb-2 [&_fieldset:last-child]:mb-0
                                  [&_legend]:mb-0.5 [&_legend]:text-xs [&_legend]:font-semibold
                                  [&_label]:flex [&_label]:items-center [&_label]:gap-1.5 [&_label]:text-sm [&_label]:cursor-pointer">
            <!-- Raised above the panel: a lighter surface, a clear border and a deep shadow. -->
            <fieldset>
              <legend>Win chance</legend>
              <label><input type="radio" name="win" value="bar" bind:group={display.win} /> Top horizontal bar</label>
              <label><input type="radio" name="win" value="gauge" bind:group={display.win} /> Side vertical gauge</label>
            </fieldset>
            <fieldset>
              <legend>On the board</legend>
              <label><input type="checkbox" bind:checked={display.layers.candidates} /> Candidates</label>
              <label><input type="checkbox" bind:checked={display.layers.marks} /> Move labels</label>
              <label><input type="checkbox" bind:checked={display.layers.regions} /> Regions</label>
              <label><input type="checkbox" bind:checked={display.layers.protected} /> Protected edges</label>
            </fieldset>
            <fieldset>
              <legend>The engine's line</legend>
              <label><input type="radio" name="line" value={true} bind:group={display.lineSteps} /> Animated</label>
              <label><input type="radio" name="line" value={false} bind:group={display.lineSteps} /> Static</label>
            </fieldset>
            <fieldset>
              <legend>Advantage chart</legend>
              <label><input type="checkbox" bind:checked={display.scoreLine} /> Score so far</label>
            </fieldset>
          </Popover.Content>
        </Popover.Root>
      </div>
    </div>
  </section>

  <section class="under">
    <div bind:this={chartBox}>
      <AdvantageChart blueWin={R.blueWin} {scoreDiff} current={pos} showScore={display.scoreLine} tips={chartTips}
             moments={R.keyMoments.map(m => ({ index: m.index, label: m.label! }))} onjump={go} />
    </div>
    <p class="flex flex-wrap items-center gap-2.5 my-3.75 text-xs text-muted">
      <strong>Advantage chart</strong>
      <span class="inline-block w-[1.2em] h-0.5 bg-ink"></span> Blue's win chance
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
