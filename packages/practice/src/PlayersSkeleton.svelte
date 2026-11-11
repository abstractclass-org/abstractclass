<script lang="ts">
  // The row above the board while the bot starts (Hedge School's design 24): the review's skeleton of each player's
  // card (PlayerCardSkeleton), with the players' names when the page knows the game, so that the row's height is the
  // cards'. The score's bar is a bone too (`bar`), or no bar.
  import PlayerCardSkeleton, { BONE } from "@abstractclass/review/PlayerCardSkeleton.svelte";
  import PlayerRow from "@abstractclass/review/PlayerRow.svelte";

  interface Props {
    gauge: boolean; // the score's gauge beside the board: no bar in the row
    names?: readonly [string, string]; // Blue's and Red's names
    second: string; // the word of each card's second count, as the game's cards give it
    bar?: boolean; // the score's bar between the cards
  }
  let { gauge, names, second, bar = true }: Props = $props();
</script>

<PlayerRow {gauge} label="Players and scores" bar={bar ? bone : undefined}>
  {#snippet blue()}<PlayerCardSkeleton player={0} name={names?.[0]} {second} />{/snippet}
  {#snippet red()}<PlayerCardSkeleton player={1} name={names?.[1]} {second} />{/snippet}
</PlayerRow>

{#snippet bone()}<div class="h-[1.15rem] {BONE}"></div>{/snippet}
