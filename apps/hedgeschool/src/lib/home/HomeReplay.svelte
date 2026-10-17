<script lang="ts">
  // The home page's board (design 22): scenes from reviewed games (scripts/home-replay.mjs), played on the board as the
  // review shows a game judged by edge: the engine's candidates before each edge, and each edge's label on it.
  // The board alone, with no row of players or bar above it: on the home page, they were more than it needs. An
  // edge every 1 to 2 seconds, at random, as players take their time; a longer hold before a scene's labelled edge,
  // with the engine's choices on the board, and on the label after it. The first frame is in the page, and the scenes
  // load after it shows. The board stops while the pointer is on it and while the page is hidden. With reduced motion,
  // it shows the first scene's labelled edge, still.
  import { onDestroy, onMount } from "svelte";
  import Board, { type BoardCandidate, type BoardMark } from "#lib/board/Board.svelte";
  import type { Position } from "#lib/review/model.ts";
  import STILL from "./still.json";

  interface Frame { p: Position; c: BoardCandidate[]; m: BoardMark[]; hold?: "before" | "moment" }
  const step = () => 1000 + Math.random() * 1000, BEFORE_MS = 2600, MOMENT_MS = 4000;

  let frame = $state.raw<Frame>(STILL as unknown as Frame);
  let paused = $state(false);
  let scenes: Frame[][] = [], scene = 0, at = 0, timer: ReturnType<typeof setTimeout> | undefined;

  function schedule() {
    clearTimeout(timer);
    if (paused || document.hidden || !scenes.length) return;
    timer = setTimeout(advance, frame.hold === "before" ? BEFORE_MS : frame.hold === "moment" ? MOMENT_MS : step());
  }
  function advance() {
    at++;
    if (at >= scenes[scene].length) { scene = (scene + 1) % scenes.length; at = 0; }
    frame = scenes[scene][at];
    schedule();
  }
  const visibility = () => schedule();

  onMount(() => {
    void import("./replay.json").then(({ default: data }) => {
      scenes = (data as unknown as { scenes: { frames: Frame[] }[] }).scenes.map(s => s.frames);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        frame = scenes[0].find(f => f.hold === "moment") ?? scenes[0][0];
        scenes = [];
        return;
      }
      schedule();
    });
    document.addEventListener("visibilitychange", visibility);
  });
  onDestroy(() => {
    clearTimeout(timer);
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", visibility);
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="w-full max-w-[26rem] max-md:max-w-[30rem] max-md:justify-self-center rounded-lg overflow-hidden
            shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)]"
     onpointerenter={() => { paused = true; schedule(); }} onpointerleave={() => { paused = false; schedule(); }}>
  <Board position={frame.p} candidates={frame.c} marks={frame.m} layers={{ coordinates: false }} />
</div>
