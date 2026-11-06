<script lang="ts">
  // The home page's board (design 33, as Hedge School's design 22): a scene from a reviewed game
  // (scripts/home-replay.mjs), played on Blueprints' board as the review shows a game judged by move: the engine's
  // first three candidates before each move, the moves of the turn so far, and each move's label on it. The board
  // alone, as a picture (Board's `still`): no row of players above it, no zoom, and the page scrolls over it. The
  // replay's timing, its pauses and its reduced motion are the sites' shared replay's (@abstractclass/site/Replay.svelte).
  // The first frame is in the page, and the scene loads after it shows.
  import Board, { type BoardCandidate, type BoardLabel } from "#lib/board/Board.svelte";
  import type { BoardMove, SitePosition } from "#lib/board/position.ts";
  import Replay, { type ReplayFrame, type ReplayScenes } from "@abstractclass/site/Replay.svelte";
  import STILL from "./still.json";

  /** A frame: the position, the last move and an earlier one of its turn, the candidates and the labels. */
  interface Frame extends ReplayFrame { p: SitePosition; l: BoardMove | null; e: BoardMove[]; c: BoardCandidate[]; m: BoardLabel[] }
  const load = () => import("./replay.json").then(m => m.default as unknown as ReplayScenes<Frame>);
</script>

<Replay still={STILL as unknown as Frame} {load}
        class="w-full max-w-[26rem] max-md:max-w-[30rem] max-md:justify-self-center rounded-lg overflow-hidden bg-panel
               shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)]">
  {#snippet board(frame)}
    <Board position={frame.p} last={frame.l} earlier={frame.e} candidates={frame.c} labels={frame.m} still />
  {/snippet}
</Replay>
