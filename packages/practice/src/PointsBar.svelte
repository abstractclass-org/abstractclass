<script lang="ts">
  // The points bar (Hedge School's design 24, item 12): the review's win bar and gauge (ShareBar), each player's share of
  // the points so far, from their own side. With the area, a second lane: each player's area against their own points,
  // under their part of the bar. Horizontal, it is the middle of the players' row (an empty cell when the bar is off).
  // Upright, it is left of the board, in the practice's frame (`beside`), and a bone of its size until the game's
  // position.
  import ShareBar, { ownShare } from "@abstractclass/review/ShareBar.svelte";
  import { BONE } from "@abstractclass/review/PlayerCardSkeleton.svelte";
  import type { ScoreDisplay } from "./practice.ts";

  interface Props {
    score: ScoreDisplay;
    scores: readonly [number, number] | null; // Blue's and Red's points, null before the game's position
    areas?: readonly [number, number]; // Blue's and Red's areas, for a game that has them
    upright: boolean;
  }
  let { score, scores, areas, upright }: Props = $props();
  const lane = $derived(score.area && areas ? areas : null);
</script>

{#if !score.bar}
  <div></div>
{:else if !scores}
  <div class="flex-none self-stretch w-[calc(var(--gauge-w)-0.375rem)] mr-1.5 {BONE}"></div>
{:else}
  {@const total = scores[0] + scores[1]}
  <ShareBar {upright} share={total > 0 ? scores[0] / total : NaN}
            sub={lane ? [ownShare(lane[0], scores[0]), ownShare(lane[1], scores[1])] : null}
            title={`Points: Blue ${Math.round(scores[0])}, Red ${Math.round(scores[1])}` +
                   (lane ? `. Area: Blue ${Math.round(lane[0])}, Red ${Math.round(lane[1])}` : "")} />
{/if}
