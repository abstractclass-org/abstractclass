<script lang="ts">
  // The board editor (docs/design/21-analysis.md): sets up a position for the Analysis board, as Lichess's board editor
  // does for its analysis board. The player draws each player's edges, marks the edges of the turn, and sets the edge
  // count and the scores. The left button draws with the tool's player and the right button with the other, as a drawing
  // program's two colours, and X swaps the two tools. After an edge, the next click continues from its end (a chain),
  // until Escape. The edge count follows the board until the player types one (CountRule). The page writes the
  // notation's position (#lib/editor/position.ts), and the engine draws it and checks that it could occur in a game
  // (protocol 0.5's check), with the edges each reason names. Analyze opens the board from it. Its way in:
  // `#position=`, from the board's Import (the position on screen) or another page. The position leaves the address at
  // once, then the analytics start (design 22). The position being made is kept in this browser, so that a reload keeps
  // it.
  import { onDestroy, onMount } from "svelte";
  import Board, { type PointClick } from "#lib/board/Board.svelte";
  import { EngineWorker, loadManifest, moduleOf } from "@abstractclass/engine/client.ts";
  import type { CheckReason } from "@abstractclass/engine/protocol.ts";
  import { parseEdge, sameEdge, STANDARD_START } from "#lib/engine/notation.ts";
  import { boardPosition, type DescribeReply } from "#lib/engine/position.ts";
  import { otherPlayer, PLAYER_NAME, type Edge, type Player, type Position } from "#lib/review/enclosure.ts";
  import { chooseMover, drawEdge, followBoard, LAST_COUNT, moverOf, placeable, readPosition, ruleOf, toggleMark,
           writePosition, type CountRule, type EditorPosition } from "#lib/editor/position.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { startAnalytics, track } from "#lib/analytics.svelte.ts";
  import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";
  import PageMeta from "#lib/PageMeta.svelte";

  const KEPT = "hedge-school:editor"; // the position being made (a convenience: the editor opens at the start without it)
  const KEPT_RULE = "hedge-school:editor-count"; // how its edge count is set (CountRule), which its notation cannot say
  const RULES: CountRule[] = [null, 0, 1, "typed"];
  type Tool = 0 | 1 | "mark"; // a player's edges, or the marks of the turn

  let made = $state<EditorPosition>(readPosition(STANDARD_START)); // the position as the player made it
  let tool = $state<Tool>(0);
  let rule = $state<CountRule>(null); // how the edge count is set
  const pos = $derived(followBoard(made, rule)); // the position, with the edge count that the rule gives
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
    const keptRule = RULES.find(r => String(r) === readLocal(KEPT_RULE)); // undefined: none kept
    for (const [text, r] of [[brought, undefined], [readLocal(KEPT), keptRule]] as const) {
      if (!text) continue;
      try { load(readPosition(text), r); break; } catch { /* the next, or the start */ }
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
  $effect(() => writeLocal(KEPT_RULE, String(rule)));
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

  /** A position read from the notation, with the count's rule kept with it, or else the rule that fits it. */
  function load(p: EditorPosition, r: CountRule = ruleOf(p)) { made = p; rule = r; pending = null; }

  /** The player whose edge a click draws: the tool's, or the other player's with the right button. */
  const drawer = (rightButton: boolean): Player => (tool === "mark" ? 0 : rightButton ? otherPlayer(tool) : tool);
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
      const next = toggleMark(made, edge);
      if (!next) { pending = [x, y]; return; } // no edge there: this point starts the next one
      if ([0, 1].some(p => next.edges.filter(e => e.player === p && e.marked).length > MARKS_PER_PLAYER))
        hint = "A player has at most two marked edges: a turn has at most two.";
      else made = next;
      pending = null;
      return;
    }
    if (!placeable(ax, ay, x, y)) { pending = [x, y]; return; } // too far: this point starts the next edge
    made = drawEdge(made, edge, drawer(how.right));
    // The edge's end begins the next edge, unless the click removed the edge.
    pending = made.edges.some(e => sameEdge(e.edge, edge)) ? [x, y] : null;
  }
  /** X swaps the two players' tools, and Escape ends the chain, as long as no field has the keyboard. */
  function key(ev: KeyboardEvent) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || (ev.target as HTMLElement).closest?.("input, textarea, select")) return;
    if (ev.key === "Escape" && pending) { pending = null; hint = ""; }
    else if (ev.key.toLowerCase() === "x" && tool !== "mark") tool = otherPlayer(tool);
  }

  function setCount(value: number) {
    made = { ...made, count: Math.max(0, Math.min(LAST_COUNT, Math.round(value) || 0)) };
    rule = "typed";
  }
  function setMover(player: Player) {
    ({ pos: made, rule } = chooseMover(pos, rule, player));
  }
  function setScore(player: 0 | 1, value: number) {
    const scores: [number, number] = [...made.scores];
    scores[player] = Math.max(0, value || 0);
    made = { ...made, scores };
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
  const toolHelp = (t: Tool) => t === "mark"
    ? "Click an edge's two points to mark it. Mark the waiting player's edges of the last turn (protected). Mark the mover's edges of this turn so far (placed)."
    : `Click an edge's two points, at most 3 apart. Right-click to draw a ${PLAYER_NAME[otherPlayer(t)]} edge. To remove a ${PLAYER_NAME[t]} edge, draw it again. To change a ${PLAYER_NAME[otherPlayer(t)]} edge to ${PLAYER_NAME[t]}, draw it again.`;
  // The page's keys and clicks, as the review lists its own (ReviewView's KEYS and MOUSE). The end of the last edge stays
  // selected: the next click draws the next edge from it (a chain).
  const CANCEL = "Cancel the selected point, so that the next click starts a new edge";
  const CLICKS: [string, string][] = [
    ["Click a point, then a second point", "Draw an edge with the selected tool"],
    ["Right-click a point, then a second point", "Draw an edge of the other player"],
    ["Drag from a point to a second point", "Draw an edge"],
    ["Click a point after you draw an edge", "Draw an edge from the end of the last edge"],
    ["Click the selected point again", CANCEL],
    ["With Marks, click or right-click an edge's two points", "Mark the edge, or remove its mark"],
  ];
  const KEYS: [string, string][] = [["X", "Change the tool from Blue edges to Red edges, or from Red edges to Blue edges"],
                                    ["Escape", CANCEL]];
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
             previewPlayer={drawer(right)} targets={reasonEdges} onpoint={click} rightClicks />
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
        <p class="text-xs text-muted">{toolHelp(tool)}</p>
        {#if hint}<p class="text-xs text-blunder" role="status">{hint}</p>{/if}
        <details class="text-xs">
          <summary class="cursor-pointer text-muted">Keys and clicks</summary>
          <table class="help-table text-xs mt-1">
            <tbody>
              {#each KEYS as [k, what] (k)}
                <tr><td class="pr-3 w-[45%]"><kbd class="kbd">{k}</kbd></td><td>{what}</td></tr>
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
      <p class="-mt-2 text-xs text-muted">The edge count is the number of edges that you draw, but not the two start
        edges. When you select Blue to play or Red to play, the count can be 1 or 2 more than the edges drawn. If you type
        a count, the count stays the same when you draw edges. The scores change only when you type them. The engine uses
        this edge count and these scores. If they are not correct, the numbers from the engine are not correct.</p>

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
        <button type="button" class="text-sm" onclick={() => { made = { ...made, edges: [] }; pending = null; }}>Remove all edges</button>
      </div>
    </section>
  {/if}
</main>
