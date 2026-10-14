<script lang="ts">
  // The board editor (docs/design/21-analysis.md): sets up a position for the Analysis board, as Lichess's board editor
  // does for its analysis board. The player draws each player's edges, marks the edges of the turn, and sets the edge
  // count and the scores. The page writes the notation's position (#lib/editor/position.ts), and the engine draws it and
  // checks that it could occur in a game (protocol 0.5's check), with the edges each reason names. Analyze opens the
  // board from it. Its way in: `#position=`, from the board's Import (the position on screen) or another page. The
  // position leaves the address at once, then the analytics start (design 22). The position being made is kept in this
  // browser, so that a reload keeps it.
  import { onDestroy, onMount } from "svelte";
  import Board from "#lib/board/Board.svelte";
  import { EngineWorker, loadManifest, moduleOf } from "#lib/engine/client.ts";
  import type { CheckReason } from "#lib/engine/protocol.ts";
  import { parseEdge, STANDARD_START } from "#lib/engine/notation.ts";
  import { boardPosition } from "#lib/engine/position.ts";
  import { PLAYER_NAME, type Edge, type Position } from "#lib/review/model.ts";
  import { drawEdge, LAST_COUNT, moverOf, placeable, readPosition, toggleMark, writePosition,
           type EditorPosition } from "#lib/editor/position.ts";
  import { errorText } from "#lib/errors.ts";
  import { startAnalytics, track } from "#lib/analytics.svelte.ts";
  import { readLocal, writeLocal } from "#lib/storage/local.ts";
  import PageMeta from "#lib/PageMeta.svelte";

  const KEPT = "hedge-school:editor"; // the position being made (a convenience: the editor opens at the start without it)
  type Tool = 0 | 1 | "mark"; // a player's edges, or the marks of the turn

  let pos = $state<EditorPosition>(readPosition(STANDARD_START));
  let tool = $state<Tool>(0);
  let pending = $state<[number, number] | null>(null); // an edge's first point
  let hint = $state(""); // why the last click did nothing
  let drawn = $state.raw<Position | null>(null); // the engine's drawing of the position
  let check = $state.raw<{ possible: boolean; reasons: CheckReason[] } | null>(null);
  let formError = $state(""); // the engine refused the position's form
  let field = $state(""); // the position field, as the player types it
  let fieldError = $state("");
  let engine = $state.raw<EngineWorker | null>(null);
  let failed = $state("");

  const notation = $derived(writePosition(pos));
  const mover = $derived(moverOf(pos.count));
  const analyzable = $derived(!!check?.possible && !formError && mover.left > 0);

  onMount(() => {
    const brought = new URLSearchParams(location.hash.slice(1)).get("position");
    history.replaceState(null, "", location.pathname);
    startAnalytics();
    for (const text of [brought, readLocal(KEPT)]) {
      if (!text) continue;
      try { pos = readPosition(text); break; } catch { /* the next, or the start */ }
    }
    track("editor_open");
    void (async () => {
      try {
        const manifest = await loadManifest();
        if (!manifest || !moduleOf(manifest)) throw new Error("no engine on this site: run `npm run engine` first");
        const e = new EngineWorker();
        await e.init(manifest);
        engine = e;
      } catch (e) {
        failed = errorText(e);
      }
    })();
  });
  onDestroy(() => engine?.terminate());

  // At each change: the field shows the position, the browser keeps it, and the engine draws and checks it. Only the
  // latest answer counts.
  let asked = 0;
  $effect(() => {
    const n = notation;
    field = n;
    fieldError = "";
    writeLocal(KEPT, n);
    if (engine) void describe(engine, n);
  });
  async function describe(e: EngineWorker, n: string) {
    const mine = ++asked;
    try {
      const { reply } = await e.describe({ position: n, moves: [] });
      if (mine !== asked) return;
      drawn = boardPosition(reply);
      check = reply.check ?? { possible: true, reasons: [] };
      formError = "";
    } catch (err) {
      if (mine !== asked) return;
      check = null;
      formError = errorText(err);
    }
  }

  // The board shows the turn's edges as it shows protected ones: in the editor, a mark is a mark.
  const shown = $derived(drawn && { ...drawn, protected: [...drawn.protected, ...drawn.placed] });
  const reasonEdges = $derived((check?.reasons ?? []).flatMap(r => r.edges.map(parseEdge)));
  /** The points that finish an edge from the first point: any point near enough for a player's edge, the other ends
   *  of the edges there for a mark. */
  const ends = $derived.by((): [number, number][] | null => {
    if (!pending) return null;
    const [px, py] = pending;
    if (tool === "mark")
      return pos.edges.flatMap(({ edge: [a, b, c, d] }): [number, number][] =>
        a === px && b === py ? [[c, d]] : c === px && d === py ? [[a, b]] : []);
    const out: [number, number][] = [];
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
      const x = px + dx, y = py + dy;
      if (x >= 0 && x <= 18 && y >= 0 && y <= 18 && placeable(px, py, x, y)) out.push([x, y]);
    }
    return out;
  });

  const MARKS_PER_PLAYER = 2; // a turn has at most two edges: the notation's limit on each mark
  function click(x: number, y: number) {
    hint = "";
    if (!pending) { pending = [x, y]; return; }
    const [ax, ay] = pending;
    if (ax === x && ay === y) { pending = null; return; }
    const edge: Edge = [ax, ay, x, y];
    if (tool === "mark") {
      const next = toggleMark(pos, edge);
      if (!next) { pending = [x, y]; return; } // no edge there: this point starts the next one
      if ([0, 1].some(p => next.edges.filter(e => e.player === p && e.marked).length > MARKS_PER_PLAYER)) {
        hint = "A player has at most two marked edges: a turn has at most two.";
        pending = null;
        return;
      }
      pos = next;
    } else {
      if (!placeable(ax, ay, x, y)) { pending = [x, y]; return; } // too far: this point starts the next edge
      pos = drawEdge(pos, edge, tool);
    }
    pending = null;
  }

  function setCount(value: number) {
    pos = { ...pos, count: Math.max(0, Math.min(LAST_COUNT, Math.round(value) || 0)) };
  }
  function setScore(player: 0 | 1, value: number) {
    const scores: [number, number] = [...pos.scores];
    scores[player] = Math.max(0, value || 0);
    pos = { ...pos, scores };
  }
  function readField() {
    try {
      pos = readPosition(field);
      fieldError = "";
    } catch (e) {
      fieldError = errorText(e);
    }
  }
  let copied = $state(false);
  async function copy() {
    await navigator.clipboard.writeText(notation);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
  function analyze() {
    track("editor_analyze");
    location.assign(`/analysis#${new URLSearchParams({ position: notation, via: "editor" })}`);
  }

  const TOOLS: [Tool, string][] = [[0, "Blue edges"], [1, "Red edges"], ["mark", "Marks"]];
  const TOOL_HELP: Record<string, string> = {
    0: "Click an edge's two points, at most 3 apart. Draw an edge again to remove it, or a Red edge to make it Blue.",
    1: "Click an edge's two points, at most 3 apart. Draw an edge again to remove it, or a Blue edge to make it Red.",
    mark: "Click an edge's two points to mark it: the waiting player's edges of the last turn (protected), and the mover's edges of this turn so far (placed).",
  };
  const FIELD = "px-2 py-1 bg-page text-ink border border-line rounded focus:outline-2 focus:outline-accent";
</script>

<PageMeta title="Board editor · Hedge School"
          description="Set up any Enclosure position: place each player's edges, and the engine checks that a game can reach it. Then analyze it on the board." />

<main class="box-content grid items-start gap-5 max-w-[1100px] mx-auto my-4 px-4 min-[961px]:grid-cols-[minmax(0,600px)_minmax(280px,1fr)]">
  {#if failed}
    <p class="text-blunder col-span-full" role="alert">{failed}</p>
  {:else if !shown}
    <p class="text-muted col-span-full">Setting up the board with the engine's rules…</p>
  {:else}
    <section class="rounded overflow-hidden">
      <Board position={shown} layers={{ candidates: false, marks: false }} {pending} ends={ends}
             previewPlayer={tool === 1 ? 1 : 0} targets={reasonEdges} onpoint={click} />
    </section>

    <section class="grid gap-4 bg-panel border border-line rounded-lg px-4 py-4">
      <h1 class="text-xl font-bold">Board editor</h1>

      <div class="grid gap-1.5">
        <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tool">
          {#each TOOLS as [t, name] (t)}
            <button type="button" role="radio" aria-checked={tool === t}
                    class={["px-3 py-1 text-sm", tool === t && "border-accent text-accent"]}
                    onclick={() => { tool = t; pending = null; hint = ""; }}>{name}</button>
          {/each}
        </div>
        <p class="text-xs text-muted">{TOOL_HELP[tool]}</p>
        {#if hint}<p class="text-xs text-blunder" role="status">{hint}</p>{/if}
      </div>

      <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <label for="edge-count">Edges played</label>
        <span class="flex flex-wrap items-center gap-2">
          <input id="edge-count" type="number" min="0" max={LAST_COUNT} value={pos.count} class={[FIELD, "w-20"]}
                 onchange={e => setCount(e.currentTarget.valueAsNumber)} />
          <span class="text-muted">{mover.left ? `${PLAYER_NAME[mover.player]} to play, ${mover.left} ${mover.left === 1 ? "edge" : "edges"} left in the turn` : "The game is over"}</span>
        </span>
        <label for="blue-score">Blue's score</label>
        <input id="blue-score" type="number" min="0" step="any" value={pos.scores[0]} class={[FIELD, "w-28"]}
               onchange={e => setScore(0, e.currentTarget.valueAsNumber)} />
        <label for="red-score">Red's score</label>
        <input id="red-score" type="number" min="0" step="any" value={pos.scores[1]} class={[FIELD, "w-28"]}
               onchange={e => setScore(1, e.currentTarget.valueAsNumber)} />
      </div>
      <p class="-mt-2 text-xs text-muted">The edge count includes the edges a timeout forfeited, and it sets who plays. A
        score adds the area its player encloses at each turn's end.</p>

      <div class="grid gap-1">
        <label for="position-text" class="text-sm">Position, in the <a href="/notation" target="_blank" rel="noopener noreferrer">notation</a></label>
        <span class="flex gap-1.5">
          <input id="position-text" bind:value={field} spellcheck="false" autocomplete="off" class={[FIELD, "flex-1 min-w-0 font-mono text-sm"]}
                 onchange={readField} />
          <button type="button" class="text-sm" onclick={copy}>{copied ? "Copied" : "Copy"}</button>
        </span>
        <p class="text-xs text-muted">Paste a position here to set it up.</p>
        {#if fieldError}<p class="text-xs text-blunder" role="alert">{fieldError}</p>{/if}
      </div>

      <div role="status">
        {#if formError}
          <p class="text-sm text-blunder">The engine cannot read this position: {formError}</p>
        {:else if check?.possible}
          <p class="text-sm">A game can reach this position.</p>
        {:else if check}
          <p class="text-sm">No game reaches this position:</p>
          <ul class="mt-1 pl-5 list-disc text-sm text-blunder">
            {#each check.reasons as r, i (i)}<li>{r.text}</li>{/each}
          </ul>
          <p class="mt-1 text-xs text-muted">The edges each reason names glow on the board.</p>
        {/if}
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-primary" disabled={!analyzable} onclick={analyze}
                title={analyzable ? "Open the Analysis board from this position" : mover.left ? "Analyze a position that a game can reach" : "The game is over at this position"}>Analyze</button>
        <button type="button" class="text-sm" onclick={() => { pos = readPosition(STANDARD_START); pending = null; }}>Standard start</button>
        <button type="button" class="text-sm" onclick={() => { pos = { ...pos, edges: [] }; pending = null; }}>Remove all edges</button>
      </div>
    </section>
  {/if}
</main>
