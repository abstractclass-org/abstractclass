<script lang="ts">
  // The difficulty chart (design 14), beside the Advantage chart as Lichess sets its Move times chart beside its
  // Advantage chart: a bar for each turn (or edge), as tall as its position's complexity, full at twice a hard
  // position's, dark where the position is hard, with a dashed line at the hard level. Under the bars, a row of the key
  // moments' labels as dots, each under its turn: the bars' heights stay a picture of difficulty alone, and the row reads
  // as a line of time, so the chart shows whether the mistakes fell where the game was hard. The pointer snaps to the
  // bar under it and names its position: the decision, before its move. A click shows that position.
  import type { Label } from "./model.ts";
  import { HARD } from "./labels.ts";
  import ChartTip, { pointerAt } from "./ChartTip.svelte";

  interface Bar { from: number; to: number; c: number; hard: boolean; title: string; details: string[] }
  interface Props {
    positions: number; // the game's positions, the end included
    bars: Bar[]; // in the game's order
    current: number;
    moments: { index: number; label: Label }[]; // a key moment's last edge
    onjump: (position: number) => void;
  }
  let { positions, bars, current, moments, onjump }: Props = $props();

  const W = 600, H = 80, ROW = 14; // the labels' row, under the bars
  const BASE = H - ROW, TOP = 2 * HARD;
  const n = $derived(Math.max(1, positions - 1));
  const x = (i: number) => (i / n) * W;
  const height = (c: number) => (Math.min(c, TOP) / TOP) * (BASE - 6);
  const barAt = (edge: number) => bars.find(b => b.from <= edge && edge < b.to);

  let svg: SVGSVGElement;
  let hovered = $state<Bar | null>(null);
  const at = (ev: MouseEvent) => barAt(pointerAt(ev, svg, n)) ?? null;
</script>

<div class="relative h-full" role="figure" aria-label="Difficulty chart">
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg bind:this={svg} viewBox="0 0 {W} {H}" preserveAspectRatio="none" class="block w-full h-full bg-panel rounded cursor-pointer"
     onclick={ev => { const b = at(ev); if (b) onjump(b.from); }} onmousemove={ev => (hovered = at(ev))} onmouseleave={() => (hovered = null)}>
  {#each bars as b (b.from)}
    <rect x={x(b.from)} width={Math.max(0, x(b.to) - x(b.from) - 0.15 * (W / n))} y={BASE - height(b.c)} height={height(b.c)}
          class={b.hard ? "fill-ink" : "fill-muted"} fill-opacity={b.hard ? 1 : hovered === b ? 0.8 : 0.5} />
  {/each}
  <line x1="0" y1={BASE - height(HARD)} x2={W} y2={BASE - height(HARD)} class="stroke-muted" stroke-opacity="0.6" stroke-dasharray="3 3"
        vector-effect="non-scaling-stroke" />
  <line x1="0" y1={BASE} x2={W} y2={BASE} class="stroke-line" vector-effect="non-scaling-stroke" />
  <line x1={x(current)} y1="0" x2={x(current)} y2={H} class="stroke-last" stroke-width="2" vector-effect="non-scaling-stroke" />
</svg>
<!-- The key moments' labels in their row under the bars, each under its turn: drawn in HTML, since the SVG stretches. -->
{#each moments as m (m.index)}
  {@const b = barAt(m.index)}
  {#if b}
    <span class="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-panel pointer-events-none"
          style:left="{(100 * (b.from + b.to)) / 2 / n}%" style:top="{(100 * (BASE + ROW / 2)) / H}%" style:background="var(--{m.label})"></span>
  {/if}
{/each}
{#if hovered}
  <ChartTip at={(100 * (hovered.from + hovered.to)) / 2 / n} title={hovered.title} lines={hovered.details} />
{/if}
</div>
