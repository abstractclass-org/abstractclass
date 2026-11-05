<script lang="ts">
  // The home page's board (design 22): scenes from reviewed games (scripts/home-replay.mjs), played on the board as the
  // review shows a game judged by edge: the engine's candidates before each edge, and each edge's label on it.
  // The board alone, with no row of players or bar above it: on the home page, they were more than it needs. The
  // replay's timing, its pauses and its reduced motion are the sites' shared replay's (@abstractclass/site/Replay.svelte).
  // The first frame is in the page, and the scenes load after it shows.
  import Board, { type BoardCandidate, type BoardMark } from "#lib/board/Board.svelte";
  import type { Position } from "#lib/review/enclosure.ts";
  import Replay, { type ReplayScenes } from "@abstractclass/site/Replay.svelte";
  import STILL from "./still.json";

  interface Frame { p: Position; c: BoardCandidate[]; m: BoardMark[]; hold?: "before" | "moment" }
  const load = () => import("./replay.json").then(m => m.default as unknown as ReplayScenes<Frame>);
</script>

<Replay still={STILL as unknown as Frame} {load}
        class="w-full max-w-[26rem] max-md:max-w-[30rem] max-md:justify-self-center rounded-lg overflow-hidden
               shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)]">
  {#snippet board(frame)}
    <Board position={frame.p} candidates={frame.c} marks={frame.m} layers={{ coordinates: false }} />
  {/snippet}
</Replay>
