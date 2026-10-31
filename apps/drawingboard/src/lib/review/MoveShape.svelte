<!-- A move's shape in the variations and the engine's line (the view's game interface, `Shape`), in its mover's colour,
     as the move list shows a move (MoveLabel.svelte): a placement is its blueprint's number in a box, and an edit the
     number of the blueprint that it takes a cell from, in a hex. A pass is a round dot. With a number (the listed
     line), the board's number of the move in a disc, as the board numbers a line. Hollow when the move is in the tree
     already. -->
<script lang="ts">
  import { DIGITS, type ShapeProps } from "@abstractclass/review/game.ts";
  import { SIDE_TEXT } from "@abstractclass/site/side.ts";
  import type { Move } from "../game/notation.ts";

  let { move, player, hollow, n, class: cls }: ShapeProps<Move> = $props();
  const text = $derived(n ?? (move ? (move.kind === "place" ? move.blueprint : move.from.blueprint) : null));
  const shape = $derived(n !== null || !move ? "disc" : move.kind === "place" ? "box" : "hex");
</script>

<span class={["relative inline-flex flex-none items-center justify-center font-sans font-bold leading-none",
              n === null ? "h-[1.15em] w-[1.3em] text-[0.8em]" : "size-[2.1em] text-[0.75em]",
              hollow ? SIDE_TEXT[player] : "text-(--on-badge)", cls]}>
  <svg class={["absolute inset-0 size-full overflow-visible", SIDE_TEXT[player]]} viewBox="0 0 100 100" preserveAspectRatio="none"
       aria-hidden="true">
    {#if shape === "box"}
      <rect x="4" y="4" width="92" height="92" rx="16" fill={hollow ? "none" : "currentColor"} stroke={hollow ? "currentColor" : "none"}
            stroke-width="8" vector-effect="non-scaling-stroke" />
    {:else if shape === "hex"}
      <polygon points="50,2 96,26 96,74 50,98 4,74 4,26" fill={hollow ? "none" : "currentColor"} stroke={hollow ? "currentColor" : "none"}
               stroke-width="8" vector-effect="non-scaling-stroke" />
    {:else}
      <circle cx="50" cy="50" r={text === null ? 30 : 46} fill={hollow ? "none" : "currentColor"} stroke={hollow ? "currentColor" : "none"}
              stroke-width="8" vector-effect="non-scaling-stroke" />
    {/if}
  </svg>
  {#if text !== null}<span class="relative"><span class={DIGITS}>{text}</span></span>{/if}
</span>
