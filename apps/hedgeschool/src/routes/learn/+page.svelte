<script lang="ts">
  // Learn, a prototype (src/lib/learn/lessons.ts). After Lichess Learn: a map of stages, each with short lessons, and
  // a lesson as a few tasks on a small board, with progress. Plain, with small rewards (design 04).
  import { onDestroy } from "svelte";
  import Board from "#lib/board/Board.svelte";
  import { EdgeInput } from "#lib/board/edgeInput.svelte.ts";
  import EdgeInputHint from "#lib/board/EdgeInputHint.svelte";
  import { EngineError, EngineWorker, loadManifest, moduleOf } from "@abstractclass/engine/client.ts";
  import { edgeName, parseEdge } from "#lib/engine/notation.ts";
  import { boardPosition, rulesOf, type DescribeReply, type GamePosition } from "#lib/engine/position.ts";
  import { COURSE, lineBoard, type Lesson, type Step } from "#lib/learn/lessons.ts";
  import type { Edge, Position } from "#lib/review/enclosure.ts";
  import PageMeta from "#lib/PageMeta.svelte";

  let lesson = $state.raw<Lesson | null>(null); // raw: the course's own object, so that indexOf finds it
  let k = $state(0);
  let shown = $state.raw<{ position: Position; cut: Edge | null } | null>(null); // the board after the step's edge
  let wrong = $state<string | null>(null);
  const done = $state<Record<string, number>>({}); // steps done, by lesson
  const input = new EdgeInput(edge => void attempt(edge));

  const step = $derived<Step | null>(lesson ? lesson.steps[k] : null);
  const lessonsInOrder = COURSE.flatMap(s => (s.ready ? s.lessons : []));

  // The engine's rules, without a network, as on the puzzles page: one worker for the page, started at the first step,
  // so that a visit to the map alone loads no engine. Null on a site without the engine (`npm run engine` not run),
  // where the input keeps the rules' box and no edge can be checked.
  let engine: Promise<EngineWorker | null> | null = null;
  let worker: EngineWorker | null = null, closed = false;
  let noEngine = $state(false);
  const startEngine = () => (engine ??= (async () => {
    const manifest = await loadManifest();
    if (!manifest || !moduleOf(manifest) || closed) return null;
    worker = new EngineWorker();
    await worker.init(manifest);
    return worker;
  })().catch(e => { console.warn("learn: no engine rules", e); return null; })
    .then(w => { noEngine = !w; return w; }));
  onDestroy(() => { closed = true; worker?.terminate(); });

  // The step's board as the engine draws it, and its legal edges and the mover's nodes for the input. Until the engine
  // answers, the board as the step's line gives it.
  let drawn = $state.raw<Position | null>(null);
  const board = $derived(step ? drawn ?? lineBoard(step.position) : null);
  $effect(() => {
    const s = step;
    drawn = null;
    input.rules = null;
    if (!s) return;
    let current = true;
    startEngine().then(e => e?.describe<DescribeReply>({ position: s.position, moves: [] }))
      .then(r => {
        if (!r || !current) return;
        drawn = boardPosition(r.reply);
        input.rules = rulesOf(r.reply);
      })
      .catch(e => console.warn("learn: describe failed", e));
    return () => { current = false; };
  });

  function openLesson(l: Lesson) { lesson = l; k = 0; resetStep(); }
  function resetStep() { shown = null; wrong = null; input.reset(); }
  // The engine plays the edge on the step's board. A legal edge that does the task shows the board after it. Any other
  // edge leaves the board as it is, with the step's hint.
  let asked = 0; // only the latest edge counts
  async function attempt(edge: Edge) {
    const s = step;
    if (!s?.task || shown) return;
    const mine = ++asked, current = () => mine === asked && s === step;
    wrong = null;
    const e = await startEngine();
    if (!e || !current()) return;
    try {
      const { reply } = await e.describeGame<GamePosition>({ position: s.position, moves: [edgeName(edge)] });
      if (!current()) return;
      const [before, after] = reply.positions;
      wrong = s.task({ before, after });
      if (wrong) return;
      shown = { position: boardPosition(after), cut: after.cuts ? parseEdge(after.cuts) : null };
      done[lesson!.id] = Math.max(done[lesson!.id] ?? 0, k + 1);
    } catch (err) {
      if (!current()) return;
      // The engine names an illegal edge in the moves field (game/check.ts): an edge entered before it gave the legal
      // edges. Any other error is the engine's or the step's.
      if (!(err instanceof EngineError && err.field === "moves")) console.warn("learn: the edge was not played", err);
      wrong = "The rules do not allow this edge.";
    }
  }
  function nextStep() {
    if (!lesson) return;
    if (!step?.task) done[lesson.id] = Math.max(done[lesson.id] ?? 0, k + 1);
    k++; // past the last step: the lesson is complete
    resetStep();
  }
  const nextLesson = $derived(lesson ? lessonsInOrder[lessonsInOrder.indexOf(lesson) + 1] : undefined);
</script>

<PageMeta title="Learn · Hedge School" noindex /> <!-- not in the early access (design 11) -->

<main class="box-content max-w-[1000px] mx-auto my-4 px-4">
  {#if !lesson}
    <h1 class="my-1 text-2xl font-bold">Learn the game</h1>
    <p class="mb-4 text-muted">Short lessons on the board, from the rules to the ideas strong players use.</p>
    {#each COURSE as stage, si (stage.title)}
      <section class={["mb-3 px-4 py-3.5 bg-panel border border-line rounded-lg", !stage.ready && "opacity-60"]}>
        <div class="flex items-start gap-3">
          <span class="flex-none grid place-items-center size-7 rounded-full bg-panel-2 font-bold">{si + 1}</span>
          <div><h2 class="text-lg font-bold">{stage.title}</h2><p class="mt-0.5 text-sm text-muted">{stage.about}</p></div>
          {#if !stage.ready}<span class="ml-auto px-2 py-0.5 text-xs text-muted border border-line rounded-full whitespace-nowrap">Coming later</span>{/if}
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2 mt-3">
          {#each stage.lessons as l (l.id)}
            {@const d = done[l.id] ?? 0}
            <button class="grid gap-1 px-3 py-2.5 text-left bg-panel-2" disabled={!stage.ready} onclick={() => openLesson(l)}>
              <strong>{l.title}</strong>
              {#if stage.ready}
                <span class="flex gap-1">{#each l.steps as _, i (i)}<span class={["size-2.5 rounded-full", i < d ? "bg-best" : "bg-line"]}></span>{/each}</span>
                <span class="text-xs text-muted">{d >= l.steps.length ? "Done ✓" : d ? `${d} of ${l.steps.length}` : `${l.steps.length} step${l.steps.length > 1 ? "s" : ""}`}</span>
              {/if}
            </button>
          {/each}
        </div>
      </section>
    {/each}
  {:else}
    <div class="grid items-start gap-5 min-[821px]:grid-cols-[minmax(0,520px)_minmax(280px,1fr)]">
      <section class="rounded-md overflow-hidden">
        {#if step && board}
          <Board
            position={shown?.position ?? board}
            cut={shown?.cut ?? null}
            preview={null}
            view={step.view}
            targets={shown ? [] : step.targets ?? []}
            layers={{ candidates: false, marks: false }}
            pending={input.pending}
            ends={input.ends}
            active={input.active}
            onpoint={step.task && !shown ? input.click : undefined}
          />
        {:else}
          <div class="grid place-items-center aspect-square text-[5rem] text-best bg-panel">✓</div>
        {/if}
      </section>
      <section class="min-w-0 [&_p]:my-3.75 [&_p]:max-w-136">
        <button class="pl-0 bg-transparent border-transparent text-muted" onclick={() => (lesson = null)}>← All lessons</button>
        <h1 class="my-1 text-2xl font-bold">{lesson.title}</h1>
        <div class="flex gap-1">
          {#each lesson.steps as _, i (i)}
            <span class={["size-3 rounded-full", i < (done[lesson.id] ?? 0) ? "bg-best" : "bg-line", i === k && "outline-2 outline-offset-1 outline-accent"]}></span>
          {/each}
        </div>
        {#if step && board}
          <h2 class="mt-3 mb-1 text-lg font-bold">{step.title}</h2>
          <p>{step.text}</p>
          {#if shown}
            <p class="text-best">Well done. {step.done}</p>
            <button class="btn-primary" onclick={nextStep}>{k + 1 < lesson.steps.length ? "Next" : "Finish the lesson"}</button>
          {:else}
            <p class="font-bold">{step.goal}</p>
            {#if step.task}
              {#if noEngine}<p class="text-sm text-muted">The engine did not start. This page cannot check your edge.</p>
              {:else}<EdgeInputHint {input} player={board.player} />{/if}
              {#if wrong}<p class="text-mistake">Not quite. {wrong}</p><button onclick={resetStep}>Try again</button>{/if}
            {:else}
              <button class="btn-primary" onclick={nextStep}>Continue</button>
            {/if}
          {/if}
        {:else}
          <h2 class="mt-3 mb-1 text-lg font-bold">Lesson complete</h2>
          <p>You finished “{lesson.title}”.</p>
          <div class="flex flex-wrap gap-1.5">
            {#if nextLesson}<button class="btn-primary" onclick={() => openLesson(nextLesson)}>Next: {nextLesson.title}</button>{/if}
            <button onclick={() => (lesson = null)}>All lessons</button>
          </div>
        {/if}
      </section>
    </div>
  {/if}
</main>
