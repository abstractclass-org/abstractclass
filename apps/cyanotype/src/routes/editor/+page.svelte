<script lang="ts">
  // The board editor (Hedge School's design 21, item 10, and design 33): sets up a Blueprints position for the Analysis
  // board, as Lichess's board editor does for its Analysis board. The player puts each player's cells on the board, of
  // a kind (Normal, star or wall), moves cells within each hand as an edit moves them, and sets the moves played (which
  // fix the mover) and the scores. The left button puts the tool's player's cell and the right button the other
  // player's, as a drawing program's two colours, and X swaps the two players. A drag with Shift puts the cell on each
  // hex that it passes, or removes it, by what a click on its first hex does: Cyanotype's own, since a set-up position
  // of Blueprints has many cells. The page writes the position's notation (#lib/game/position.ts) and draws it at once.
  // The engine reads it at each change, as the Analysis board reads a start (startChecked), and says what is wrong with
  // it: the rules' checks, and whether a game can reach it (protocol 0.8.0's check), with the hexes that each reason
  // names marked on the board. Analyze opens the board from a position that a game can reach. Its way in:
  // `#position=`, from the Analysis board's New menu and Import (the position on screen) or another page. The position leaves the address at once. The position being
  // made is kept in this browser, so that a reload keeps it.
  import { onDestroy, onMount } from "svelte";
  import Board, { type BoardHex } from "#lib/board/Board.svelte";
  import { EngineWorker, loadManifest, moduleOf } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { LAST_COUNT, moverOf } from "@abstractclass/analysis/turns.ts";
  import type { Player } from "@abstractclass/analysis/game.ts";
  import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import PositionCheckStatus from "@abstractclass/review/PositionCheckStatus.svelte";
  import type { PositionCheck } from "@abstractclass/engine/protocol.ts";
  import type { HexReason } from "#lib/board/described.ts";
  import { hexKey, parseHex, type Hex } from "#lib/board/hex.ts";
  import { PLAYER_NAMES, type HandHex, type Kind, type SitePosition } from "#lib/board/position.ts";
  import { readPosition, STANDARD_START, writePosition } from "#lib/game/position.ts";
  import { hasCell, moveHandCell, paintCell, placeCell, removeAllCells, withCount, withMover, withScore } from "#lib/editor/position.ts";
  import { rulesBy, startChecked } from "#lib/review/recordCheck.ts";
  import { EDITOR_KEY, SITE_NAME } from "#lib/site.ts";

  let made = $state.raw<SitePosition>(readPosition(STANDARD_START)); // the position as the player made it
  let loads = $state(0); // a new whole position: the board fits its view again
  let player = $state<Player>(0); // the tool's player
  let kind = $state<Kind>("plain"); // the tool's kind
  let chosen = $state.raw<({ player: Player } & HandHex) | null>(null); // a hand's cell, chosen to move
  let hint = $state(""); // why the last click did nothing
  let formError = $state(""); // the engine refused the position
  let check = $state.raw<PositionCheck<HexReason> | null>(null); // whether a game can reach it
  let checked = $state(false); // the engine has read the latest position
  let field = $state(""); // the position field, as the player types it
  let fieldError = $state("");
  let engine = $state.raw<EngineWorker | null>(null);
  let failed = $state("");

  const notation = $derived(writePosition(made));
  const mover = $derived(moverOf(made.ply));
  const analyzable = $derived(checked && !formError && !!check?.possible && mover.left > 0);
  // The hexes that the reasons name, once the engine has read the latest position
  const targets = $derived(checked ? (check?.reasons ?? []).flatMap(r => r.hexes.map(parseHex)) : []);
  const other = (p: Player): Player => (p ? 0 : 1);

  onMount(() => {
    const brought = new URLSearchParams(location.hash.slice(1)).get("position");
    history.replaceState(null, "", location.pathname);
    for (const text of [brought, readLocal(EDITOR_KEY)]) {
      if (!text) continue;
      try { load(readPosition(text)); break; } catch { /* the next, or the start */ }
    }
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

  // At each change: the field shows the position, the browser keeps it, and the engine reads it, as the Analysis board
  // reads a start (startChecked). Only the latest answer counts. A drag with Shift counts at its end.
  let asked = 0;
  $effect(() => {
    if (stroke) return;
    const n = notation;
    field = n;
    fieldError = "";
    writeLocal(EDITOR_KEY, n);
    checked = false;
    if (engine) void askEngine(engine, n);
  });
  async function askEngine(e: EngineWorker, n: string) {
    const mine = ++asked, read = await startChecked(rulesBy(e), n);
    if (mine === asked) {
      formError = read.refused ?? "";
      check = read.check;
      checked = true;
    }
  }

  /** A whole position: the board fits its view again, and no cell is chosen. */
  function load(p: SitePosition) { made = p; chosen = null; hint = ""; loads++; }

  /** A click: on the board, the tool's cell (the other player's with the right button); in a hand, a cell chosen, then
   *  the empty hex where it goes in the same hand. */
  function click(at: BoardHex, how: { right: boolean }) {
    hint = "";
    if (!at.hand) { made = placeCell(made, at.hex, how.right ? other(player) : player, kind); return; }
    const { player: owner, blueprint, hex } = at.hand, here: HandHex = { blueprint, hex };
    const cell = !!made.blueprints[owner][blueprint - 1][hexKey(hex)];
    if (chosen && chosen.player === owner && chosen.blueprint === blueprint && hexKey(chosen.hex) === hexKey(hex)) chosen = null;
    else if (cell) chosen = { player: owner, ...here };
    else if (!chosen) hint = "Click a cell in a hand first. Then click the empty hex where the cell goes.";
    else if (chosen.player !== owner) hint = `A cell moves only in its own player's hand. Click an empty hex in ${PLAYER_NAMES[chosen.player]}'s hand.`;
    else {
      made = moveHandCell(made, owner, chosen, here) ?? made;
      chosen = null;
    }
  }
  // A drag with Shift: the player, whether it removes (its first hex has the player's cell of the chosen kind, which a
  // click there removes), and the hexes that it changed, so that a hex that it passes twice changes once. The editor
  // has no takeback: one drag is one change of the position, as one click is.
  let stroke = $state.raw<{ player: Player; remove: boolean; seen: Set<string> } | null>(null);
  function paint(hex: Hex, { right, first }: { right: boolean; first: boolean }) {
    const key = hexKey(hex);
    if (first || !stroke) {
      const p = right ? other(player) : player;
      stroke = { player: p, remove: hasCell(made, hex, p, kind), seen: new Set() };
      hint = "";
      checked = false;
    }
    if (stroke.seen.has(key)) return;
    stroke.seen.add(key);
    made = paintCell(made, hex, stroke.player, kind, stroke.remove);
  }
  function paintEnd() { stroke = null; }

  /** X swaps the two players, and Escape cancels a chosen cell, as long as no field has the keyboard. */
  function key(ev: KeyboardEvent) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || (ev.target as HTMLElement).closest?.("input, textarea, select")) return;
    if (ev.key === "Escape" && chosen) { chosen = null; hint = ""; }
    else if (ev.key.toLowerCase() === "x") player = other(player);
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
    location.assign(`/analysis#${new URLSearchParams({ position: notation, via: "editor" })}`);
  }

  const KINDS: [Kind, string][] = [["plain", "Normal"], ["star", "Star"], ["wall", "Wall"]];
  const KIND_WORD: Record<Kind, string> = { plain: "Normal cell", star: "star", wall: "wall" };
  // The tools' help, in strict Simplified Technical English: the player follows it.
  const toolHelp = $derived(`Click a hex to put a ${PLAYER_NAMES[player]} ${KIND_WORD[kind]} on it. To remove the cell, click it again. `
    + `Right-click to put a ${PLAYER_NAMES[other(player)]} ${KIND_WORD[kind]}. To put cells on many hexes, hold Shift and drag across them.`);
  // The page's keys and clicks, as the review lists its own (ReviewView's KEYS and MOUSE).
  const CANCEL = "Cancel the move of the selected cell";
  const CLICKS: [string, string][] = [
    ["Click a hex of the board", "Put a cell of the selected player and kind on it, or remove the cell"],
    ["Right-click a hex of the board", "Put a cell of the other player on it"],
    ["Hold Shift and drag across the board", "Put a cell of the selected player and kind on each hex. If the first hex has that cell, remove that cell from each hex"],
    ["Hold Shift and drag with the right button", "Do the same with a cell of the other player"],
    ["Click a cell in a hand, then an empty hex of the same hand", "Move the cell"],
    ["Click the selected cell again", CANCEL],
    ["Drag the board", "Move the view"],
    ["Turn the wheel on the board", "Zoom the view"],
  ];
  const KEYS: [string, string][] = [["X", "Change the player from Blue to Red, or from Red to Blue"], ["Escape", CANCEL]];
  const FIELD = "px-2 py-1 bg-page text-ink border border-line rounded focus:outline-2 focus:outline-accent";
  const CHOICE = "px-3 py-1 text-sm";
</script>

<svelte:window onkeydown={key} />

<PageMeta title="Board editor · {SITE_NAME}"
          description="Set up any Blueprints position: put each player's cells on the board, shape their blueprints, and the engine reads it. Then analyze it on the board." />

<main class="box-content grid items-start gap-5 max-w-[1100px] mx-auto my-4 px-4 min-[961px]:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)]">
  {#if failed}
    <p class="text-blunder col-span-full" role="alert">{failed}</p>
  {:else}
    <!-- The board with both hands in its box: in a row above and below the field, or in a column on each side of a wide
         area. On a computer it takes the window's height under the header, and on a phone a fixed height, above the
         panel. -->
    <section class="h-[34rem] min-[961px]:h-[calc(100dvh-var(--site-header)-2rem)] min-[961px]:min-h-[30rem] min-w-0"
             aria-label="The position being set up">
      {#key loads}
        <Board position={made} layers={{ candidates: false }} onedit={click} {chosen} onpaint={paint} onpaintend={paintEnd} {targets} />
      {/key}
    </section>

    <section class="grid gap-4 bg-panel border border-line rounded-lg px-4 py-4">
      <h1 class="text-xl font-bold">Board editor</h1>

      <div class="grid gap-1.5">
        <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Player">
          {#each [0, 1] as const as p (p)}
            <button type="button" role="radio" aria-checked={player === p} class={[CHOICE, player === p && "border-accent text-accent"]}
                    onclick={() => { player = p; hint = ""; }}>{PLAYER_NAMES[p]} cells</button>
          {/each}
        </div>
        <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind">
          {#each KINDS as [k, name] (k)}
            <button type="button" role="radio" aria-checked={kind === k} class={[CHOICE, kind === k && "border-accent text-accent"]}
                    onclick={() => { kind = k; hint = ""; }}>{name}</button>
          {/each}
        </div>
        <p class="text-xs text-muted">{toolHelp}</p>
        <p class="text-xs text-muted">To move a cell in a hand, click the cell. Then click an empty hex in the same hand.</p>
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
          <p class="mt-1 text-muted">On a touch screen, use the player buttons to change the player.</p>
        </details>
      </div>

      <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <label for="move-count">Moves played</label>
        <span class="flex flex-wrap items-center gap-2">
          <input id="move-count" type="number" min="0" max={LAST_COUNT} value={made.ply} class={[FIELD, "w-20"]}
                 onchange={e => (made = withCount(made, e.currentTarget.valueAsNumber))} />
          <span class="text-muted">{mover.left ? `${mover.left} ${mover.left === 1 ? "move" : "moves"} left in the turn` : "The game is over"}</span>
        </span>
        <span>To play</span>
        <span class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="To play">
          {#each [0, 1] as const as p (p)}
            {@const on = !!mover.left && mover.player === p}
            <button type="button" role="radio" aria-checked={on} class={[CHOICE, on && "border-accent text-accent"]}
                    onclick={() => (made = withMover(made, p))}>{PLAYER_NAMES[p]} to play</button>
          {/each}
        </span>
        <label for="blue-score">Blue's points</label>
        <input id="blue-score" type="number" min="0" step="1" value={made.scores[0]} class={[FIELD, "w-28"]}
               onchange={e => (made = withScore(made, 0, e.currentTarget.valueAsNumber))} />
        <label for="red-score">Red's points</label>
        <input id="red-score" type="number" min="0" step="1" value={made.scores[1]} class={[FIELD, "w-28"]}
               onchange={e => (made = withScore(made, 1, e.currentTarget.valueAsNumber))} />
      </div>
      <p class="-mt-2 text-xs text-muted">The moves played set who plays: Blue makes one move, then each player makes two
        moves in a turn. A pass is one move. The points do not follow from the board: a placement scores the opponent's
        stars that it captures, times the mover's stars on the board. The engine uses these numbers. If they are not
        correct, the numbers from the engine are not correct.</p>
      <p class="-mt-2 text-xs text-muted">Each player's three blueprints hold 21 cells. A cell moves from one blueprint to
        another, as an edit moves it, so each hand keeps its stars and walls.</p>

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

      <PositionCheckStatus reading={!engine || !checked} refused={formError && formError.replace(/\.?$/, ".")} {check}
                           places="hexes">
        {#snippet reachable()}
          <p class="text-sm">A game can reach this position.{#if !mover.left} The game is over at this position: all
            {LAST_COUNT} moves are played.{/if}</p>
        {/snippet}
      </PositionCheckStatus>

      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-primary" disabled={!analyzable} onclick={analyze}
                title={analyzable ? "Open the Analysis board from this position" : mover.left ? "Analyze a position that a game can reach" : "The game is over at this position"}>Analyze</button>
        <button type="button" class="text-sm" onclick={() => load(readPosition(STANDARD_START))}>Standard start</button>
        <button type="button" class="text-sm" onclick={() => load(removeAllCells(made))}>Remove all cells</button>
      </div>
    </section>
  {/if}
</main>
