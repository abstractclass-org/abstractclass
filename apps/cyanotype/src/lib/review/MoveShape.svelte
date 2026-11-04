<!-- A move's shape in the variations and the engine's line (the view's game interface, `Shape`), in its mover's colour:
     a placement is a hex with its blueprint's number in it, which tells the hand that the move plays. An edit is the
     cell that it moves, with an arrow drawn out of it, as one glyph: the cell's kind from the hand before the move,
     where the view gives it, else a cell with no kind. A pass is a round dot. Hollow when the move is in the tree
     already. The engine's line shows its moves in order, with no numbers: the board numbers them, and a number beside
     the hex would read as the blueprint's. -->
<script lang="ts">
  import { DIGITS, type ShapeProps } from "@abstractclass/review/game.ts";
  import { SIDE_TEXT } from "@abstractclass/site/side.ts";
  import Cell from "../board/Cell.svelte";
  import { hexKey, hexPath } from "../board/hex.ts";
  import type { Hand } from "../board/position.ts";
  import type { Move } from "../game/notation.ts";

  let { move, player, hollow, class: cls, before }: ShapeProps<Move, { blueprints: readonly [Hand, Hand] }> = $props();
  // An edit's cell: its kind in the mover's hand before the move, where the view gives the hand
  const kind = $derived(move?.kind === "edit" && before?.blueprints
    ? before.blueprints[player][move.from.blueprint - 1][hexKey([move.from.q, move.from.r])] ?? null : null);
  // A pointy-top hex, √3 wide and 2 high, as the board's
  const HEX = hexPath(0, 0, 0.94);
</script>

<span class={["relative inline-flex flex-none items-center", cls]}>
  {#if move?.kind === "place"}
    <!-- A placement: a hex with the blueprint's number in it. -->
    <span class="relative inline-flex flex-none items-center justify-center h-[1.2em] w-[1.04em] font-sans font-bold leading-none">
      <svg class={["absolute inset-0 size-full overflow-visible", SIDE_TEXT[player]]} viewBox="-0.866 -1 1.732 2" aria-hidden="true">
        <path d={HEX} fill={hollow ? "none" : "currentColor"} stroke={hollow ? "currentColor" : "none"} stroke-width="0.14" />
      </svg>
      <span class={["relative text-[0.72em]", hollow ? SIDE_TEXT[player] : "text-(--on-badge)"]}><span class={DIGITS}>{move.blueprint}</span></span>
    </span>
  {:else if move}
    <!-- An edit: the cell that it moves, with an arrow drawn out of it. -->
    <svg class={["h-[1.05em] w-auto flex-none overflow-visible", SIDE_TEXT[player]]} viewBox="-1 -1 3.3 2" style:aspect-ratio="1.65" aria-hidden="true">
      {#if kind}<Cell hex={[0, 0]} owner={player} {kind} look={hollow ? "ghost" : "cell"} />
      {:else}<path d={HEX} fill="none" stroke="currentColor" stroke-width="0.14" stroke-dasharray={hollow ? "0.25 0.18" : undefined} />{/if}
      <path d="M0.8 0H2.05" stroke="currentColor" stroke-width="0.26" stroke-linecap="round" fill="none" />
      <path d="M1.75 -0.42L2.25 0L1.75 0.42" stroke="currentColor" stroke-width="0.26" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </svg>
  {:else}
    <!-- A pass: a round dot. -->
    <svg class={["size-[0.85em] flex-none overflow-visible", SIDE_TEXT[player]]} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill={hollow ? "none" : "currentColor"} stroke={hollow ? "currentColor" : "none"}
              stroke-width="8" vector-effect="non-scaling-stroke" />
    </svg>
  {/if}
</span>
