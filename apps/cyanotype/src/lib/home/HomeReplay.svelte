<script lang="ts">
  // The home page's board (design 33, as Hedge School's design 22): scenes from reviewed games
  // (scripts/home-replay.mjs), played on Blueprints' board as the review shows a game judged by move: the engine's
  // first three candidates before each move, the moves of the turn so far, and each move's label on it. The board
  // alone, as a picture (Board's `still`): no row of players above it, no zoom buttons, and the page scrolls over it.
  // Each scene's view holds the hexes that its frames draw on, and zooms in on its labelled move at the end
  // (HomeBoard.svelte, sceneView.ts). The replay's timing, its pauses and its reduced motion are the sites' shared
  // replay's (@abstractclass/site/Replay.svelte). The first frame is in the page, and the scenes load after it shows.
  import Replay, { type ReplayScenes } from "@abstractclass/site/Replay.svelte";
  import HomeBoard, { type Frame } from "./HomeBoard.svelte";
  import STILL from "./still.json";

  const load = () => import("./replay.json").then(m => m.default as unknown as ReplayScenes<Frame>);
</script>

<Replay still={STILL as unknown as Frame} {load}
        class="w-full max-w-[26rem] max-md:max-w-[30rem] max-md:justify-self-center rounded-lg overflow-hidden bg-panel
               shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)]">
  {#snippet board(frame)}
    <HomeBoard {frame} />
  {/snippet}
</Replay>
