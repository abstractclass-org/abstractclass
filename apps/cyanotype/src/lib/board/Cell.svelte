<script lang="ts" module>
  import { center, hexPath, type Hex } from "./hex.ts";
  import type { Kind, Player } from "./position.ts";
  import { sixPointStar, stripes } from "./cellMarks.ts";

  // The kinds' marks (design 33, "The cells' marks"), for a hex of radius 1: a star cell's six-point star, whose points
  // face the hex's corners, and a wall's three diagonal stripes. A Normal cell has no mark. The shapes, not the colours
  // alone, tell the kinds apart: a shape against lines.
  const STAR = sixPointStar(0.64);
  const STRIPES = stripes(0.76, 0.17, [-0.38, 0, 0.38]);
  /** A cell's radius: a gap of 0.07 between two cells, so that each cell reads alone. */
  export const CELL_SIZE = 0.93;
  const SHAPE = hexPath(0, 0, CELL_SIZE);
</script>

<script lang="ts">
  // A cell of the board or of a blueprint, on its hex: the owner's colour and the kind's mark.
  // - "cell": a cell in place.
  // - "captured": a cell that a move captured, as Hedge School's board draws a cut edge: faded, dashed, with ×.
  // - "ghost": a cell that a candidate or a line would place: faded, dashed, in the mover's colour.
  // In a text (`inText`, a move's glyph), the cell takes the colour of the text round it, as the glyph's boxes do, and
  // its mark the colour that the text gives (--on-text), else white.
  interface Props { hex: Hex; owner: Player; kind: Kind; look?: "cell" | "captured" | "ghost"; inText?: boolean }
  let { hex, owner, kind, look = "cell", inText = false }: Props = $props();
  const [x, y] = $derived(center(hex));
</script>

<g class="cell {look} p{owner}" class:faded={look !== "cell"} class:in-text={inText} transform="translate({x} {y})">
  <path d={SHAPE} class="body" />
  {#if kind === "star"}
    <path d={STAR} class="mark star" />
  {:else if kind === "wall"}
    <path d={STRIPES} class="mark wall" />
  {/if}
  {#if look === "captured"}
    <text y="0.3" class="cross">×</text>
  {/if}
</g>

<style>
  .cell { pointer-events: none; }
  .p0 { --own: var(--blue); }
  .p1 { --own: var(--red); }
  .in-text { --own: currentColor; }
  .body { fill: var(--own); stroke: none; }
  .mark { fill: var(--on-badge); }
  .in-text .mark { fill: var(--on-text, var(--on-badge)); }

  /* A captured cell and a ghost: faded and dashed, the mark in the owner's colour. */
  .faded .body { fill-opacity: 0.18; stroke: var(--own); stroke-width: 0.07; stroke-dasharray: 0.2 0.12; }
  .faded .mark { opacity: 0.6; fill: var(--own); }
  .cross { font-size: 0.9px; fill: var(--muted); text-anchor: middle; font-weight: 700; font-family: system-ui, sans-serif; }
</style>
