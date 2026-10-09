<script lang="ts">
  // Puzzles, a prototype on the mock game (src/lib/puzzles/model.ts). After Lichess (ui/puzzle): a side menu of modes,
  // and a puzzle in three states. Play is rated. After a wrong edge it becomes try: unrated, try again or view the
  // solution. View comes after the end, with the rating change, a vote and "Continue training".
  import Board, { type BoardCandidate } from "#lib/board/Board.svelte";
  import { EdgeInput } from "#lib/board/edgeInput.svelte.ts";
  import { review, edgeName, sameEdge, PLAYER_NAME, type Edge, type ReviewData } from "#lib/review/model.ts";
  import { puzzlesFrom, nextRating, THEME_TEXT, type Puzzle, type Theme } from "#lib/puzzles/model.ts";
  import data from "#lib/mock/review.json";

  const R = review(data as unknown as ReviewData);
  const ALL = puzzlesFrom(R);

  type View = "puzzles" | "streak" | "themes";
  let view = $state<View>("puzzles");
  let theme = $state<Theme | null>(null);
  // Streak runs from easy to hard, as Lichess's does. Otherwise: the chosen theme, or all.
  const pool = $derived(view === "streak" ? [...ALL].sort((a, b) => a.rating - b.rating)
    : theme ? ALL.filter(p => p.themes.includes(theme!)) : ALL);

  let rating = $state(1500); // the visitor's puzzle rating, kept in this page only (no accounts yet)
  let at = $state(0);
  let mode = $state<"play" | "try" | "view">("play");
  let feedback = $state<"init" | "fail" | "win" | "shown">("init");
  let tried = $state<Edge | null>(null);
  let change = $state<number | null>(null);
  let vote = $state<"up" | "down" | null>(null);
  let history = $state<{ id: string; solved: boolean }[]>([]);
  let streak = $state(0);
  let streakOver = $state(false);
  let skipUsed = $state(false);

  const puzzle = $derived<Puzzle>(pool[at % pool.length]);
  const position = $derived(R.data.positions[puzzle.index]);
  const lastMove = $derived(puzzle.index > 0 ? R.edges[puzzle.index - 1] : null);
  const input = new EdgeInput(edge => attempt(edge));

  const solutionShown = $derived(mode === "view");
  const candidates = $derived<BoardCandidate[]>(
    solutionShown ? [{ edge: puzzle.solution, rank: 1, note: `${edgeName(puzzle.solution)} · the only good edge` }] : []);

  function attempt(edge: Edge) {
    if (mode === "view") return;
    tried = edge;
    const solved = sameEdge(edge, puzzle.solution);
    if (solved) {
      feedback = "win";
      if (mode === "play") finish(true);
      mode = "view";
    } else {
      feedback = "fail";
      if (mode === "play") finish(false);
      if (view === "streak") { streakOver = true; mode = "view"; }
      else mode = "try";
    }
  }
  // The result counts once, at the first edge, as on Lichess.
  function finish(solved: boolean) {
    const before = rating;
    if (view !== "streak") { rating = nextRating(rating, puzzle.rating, solved); change = rating - before; }
    history = [...history, { id: puzzle.id, solved }].slice(-12);
    if (view === "streak" && solved) streak++;
  }
  function showSolution() {
    if (mode === "play") finish(false);
    feedback = "shown";
    mode = "view";
    if (view === "streak") streakOver = true;
  }
  function next() {
    at = (at + 1) % pool.length;
    mode = "play"; feedback = "init"; tried = null; change = null; vote = null;
    input.reset();
  }
  function open(v: View, t: Theme | null = null) {
    view = v; theme = t; at = 0;
    if (v === "streak") { streak = 0; streakOver = false; skipUsed = false; at = 0; }
    mode = "play"; feedback = "init"; tried = null; change = null; vote = null;
    input.reset();
  }
  function skip() { skipUsed = true; next(); }
</script>

<svelte:head><title>Puzzles</title></svelte:head>

<main class="puzzles">
  <nav class="menu" aria-label="Puzzle modes">
    <button class:on={view === "puzzles" && !theme} onclick={() => open("puzzles")}>Puzzles</button>
    <button class:on={view === "streak"} onclick={() => open("streak")}>Streak</button>
    <button class:on={view === "themes" || (view === "puzzles" && !!theme)} onclick={() => (view = "themes")}>Themes</button>
    <span class="soon" title="Needs stored history">From my games</span>
    <span class="soon" title="Needs stored history">Dashboard</span>
    <span class="soon" title="Needs stored history">History</span>
  </nav>

  {#if view === "themes"}
    <section class="themes">
      <h1>Puzzle themes</h1>
      <p class="mock">Mock puzzles from one bot game. Motif themes (enclose, cut, double threat) come when the engine
        gives the rules.</p>
      <div class="grid">
        {#each Object.entries(THEME_TEXT) as [key, t] (key)}
          {@const n = ALL.filter(p => p.themes.includes(key as Theme)).length}
          <button class="theme" disabled={!n} onclick={() => open("puzzles", key as Theme)}>
            <strong>{t.name}</strong> <span class="count">{n}</span>
            <span class="about">{t.about}</span>
          </button>
        {/each}
      </div>
    </section>
  {:else}
    <section class="board-col">
      <Board
        {position}
        lastEdge={lastMove?.edge ?? null}
        cut={lastMove?.cut ?? null}
        {candidates}
        preview={tried}
        previewPlayer={puzzle.player}
        layers={{ regions: true, protected: true, candidates: true, marks: false, coordinates: true }}
        pending={input.pending}
        onpoint={mode !== "view" ? input.click : undefined}
      />
    </section>

    <section class="side">
      {#if view === "streak"}
        <div class="streak">Streak <strong>{streak}</strong></div>
      {:else}
        <div class="rating">Your puzzle rating <strong>{rating}</strong>
          {#if change !== null}<span class:up={change > 0} class:down={change < 0}>{change > 0 ? "+" : ""}{change}</span>{/if}
        </div>
        {#if theme}<p class="filter">Theme: <strong>{THEME_TEXT[theme].name}</strong>
          <button class="link" onclick={() => open("puzzles")}>clear</button></p>{/if}
      {/if}

      <div class="card">
        {#if feedback === "init"}
          <div class="turn"><span class="swatch p{puzzle.player}"></span> Your turn</div>
          <p class="ask">Find the best edge for {PLAYER_NAME[puzzle.player]}.</p>
          <p class="hint">{input.pending ? "Now its second point, at most 3 apart." : "Click the edge's first point."}</p>
        {:else if feedback === "fail" && mode === "try"}
          <p class="bad">That's not the edge. Try something else.</p>
          <p class="hint">This attempt no longer counts for your rating.</p>
        {:else if feedback === "fail"}
          <p class="bad">Streak over: {streak} solved.</p>
        {:else if feedback === "win"}
          <p class="good">Best edge! {edgeName(puzzle.solution)} is the only good edge here.</p>
        {:else}
          <p>The solution: <strong>{edgeName(puzzle.solution)}</strong>, number 1 on the board.</p>
        {/if}

        <div class="row">
          {#if mode !== "view"}
            <button onclick={showSolution}>View the solution</button>
            {#if view === "streak" && !skipUsed}<button onclick={skip} title="One skip per streak, as on Lichess">Skip</button>{/if}
          {:else if view === "streak" && streakOver}
            <button class="primary" onclick={() => open("streak")}>New streak</button>
          {:else}
            <button class="primary" onclick={next}>Continue training</button>
          {/if}
        </div>
      </div>

      {#if mode === "view"}
        <div class="after">
          <p>Puzzle {puzzle.id} · rating {puzzle.rating} (predicted) · from edge {puzzle.index + 1} of a bot game</p>
          <p class="tags">{#each puzzle.themes as t (t)}<span class="tag">{THEME_TEXT[t].name}</span>{/each}</p>
          <div class="vote">
            Did you like this puzzle?
            <button class:on={vote === "up"} onclick={() => (vote = "up")} aria-label="Yes">▲</button>
            <button class:on={vote === "down"} onclick={() => (vote = "down")} aria-label="No">▼</button>
          </div>
        </div>
      {/if}

      {#if history.length}
        <div class="session" aria-label="This session">
          {#each history as h, i (i)}<span class="pip" class:ok={h.solved} title={h.id}></span>{/each}
        </div>
      {/if}
      <p class="mock">Prototype on mock data: {ALL.length} puzzles from one bot game. Ratings stay in this page.</p>
    </section>
  {/if}
</main>

<style>
  .puzzles { display: grid; grid-template-columns: 10rem minmax(0, 600px) minmax(280px, 360px); gap: 1.25rem;
             max-width: 1180px; margin: 1rem auto; padding: 0 1rem; align-items: start; }
  @media (max-width: 960px) { .puzzles { grid-template-columns: minmax(0, 1fr); } .menu { flex-direction: row; flex-wrap: wrap; } }
  .menu { display: flex; flex-direction: column; gap: 0.15rem; }
  .menu button { text-align: left; background: none; border-color: transparent; }
  .menu button.on { background: var(--panel); border-color: var(--border); font-weight: 600; }
  .soon { color: var(--muted); opacity: 0.55; padding: 0.3rem 0.7rem; cursor: default; }
  .themes { grid-column: 2 / -1; }
  .themes h1 { margin: 0 0 0.3rem; font-size: 1.4rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.6rem; }
  .theme { text-align: left; background: var(--panel); padding: 0.7rem 0.8rem; display: grid; gap: 0.2rem; }
  .count { color: var(--muted); font-weight: 400; margin-left: 0.3rem; }
  .about { color: var(--muted); font-size: 0.88em; }
  .board-col { border-radius: 4px; overflow: hidden; }
  .side { display: grid; gap: 0.7rem; min-width: 0; }
  .rating, .streak { font-size: 0.95em; color: var(--muted); }
  .rating strong, .streak strong { color: var(--text); font-size: 1.4em; margin-left: 0.3rem; }
  .up { color: var(--best); font-weight: 700; margin-left: 0.4rem; }
  .down { color: var(--blunder); font-weight: 700; margin-left: 0.4rem; }
  .filter { margin: 0; font-size: 0.9em; }
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 0.9rem 1rem; }
  .card p { margin: 0 0 0.5rem; }
  .turn { display: flex; align-items: center; gap: 0.4rem; font-weight: 700; font-size: 1.15em; margin-bottom: 0.3rem; }
  .ask { font-weight: 600; }
  .hint { color: var(--muted); font-size: 0.88em; }
  .good { color: var(--best); font-weight: 700; }
  .bad { color: var(--mistake); font-weight: 700; }
  .row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .after { font-size: 0.88em; color: var(--muted); }
  .after p { margin: 0 0 0.4rem; }
  .tags { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .tag { background: var(--panel-2); border: 1px solid var(--border); border-radius: 999px; padding: 0.05rem 0.5rem; color: var(--text); }
  .vote { display: flex; align-items: center; gap: 0.4rem; }
  .vote button { padding: 0.1rem 0.5rem; }
  .vote button.on { border-color: var(--accent); color: var(--accent); }
  .session { display: flex; gap: 4px; flex-wrap: wrap; }
  .pip { width: 12px; height: 12px; border-radius: 3px; background: var(--blunder); }
  .pip.ok { background: var(--best); }
  .swatch { display: inline-block; width: 0.8em; height: 0.8em; border-radius: 50%; }
  .swatch.p0 { background: var(--blue); }
  .swatch.p1 { background: var(--red); }
  .link { background: none; border: none; color: var(--accent); padding: 0 0.2rem; }
  .mock { font-size: 0.78em; color: var(--muted); margin: 0; }
</style>
