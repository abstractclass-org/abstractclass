<script lang="ts">
  // The ring that marks a blueprint's first cell (0, 0): in the hands, and on the board round a candidate's first cell
  // while the candidate is pointed at or pinned, since its name (K@q,r) names that hex. On the hex round (x, y), in the
  // frame's units, for `unit` pixels per unit: at least 1.6 pixels wide, for a small hand (a phone). The ring is inside
  // the cell's edge, so that a neighbour's edge or the grid never meets it: its width is the same all round. A path's
  // stroke is centred on it, and a hex's radius is its side's distance times 2 / √3.
  import { CELL_SIZE } from "./Cell.svelte";
  import { hexPath } from "./hex.ts";

  interface Props { x?: number; y?: number; unit: number }
  let { x = 0, y = 0, unit }: Props = $props();
  const width = $derived(Math.max(0.12, 1.6 / unit));
</script>

<path d={hexPath(x, y, CELL_SIZE - width / Math.sqrt(3))} class="first-ring" stroke-width={width} />

<style>
  .first-ring { fill: none; stroke: var(--text); opacity: 0.75; pointer-events: none; }
</style>
