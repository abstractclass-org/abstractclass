<script lang="ts">
  // The review of one game: three stages on one page (docs/research/01-ux-survey.md, section 8): Highlights
  // (chess.com), learning from the mistakes with retries (chess.com's key moments, Lichess's "Learn from your
  // mistakes"), and free analysis (Lichess). The review may be partial while the engine works: an edge with no label
  // yet shows none.
  import Board, { type BoardCandidate, type BoardLayers, type BoardMark } from "#lib/board/Board.svelte";
  import Graph from "./Graph.svelte";
  import {
    explain, edgeName, moveName, sameEdge, moverWin, largest, lossText, LABELS, LABEL_TEXT, LABEL_PLURAL, LABEL_GLYPH, BAD_LABELS,
    PLAYER_NAME, type Edge, type Player, type Review,
  } from "./model.ts";

  interface Props {
    R: Review;
    note?: string; // what the engine is doing, under the board
    onposition?: (pos: number) => void; // the position on screen changed
  }
  let { R, note = "", onposition }: Props = $props();
  const last = $derived(R.data.positions.length - 1);
  const SOLVED_MARGIN = 0.02; // Lichess: within 0.04 winning chances of the best, which is 0.02 of win chance
  const GOOD_GAP = 0.05; // a candidate shows when it is within the Good band of the first choice (labels.ts)
  const GOOD_POINTS = 36; // the Good band in points (labels.ts)
  const MAX_CANDIDATES = 3;

  type Stage = "highlights" | "walk" | "analysis";
  let stage = $state<Stage>("highlights");
  let pos = $state(0);
  let hover = $state<Edge | null>(null);
  let layers = $state<BoardLayers>({ regions: true, protected: true, candidates: true, marks: true, coordinates: true });
  let showScore = $state(true);

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
  const currentKey = $derived(moments[Math.min(moment, moments.length - 1)]);
  const atMoment = $derived(!!currentKey && pos === currentKey.index);

  const pct = (x: number) => `${(100 * x).toFixed(0)}%`;
  const pts = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x))}`;
  const moverPts = (blue: number | undefined, p: Player) => (blue === undefined ? undefined : p === 0 ? blue : -blue);
  const fmtScore = (s: number) => Math.round(s).toLocaleString("en");

  // The engine's candidates in the position: its first choice, and the others within the Good band, at most three.
  function candidatesFor(i: number, p: Player): BoardCandidate[] {
    const a = R.data.analysis[i];
    if (!a) return [];
    const first = a.candidates[0];
    if (!first) return [];
    const best = moverWin(first.blueWin, p), bestPts = moverPts(first.lead, p);
    return a.candidates
      .map((c, k) => {
        const gap = best - moverWin(c.blueWin, p), cp = moverPts(c.lead, p);
        return { c, k, gap, gapPts: bestPts !== undefined && cp !== undefined ? bestPts - cp : undefined };
      })
      .filter(({ k, gap, gapPts }) => k === 0 || (gap <= GOOD_GAP && (gapPts === undefined || gapPts <= GOOD_POINTS)))
      .slice(0, MAX_CANDIDATES)
      .map(({ c, k, gap, gapPts }) => ({
        edge: c.edge, rank: k + 1,
        note: k === 0 ? `${edgeName(c.edge)} · ${pct(moverWin(c.blueWin, p))}${c.lead !== undefined ? ` · lead ${pts(moverPts(c.lead, p)!)}` : ""}`
          : gap < 0.005 && (gapPts ?? 0) < 1 ? `${edgeName(c.edge)} · as good as 1`
          : `${edgeName(c.edge)} · −${pct(Math.max(0, gap))}${gapPts !== undefined ? `, −${Math.max(0, Math.round(gapPts))} pts` : ""}`,
      }));
  }

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
  const here = $derived(pos < last ? R.data.analysis[pos] : undefined);
  const status = $derived.by(() => {
    if (pos === last) return `Game over · ${PLAYER_NAME[winner]} won by ${margin.toFixed(1)} points`;
    const t = turnOf(pos);
    const k = t.edges.findIndex(e => e.index === pos) + 1;
    return `Edge ${pos + 1} of ${last} · Turn ${t.number} · ${PLAYER_NAME[mover]} to play, edge ${k} of ${t.edges.length}`;
  });
  const blueWin = $derived(R.blueWin[pos]);
</script>

<svelte:window {onkeydown} />

<main class="review">
  <section class="board-col">
    <!-- The players face each other left and right, as they start: Blue at A10-D10, Red at Q10-T10. -->
    <div class="match" aria-label="Players, scores and win chance">
      <div class="side-info p0" class:to-move={pos < last && mover === 0}>
        <span class="swatch p0"></span>
        <span class="name">{R.data.players.blue}</span>
        <span class="role">Blue</span>
        <span class="points"><strong>{fmtScore(position.scores[0])}</strong> points</span>
      </div>
      <div class="side-info p1" class:to-move={pos < last && mover === 1}>
        <span class="points"><strong>{fmtScore(position.scores[1])}</strong> points</span>
        <span class="role">Red</span>
        <span class="name">{R.data.players.red}</span>
        <span class="swatch p1"></span>
      </div>
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
      <p class="expect">
        {#if here?.lead !== undefined}
          Expected final margin <strong>{pts(here.margin!)} ± {Math.round(here.spread!)}</strong> for Blue ·
          lead {pts(here.lead)} · {here.visits} visits
        {:else if pos === last}
          Final margin {pts(R.data.result.blue - R.data.result.red)} for Blue
        {:else}&nbsp;{/if}
      </p>
    </div>

    <div class="board-wrap">
      <Board
        {position}
        lastEdge={lastMove?.edge ?? null}
        cut={lastMove?.cut ?? null}
        candidates={boardCandidates}
        preview={stage === "walk" && atMoment && tried ? tried : hover}
        previewPlayer={mover}
        {marks}
        ghost={stage === "walk" && atMoment && showGame && currentKey.edge
          ? { edge: currentKey.edge, label: currentKey.label!, glyph: LABEL_GLYPH[currentKey.label!] } : null}
        {layers}
        pending={stage === "walk" && atMoment ? pending : null}
        onpoint={stage === "walk" && atMoment ? onpoint : undefined}
        oncandidate={e => (hover = e)}
      />
    </div>

    <div class="toolbar">
      <div class="nav">
        <button onclick={() => go(0)} aria-label="First">⏮</button>
        <button onclick={() => go(pos - 1)} aria-label="Back">◀</button>
        <button onclick={() => go(pos + 1)} aria-label="Forward">▶</button>
        <button onclick={() => go(last)} aria-label="Last">⏭</button>
      </div>
      <div class="chips" aria-label="Board layers">
        <label class="chip"><input type="checkbox" bind:checked={layers.candidates} /> Candidates</label>
        <label class="chip"><input type="checkbox" bind:checked={layers.marks} /> Move labels</label>
        <label class="chip"><input type="checkbox" bind:checked={layers.regions} /> Regions</label>
        <label class="chip"><input type="checkbox" bind:checked={layers.protected} /> Protected</label>
      </div>
    </div>
    <p class="status">{status}{#if note} · <span class="engine-note">{note}</span>{/if}</p>

    <Graph blueWin={R.blueWin} {scoreDiff} current={pos} {showScore}
           moments={(stage === "walk" ? moments : R.keyMoments).map(m => ({ index: m.index, label: m.label! }))} onjump={go} />
    <p class="legend">
      <span class="key area"></span> Blue's win chance <span class="key line"></span> Score so far (Blue − Red)
      <label><input type="checkbox" bind:checked={showScore} /> show score</label>
    </p>
  </section>

  <section class="side">
    <div class="tabs" role="tablist">
      <button role="tab" class:on={stage === "highlights"} onclick={() => (stage = "highlights")}>Highlights</button>
      <button role="tab" class:on={stage === "walk"} onclick={() => startWalk(moment)}>Retry mistakes</button>
      <button role="tab" class:on={stage === "analysis"} onclick={() => (stage = "analysis")}>Analysis</button>
    </div>
    <p class="mock">A bot game, analysed in your browser. The label bands are placeholders until they are fitted to
      Enclosure.</p>

    {#if stage === "highlights"}
      <p class="summary">
        <strong>{PLAYER_NAME[winner]} won by {margin.toFixed(1)} points</strong>
        ({fmtScore(R.data.result.blue)} to {fmtScore(R.data.result.red)}).
        {#if R.analysed < last}Analysed {R.analysed} of {last} positions so far.{/if}
        {#if biggest}The largest mistake came at edge {biggest.index + 1}: {explain(biggest)}{/if}
      </p>
      <table class="counts">
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
      <h3>Biggest mistakes</h3>
      <ol class="moments">
        {#each R.keyMoments as m, k (m.index)}
          <li>
            <button class="link" onclick={() => startWalk(0, m.index)}>
              <span class="glyph-badge {m.label}">{LABEL_GLYPH[m.label!]}</span>
              Edge {m.index + 1}: {PLAYER_NAME[m.player]} played {moveName(m.edge)}
              <span class="loss">{lossText(m)}</span>
            </button>
          </li>
        {/each}
      </ol>
      <button class="primary" onclick={() => startWalk(0)}>Learn from your mistakes</button>
    {:else if stage === "walk"}
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
      {#if analysis}
        <table class="cands">
          <thead><tr><th>#</th><th>Edge</th><th>{PLAYER_NAME[mover]} wins</th><th>Lead</th><th>Visits</th></tr></thead>
          <tbody>
            {#each analysis.candidates.slice(0, 5) as c, k (k)}
              <tr class:first={k === 0} onmouseenter={() => (hover = c.edge)} onmouseleave={() => (hover = null)}>
                <td><span class="rank" class:first={k === 0}>{k + 1}</span></td>
                <td>{edgeName(c.edge)}</td><td>{pct(moverWin(c.blueWin, mover))}</td>
                <td>{c.lead !== undefined ? pts(moverPts(c.lead, mover)!) : "–"}</td><td>{c.visits}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
      <div class="movelist">
        {#each R.turns as t (t.number)}
          <div class="turn">
            <span class="tn">{t.number}{t.player === 0 ? "b" : "r"}.</span>
            {#each t.edges as e (e.index)}
              <button class="mv p{e.player}" class:here={pos === e.index + 1} onclick={() => go(e.index + 1)}
                      title={e.label ? LABEL_TEXT[e.label] : "Not analysed yet"}>
                {moveName(e.edge)}{#if e.label}<span class="glyph {e.label}">{LABEL_GLYPH[e.label]}</span>{/if}
              </button>
            {/each}
          </div>
          {#each t.edges.filter(e => e.label === "great" || (!!e.label && BAD_LABELS.includes(e.label) && e.label !== "inaccuracy")) as e (e.index)}
            <div class="comment">{explain(e)}</div>
          {/each}
        {/each}
      </div>
    {/if}
  </section>
</main>

<style>
  .review {
    display: grid;
    grid-template-columns: minmax(0, 640px) minmax(320px, 420px);
    gap: 1.25rem;
    max-width: 1100px;
    margin: 1rem auto;
    padding: 0 1rem;
    align-items: start;
  }
  @media (max-width: 860px) { .review { grid-template-columns: minmax(0, 1fr); } }

  /* The match strip: Blue on the left, Red on the right, the win-chance bar between and below them. */
  .match { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem 0.5rem; margin-bottom: 0.5rem; }
  .side-info { display: flex; align-items: baseline; gap: 0.4rem; padding: 0.15rem 0.4rem; border-radius: 4px; min-width: 0; }
  .side-info.p1 { justify-content: flex-end; }
  .side-info.to-move { background: var(--panel-2); box-shadow: inset 0 -2px 0 var(--last); }
  .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .role { color: var(--muted); font-size: 0.85em; }
  .points { font-variant-numeric: tabular-nums; color: var(--muted); font-size: 0.9em; white-space: nowrap; }
  .points strong { color: var(--text); font-size: 1.1em; }
  .side-info.p0 .points { margin-left: auto; }
  .side-info.p1 .points { margin-right: auto; }
  .bar { grid-column: 1 / -1; display: flex; height: 1.15rem; border-radius: 3px; overflow: hidden; background: var(--red); }
  .bar.pending { background: var(--panel-2); align-items: center; justify-content: center; }
  .bar-wait { font-size: 0.75rem; color: var(--muted); }
  .expect { grid-column: 1 / -1; margin: 0; font-size: 0.85em; color: var(--muted); text-align: center; font-variant-numeric: tabular-nums; }
  .expect strong { color: var(--text); }
  .engine-note { color: var(--accent); }
  .bar-blue, .bar-red { display: flex; align-items: center; font-size: 0.75rem; font-weight: 700; color: #fff; }
  .bar-blue { background: var(--blue); justify-content: flex-start; padding-left: 0.4rem; transition: width 0.2s; box-sizing: border-box; }
  .bar-red { flex: 1; background: var(--red); justify-content: flex-end; padding-right: 0.4rem; }
  .swatch { display: inline-block; width: 0.8em; height: 0.8em; border-radius: 50%; flex: none; }
  .swatch.p0 { background: var(--blue); }
  .swatch.p1 { background: var(--red); }

  .board-wrap { border-radius: 4px; overflow: hidden; }
  .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.4rem; }
  .nav { display: flex; gap: 0.3rem; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .chip { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.82em; padding: 0.15rem 0.5rem;
          border: 1px solid var(--border); border-radius: 999px; background: var(--panel); cursor: pointer; }
  .chip input { margin: 0; }
  .status { margin: 0.35rem 0 0.6rem; color: var(--muted); font-size: 0.88em; }
  .legend { font-size: 0.82em; color: var(--muted); display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
  .key { display: inline-block; width: 1.2em; height: 0.6em; }
  .key.area { background: linear-gradient(var(--blue), var(--red)); opacity: 0.5; }
  .key.line { height: 2px; background: var(--text); }

  .side { background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 0.8rem 1rem 1rem; min-width: 0; }
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

  .cands { width: 100%; border-collapse: collapse; font-size: 0.9em; margin-bottom: 0.7rem; }
  .cands th { text-align: left; color: var(--muted); font-weight: 500; }
  .cands td, .cands th { padding: 0.15rem 0.3rem; border-bottom: 1px solid var(--border); }
  .cands tr.first td { font-weight: 600; }
  .rank { display: inline-flex; width: 1.3em; height: 1.3em; border-radius: 50%; align-items: center; justify-content: center;
          background: var(--candidate); color: var(--on-badge); font-size: 0.8em; font-weight: 700; }
  .rank.first { background: var(--engine); }
  .movelist { max-height: 26rem; overflow-y: auto; font-size: 0.9em; border-top: 1px solid var(--border); padding-top: 0.4rem; }
  .turn { display: flex; gap: 0.3rem; align-items: baseline; }
  .tn { width: 2.6rem; color: var(--muted); font-variant-numeric: tabular-nums; }
  .mv { background: none; border: none; padding: 0.05rem 0.3rem; font-family: ui-monospace, monospace; font-size: 0.95em; }
  .mv.p0 { color: var(--blue); }
  .mv.p1 { color: var(--red); }
  .mv.here { background: var(--panel-2); outline: 1px solid var(--accent); }
  .comment { margin: 0.1rem 0 0.35rem 2.9rem; font-size: 0.88em; color: var(--muted); }
</style>
