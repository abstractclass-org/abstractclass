<script lang="ts" module>
  /** The review in progress: what the engine does now, and the passes as parts of one bar, each with its share of the
   *  work (by visits) and how much of it is done (0 to 1). */
  export interface ReviewProgress { text: string; parts: { share: number; done: number }[] }
</script>

<script lang="ts">
  // The review of one game: three stages on one page (docs/research/01-ux-survey.md, section 8): Highlights
  // (chess.com), learning from the mistakes with retries (chess.com's key moments, Lichess's "Learn from your
  // mistakes"), and free analysis (Lichess). The review may be partial while the engine works: an edge with no label
  // yet shows none. The layout is design 06 (docs/design/06-review-layout.md): the board fills the window's height,
  // with the summary on its left from 1,260 pixels (Lichess's three columns), and the analysis on its right.
  import { MediaQuery } from "svelte/reactivity";
  import Board, { type BoardCandidate, type BoardMark } from "#lib/board/Board.svelte";
  import { EdgeInput } from "#lib/board/edgeInput.svelte.ts";
  import Swatch from "#lib/ui/Swatch.svelte";
  import { SIDE_TEXT } from "#lib/ui/side.ts";
  import AdvantageChart from "./AdvantageChart.svelte";
  import { loadDisplay, saveDisplay } from "./display.ts";
  import {
    explain, edgeName, moveName, moveNotation, sameEdge, moverWin, moverScore, largest, lossText, lossPhrase, pct, gradeTry,
    shownCandidates, LABELS, LABEL_TEXT, LABEL_GLYPH, PLAYER_NAME, type Edge, type Label, type Player, type Review,
  } from "./model.ts";

  interface Props {
    R: Review;
    progress?: ReviewProgress | null; // the review in progress, or null when it is complete
    problem?: string; // an engine error
    deepVisits?: number; // the budget of the position on screen: its search bar is full at this many visits
    onposition?: (pos: number) => void; // the position on screen changed
  }
  let { R, progress = null, problem = "", deepVisits = 0, onposition }: Props = $props();
  const last = $derived(R.data.positions.length - 1);
  const TABLE_ROWS = 5; // the Analysis table shows this many rows and scrolls, so the move list under it does not move
  const ROW_EM = 1.9; // a table row's height, in em
  const GAUGE_TEXT_ROOM = 0.06; // a side's share of the gauge that has room for its percentage
  // Class lists used in several places.
  const PANEL = "min-w-0 px-4 py-3 bg-panel border border-line rounded-md";
  const BADGE = "inline-flex items-center justify-center min-w-[1.3em] h-[1.3em] px-[0.15em] rounded-full text-[0.78em] font-extrabold text-on-badge";
  const GAUGE_TEXT = "absolute inset-x-0 text-center text-[0.6rem] font-bold text-white tabular-nums";
  const tab = (on: boolean) => ["flex-1 bg-transparent border-transparent border-b-2 rounded-none", on ? "border-b-accent font-semibold" : "border-b-line"];

  type Stage = "highlights" | "walk" | "analysis";
  let stage = $state<Stage>("highlights");
  let pos = $state(0);
  let hover = $state<Edge | null>(null);
  // Three columns from Lichess's width for them (its $x-large, 1,260 pixels): the summary gets its own column, and
  // Highlights is no longer a tab.
  const wide = new MediaQuery("min-width: 1260px");
  const view = $derived(wide.current && stage === "highlights" ? "analysis" : stage);
  // The display settings, kept in this browser (display.ts), and their menu.
  const display = $state(loadDisplay());
  $effect(() => saveDisplay($state.snapshot(display)));
  let menuOpen = $state(false);
  function onwindowclick(ev: MouseEvent) {
    if (menuOpen && !(ev.target instanceof Element && ev.target.closest(".menu-wrap"))) menuOpen = false;
  }

  // Learning from the mistakes (Lichess's "Learn from your mistakes", chess.com's Retry): the largest mistakes of the
  // chosen side, one at a time, each from the position before it. Lichess asks whose mistakes. Chess.com lets the
  // player highlight their own, the opponent's, or both. With no accounts, the page cannot know which side is the
  // visitor's, so it asks.
  let side = $state<"both" | Player>("both");
  const moments = $derived(largest(R.mistakes.filter(e => side === "both" || e.player === side)));
  let moment = $state(0);
  let attempt = $state<"find" | "solved" | "worse" | "unknown" | "shown">("find");
  let tried = $state<Edge | null>(null);
  // Edge input: a first point, then a second within 3 units (the rules' box).
  const input = new EdgeInput(check);
  let showGame = $state(false); // the game's edge as a ghost, with its label
  const solved = $state<Record<number, boolean>>({}); // by the mistake's edge index

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
  const currentKey = $derived(moments[Math.min(moment, moments.length - 1)]);
  const atMoment = $derived(!!currentKey && pos === currentKey.index);
  const walking = $derived(stage === "walk" && atMoment); // at the walk's mistake, where the player tries edges

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

  // In the walk, the board shows only the solution, once it is found or shown.
  const boardCandidates = $derived(walking ? (attempt === "shown" || attempt === "solved" ? candidates.slice(0, 1) : []) : candidates);
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

  /** Opens the walk at a moment: by its index in the list, or at the mistake on a given edge. */
  function startWalk(k = 0, edgeIndex?: number) {
    stage = "walk";
    if (edgeIndex !== undefined) {
      if (!moments.some(m => m.index === edgeIndex)) side = "both";
      k = Math.max(0, moments.findIndex(m => m.index === edgeIndex));
    }
    moment = k;
    resetAttempt();
  }
  function toMoment(k: number) {
    moment = Math.max(0, Math.min(moments.length - 1, k));
    resetAttempt();
  }
  function resetAttempt() {
    attempt = "find";
    tried = null;
    input.reset();
    showGame = false;
    if (currentKey) go(currentKey.index);
  }
  function setSide(s: "both" | Player) {
    side = s;
    moment = 0;
    resetAttempt();
  }

  // A point clicked at the mistake counts while the player still tries edges.
  function onpoint(x: number, y: number) {
    if (attempt === "find" || attempt === "worse" || attempt === "unknown") input.click(x, y);
  }
  function check(edge: Edge) {
    tried = edge;
    attempt = gradeTry(analysis, mover, edge);
    if (attempt === "solved") solved[currentKey.index] = true;
  }

  function onkeydown(ev: KeyboardEvent) {
    if (ev.target instanceof HTMLInputElement) return;
    if (ev.key === "Escape" && menuOpen) menuOpen = false;
    else if (ev.key === "ArrowLeft") go(pos - 1);
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

<svelte:window {onkeydown} onclick={onwindowclick} />

<!-- The top of the side panel: the review's progress or an engine error, and the players when the gauge shows. -->
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
  {#if display.win === "gauge"}<div class="grid gap-1 mb-2.5">{@render player(0, false)}{@render player(1, false)}</div>{/if}
{/snippet}

<!-- A player's name, side and score: in the bar above the board (`strip`), facing the other player, or in a list. -->
{#snippet player(p: Player, strip: boolean)}
  <div class={["flex items-baseline gap-1.5 px-1.5 py-0.5 rounded min-w-0", strip && "max-w-64", strip && p === 1 && "flex-row-reverse",
               pos < last && mover === p && "bg-panel-2 shadow-[inset_0_-2px_0_var(--last)]"]}>
    <Swatch player={p} />
    <span class="font-semibold truncate">{p === 0 ? R.data.players.blue : R.data.players.red}</span>
    <span class="text-xs text-muted">{PLAYER_NAME[p]}</span>
    <span class={["text-sm text-muted tabular-nums whitespace-nowrap", !strip && "ml-auto"]}>
      <strong class="text-[1.1em] text-ink">{fmtScore(position.scores[p])}</strong> points
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
        {#each R.summary as s, p (p)}<td>{Number.isNaN(s.accuracy) ? "–" : s.accuracy.toFixed(0)}</td>{/each}
      </tr>
      <tr>
        <td title="Points lost an edge, on average">Avg pts lost</td>
        {#each R.summary as s, p (p)}<td>{s.meanPointsLost?.toFixed(0) ?? "–"}</td>{/each}
      </tr>
      {#each LABELS as l (l)}
        <tr>
          <td><span class={BADGE} style:background="var(--{l})">{LABEL_GLYPH[l]}</span> {LABEL_TEXT[l]}</td>
          {#each R.summary as s, p (p)}<td>{s.counts[l]}</td>{/each}
        </tr>
      {/each}
    </tbody>
  </table>
  <h3 class="mt-4 mb-1 font-bold">Biggest mistakes{#if progress} <span class="ml-1.5 text-sm font-normal text-muted">so far</span>{/if}</h3>
  <ol class="mb-3.5 pl-5 list-decimal">
    {#each R.keyMoments as m (m.index)}
      <li>
        <button class="px-0 py-0.5 text-left bg-transparent border-0 hover:text-accent" onclick={() => startWalk(0, m.index)}>
          <span class={BADGE} style:background="var(--{m.label})">{LABEL_GLYPH[m.label!]}</span>
          <span class="font-mono text-[0.95em] {SIDE_TEXT[m.player]}">{moveText(m.index)}</span>
          <span class="ml-1 text-sm text-muted">{lossText(m)}</span>
        </button>
      </li>
    {/each}
  </ol>
  <button class="btn-primary" onclick={() => startWalk(0)}>Learn from your mistakes</button>
{/snippet}

<main class={["review", wide.current && "wide", display.win === "gauge" && "gauge-mode"]}>
  {#if wide.current}
    <aside class="summary-col {PANEL} overflow-y-auto">
      {@render panelHead()}
      {@render highlights()}
    </aside>
  {/if}

  <section class="board-col">
    {#if display.win === "bar"}
      <!-- The players face each other left and right, as they start: Blue at A10-D10, Red at Q10-T10. -->
      <div class="grid grid-cols-[auto_minmax(6rem,1fr)_auto] items-center gap-2 h-[calc(var(--strip)-0.5rem)] mb-2"
           aria-label="Players, scores and win chance">
        {@render player(0, true)}
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
        {@render player(1, true)}
      </div>
    {/if}
    <div class="flex">
      {#if display.win === "gauge"}
        <!-- Lichess's and chess.com's gauge: Blue's share from the bottom. -->
        <div class={["relative flex flex-col-reverse flex-none self-stretch w-8 mr-2 rounded-[3px] overflow-hidden", Number.isNaN(blueWin) ? "bg-panel-2" : "bg-red"]}
             role="img" aria-label={Number.isNaN(blueWin) ? "Win chance: not analysed yet" : `Blue's win chance ${pct(blueWin)}`}>
          {#if !Number.isNaN(blueWin)}
            <div class="bg-blue transition-[height] duration-200" style="height: {100 * blueWin}%"></div>
            <!-- Each side's share at its own end, inside the gauge, as the bar shows them at its ends. Small, so that
                 "50.0%" fits the gauge's width. -->
            {#if blueWin <= 1 - GAUGE_TEXT_ROOM}<span class="{GAUGE_TEXT} top-1.25">{pct(1 - blueWin)}</span>{/if}
            {#if blueWin >= GAUGE_TEXT_ROOM}<span class="{GAUGE_TEXT} bottom-1.25">{pct(blueWin)}</span>{/if}
          {/if}
        </div>
      {/if}
      <div class="board-wrap rounded overflow-hidden">
        <Board
          {position}
          lastEdge={lastMove?.edge ?? null}
          cut={lastMove?.cut ?? null}
          candidates={boardCandidates}
          highlight={hover}
          preview={walking && tried ? tried : hover}
          previewPlayer={mover}
          {marks}
          ghost={walking && showGame && currentKey.edge
            ? { edge: currentKey.edge, label: currentKey.label!, glyph: LABEL_GLYPH[currentKey.label!] } : null}
          layers={display.layers}
          pending={walking ? input.pending : null}
          onpoint={walking ? onpoint : undefined}
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
    <div class="flex gap-1 mb-2" role="tablist">
      {#if !wide.current}
        <button role="tab" class={tab(view === "highlights")} onclick={() => (stage = "highlights")}>Highlights</button>
      {/if}
      <button role="tab" class={tab(view === "walk")} onclick={() => startWalk(moment)}>Retry mistakes</button>
      <button role="tab" class={tab(view === "analysis")} onclick={() => (stage = "analysis")}>Analysis</button>
    </div>

    <div class={["flex-1 min-h-0", view === "analysis" ? "flex flex-col overflow-hidden" : "overflow-y-auto"]}>
      {#if view === "highlights"}
        {@render highlights()}
      {:else if view === "walk"}
        <h2 class="mb-2 text-[1.05rem] font-bold">Learn from your mistakes</h2>
        <div class="flex flex-wrap items-center gap-1 mb-3 text-sm text-muted" role="radiogroup" aria-label="Whose mistakes">
          <span>Whose mistakes:</span>
          {#each [["both", "Both"], [0, "Blue"], [1, "Red"]] as const as [v, text] (v)}
            <button role="radio" aria-checked={side === v} onclick={() => setSide(v)}
                    class={["inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.95em]", side === v && "bg-panel border-accent text-ink font-semibold"]}>
              {#if v !== "both"}<Swatch player={v} />{/if}{text}
            </button>
          {/each}
        </div>
        {#if !currentKey}
          <p class="mb-3">No mistakes for this side after the opening.</p>
        {:else}
          {@const m = currentKey}
          <div class="flex items-center gap-1.5 mb-2.5 text-sm text-muted">
            <button class="px-2 py-0.5" onclick={() => toMoment(moment - 1)} disabled={moment === 0} aria-label="Previous mistake">◀</button>
            <span>Mistake {moment + 1} of {moments.length}</span>
            <button class="px-2 py-0.5" onclick={() => toMoment(moment + 1)} disabled={moment + 1 >= moments.length} aria-label="Next mistake">▶</button>
            <span class="flex items-center gap-[5px] ml-auto">
              {#each moments as mm, k (mm.index)}
                <button class={["size-[11px] p-0 rounded-full border-0", solved[mm.index] ? "bg-best" : "bg-line", k === moment && "outline-2 outline-offset-1 outline-accent"]}
                        onclick={() => toMoment(k)} aria-label="Mistake {k + 1}, edge {mm.index + 1}"></button>
              {/each}
            </span>
          </div>
          <div class="grid gap-2 px-3 py-2.75 bg-panel-2 rounded-md">
            <p>
              Edge {m.index + 1}: {PLAYER_NAME[m.player]} played <strong>{moveName(m.edge)}</strong>
              <span class={BADGE} style:background="var(--{m.label})">{LABEL_GLYPH[m.label!]}</span>
              and lost {lossPhrase(m)}.
            </p>
            {#if !atMoment}
              <p class="text-sm text-muted">You moved away from this position.</p>
              <div class="flex flex-wrap gap-1.5"><button class="btn-primary" onclick={resetAttempt}>Back to the mistake</button></div>
            {:else if attempt === "find"}
              <p class="text-[1.05em] font-bold">Find a better edge for {PLAYER_NAME[m.player]}.</p>
              <p class="text-sm text-muted">
                {input.pending ? "Now click its second point, at most 3 apart." : "Click the edge's first point on the board."}
              </p>
            {:else if attempt === "solved"}
              <p class="font-semibold text-best">Good edge! {edgeName(tried ?? m.best!.edge)} is as good as the engine's first choice.</p>
            {:else if attempt === "worse"}
              <p class="text-mistake">Better than the game's edge, but not the best. Try another edge.</p>
            {:else if attempt === "unknown"}
              <p class="text-mistake">The engine did not consider {edgeName(tried!)}. Try another edge.</p>
            {:else}
              <p>The solution: <strong>{edgeName(m.best!.edge)}</strong>, number 1 on the board.</p>
            {/if}
            {#if atMoment}
              <div class="flex flex-wrap gap-1.5">
                {#if attempt === "solved" || attempt === "shown"}
                  <button class="btn-primary" disabled={moment + 1 >= moments.length} onclick={() => toMoment(moment + 1)}>
                    Next mistake
                  </button>
                {:else}
                  <button onclick={() => (attempt = "shown")}>View the solution</button>
                  <button onclick={() => toMoment(moment + 1)} disabled={moment + 1 >= moments.length}>Skip</button>
                {/if}
                <button class="bg-transparent border-transparent text-muted" aria-pressed={showGame} onclick={() => (showGame = !showGame)}>
                  {showGame ? "Hide" : "Show"} the game's edge
                </button>
              </div>
            {/if}
          </div>
          {#if moment + 1 >= moments.length}
            <p class="mt-2.5 text-sm text-muted">Solved {moments.filter(mm => solved[mm.index]).length} of {moments.length}.</p>
          {/if}
        {/if}
      {:else}
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
                  style={rowTint(c.blueWin)} onmouseenter={() => (hover = c.edge)} onmouseleave={() => (hover = null)}>
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
            <div class="flex items-baseline gap-1">
              <span class="flex-none w-[2.2rem] text-muted tabular-nums">{t.number}.</span>
              {#each t.edges as e (e.index)}
                {@const after = R.blueScore[e.index + 1]}
                <!-- Every move has one width, so the columns line up. The move: the widest in the notation is 10
                     characters, an edge with two-digit rows and the cut mark (D10-G10x, 8) and the widest glyph (??, 2),
                     then the glyph's margin. The lead after it: at most 5 characters (+1.2k), smaller and right-aligned.
                     The font is monospaced, so ch is one character of the span's own size. -->
                <button class={["mv inline-flex flex-none items-baseline gap-1 px-[0.2rem] py-px font-mono text-[0.95em] text-left whitespace-nowrap bg-transparent border-0",
                                SIDE_TEXT[e.player], pos === e.index + 1 ? "here bg-panel-2 outline outline-accent" : "hover:bg-panel-2 hover:outline hover:outline-line"]}
                        onclick={() => go(e.index + 1)}
                        title={[e.label ? LABEL_TEXT[e.label] : "Not analysed yet", after !== undefined ? sideText(after) : ""].filter(Boolean).join(" · ")}>
                  <span class="w-[calc(10ch+0.15em)]">{moveNotation(e)}{#if listed(e.label)}<span class="ml-[0.15em] font-extrabold" style:color="var(--{e.label})">{LABEL_GLYPH[e.label]}</span>{/if}</span>
                  <span class="w-[5ch] text-[0.78em] text-right text-muted tabular-nums">{leadShort(after)}</span>
                </button>
              {/each}
            </div>
            {#each t.edges.filter(e => !!e.label && COMMENTED.includes(e.label)) as e (e.index)}
              <div class="mt-0.5 mb-1.5 ml-10 text-sm text-muted">{explain(e)}</div>
            {/each}
          {/each}
        </div>
      {/if}
    </div>

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
        <div class="menu-wrap relative">
          <button aria-label="Display settings" aria-expanded={menuOpen} aria-haspopup="dialog"
                  onclick={() => (menuOpen = !menuOpen)}>⚙</button>
          {#if menuOpen}
            <div class="absolute right-0 bottom-[calc(100%+0.4rem)] z-5 w-60 px-3 py-2.5 bg-panel border border-line rounded-md shadow-[0_4px_14px_rgb(0_0_0/0.25)]
                        [&_fieldset]:grid [&_fieldset]:gap-1 [&_fieldset]:mb-2 [&_fieldset:last-child]:mb-0
                        [&_legend]:mb-0.5 [&_legend]:text-xs [&_legend]:font-semibold
                        [&_label]:flex [&_label]:items-center [&_label]:gap-1.5 [&_label]:text-sm [&_label]:cursor-pointer"
                 role="dialog" aria-label="Display settings">
              <fieldset>
                <legend>Win chance</legend>
                <label><input type="radio" name="win" value="bar" bind:group={display.win} /> A bar above the board</label>
                <label><input type="radio" name="win" value="gauge" bind:group={display.win} /> A gauge beside the board</label>
              </fieldset>
              <fieldset>
                <legend>On the board</legend>
                <label><input type="checkbox" bind:checked={display.layers.candidates} /> Candidates</label>
                <label><input type="checkbox" bind:checked={display.layers.marks} /> Move labels</label>
                <label><input type="checkbox" bind:checked={display.layers.regions} /> Regions</label>
                <label><input type="checkbox" bind:checked={display.layers.protected} /> Protected edges</label>
              </fieldset>
              <fieldset>
                <legend>Advantage chart</legend>
                <label><input type="checkbox" bind:checked={display.scoreLine} /> Score so far</label>
              </fieldset>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <section class="under">
    <AdvantageChart blueWin={R.blueWin} {scoreDiff} current={pos} showScore={display.scoreLine} tips={chartTips}
           moments={(stage === "walk" ? moments : R.keyMoments).map(m => ({ index: m.index, label: m.label! }))} onjump={go} />
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
    --strip: 2.1rem; /* the bar above the board, with its margin */
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
    gap: 0.8rem var(--gap);
    justify-content: center;
    align-items: start;
    margin: 1rem auto;
    padding: 0 1rem;
  }
  .review.gauge-mode { --strip: 0px; --gauge-w: 2.5rem; }
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
