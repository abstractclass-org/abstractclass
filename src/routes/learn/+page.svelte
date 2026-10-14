<script lang="ts">
  // Learn, a prototype (src/lib/learn/lessons.ts). After Lichess Learn: a map of stages, each with short lessons, and
  // a lesson as a few tasks on a small board, with progress. Plain, with small rewards (design 04).
  import Board from "#lib/board/Board.svelte";
  import { EdgeInput } from "#lib/board/edgeInput.svelte.ts";
  import { COURSE, type Lesson, type Step } from "#lib/learn/lessons.ts";
  import type { Edge, Position } from "#lib/review/model.ts";
  import PageMeta from "#lib/PageMeta.svelte";

  let lesson = $state<Lesson | null>(null);
  let k = $state(0);
  let shown = $state<{ position: Position; cut?: Edge; text: string; edge: Edge } | null>(null);
  let wrong = $state<string | null>(null);
  const done = $state<Record<string, number>>({}); // steps done, by lesson
  const input = new EdgeInput(edge => attempt(edge));

  const step = $derived<Step | null>(lesson ? lesson.steps[k] : null);
  const lessonsInOrder = COURSE.flatMap(s => (s.ready ? s.lessons : []));

  function openLesson(l: Lesson) { lesson = l; k = 0; resetStep(); }
  function resetStep() { shown = null; wrong = null; input.reset(); }
  function attempt(edge: Edge) {
    if (!step?.check || shown) return;
    const why = step.check(edge);
    if (why) { wrong = why; return; }
    wrong = null;
    shown = { ...step.result!(edge), edge };
    done[lesson!.id] = Math.max(done[lesson!.id] ?? 0, k + 1);
  }
  function nextStep() {
    if (!lesson) return;
    if (!step?.check) done[lesson.id] = Math.max(done[lesson.id] ?? 0, k + 1);
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
    <p class="my-3 text-xs text-muted">Prototype: the lessons check edges with small hand-written tests until the engine gives the rules.</p>
  {:else}
    <div class="grid items-start gap-5 min-[821px]:grid-cols-[minmax(0,520px)_minmax(280px,1fr)]">
      <section class="rounded-md overflow-hidden">
        {#if step}
          <Board
            position={shown?.position ?? step.position}
            lastEdge={shown?.edge ?? null}
            cut={shown?.cut ?? null}
            preview={null}
            view={step.view}
            targets={shown ? [] : step.targets ?? []}
            layers={{ candidates: false, marks: false }}
            pending={input.pending}
            onpoint={step.check && !shown ? input.click : undefined}
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
        {#if step}
          <h2 class="mt-3 mb-1 text-lg font-bold">{step.title}</h2>
          <p>{step.text}</p>
          {#if shown}
            <p class="text-best">Well done. {shown.text}</p>
            <button class="btn-primary" onclick={nextStep}>{k + 1 < lesson.steps.length ? "Next" : "Finish the lesson"}</button>
          {:else}
            <p class="font-bold">{step.goal}</p>
            {#if step.check}
              <p class="text-sm text-muted">{input.pending ? "Now click its second point, at most 3 apart." : "Click the edge's first point."}</p>
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
