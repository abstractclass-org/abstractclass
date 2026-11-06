<script lang="ts" module>
  /** A frame of a scene: what the site's board draws (the site's own), and the holds of the scene's labelled move. */
  export interface ReplayFrame { hold?: "before" | "moment" }
  /** The scenes, as each site's script writes them: each scene its frames in order. */
  export interface ReplayScenes<F extends ReplayFrame> { scenes: { frames: F[] }[] }
</script>

<script lang="ts" generics="F extends ReplayFrame">
  // A home page's board (Hedge School's design 22): scenes from reviewed games, played on the site's board as the review
  // shows a game judged by move: the engine's candidates before each move, and each move's label on it. Each site gives
  // its frames and draws them on its own board (`board`). A move every 1 to 2 seconds, at random, as players take their
  // time; a longer hold before a scene's labelled move, with the engine's choices on the board, and on the label after
  // it. The first frame is in the page (`still`), and the scenes load after it shows (`load`). The board stops while
  // the pointer is on it and while the page is hidden. With reduced motion, it shows the first scene's labelled move,
  // still.
  import { onMount, type Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";

  let { still, load, board, class: classes }: {
    still: F; load: () => Promise<ReplayScenes<F>>; board: Snippet<[F]>; class?: ClassValue;
  } = $props();

  const step = () => 1000 + Math.random() * 1000, BEFORE_MS = 2600, MOMENT_MS = 4000;

  // svelte-ignore state_referenced_locally
  let frame = $state.raw<F>(still);
  let paused = false, scenes: F[][] = [], scene = 0, at = 0, timer: ReturnType<typeof setTimeout> | undefined;

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

  // A page left before the scenes load starts no timer.
  onMount(() => {
    let gone = false;
    void load().then(data => {
      if (gone) return;
      scenes = data.scenes.map(s => s.frames);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        frame = scenes[0].find(f => f.hold === "moment") ?? scenes[0][0];
        scenes = [];
        return;
      }
      schedule();
    });
    document.addEventListener("visibilitychange", schedule);
    return () => {
      gone = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class={classes} onpointerenter={() => { paused = true; schedule(); }} onpointerleave={() => { paused = false; schedule(); }}>
  {@render board(frame)}
</div>
