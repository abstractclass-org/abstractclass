<script lang="ts" module>
  import { center, hexPath, type Hex } from "./hex.ts";
  import type { Kind, Player } from "./position.ts";

  // The kinds' marks, for a hex of radius 1: a star (five points, as strategyjam.org names the kind), and a wall as
  // courses of bricks. A plain cell has no mark. The shapes, not the colours alone, tell the kinds apart.
  const STAR = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2, r = i % 2 ? 0.22 : 0.52;
    return `${(r * Math.cos(a)).toFixed(3)},${(r * Math.sin(a) + 0.03).toFixed(3)}`;
  }).join(" ");
  const BRICKS = "M-0.45,-0.3H0.45V0.3H-0.45Z M-0.45,-0.1H0.45 M-0.45,0.1H0.45 M0,-0.3V-0.1 M-0.22,-0.1V0.1 M0.22,-0.1V0.1 M0,0.1V0.3";
  const SHAPE = hexPath(0, 0, 0.93); // a gap of 0.07 between two cells, so that each cell reads alone
</script>

<script lang="ts">
  // A cell of the board or of a blueprint, on its hex: the owner's colour and the kind's mark.
  // - "cell": a cell in place.
  // - "removed": a cell that a move removed, as Hedge School's board draws a cut edge: faded, dashed, with ×.
  // - "ghost": a cell that a candidate or a line would stamp: faded, dashed, in the mover's colour.
  interface Props { hex: Hex; owner: Player; kind: Kind; look?: "cell" | "removed" | "ghost" }
  let { hex, owner, kind, look = "cell" }: Props = $props();
  const [x, y] = $derived(center(hex));
</script>

<g class="cell {look} p{owner}" transform="translate({x} {y})">
  <path d={SHAPE} class="body" />
  {#if kind === "star"}
    <polygon points={STAR} class="mark star" />
  {:else if kind === "wall"}
    <path d={BRICKS} class="mark wall" />
  {/if}
  {#if look === "removed"}
    <text y="0.3" class="cross">×</text>
  {/if}
</g>

<style>
  .cell { pointer-events: none; }
  .body { stroke: none; }
  .p0 .body { fill: var(--blue); }
  .p1 .body { fill: var(--red); }
  .star { fill: var(--on-badge); }
  .wall { fill: none; stroke: var(--on-badge); stroke-width: 0.07; stroke-linejoin: round; }

  .removed .body, .ghost .body { fill-opacity: 0.18; stroke-width: 0.07; stroke-dasharray: 0.2 0.12; }
  .removed.p0 .body, .ghost.p0 .body { stroke: var(--blue); }
  .removed.p1 .body, .ghost.p1 .body { stroke: var(--red); }
  .removed .mark, .ghost .mark { opacity: 0.6; }
  .removed.p0 .star, .ghost.p0 .star { fill: var(--blue); }
  .removed.p1 .star, .ghost.p1 .star { fill: var(--red); }
  .removed.p0 .wall, .ghost.p0 .wall { stroke: var(--blue); }
  .removed.p1 .wall, .ghost.p1 .wall { stroke: var(--red); }
  .cross { font-size: 0.9px; fill: var(--muted); text-anchor: middle; font-weight: 700; font-family: system-ui, sans-serif; }
</style>
