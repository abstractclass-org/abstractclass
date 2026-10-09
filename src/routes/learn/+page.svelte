<script lang="ts">
  // Learn, a prototype (src/lib/learn/lessons.ts). After Lichess Learn: a map of stages, each with short lessons, and
  // a lesson as a few tasks on a small board, with progress. Plain, with small rewards (design 04).
  import Board from "#lib/board/Board.svelte";
  import { EdgeInput } from "#lib/board/edgeInput.svelte.ts";
  import { COURSE, type Lesson, type Step } from "#lib/learn/lessons.ts";
  import type { Edge, Position } from "#lib/review/model.ts";

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
    if (k + 1 < lesson.steps.length) { k++; resetStep(); }
    else { k = lesson.steps.length; resetStep(); }
  }
  const finished = $derived(!!lesson && k >= lesson.steps.length);
  const nextLesson = $derived(lesson ? lessonsInOrder[lessonsInOrder.indexOf(lesson) + 1] : undefined);
</script>

<svelte:head><title>Learn</title></svelte:head>

<main class="learn">
  {#if !lesson}
    <h1>Learn Enclosure</h1>
    <p class="lead">Short lessons on the board, from the rules to the ideas strong players use.</p>
    {#each COURSE as stage, si (stage.title)}
      <section class="stage" class:locked={!stage.ready}>
        <div class="stage-head">
          <span class="num">{si + 1}</span>
          <div><h2>{stage.title}</h2><p>{stage.about}</p></div>
          {#if !stage.ready}<span class="badge">Coming later</span>{/if}
        </div>
        <div class="lessons">
          {#each stage.lessons as l (l.id)}
            {@const d = done[l.id] ?? 0}
            <button class="lesson" disabled={!stage.ready} onclick={() => openLesson(l)}>
              <strong>{l.title}</strong>
              {#if stage.ready}
                <span class="steps">{#each l.steps as _, i (i)}<span class="pip" class:ok={i < d}></span>{/each}</span>
                <span class="meta">{d >= l.steps.length ? "Done ✓" : d ? `${d} of ${l.steps.length}` : `${l.steps.length} step${l.steps.length > 1 ? "s" : ""}`}</span>
              {/if}
            </button>
          {/each}
        </div>
      </section>
    {/each}
    <p class="mock">Prototype: the lessons check edges with small hand-written tests until the engine gives the rules.</p>
  {:else}
    <div class="player">
      <section class="board-col">
        {#if step}
          <Board
            position={shown?.position ?? step.position}
            lastEdge={shown?.edge ?? null}
            cut={shown?.cut ?? null}
            preview={null}
            view={step.view}
            targets={shown ? [] : step.targets ?? []}
            layers={{ regions: true, protected: true, candidates: false, marks: false, coordinates: true }}
            pending={input.pending}
            onpoint={step.check && !shown ? input.click : undefined}
          />
        {:else}
          <div class="complete">✓</div>
        {/if}
      </section>
      <section class="side">
        <button class="back" onclick={() => (lesson = null)}>← All lessons</button>
        <h1>{lesson.title}</h1>
        <div class="steps big">
          {#each lesson.steps as _, i (i)}<span class="pip" class:ok={i < (done[lesson.id] ?? 0)} class:here={i === k}></span>{/each}
        </div>
        {#if step}
          <h2>{step.title}</h2>
          <p>{step.text}</p>
          {#if shown}
            <p class="good">Well done. {shown.text}</p>
            <button class="primary" onclick={nextStep}>{k + 1 < lesson.steps.length ? "Next" : "Finish the lesson"}</button>
          {:else}
            <p class="goal">{step.goal}</p>
            {#if step.check}
              <p class="hint">{input.pending ? "Now click its second point, at most 3 apart." : "Click the edge's first point."}</p>
              {#if wrong}<p class="warn">Not quite. {wrong}</p>{/if}
              {#if wrong}<button onclick={resetStep}>Try again</button>{/if}
            {:else}
              <button class="primary" onclick={nextStep}>Continue</button>
            {/if}
          {/if}
        {:else if finished}
          <h2>Lesson complete</h2>
          <p>You finished “{lesson.title}”.</p>
          <div class="row">
            {#if nextLesson}<button class="primary" onclick={() => openLesson(nextLesson)}>Next: {nextLesson.title}</button>{/if}
            <button onclick={() => (lesson = null)}>All lessons</button>
          </div>
        {/if}
      </section>
    </div>
  {/if}
</main>

<style>
  .learn { max-width: 1000px; margin: 1rem auto; padding: 0 1rem; }
  h1 { margin: 0.3rem 0; font-size: 1.5rem; }
  .lead { color: var(--muted); margin: 0 0 1rem; }
  .stage { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 0.9rem 1rem; margin-bottom: 0.8rem; }
  .stage.locked { opacity: 0.6; }
  .stage-head { display: flex; gap: 0.8rem; align-items: flex-start; }
  .stage-head h2 { margin: 0; font-size: 1.1rem; }
  .stage-head p { margin: 0.1rem 0 0; color: var(--muted); font-size: 0.92em; }
  .num { flex: none; width: 1.8rem; height: 1.8rem; border-radius: 50%; display: grid; place-items: center; background: var(--panel-2); font-weight: 700; }
  .badge { margin-left: auto; font-size: 0.78em; border: 1px solid var(--border); border-radius: 999px; padding: 0.1rem 0.55rem; color: var(--muted); white-space: nowrap; }
  .lessons { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: 0.5rem; margin-top: 0.8rem; }
  .lesson { text-align: left; display: grid; gap: 0.3rem; padding: 0.65rem 0.8rem; background: var(--panel-2); }
  .meta { color: var(--muted); font-size: 0.85em; }
  .steps { display: flex; gap: 4px; }
  .pip { width: 10px; height: 10px; border-radius: 50%; background: var(--border); }
  .pip.ok { background: var(--best); }
  .pip.here { outline: 2px solid var(--accent); outline-offset: 1px; }
  .steps.big .pip { width: 12px; height: 12px; }
  .player { display: grid; grid-template-columns: minmax(0, 520px) minmax(280px, 1fr); gap: 1.25rem; align-items: start; }
  @media (max-width: 820px) { .player { grid-template-columns: minmax(0, 1fr); } }
  .board-col { border-radius: 6px; overflow: hidden; }
  .complete { aspect-ratio: 1; display: grid; place-items: center; font-size: 5rem; color: var(--best); background: var(--panel); }
  .side { min-width: 0; }
  .side h2 { font-size: 1.1rem; margin: 0.8rem 0 0.3rem; }
  .side p { max-width: 34rem; }
  .back { background: none; border-color: transparent; padding-left: 0; color: var(--muted); }
  .goal { font-weight: 700; font-size: 1.05em; }
  .hint { color: var(--muted); font-size: 0.9em; }
  .good { color: var(--best); }
  .warn { color: var(--mistake); }
  .row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .mock { font-size: 0.78em; color: var(--muted); }
</style>
