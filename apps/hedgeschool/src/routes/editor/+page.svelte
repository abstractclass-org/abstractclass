<script lang="ts">
  // The board editor (docs/design/21-analysis.md): sets up a position for the Analysis board, as Lichess's board editor
  // does for its analysis board. The player draws each player's edges, marks the edges of the turn, and sets the edge
  // count and the scores. The left button draws with the tool's player and the right button with the other, as a drawing
  // program's two colours, and X swaps the two tools. After an edge, the next click continues from its end (a chain),
  // until Escape. The edge count follows the board until the player types one (CountRule). The page writes the
  // notation's position (#lib/editor/position.ts), and the engine draws it and checks that it could occur in a game
  // (protocol 0.5's check), with the edges each reason names. Analyze opens the board from it. Its way in: `#position=`, from the board's Import (the position on screen) or another page. The
  // position leaves the address at once, then the analytics start (design 22). The position being made is kept in this
  // browser, so that a reload keeps it.
  import { onDestroy, onMount } from "svelte";
  import Board, { type PointClick } from "#lib/board/Board.svelte";
  import { EngineWorker, loadManifest, moduleOf } from "@abstractclass/engine/client.ts";
  import type { CheckReason } from "@abstractclass/engine/protocol.ts";
  import { parseEdge, STANDARD_START } from "#lib/engine/notation.ts";
  import { boardPosition, type DescribeReply } from "#lib/engine/position.ts";
  import { PLAYER_NAME, type Edge, type Player, type Position } from "#lib/review/enclosure.ts";
  import { chooseMover, drawEdge, followBoard, LAST_COUNT, moverOf, placeable, readPosition, ruleOf, toggleMark,
           writePosition, type CountRule, type EditorPosition } from "#lib/editor/position.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { startAnalytics, track } from "#lib/analytics.svelte.ts";
  import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";
  import PageMeta from "#lib/PageMeta.svelte";

  const KEPT = "hedge-school:editor"; // the position being made (a convenience: the editor opens at the start without it)
  type Tool = 0 | 1 | "mark"; // a player's edges, or the marks of the turn

  let pos = $state<EditorPosition>(readPosition(STANDARD_START));
  let tool = $state<Tool>(0);
  let rule = $state<CountRule>(null); // how the edge count is set
  let pending = $state<[number, number] | null>(null); // an edge's first point, or the end of the chain's last edge
  let right = $state(false); // the last click was the right button's: the dashed edge shows the other player
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
      try { load(readPosition(text)); break; } catch { /* the next, or the start */ }
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
      const { reply } = await e.describe<DescribeReply>({ position: n, moves: [] });
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
  const shown = $derived(drawn); // the board marks the placed edges as it marks the protected ones
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

  /** A position read from the notation, with the count's rule that fits it. */
  function load(p: EditorPosition) { pos = p; rule = ruleOf(p); pending = null; }

  const MARKS_PER_PLAYER = 2; // a turn has at most two edges: the notation's limit on each mark
  /** A click on a point: the first point of an edge, or its second, which draws it (or marks it). The right button draws
   *  the other player's edge, and with the marks does what the left does. A drawn edge's end begins the next edge (a
   *  chain). A drag's press always begins an edge. */
  function click(x: number, y: number, how: PointClick) {
    hint = "";
    right = how.right;
    if (!pending || how.begin) { pending = [x, y]; return; }
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
      const next = drawEdge(pos, edge, how.right ? ((1 - tool) as Player) : tool);
      // A removal ends the chain: the edge is gone, and its end is no edge's.
      pending = next.edges.length < pos.edges.length ? null : [x, y];
      pos = followBoard(next, rule);
      return;
    }
    pending = null;
  }
  /** X swaps the two players' tools, and Escape ends the chain, as long as no field has the keyboard. */
  function key(ev: KeyboardEvent) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || (ev.target as HTMLElement).closest?.("input, textarea, select")) return;
    if (ev.key === "Escape" && pending) { pending = null; hint = ""; }
    else if (ev.key.toLowerCase() === "x" && tool !== "mark") tool = (1 - tool) as Player;
  }

  function setCount(value: number) {
    pos = { ...pos, count: Math.max(0, Math.min(LAST_COUNT, Math.round(value) || 0)) };
    rule = "typed";
  }
  function setMover(player: Player) {
    ({ pos, rule } = chooseMover(pos, rule, player));
  }
  function setScore(player: 0 | 1, value: number) {
    const scores: [number, number] = [...pos.scores];
    scores[player] = Math.max(0, value || 0);
    pos = { ...pos, scores };
  }
  function readField() {
    try {
      load(readPosition(field));
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
    0: "Click an edge's two points, at most 3 apart. Right-click to draw a Red edge. Draw an edge again to remove it, or a Red edge to make it Blue.",
    1: "Click an edge's two points, at most 3 apart. Right-click to draw a Blue edge. Draw an edge again to remove it, or a Blue edge to make it Red.",
    mark: "Click an edge's two points to mark it: the waiting player's edges of the last turn (protected), and the mover's edges of this turn so far (placed).",
  };
  // The page's keys and clicks, as the review lists its own (ReviewView's KEYS and MOUSE).
  const CLICKS: [string, string][] = [
    ["Click a point, then a second point", "Draw an edge of the tool's player"],
    ["Right-click", "Draw an edge of the other player"],
    ["Drag from a point to a second point", "Draw an edge"],
    ["Click a point after an edge", "Draw the next edge from the end of the last edge (a chain)"],
    ["Click the last point again", "Stop the chain"],
    ["With Marks, click an edge's two points", "Mark the edge, or remove its mark. Right-click does the same"],
  ];
  const KEYS: [string, string][] = [["X", "Change between the Blue tool and the Red tool"], ["Esc", "Stop the chain"]];
  const KBD = "inline-block min-w-[1.6em] px-1 py-px rounded border border-line bg-panel font-mono text-[0.85em] text-center leading-tight";
  const HELP_TABLE = "w-full text-xs [&_td]:py-1 [&_td]:align-top [&_tr+tr_td]:border-t [&_tr+tr_td]:border-line";
  const FIELD = "px-2 py-1 bg-page text-ink border border-line rounded focus:outline-2 focus:outline-accent";
</script>

<svelte:window onkeydown={key} />

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
             previewPlayer={tool === "mark" ? 0 : right ? (1 - tool) as Player : tool} targets={reasonEdges} onpoint={click} rightClicks />
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
        <details class="text-xs">
          <summary class="cursor-pointer text-muted">Keys and clicks</summary>
          <table class={[HELP_TABLE, "mt-1"]}>
            <tbody>
              {#each KEYS as [k, what] (k)}
                <tr><td class="pr-3 w-[45%]"><kbd class={KBD}>{k}</kbd></td><td>{what}</td></tr>
              {/each}
              {#each CLICKS as [how, what] (how)}
                <tr><td class="pr-3 w-[45%] text-muted">{how}</td><td>{what}</td></tr>
              {/each}
            </tbody>
          </table>
          <p class="mt-1 text-muted">On a touch screen, use the tool buttons to change the player.</p>
        </details>
      </div>

      <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <label for="edge-count">Edges played</label>
        <span class="flex flex-wrap items-center gap-2">
          <input id="edge-count" type="number" min="0" max={LAST_COUNT} value={pos.count} class={[FIELD, "w-20"]}
                 onchange={e => setCount(e.currentTarget.valueAsNumber)} />
          <span class="text-muted">{mover.left ? `${mover.left} ${mover.left === 1 ? "edge" : "edges"} left in the turn` : "The game is over"}</span>
        </span>
        <span>To play</span>
        <span class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="To play">
          {#each [0, 1] as const as p (p)}
            {@const on = !!mover.left && mover.player === p}
            <button type="button" role="radio" aria-checked={on} class={["px-3 py-1 text-sm", on && "border-accent text-accent"]}
                    onclick={() => setMover(p)}>{PLAYER_NAME[p]} to play</button>
          {/each}
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
      <p class="-mt-2 text-xs text-muted">The edge count is the number of edges that you draw. The two start edges are not
        in the count. If you type a count, the count stays the same when you draw edges. The scores change only when you
        type them. The engine uses this edge count and these scores. If they are not correct, the numbers from the engine
        are not correct.</p>

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
        <button type="button" class="text-sm" onclick={() => load(readPosition(STANDARD_START))}>Standard start</button>
        <button type="button" class="text-sm" onclick={() => { pos = followBoard({ ...pos, edges: [] }, rule); pending = null; }}>Remove all edges</button>
      </div>
    </section>
  {/if}
</main>
