<script lang="ts" module>
  import type { BoardCandidate, BoardLabel } from "#lib/board/Board.svelte";
  import type { Box } from "#lib/board/hex.ts";
  import type { BoardMove, SitePosition } from "#lib/board/position.ts";
  import type { ReplayFrame } from "@abstractclass/site/Replay.svelte";

  /** A frame: the position, the last move and an earlier one of its turn, the candidates, the labels and the scene's
   *  view (sceneView.ts). */
  export interface Frame extends ReplayFrame {
    p: SitePosition; l: BoardMove | null; e: BoardMove[]; c: BoardCandidate[]; m: BoardLabel[]; z?: Box;
  }
</script>

<script lang="ts">
  // A frame of the home page's scenes on Blueprints' board (HomeReplay.svelte), in its scene's view (`z`). The view
  // stays still through the scene's frames. On the labelled move's moment it zooms in on that move, in ZOOM_MS, and
  // cuts with reduced motion. Each other change of the view, to the next scene's, is a cut.
  import { untrack } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { prefersReducedMotion, Tween } from "svelte/motion";
  import Board from "#lib/board/Board.svelte";

  let { frame }: { frame: Frame } = $props();
  /** The zoom onto the labelled move: short, and slower at its end (cubicOut). */
  const ZOOM_MS = 400;

  const view = new Tween<Box | undefined>(untrack(() => frame.z), { easing: cubicOut });
  $effect.pre(() => {
    const zooms = frame.hold === "moment" && !prefersReducedMotion.current;
    void view.set(frame.z, { duration: zooms ? ZOOM_MS : 0 });
  });
</script>

<Board position={frame.p} last={frame.l} earlier={frame.e} candidates={frame.c} labels={frame.m}
       zoom={view.current ?? null} still />
