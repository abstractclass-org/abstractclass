<script lang="ts">
  // Puzzles, a prototype on the mock game (src/lib/puzzles/model.ts). After Lichess (ui/puzzle): a side menu of modes,
  // and a puzzle in three states. Play is rated. After a wrong edge it becomes try: unrated, try again or view the
  // solution. View comes after the end, with the rating change, a vote and "Continue training".
  import Board, { type BoardCandidate } from "#lib/board/Board.svelte";
  import { EdgeInput } from "#lib/board/edgeInput.svelte.ts";
  import EdgeInputHint from "#lib/board/EdgeInputHint.svelte";
  import { EngineWorker, loadManifest, moduleOf } from "@abstractclass/engine/client.ts";
  import { rulesOf, type DescribeReply } from "#lib/engine/position.ts";
  import { review, edgeName, sameEdge, PLAYER_NAME, type Edge } from "#lib/review/enclosure.ts";
  import { puzzlesFrom, nextRating, THEME_TEXT, type Puzzle, type Theme } from "#lib/puzzles/model.ts";
  import { SAMPLE, SAMPLE_MOVES } from "#lib/mock/sample.ts";
  import Swatch from "#lib/ui/Swatch.svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";

  const R = review(SAMPLE);
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

  // The engine's rules, without a network: the legal edges of each puzzle's position, so that the input takes only a
  // legal edge. A site without the engine (`npm run engine` not run) keeps the rules' box.
  let rules = $state<EngineWorker | null>(null);
  $effect(() => {
    let worker: EngineWorker | null = null, closed = false;
    (async () => {
      const manifest = await loadManifest();
      const module = manifest && moduleOf(manifest);
      if (!module || closed) return;
      worker = new EngineWorker();
      await worker.init(manifest);
      if (!closed) rules = worker;
    })().catch(e => console.warn("puzzles: no engine rules", e));
    return () => { closed = true; worker?.terminate(); };
  });
  $effect(() => {
    const engine = rules, index = puzzle.index;
    input.rules = null;
    if (!engine) return;
    let current = true;
    engine.describe<DescribeReply>({ moves: SAMPLE_MOVES.slice(0, index) })
      .then(({ reply }) => {
        if (!current) return;
        input.rules = rulesOf(reply);
      })
      .catch(e => console.warn("puzzles: describe failed", e));
    return () => { current = false; };
  });

  const candidates = $derived<BoardCandidate[]>(
    mode === "view" ? [{ edge: puzzle.solution, rank: 1, note: "the only good edge" }] : []);

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
  function resetPuzzle() {
    mode = "play"; feedback = "init"; tried = null; change = null; vote = null;
    input.reset();
  }
  function next() {
    at = (at + 1) % pool.length;
    resetPuzzle();
  }
  function open(v: View, t: Theme | null = null) {
    view = v; theme = t; at = 0;
    if (v === "streak") { streak = 0; streakOver = false; skipUsed = false; }
    resetPuzzle();
  }
  function skip() { skipUsed = true; next(); }
  const menuItem = (on: boolean) => ["text-left", on ? "bg-panel border-line font-semibold" : "bg-transparent border-transparent"];
</script>

<PageMeta title="Puzzles · Hedge School" noindex /> <!-- not in the early access (design 11) -->

<main class="box-content grid items-start gap-5 max-w-[1180px] mx-auto my-4 px-4 min-[961px]:grid-cols-[10rem_minmax(0,600px)_minmax(280px,360px)]">
  <nav class="flex flex-wrap gap-0.5 min-[961px]:flex-col" aria-label="Puzzle modes">
    <button class={menuItem(view === "puzzles" && !theme)} onclick={() => open("puzzles")}>Puzzles</button>
    <button class={menuItem(view === "streak")} onclick={() => open("streak")}>Streak</button>
    <button class={menuItem(view === "themes" || (view === "puzzles" && !!theme))} onclick={() => (view = "themes")}>Themes</button>
    {#each ["From my games", "Dashboard", "History"] as soon (soon)}
      <span class="px-2.75 py-1.25 text-muted opacity-55 cursor-default" title="Needs stored history">{soon}</span>
    {/each}
  </nav>

  {#if view === "themes"}
    <section class="col-[2/-1]">
      <h1 class="mb-1 text-[1.4rem] font-bold">Puzzle themes</h1>
      <p class="mb-4 text-xs text-muted">Mock puzzles from one bot game. Motif themes (enclose, cut, double threat) come when the engine
        gives the rules.</p>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2.5">
        {#each Object.entries(THEME_TEXT) as [key, t] (key)}
          {@const n = ALL.filter(p => p.themes.includes(key as Theme)).length}
          <button class="grid gap-1 px-3 py-2.75 text-left bg-panel" disabled={!n} onclick={() => open("puzzles", key as Theme)}>
            <strong>{t.name}</strong> <span class="ml-1 text-muted">{n}</span>
            <span class="text-sm text-muted">{t.about}</span>
          </button>
        {/each}
      </div>
    </section>
  {:else}
    <section class="rounded overflow-hidden">
      <Board
        {position}
        cut={lastMove?.cut ?? null}
        {candidates}
        preview={tried}
        previewPlayer={puzzle.player}
        layers={{ marks: false }}
        pending={input.pending}
        ends={input.ends}
        active={input.active}
        onpoint={mode !== "view" ? input.click : undefined}
      />
    </section>

    <section class="grid gap-3 min-w-0">
      {#if view === "streak"}
        <div class="text-muted">Streak <strong class="ml-1 text-[1.4em] text-ink">{streak}</strong></div>
      {:else}
        <div class="text-muted">Your puzzle rating <strong class="ml-1 text-[1.4em] text-ink">{rating}</strong>
          {#if change !== null}<span class={["ml-1.5 font-bold", change > 0 && "text-best", change < 0 && "text-blunder"]}>{change > 0 ? "+" : ""}{change}</span>{/if}
        </div>
        {#if theme}<p class="text-sm">Theme: <strong>{THEME_TEXT[theme].name}</strong>
          <button class="px-1 py-0 bg-transparent border-0 text-accent" onclick={() => open("puzzles")}>clear</button></p>{/if}
      {/if}

      <div class="grid gap-2 px-4 py-3.5 bg-panel border border-line rounded-md">
        {#if feedback === "init"}
          <div class="flex items-center gap-1.5 text-lg font-bold"><Swatch player={puzzle.player} /> Your turn</div>
          <p class="font-semibold">Find the best edge for {PLAYER_NAME[puzzle.player]}.</p>
          <EdgeInputHint {input} player={puzzle.player} />
        {:else if feedback === "fail" && mode === "try"}
          <p class="font-bold text-mistake">That's not the edge. Try something else.</p>
          <p class="text-sm text-muted">This attempt no longer counts for your rating.</p>
          <EdgeInputHint {input} player={puzzle.player} />
        {:else if feedback === "fail"}
          <p class="font-bold text-mistake">Streak over: {streak} solved.</p>
        {:else if feedback === "win"}
          <p class="font-bold text-best">Best edge! {edgeName(puzzle.solution)} is the only good edge here.</p>
        {:else}
          <p>The solution: <strong>{edgeName(puzzle.solution)}</strong>, number 1 on the board.</p>
        {/if}

        <div class="flex flex-wrap gap-1.5">
          {#if mode !== "view"}
            <button onclick={showSolution}>View the solution</button>
            {#if view === "streak" && !skipUsed}<button onclick={skip} title="One skip per streak, as on Lichess">Skip</button>{/if}
          {:else if view === "streak" && streakOver}
            <button class="btn-primary" onclick={() => open("streak")}>New streak</button>
          {:else}
            <button class="btn-primary" onclick={next}>Continue training</button>
          {/if}
        </div>
      </div>

      {#if mode === "view"}
        <div class="grid gap-1.5 text-sm text-muted">
          <p>Puzzle {puzzle.id} · rating {puzzle.rating} (predicted) · from edge {puzzle.index + 1} of a bot game</p>
          <p class="flex flex-wrap gap-1">
            {#each puzzle.themes as t (t)}
              <span class="px-2 py-px bg-panel-2 border border-line rounded-full text-ink">{THEME_TEXT[t].name}</span>
            {/each}
          </p>
          <div class="flex items-center gap-1.5">
            Did you like this puzzle?
            <button class={["px-2 py-0.5", vote === "up" && "border-accent text-accent"]} onclick={() => (vote = "up")} aria-label="Yes">▲</button>
            <button class={["px-2 py-0.5", vote === "down" && "border-accent text-accent"]} onclick={() => (vote = "down")} aria-label="No">▼</button>
          </div>
        </div>
      {/if}

      {#if history.length}
        <div class="flex flex-wrap gap-1" aria-label="This session">
          {#each history as h, i (i)}<span class={["size-3 rounded-[3px]", h.solved ? "bg-best" : "bg-blunder"]} title={h.id}></span>{/each}
        </div>
      {/if}
      <p class="text-xs text-muted">Prototype on mock data: {ALL.length} puzzles from one bot game. Ratings stay in this page.</p>
    </section>
  {/if}
</main>
