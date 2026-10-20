<script lang="ts" module>
  import { fmtScore, type Player } from "./enclosure.ts";

  // The row above the board (design 06), in the review, in its skeleton and in Practice: the classes that set its
  // height, the same in each, so that a skeleton's board has the page's size. Each card has two lines, its name over its
  // numbers, so that the cards are narrow and the bar between them long. The narrowest row takes three (the points, then
  // the area). The row's container is `bar` with the win bar or the points' bar between the players, `gauge` without.
  // The review's layout sets the row's height before it measures it, from these widths and lines (ReviewView.svelte,
  // --strip): change them together.
  export const stripBox = (gauge: boolean) => (gauge ? "@container/gauge" : "@container/bar");
  export const stripRow = (gauge: boolean) => ["grid items-center gap-2",
    gauge ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_minmax(6rem,1fr)_auto]"];
  export const playerBox = (p: Player) => ["flex flex-col leading-tight px-1.5 py-0.5 rounded min-w-0 max-w-64",
    p === 0 ? "items-start" : "items-end"];
  export const playerName = (p: Player) => ["flex items-baseline gap-1.5 min-w-0 max-w-full", p === 1 && "flex-row-reverse"];
  export const playerNumbers = (p: Player) => ["flex items-baseline gap-x-1 text-sm text-muted tabular-nums whitespace-nowrap",
    "@max-[27.5rem]/bar:flex-col @max-[21.25rem]/gauge:flex-col", p === 1 && "@max-[27.5rem]/bar:items-end @max-[21.25rem]/gauge:items-end"];
  export const AREA_DOT = "@max-[27.5rem]/bar:hidden @max-[21.25rem]/gauge:hidden";
</script>

<script lang="ts">
  // A player's name, side and score, in the row above the board, facing the other player: the name, then the numbers
  // under it (design 06). In the narrowest row, three lines: the points, then the area. The widths are the row's own
  // (container queries), set by the widest numbers of a game (points in thousands): with the bar, where it keeps its
  // 6rem; with the gauge, where the two tags meet.
  import Swatch from "#lib/ui/Swatch.svelte";

  interface Props {
    player: Player;
    name: string;
    tag?: string | null; // a word after the name: the side ("Blue") where the names are not the sides
    points: number; // the points so far
    area?: number | null; // the area enclosed now, which each turn's end adds to the points
    areaNote?: string | null; // why the area differs from the position's (the engine's line), drawn in the accent colour
    toMove?: boolean; // the player to move: marked as the board marks the last edge
  }
  let { player: p, name, tag = null, points, area = null, areaNote = null, toMove = false }: Props = $props();
</script>

<div class={[playerBox(p), toMove && "bg-panel-2 shadow-[inset_0_-2px_0_var(--last)]"]}>
  <span class={playerName(p)}>
    <Swatch player={p} />
    <span class="font-semibold truncate">{name}</span>
    {#if tag}<span class="text-xs text-muted whitespace-nowrap">{tag}</span>{/if}
  </span>
  <span class={playerNumbers(p)}>
    <span><strong class="text-[1.1em] text-ink">{fmtScore(points)}</strong> points</span>
    {#if area !== null}
      <span class={AREA_DOT} aria-hidden="true">·</span>
      <span><strong class={["text-[1.1em]", areaNote ? "text-accent" : "text-ink"]}
                    title={areaNote ?? "The area enclosed now, added at the turn's end"}>{fmtScore(area)}</strong> area</span>
    {/if}
  </span>
</div>
