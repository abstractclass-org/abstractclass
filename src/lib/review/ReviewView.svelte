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
  import AdvantageChart from "./AdvantageChart.svelte";
  import { loadDisplay, saveDisplay } from "./display.ts";
  import {
    explain, edgeName, moveName, moveNotation, sameEdge, moverWin, largest, lossText, LABELS, LABEL_TEXT, LABEL_PLURAL, LABEL_GLYPH, BAD_LABELS,
    PLAYER_NAME, type Edge, type Label, type Player, type Review,
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
  const SOLVED_MARGIN = 0.02; // Lichess: within 0.04 winning chances of the best, which is 0.02 of win chance
  const GOOD_GAP = 0.05; // a candidate shows when it is within the Good band of the first choice (labels.ts)
  const GOOD_POINTS = 36; // the Good band in points (labels.ts)
  // KataGo lets a move compete for its choice (by its lower confidence bound) only when the move has this share of the
  // most visited move's weight (minVisitPropForLCB, its analysis_example.cfg; search/searchresults.cpp,
  // getPlaySelectionValues). With fewer visits, its value is too uncertain to compare. The board uses the same rule,
  // with visits for weight.
  const MIN_VISIT_SHARE = 0.15;
  const TABLE_ROWS = 5; // the Analysis table shows this many rows and scrolls, so the move list under it does not move
  const ROW_EM = 1.9; // a table row's height, in em
  const GAUGE_TEXT_ROOM = 0.06; // a side's share of the gauge that has room for its percentage

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
  let pending = $state<[number, number] | null>(null);
  let showGame = $state(false); // the game's edge as a ghost, with its label
  const solved = $state<Record<number, boolean>>({}); // by the mistake's edge index

  const position = $derived(R.data.positions[pos]);
  const analysis = $derived(pos < last ? R.data.analysis[pos] : null);
  const mover = $derived(position.player as Player);
  const lastMove = $derived(pos > 0 ? R.edges[pos - 1] : null);
  const turnOf = (index: number) => R.turns.find(t => t.edges.some(e => e.index === index))!;
  /** A move in the record's notation with its turn: "12. L10-N11", and "12... N11-Q10" for a turn's second edge. */
  const moveText = (index: number) => {
    const t = turnOf(index);
    return `${t.number}${t.edges[0].index === index ? "." : "..."} ${moveNotation(R.edges[index])}`;
  };
  // The move list and the chart show only these labels, to stay quiet. The board shows every label.
  const LISTED: Label[] = ["great", "inaccuracy", "mistake", "blunder"];
  const listed = (l: Label | null): l is Label => !!l && LISTED.includes(l);
  const currentKey = $derived(moments[Math.min(moment, moments.length - 1)]);
  const atMoment = $derived(!!currentKey && pos === currentKey.index);

  const pct = (x: number) => `${(100 * x).toFixed(1)}%`; // win chance, with one decimal wherever it shows
  const pts = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x))}`;
  const moverPts = (blue: number | undefined, p: Player) => (blue === undefined ? undefined : p === 0 ? blue : -blue);
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

  // The engine's candidates on the board: its first choice, and every other candidate that has enough visits to compare
  // (MIN_VISIT_SHARE of the most visited candidate's) and is within the Good band of the first choice. No limit on the
  // count: in an open position the visits spread, and every move that earns them shows. The first choice is KataGo's
  // order, its choice of move (the engine repository's design 04, "order"): by play selection value, where the move
  // with the best lower confidence bound is raised as far as that bound justifies, at most fivefold. So the first
  // choice is usually, not always, the best-LCB move, and it can have fewer visits than another candidate.
  function candidatesFor(i: number, p: Player): BoardCandidate[] {
    const a = R.data.analysis[i];
    if (!a) return [];
    const first = a.candidates[0];
    if (!first) return [];
    const best = moverWin(first.blueWin, p), bestPts = moverPts(first.lead, p);
    const most = Math.max(...a.candidates.map(c => c.visits));
    return a.candidates
      .map((c, k) => {
        const gap = best - moverWin(c.blueWin, p), cp = moverPts(c.lead, p);
        return { c, k, gap, gapPts: bestPts !== undefined && cp !== undefined ? bestPts - cp : undefined };
      })
      .filter(({ c, k, gap, gapPts }) => k === 0 || (c.visits >= MIN_VISIT_SHARE * most && gap <= GOOD_GAP
        && (gapPts === undefined || gapPts <= GOOD_POINTS)))
      .map(({ c, k, gap, gapPts }) => ({
        edge: c.edge, rank: k + 1,
        // Number 1's own values, and the others' difference from number 1 ("vs 1"), even when it is 0. A candidate
        // after number 1 in the engine's order can be better than it, by a little: its difference is then positive.
        note: k === 0 ? `${pct(moverWin(c.blueWin, p))}${c.lead !== undefined ? ` · ${pts(moverPts(c.lead, p)!)} pts` : ""}`
          : `vs 1: ${signed(-gap, pct(Math.abs(gap)))}${gapPts !== undefined ? ` · ${signed(-gapPts, `${Math.abs(Math.round(gapPts))} pts`)}` : ""}`,
      }));
  }

  // The table: every candidate, in the engine's order, in a box of TABLE_ROWS rows that scrolls. The rows on the board
  // have their number in a badge, as the board draws it.
  const onBoard = $derived(new Set(analysis ? candidatesFor(pos, mover).map(c => c.rank) : []));
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

  const boardCandidates = $derived.by(() => {
    if (stage === "walk" && atMoment)
      return attempt === "shown" || attempt === "solved" ? candidatesFor(pos, mover).slice(0, 1) : [];
    return analysis ? candidatesFor(pos, mover) : [];
  });
  // Label badges on the edges of the turn just played, as far as the current position.
  const marks = $derived.by((): BoardMark[] => {
    if (!lastMove) return [];
    return turnOf(lastMove.index).edges.filter(e => e.index < pos && e.label && e.edge)
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
    pending = null;
    showGame = false;
    if (currentKey) go(currentKey.index);
  }
  function setSide(s: "both" | Player) {
    side = s;
    moment = 0;
    resetAttempt();
  }

  // Edge input: a first point, then a second within 3 units (the rules' box). The rules engine will check legality
  // when the engine protocol gives the rules (docs/requests/02-engine-protocol.md).
  function onpoint(x: number, y: number) {
    if (!atMoment || (attempt !== "find" && attempt !== "worse" && attempt !== "unknown")) return;
    if (!pending) { pending = [x, y]; return; }
    const [px, py] = pending;
    const d = Math.max(Math.abs(px - x), Math.abs(py - y));
    if (d === 0) { pending = null; return; }
    if (d > 3) { pending = [x, y]; return; }
    pending = null;
    check([px, py, x, y]);
  }
  function check(edge: Edge) {
    tried = edge;
    const a = R.data.analysis[pos];
    const c = a?.candidates.find(c => sameEdge(c.edge, edge));
    if (!a || !c) { attempt = "unknown"; return; }
    const best = moverWin(a.candidates[0].blueWin, mover);
    if (moverWin(c.blueWin, mover) >= best - SOLVED_MARGIN) { attempt = "solved"; solved[currentKey.index] = true; }
    else attempt = "worse";
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
  const here = $derived(pos < last ? R.data.analysis[pos] : undefined);
  const status = $derived.by(() => {
    if (pos === last) return `Game over · ${PLAYER_NAME[winner]} won by ${margin.toFixed(1)} points`;
    const t = turnOf(pos);
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
  const searched = $derived(here && deepVisits ? Math.min(1, here.visits / deepVisits) : null);
</script>

<svelte:window {onkeydown} onclick={onwindowclick} />

{#snippet reviewStatus()}
  {#if problem}
    <p class="problem" role="alert">Engine error: {problem}</p>
  {:else if progress}
    <div class="review-progress">
      <div class="track" role="progressbar" aria-label="The review" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow={Math.round(100 * progress.parts.reduce((s, p) => s + p.share * p.done, 0))}>
        {#each progress.parts as part, k (k)}
          <div class="part" style="flex: {part.share}"><div style="width: {100 * part.done}%"></div></div>
        {/each}
      </div>
      <p>{progress.text}</p>
    </div>
  {/if}
{/snippet}

{#snippet player(p: Player)}
  <div class="side-info p{p}" class:to-move={pos < last && mover === p}>
    <span class="swatch p{p}"></span>
    <span class="name">{p === 0 ? R.data.players.blue : R.data.players.red}</span>
    <span class="role">{PLAYER_NAME[p]}</span>
    <span class="points"><strong>{fmtScore(position.scores[p])}</strong> points</span>
  </div>
{/snippet}

{#snippet highlights()}
  <p class="mock">A bot game, analysed in your browser. The label bands are placeholders until they are fitted to
    Enclosure.</p>
      <p class="summary">
        <strong>{PLAYER_NAME[winner]} won by {margin.toFixed(1)} points</strong>
        ({fmtScore(R.data.result.blue)} to {fmtScore(R.data.result.red)}).
        {#if progress}The review is still running: the counts and the mistakes below are partial.{/if}
        {#if biggest}The largest mistake came at edge {biggest.index + 1}: {explain(biggest)}{/if}
      </p>
      <table class="counts" class:partial={!!progress}>
        <thead>
          <tr>
            <th></th>
            <th><span class="swatch p0"></span> Blue</th>
            <th><span class="swatch p1"></span> Red</th>
          </tr>
        </thead>
        <tbody>
          <tr class="acc">
            <td>Accuracy</td><td>{Number.isNaN(R.summary[0].accuracy) ? "–" : R.summary[0].accuracy.toFixed(0)}</td>
            <td>{Number.isNaN(R.summary[1].accuracy) ? "–" : R.summary[1].accuracy.toFixed(0)}</td>
          </tr>
          <tr>
            <td>Points lost an edge</td><td>{R.summary[0].meanPointsLost?.toFixed(0) ?? "–"}</td>
            <td>{R.summary[1].meanPointsLost?.toFixed(0) ?? "–"}</td>
          </tr>
          {#each LABELS as l (l)}
            <tr>
              <td><span class="glyph-badge {l}">{LABEL_GLYPH[l]}</span> {LABEL_PLURAL[l]}</td>
              <td>{R.summary[0].counts[l]}</td><td>{R.summary[1].counts[l]}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <h3>Biggest mistakes{#if progress} <span class="so-far">so far</span>{/if}</h3>
      <ol class="moments">
        {#each R.keyMoments as m, k (m.index)}
          <li>
            <button class="link" onclick={() => startWalk(0, m.index)}>
              <span class="glyph-badge {m.label}">{LABEL_GLYPH[m.label!]}</span>
              <span class="move p{m.player}">{moveText(m.index)}</span>
              <span class="loss">{lossText(m)}</span>
            </button>
          </li>
        {/each}
      </ol>
      <button class="primary" onclick={() => startWalk(0)}>Learn from your mistakes</button>
{/snippet}

<main class="review" class:wide={wide.current} class:gauge-mode={display.win === "gauge"}>
  {#if wide.current}
    <aside class="summary-col panel">
      {@render reviewStatus()}
      {#if display.win === "gauge"}<div class="players">{@render player(0)}{@render player(1)}</div>{/if}
      {@render highlights()}
    </aside>
  {/if}

  <section class="board-col">
    {#if display.win === "bar"}
      <!-- The players face each other left and right, as they start: Blue at A10-D10, Red at Q10-T10. -->
      <div class="strip" aria-label="Players, scores and win chance">
        {@render player(0)}
        <div class="bar" class:pending={Number.isNaN(blueWin)} title="Win chance from the engine's search">
          {#if !Number.isNaN(blueWin)}
            <div class="bar-blue" style="width: {100 * blueWin}%">
              {#if blueWin >= 0.12}<span>{pct(blueWin)}</span>{/if}
            </div>
            <div class="bar-red">
              {#if blueWin <= 0.88}<span>{pct(1 - blueWin)}</span>{/if}
            </div>
          {:else}
            <span class="bar-wait">not analysed yet</span>
          {/if}
        </div>
        {@render player(1)}
      </div>
    {/if}
    <div class="board-row">
      {#if display.win === "gauge"}
        <!-- Lichess's and chess.com's gauge: Blue's share from the bottom. -->
        <div class="gauge" class:pending={Number.isNaN(blueWin)} role="img"
             aria-label={Number.isNaN(blueWin) ? "Win chance: not analysed yet" : `Blue's win chance ${pct(blueWin)}`}>
          {#if !Number.isNaN(blueWin)}
            <div class="gauge-blue" style="height: {100 * blueWin}%"></div>
            <!-- Each side's share at its own end, inside the gauge, as the bar shows them at its ends. -->
            {#if blueWin <= 1 - GAUGE_TEXT_ROOM}<span class="gauge-text top">{pct(1 - blueWin)}</span>{/if}
            {#if blueWin >= GAUGE_TEXT_ROOM}<span class="gauge-text bottom">{pct(blueWin)}</span>{/if}
          {/if}
        </div>
      {/if}
      <div class="board-wrap">
        <Board
          {position}
          lastEdge={lastMove?.edge ?? null}
          cut={lastMove?.cut ?? null}
          candidates={boardCandidates}
          highlight={hover}
          preview={stage === "walk" && atMoment && tried ? tried : hover}
          previewPlayer={mover}
          {marks}
          ghost={stage === "walk" && atMoment && showGame && currentKey.edge
            ? { edge: currentKey.edge, label: currentKey.label!, glyph: LABEL_GLYPH[currentKey.label!] } : null}
          layers={display.layers}
          pending={stage === "walk" && atMoment ? pending : null}
          onpoint={stage === "walk" && atMoment ? onpoint : undefined}
          oncandidate={e => (hover = e)}
        />
      </div>
    </div>
  </section>

  <section class="side panel">
    {#if !wide.current}
      {@render reviewStatus()}
      {#if display.win === "gauge"}<div class="players">{@render player(0)}{@render player(1)}</div>{/if}
    {/if}
    <!-- The position's engine header, as Lichess's: its values, its visits, and its search's progress. -->
    <div class="engine-head">
      <p class="expect">
        {#if here?.lead !== undefined}
          Expected final margin
          <strong>{pts(here.margin!)} ± {Math.round(here.spread!)}</strong> for Blue · lead {pts(here.lead)}
        {:else if pos === last}
          Final margin <strong>{pts(R.data.result.blue - R.data.result.red)}</strong> for Blue
        {:else}Not analysed yet{/if}
      </p>
      <div class="visits-row">
        <div class="search-bar" class:on={searched !== null} role="progressbar" aria-label="This position's search"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(100 * (searched ?? 0))}>
          {#if searched !== null}<div style="width: {100 * searched}%"></div>{/if}
        </div>
        <span class="visits">{#if here}{here.visits.toLocaleString("en")}{searched !== null && searched < 1 ? ` of ${deepVisits.toLocaleString("en")}` : ""} visits{/if}</span>
      </div>
    </div>
    <div class="tabs" role="tablist">
      {#if !wide.current}
        <button role="tab" class:on={view === "highlights"} onclick={() => (stage = "highlights")}>Highlights</button>
      {/if}
      <button role="tab" class:on={view === "walk"} onclick={() => startWalk(moment)}>Retry mistakes</button>
      <button role="tab" class:on={view === "analysis"} onclick={() => (stage = "analysis")}>Analysis</button>
    </div>

    <div class="stage" class:fill={view === "analysis"}>
      {#if view === "highlights"}
        {@render highlights()}
      {:else if view === "walk"}
        <h2 class="walk-title">Learn from your mistakes</h2>
        <div class="sides" role="radiogroup" aria-label="Whose mistakes">
          <span>Whose mistakes:</span>
          {#each [["both", "Both"], [0, "Blue"], [1, "Red"]] as const as [v, text] (v)}
            <button role="radio" aria-checked={side === v} class:on={side === v} onclick={() => setSide(v)}>
              {#if v !== "both"}<span class="swatch p{v}"></span>{/if}{text}
            </button>
          {/each}
        </div>
        {#if !currentKey}
          <p>No mistakes for this side after the opening.</p>
        {:else}
          {@const m = currentKey}
          <div class="walk-nav">
            <button onclick={() => toMoment(moment - 1)} disabled={moment === 0} aria-label="Previous mistake">◀</button>
            <span>Mistake {moment + 1} of {moments.length}</span>
            <button onclick={() => toMoment(moment + 1)} disabled={moment + 1 >= moments.length} aria-label="Next mistake">▶</button>
            <span class="progress">
              {#each moments as mm, k (mm.index)}
                <button class="pip" class:done={solved[mm.index]} class:here={k === moment} onclick={() => toMoment(k)}
                        aria-label="Mistake {k + 1}, edge {mm.index + 1}"></button>
              {/each}
            </span>
          </div>
          <div class="task">
            <p class="played">
              Edge {m.index + 1}: {PLAYER_NAME[m.player]} played <strong>{moveName(m.edge)}</strong>
              <span class="glyph-badge {m.label}">{LABEL_GLYPH[m.label!]}</span>
              and lost {m.pointsLost !== undefined ? `${Math.round(m.pointsLost)} points and ` : ""}{pct(m.loss)} of win chance.
            </p>
            {#if !atMoment}
              <p class="hint">You moved away from this position.</p>
              <div class="row"><button class="primary" onclick={resetAttempt}>Back to the mistake</button></div>
            {:else if attempt === "find"}
              <p class="ask">Find a better edge for {PLAYER_NAME[m.player]}.</p>
              <p class="hint">
                {pending ? "Now click its second point, at most 3 apart." : "Click the edge's first point on the board."}
              </p>
            {:else if attempt === "solved"}
              <p class="ok">Good edge! {edgeName(tried ?? m.best!.edge)} is as good as the engine's first choice.</p>
            {:else if attempt === "worse"}
              <p class="warn">Better than the game's edge, but not the best. Try another edge.</p>
            {:else if attempt === "unknown"}
              <p class="warn">The engine did not consider {edgeName(tried!)}. Try another edge.</p>
            {:else}
              <p>The solution: <strong>{edgeName(m.best!.edge)}</strong>, number 1 on the board.</p>
            {/if}
            {#if atMoment}
              <div class="row">
                {#if attempt === "solved" || attempt === "shown"}
                  <button class="primary" disabled={moment + 1 >= moments.length} onclick={() => toMoment(moment + 1)}>
                    Next mistake
                  </button>
                {:else}
                  <button onclick={() => (attempt = "shown")}>View the solution</button>
                  <button onclick={() => toMoment(moment + 1)} disabled={moment + 1 >= moments.length}>Skip</button>
                {/if}
                <button class="quiet" aria-pressed={showGame} onclick={() => (showGame = !showGame)}>
                  {showGame ? "Hide" : "Show"} the game's edge
                </button>
              </div>
            {/if}
          </div>
          {#if moment + 1 >= moments.length}
            <p class="done">Solved {moments.filter(mm => solved[mm.index]).length} of {moments.length}.</p>
          {/if}
        {/if}
      {:else}
        {@const rows = (analysis?.candidates ?? []).map((c, k) => ({ c, rank: k + 1 }))}
        <div class="cands-box" bind:this={tableBox} style="height: {(TABLE_ROWS + 1) * ROW_EM + 0.2}em">
        <table class="cands">
          <colgroup><col class="c-rank" /><col class="c-edge" /><col class="c-win" /><col class="c-lead" /><col class="c-visits" /></colgroup>
          <thead><tr><th>#</th><th>Edge</th><th>{PLAYER_NAME[mover]} wins</th><th>Lead</th><th>Visits</th></tr></thead>
          <tbody>
            {#each rows as { c, rank } (rank)}
              <tr class:first={rank === 1} class:lit={!!hover && sameEdge(c.edge, hover)} style={rowTint(c.blueWin)}
                  onmouseenter={() => (hover = c.edge)} onmouseleave={() => (hover = null)}>
                <td><span class="rank" class:first={rank === 1} class:shown={onBoard.has(rank)}
                          title={onBoard.has(rank) ? "On the board" : undefined}>{rank}</span></td>
                <td>{edgeName(c.edge)}</td><td>{pct(moverWin(c.blueWin, mover))}</td>
                <td>{c.lead !== undefined ? pts(moverPts(c.lead, mover)!) : "–"}</td><td>{c.visits}</td>
              </tr>
            {/each}
            {#each Array.from({ length: Math.max(0, TABLE_ROWS - rows.length) }, (_, k) => k) as k (k)}
              <tr class="empty">
                <td colspan="5">{k === 0 && !rows.length ? (pos === last ? "The game is over." : "Not analysed yet.") : ""}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        </div>
        <div class="movelist" bind:this={movelist}>
          {#each R.turns as t (t.number)}
            <div class="turn">
              <span class="tn">{t.number}.</span>
              {#each t.edges as e (e.index)}
                {@const after = R.blueScore[e.index + 1]}
                <button class="mv p{e.player}" class:here={pos === e.index + 1} onclick={() => go(e.index + 1)}
                        title={[e.label ? LABEL_TEXT[e.label] : "Not analysed yet", after !== undefined ? sideText(after) : ""].filter(Boolean).join(" · ")}>
                  <span class="mv-move">{moveNotation(e)}{#if listed(e.label)}<span class="glyph {e.label}">{LABEL_GLYPH[e.label]}</span>{/if}</span>
                  <span class="mv-eval">{leadShort(after)}</span>
                </button>
              {/each}
            </div>
            {#each t.edges.filter(e => e.label === "great" || (!!e.label && BAD_LABELS.includes(e.label) && e.label !== "inaccuracy")) as e (e.index)}
              <div class="comment">{explain(e)}</div>
            {/each}
          {/each}
        </div>
      {/if}
    </div>

    <div class="controls">
      <p class="status">{status}</p>
      <div class="controls-row">
        <div class="nav">
          <button onclick={() => go(0)} aria-label="First">⏮</button>
          <button onclick={() => go(pos - 1)} aria-label="Back">◀</button>
          <button onclick={() => go(pos + 1)} aria-label="Forward">▶</button>
          <button onclick={() => go(last)} aria-label="Last">⏭</button>
        </div>
        <div class="menu-wrap">
          <button class="gear" aria-label="Display settings" aria-expanded={menuOpen} aria-haspopup="dialog"
                  onclick={() => (menuOpen = !menuOpen)}>⚙</button>
          {#if menuOpen}
            <div class="menu" role="dialog" aria-label="Display settings">
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
    <p class="legend">
      <strong>Advantage chart</strong>
      <span class="key win"></span> Blue's win chance
      {#if display.scoreLine}<span class="key line"></span> Score so far (Blue − Red){/if}
    </p>
  </section>
</main>

<style>
  /* Design 06. The board's size is the smaller of the window's height (less the site's header, the bar above the
     board and a margin) and the width left after the other columns at their least (Lichess's uniboard). The columns:
     Lichess's side column (250 to 350 pixels) and an analysis column wider than its 240 to 400, for the five-column
     candidates table. */
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
  /* One column below 800 pixels (Lichess's $small): the board as wide as the window, then the analysis. */
  @media (max-width: 799px) {
    .review, .review.wide {
      --board: calc(100vw - 2rem - var(--gauge-w));
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: "board" "side" "under";
    }
    .review .side { height: auto; }
    .review .movelist { max-height: 22rem; }
    .review .board-wrap { width: auto; flex: 1; min-width: 0; } /* the column's width, whatever the scroll bar takes */
  }

  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 0.8rem 1rem; min-width: 0;
           box-sizing: border-box; }
  .summary-col { grid-area: summary; max-height: calc(var(--strip) + var(--board)); overflow-y: auto; }
  .board-col { grid-area: board; }
  .board-row { display: flex; }
  .board-wrap { width: var(--board); border-radius: 4px; overflow: hidden; flex: none; }
  /* The analysis column is as high as the board's column; the move list takes what is left. */
  .side { grid-area: side; height: calc(var(--strip) + var(--board)); display: flex; flex-direction: column; }
  .stage { flex: 1; min-height: 0; overflow-y: auto; }
  .stage.fill { display: flex; flex-direction: column; overflow: hidden; }
  .under { grid-area: under; min-width: 0; }

  /* The bar above the board: Blue's name and score, the bar, Red's score and name, in one row. */
  .strip { display: grid; grid-template-columns: auto minmax(6rem, 1fr) auto; align-items: center; gap: 0.5rem;
           height: calc(var(--strip) - 0.5rem); margin-bottom: 0.5rem; }
  .side-info { display: flex; align-items: baseline; gap: 0.4rem; padding: 0.15rem 0.4rem; border-radius: 4px; min-width: 0;
               max-width: 16rem; }
  .strip .side-info.p1 { flex-direction: row-reverse; }
  .side-info.to-move { background: var(--panel-2); box-shadow: inset 0 -2px 0 var(--last); }
  .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .role { color: var(--muted); font-size: 0.85em; }
  .points { font-variant-numeric: tabular-nums; color: var(--muted); font-size: 0.9em; white-space: nowrap; }
  .points strong { color: var(--text); font-size: 1.1em; }
  .players { display: grid; gap: 0.2rem; margin-bottom: 0.6rem; }
  .players .points { margin-left: auto; }
  .players .side-info { max-width: none; }
  .bar { display: flex; height: 1.15rem; border-radius: 3px; overflow: hidden; background: var(--red); }
  .bar.pending { background: var(--panel-2); align-items: center; justify-content: center; }
  .bar-wait { font-size: 0.75rem; color: var(--muted); }
  .bar-blue, .bar-red { display: flex; align-items: center; font-size: 0.75rem; font-weight: 700; color: #fff; }
  .bar-blue { background: var(--blue); justify-content: flex-start; padding-left: 0.4rem; transition: width 0.2s; box-sizing: border-box; }
  .bar-red { flex: 1; background: var(--red); justify-content: flex-end; padding-right: 0.4rem; }
  /* The gauge beside the board: Red's share from the top, Blue's from the bottom. */
  .gauge { position: relative; width: 2rem; align-self: stretch; margin-right: 0.5rem; display: flex;
           flex-direction: column-reverse; background: var(--red); border-radius: 3px; overflow: hidden; flex: none; }
  .gauge.pending { background: var(--panel-2); }
  .gauge-blue { background: var(--blue); transition: height 0.2s; }
  /* Small, so that "50.0%" fits the gauge's width. */
  .gauge-text { position: absolute; left: 0; right: 0; text-align: center; font-size: 0.6rem; font-weight: 700; color: #fff;
                font-variant-numeric: tabular-nums; }
  .gauge-text.top { top: 0.3rem; }
  .gauge-text.bottom { bottom: 0.3rem; }
  .swatch { display: inline-block; width: 0.8em; height: 0.8em; border-radius: 50%; flex: none; }
  .swatch.p0 { background: var(--blue); }
  .swatch.p1 { background: var(--red); }

  .engine-head { margin-bottom: 0.4rem; }
  .expect { margin: 0; font-size: 0.85em; color: var(--muted); font-variant-numeric: tabular-nums; }
  .expect strong { color: var(--text); }
  .visits-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
  .search-bar { flex: 1; height: 3px; border-radius: 2px; overflow: hidden; }
  .search-bar.on { background: var(--panel-2); }
  .search-bar div { height: 100%; background: var(--accent); transition: width 0.2s; }
  .visits { font-size: 0.78em; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }

  /* The step controls and the display menu, at the bottom of the analysis column (Lichess's place). */
  .controls { border-top: 1px solid var(--border); padding-top: 0.4rem; margin-top: 0.4rem; }
  .status { margin: 0 0 0.35rem; color: var(--muted); font-size: 0.82em; white-space: nowrap; overflow: hidden;
            text-overflow: ellipsis; }
  .controls-row { display: flex; justify-content: space-between; align-items: center; }
  .nav { display: flex; gap: 0.3rem; }
  .menu-wrap { position: relative; }
  .menu { position: absolute; right: 0; bottom: calc(100% + 0.4rem); z-index: 5; width: 15rem; padding: 0.6rem 0.8rem;
          background: var(--panel); border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 4px 14px rgb(0 0 0 / 0.25); }
  .menu fieldset { border: none; margin: 0 0 0.5rem; padding: 0; display: grid; gap: 0.2rem; }
  .menu fieldset:last-child { margin-bottom: 0; }
  .menu legend { font-weight: 600; font-size: 0.85em; margin-bottom: 0.15rem; }
  .menu label { font-size: 0.88em; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; }

  .legend { font-size: 0.82em; color: var(--muted); display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
  .key { display: inline-block; width: 1.2em; height: 0.6em; }
  .key.win { height: 2px; background: var(--text); }
  .key.line { height: 2px; background: var(--accent); }

  .problem { color: var(--blunder); font-size: 0.9em; margin: 0 0 0.6rem; }
  .review-progress { margin-bottom: 0.6rem; }
  .review-progress .track { display: flex; gap: 2px; height: 6px; }
  .review-progress .part { background: var(--panel-2); border-radius: 3px; overflow: hidden; }
  .review-progress .part div { height: 100%; background: var(--accent); transition: width 0.2s; }
  .review-progress p { margin: 0.25rem 0 0; font-size: 0.82em; color: var(--muted); }
  .tabs { display: flex; gap: 0.3rem; margin-bottom: 0.5rem; }
  .tabs button { flex: 1; background: transparent; border-color: transparent; border-bottom: 2px solid var(--border); border-radius: 0; }
  .tabs button.on { border-bottom-color: var(--accent); font-weight: 600; }
  .mock { font-size: 0.78em; color: var(--muted); margin: 0 0 0.8rem; }
  .summary { margin-top: 0; }

  .counts { width: 100%; border-collapse: collapse; font-size: 0.9em; }
  .counts th { font-weight: 600; text-align: right; padding-bottom: 0.2rem; }
  .counts td { padding: 0.12rem 0; border-top: 1px solid var(--border); }
  .counts td:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; width: 4.5rem; }
  .counts tr.acc td { font-weight: 700; font-size: 1.1em; }
  .counts.partial td:not(:first-child) { color: var(--muted); font-style: italic; }
  .so-far { margin-left: 0.4em; font-weight: 400; font-size: 0.85em; color: var(--muted); }
  .glyph-badge {
    display: inline-flex; align-items: center; justify-content: center; min-width: 1.3em; height: 1.3em; padding: 0 0.15em;
    border-radius: 999px; color: var(--on-badge); font-size: 0.78em; font-weight: 800; box-sizing: border-box;
  }
  .glyph-badge.great { background: var(--great); }
  .glyph-badge.best { background: var(--best); }
  .glyph-badge.excellent { background: var(--excellent); }
  .glyph-badge.good { background: var(--good); }
  .glyph-badge.inaccuracy { background: var(--inaccuracy); }
  .glyph-badge.mistake { background: var(--mistake); }
  .glyph-badge.blunder { background: var(--blunder); }
  .glyph { font-weight: 800; margin-left: 0.15em; }
  .glyph.great { color: var(--great); }
  .glyph.best { color: var(--best); }
  .glyph.excellent { color: var(--excellent); }
  .glyph.good { color: var(--good); }
  .glyph.inaccuracy { color: var(--inaccuracy); }
  .glyph.mistake { color: var(--mistake); }
  .glyph.blunder { color: var(--blunder); }

  h3 { margin: 1rem 0 0.3rem; font-size: 1rem; }
  .moments { padding-left: 1.3rem; margin: 0 0 0.9rem; }
  .link { background: none; border: none; padding: 0.1rem 0; text-align: left; }
  .link:hover { color: var(--accent); }
  .loss { color: var(--muted); font-size: 0.88em; margin-left: 0.3em; }
  .move { font-family: ui-monospace, monospace; font-size: 0.95em; }
  .move.p0 { color: var(--blue); }
  .move.p1 { color: var(--red); }
  .walk-title { font-size: 1.05rem; margin: 0 0 0.5rem; }
  .sides { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; font-size: 0.88em; color: var(--muted); margin-bottom: 0.7rem; }
  .sides button { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.95em; }
  .sides button.on { border-color: var(--accent); background: var(--panel); color: var(--text); font-weight: 600; }
  .walk-nav { display: flex; align-items: center; gap: 0.4rem; color: var(--muted); font-size: 0.9em; margin-bottom: 0.6rem; }
  .walk-nav button { padding: 0.1rem 0.5rem; }
  .progress { display: flex; gap: 5px; align-items: center; margin-left: auto; }
  .pip { width: 11px; height: 11px; padding: 0; border-radius: 50%; background: var(--border); border: none; }
  .pip.done { background: var(--best); }
  .pip.here { outline: 2px solid var(--accent); outline-offset: 1px; }
  .task { background: var(--panel-2); border-radius: 6px; padding: 0.7rem 0.8rem; }
  .task p { margin: 0 0 0.5rem; }
  .ask { font-weight: 700; font-size: 1.05em; }
  .hint { color: var(--muted); font-size: 0.9em; }
  .done { color: var(--muted); font-size: 0.9em; margin-top: 0.6rem; }
  button.quiet { background: none; border-color: transparent; color: var(--muted); }
  .ok { color: var(--best); font-weight: 600; }
  .warn { color: var(--mistake); }
  .row { display: flex; flex-wrap: wrap; gap: 0.4rem; }

  /* Fixed columns: the table keeps its layout from position to position. The space left goes to the edge column. */
  /* The table's box: a fixed height (set from TABLE_ROWS), a scroll bar when there are more rows, and room for the
     scroll bar kept at all times, so that the columns do not move when it appears. */
  .cands-box { font-size: 0.9em; overflow-y: auto; scrollbar-gutter: stable; margin-bottom: 0.7rem; flex: none; }
  .cands { width: 100%; table-layout: fixed; border-collapse: collapse; }
  .cands thead th { position: sticky; top: 0; z-index: 1; background: var(--panel); height: 1.9em; }
  .c-rank { width: 2.2em; }
  .c-win { width: 6.5em; }
  .c-lead { width: 4.5em; }
  .c-visits { width: 4.5em; }
  .cands td, .cands th { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cands th { text-align: left; color: var(--muted); font-weight: 500; }
  .cands td, .cands th { padding: 0.15rem 0.3rem; border-bottom: 1px solid var(--border); }
  .cands tbody tr { height: 1.9em; }
  .cands tr.first td { font-weight: 600; }
  .cands tr.lit { outline: 1px solid var(--accent); outline-offset: -1px; }
  .cands tr.empty td { color: var(--muted); font-style: italic; }
  /* A candidate on the board has its number in a badge, as the board draws it. The others have a plain number. */
  .rank { display: inline-flex; min-width: 1.3em; height: 1.3em; border-radius: 999px; align-items: center; justify-content: center;
          color: var(--muted); font-size: 0.8em; font-weight: 700; box-sizing: border-box; padding: 0 0.2em; }
  .rank.shown { background: var(--candidate); color: var(--on-badge); }
  .rank.shown.first { background: var(--engine); }
  .movelist { flex: 1; min-height: 0; overflow-y: auto; font-size: 0.9em; border-top: 1px solid var(--border); padding-top: 0.4rem; }
  .turn { display: flex; gap: 0.3rem; align-items: baseline; }
  .tn { width: 2.2rem; flex: none; color: var(--muted); font-variant-numeric: tabular-nums; }
  /* Every move has one width, so the columns line up. The move: the widest in the notation is 10 characters, an edge
     with two-digit rows and the cut mark (D10-G10x, 8) and the widest glyph (??, 2), then the glyph's margin. The
     lead after it: at most 5 characters (+1.2k), smaller and right-aligned. The font is monospaced, so ch is one
     character of the span's own size. */
  .mv { display: inline-flex; align-items: baseline; gap: 0.25rem; background: none; border: none; padding: 0.05rem 0.2rem;
        font-family: ui-monospace, monospace; font-size: 0.95em; text-align: left; white-space: nowrap; flex: none; }
  .mv-move { width: calc(10ch + 0.15em); }
  .mv-eval { width: 5ch; font-size: 0.78em; text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }
  .mv.p0 { color: var(--blue); }
  .mv.p1 { color: var(--red); }
  .mv:hover { background: var(--panel-2); outline: 1px solid var(--border); }
  .mv.here { background: var(--panel-2); outline: 1px solid var(--accent); }
  .comment { margin: 0.1rem 0 0.35rem 2.5rem; font-size: 0.88em; color: var(--muted); }
</style>
