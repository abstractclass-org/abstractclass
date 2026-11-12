<script lang="ts" generics="M extends { player: Player }">
  // Practice's move list (Hedge School's design 24), in the side column: the review's move list's frame (moveList.ts),
  // which keeps the position on the board in view. While the bot of a game with moves starts (a game kept, or a start
  // brought), a skeleton of its rows. The site gives the rows of the game's turns: one row a turn (Hedge School) or one
  // a move (Cyanotype). A click on a move does not focus it, as in the review.
  import type { Snippet } from "svelte";
  import type { Player } from "@abstractclass/analysis/game.ts";
  import { BONE } from "@abstractclass/review/PlayerCardSkeleton.svelte";
  import { MOVE_LIST, keepInView } from "@abstractclass/review/moveList.ts";
  import type { PracticeStatus } from "./game.svelte.ts";
  import { turnsOf, type Turn } from "./practice.ts";

  interface Props {
    // The page (PracticePage): its game, the game whose bot starts, the position on the board, and what the status line
    // tells ("starting": the bot starts). The line is page.svelte.ts's PracticeLine. A component that imports
    // page.svelte.ts gives svelte-check a second copy of it, by the path in node_modules. The sites' bots then differ.
    page: {
      game: { played: readonly M[] } | null; starting: { moves: readonly string[] } | null; shown: number;
      line: PracticeStatus | "resigned";
    };
    text: (move: M) => string; // a move's text in the list
    row: Snippet<[turn: Turn, k: number]>; // the rows of the turn `k`, from 0 at the game's first turn
  }
  let { page, text, row }: Props = $props();

  const turns = $derived(turnsOf(page.game?.played ?? [], text));
  const bones = $derived(page.line === "starting" && page.starting?.moves.length ? 12 : 0);
  let list = $state<HTMLElement | null>(null);
  $effect(() => { void page.shown; void turns; keepInView(list); });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={list} class={[MOVE_LIST, "min-h-24 one-column-layout:max-h-64"]}
     onmousedown={e => { if ((e.target as Element).closest("button")) e.preventDefault(); }}>
  {#each Array(bones) as _, k (k)}<div class="h-4 mb-2.5 {BONE}" style:width="{k % 3 === 2 ? 55 : 85}%"></div>{/each}
  {#each turns as t, k (k)}{@render row(t, k)}{/each}
</div>
