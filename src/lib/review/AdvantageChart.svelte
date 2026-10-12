<script lang="ts">
  // The advantage chart, named as Lichess names its own ("Advantage"): Blue's win chance by position as a line, with
  // the area between it and 50% in the colour of the side ahead (Lichess's chart), the score difference as a second line
  // in another colour (Enclosure pays points every turn), the difference of the areas each player encloses now as a
  // third, each scaled to its own largest value, the key moments as dots, and the current position as a marker.
  // The pointer snaps to the nearest position and shows its note (Lichess's chart tooltip). A click jumps there. By turn,
  // the chart draws and snaps to the turns' ends only: a turn is one step (design 10).
  // While the review runs, the line is dashed and faint where a position has only its first, quick search, and solid
  // where its search has the review's depth: the sweep draws the whole line first, and the label pass then refines it
  // (design 06).
  import type { Label } from "./model.ts";

  interface Props {
    blueWin: number[];
    scoreDiff: number[]; // Blue minus Red, by position
    areaDiff: number[]; // the area each player encloses, Blue's minus Red's, by position
    current: number;
    moments: { index: number; label: Label }[];
    showScore: boolean;
    showArea: boolean;
    tips: { title: string; value: string; details?: string[] }[]; // by position: the hover note, a line for each value
    settled?: boolean[]; // by position: its search has the review's depth (all, when not given)
    points?: number[]; // the positions drawn and snapped to, in order (all, when not given): by turn, the turns' ends
    onjump: (position: number) => void;
  }
  let { blueWin, scoreDiff, areaDiff, current, moments, showScore, showArea, tips, settled, points, onjump }: Props = $props();

  const W = 600, H = 120;
  const n = $derived(blueWin.length - 1);
  const x = (i: number) => (i / n) * W;
  const yWin = (v: number) => H - v * H;
  // A line of differences, Blue less Red, around the middle: scaled to its own largest value, so that the score and the
  // area, of very different sizes, both show. Its largest value reaches 70% of the way from the middle to the edge, so
  // that it swings less than the win chance and stays apart from it.
  const DIFF_REACH = 0.7;
  const yDiff = (max: number) => (d: number) => H / 2 - (d / max) * (H / 2) * DIFF_REACH;
  const yScore = $derived(yDiff(Math.max(1, ...scoreDiff.map(Math.abs))));
  const yArea = $derived(yDiff(Math.max(1, ...areaDiff.map(Math.abs))));
  const drawn = $derived(points ?? blueWin.map((_, i) => i));
  // The runs of analysed positions among those drawn (NaN: not analysed yet).
  const runs = $derived.by(() => {
    const out: number[][] = [];
    let prev: number | null = null; // the drawn position before, when analysed
    for (const i of drawn) {
      if (Number.isNaN(blueWin[i])) { prev = null; continue; }
      const run = out.at(-1);
      if (run && prev !== null && run.at(-1) === prev) run.push(i); else out.push([i]);
      prev = i;
    }
    return out;
  });
  // The area around 50%, one closed shape for each run.
  const area = $derived.by(() => {
    return runs.map(r => `M${x(r[0])},${H / 2} ` + r.map(i => `L${x(i)},${yWin(blueWin[i])}`).join(" ") +
                         ` L${x(r.at(-1)!)},${H / 2} Z`).join(" ");
  });
  // The win chance as a line over the runs of analysed positions, in two paths: the steps between two settled
  // positions, and the steps with an end still at its first search.
  const winLines = $derived.by(() => {
    const solid: string[] = [], rough: string[] = [];
    for (const r of runs)
      for (let k = 1; k < r.length; k++) {
        const a = r[k - 1], b = r[k], step = `M${x(a)},${yWin(blueWin[a])} L${x(b)},${yWin(blueWin[b])}`;
        (!settled || (settled[a] && settled[b]) ? solid : rough).push(step);
      }
    return { solid: solid.join(" "), rough: rough.join(" ") };
  });
  const scoreLine = $derived(drawn.map((i, k) => `${k ? "L" : "M"}${x(i)},${yScore(scoreDiff[i])}`).join(" "));
  const areaLine = $derived(drawn.map((i, k) => `${k ? "L" : "M"}${x(i)},${yArea(areaDiff[i] ?? 0)}`).join(" "));

  let svg: SVGSVGElement;
  let hovered = $state<number | null>(null);
  const at = (ev: MouseEvent) => {
    const r = svg.getBoundingClientRect(), f = ((ev.clientX - r.left) / r.width) * n;
    return drawn.reduce((best, i) => (Math.abs(i - f) < Math.abs(best - f) ? i : best), drawn[0]);
  };
  // The note sits beside the snapped point, on the side with more room.
  const tip = $derived(hovered === null ? null : { ...tips[hovered], left: hovered / n <= 0.5, at: (100 * hovered) / n });
</script>

<div class="relative h-full" role="figure" aria-label="Advantage chart">
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg bind:this={svg} viewBox="0 0 {W} {H}" preserveAspectRatio="none" class="block w-full h-full bg-panel rounded cursor-pointer"
     onclick={ev => onjump(at(ev))} onmousemove={ev => (hovered = at(ev))} onmouseleave={() => (hovered = null)}>
  <defs>
    <clipPath id="above"><rect x="0" y="0" width={W} height={H / 2} /></clipPath>
    <clipPath id="below"><rect x="0" y={H / 2} width={W} height={H / 2} /></clipPath>
  </defs>
  <path d={area} class="fill-blue" fill-opacity="0.35" clip-path="url(#above)" />
  <path d={area} class="fill-red" fill-opacity="0.35" clip-path="url(#below)" />
  <line x1="0" y1={H / 2} x2={W} y2={H / 2} class="stroke-muted" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" />
  {#if showArea}<path d={areaLine} class="fill-none stroke-area" stroke-width="1.5" vector-effect="non-scaling-stroke" />{/if}
  {#if showScore}<path d={scoreLine} class="fill-none stroke-accent" stroke-width="1.5" vector-effect="non-scaling-stroke" />{/if}
  <path d={winLines.solid} class="fill-none stroke-ink" stroke-width="1.5" vector-effect="non-scaling-stroke" />
  <path d={winLines.rough} class="fill-none stroke-ink" stroke-width="1.5" stroke-dasharray="4 3" stroke-opacity="0.55"
        vector-effect="non-scaling-stroke" />
  <line x1={x(current)} y1="0" x2={x(current)} y2={H} class="stroke-last" stroke-width="2" vector-effect="non-scaling-stroke" />
  {#if hovered !== null}
    <line x1={x(hovered)} y1="0" x2={x(hovered)} y2={H} class="stroke-muted pointer-events-none" vector-effect="non-scaling-stroke" />
  {/if}
</svg>
<!-- The key moments' labels, as dots in their label's colour, 7 pixels wide: drawn in HTML, since the SVG stretches,
     and in a column as narrow as the summary's a circle in it would be a thin ellipse. -->
{#each moments.filter(m => !Number.isNaN(blueWin[m.index + 1])) as m (m.index)}
  <span class="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-panel pointer-events-none"
        style:left="{(100 * (m.index + 1)) / n}%" style:top="{100 * (1 - blueWin[m.index + 1])}%" style:background="var(--{m.label})"></span>
{/each}
{#if hovered !== null && !Number.isNaN(blueWin[hovered])}
  <!-- A dot drawn in HTML, since the SVG stretches and would draw an ellipse. -->
  <span class="absolute size-2 -mt-1 -ml-1 rounded-full bg-ink border-[1.5px] border-panel pointer-events-none"
        style="left: {(100 * hovered) / n}%; top: {100 * (1 - blueWin[hovered])}%"></span>
{/if}
{#if tip}
  <!-- The note takes at most the room beside the point, and wraps there: the chart can be as narrow as a side column. -->
  <div class="absolute bottom-full mb-1.5 z-10 flex flex-col gap-0.5 w-max px-2 py-1 text-xs bg-panel border border-line rounded shadow-[0_2px_6px_rgb(0_0_0/0.25)] pointer-events-none"
       style={tip.left ? `left: calc(${tip.at}% + 10px); max-width: calc(${100 - tip.at}% - 10px)`
                       : `right: calc(${100 - tip.at}% + 10px); max-width: calc(${tip.at}% - 10px)`}>
    <strong class="font-mono">{tip.title}</strong>
    <span class="text-muted tabular-nums">{tip.value}</span>
    {#each tip.details ?? [] as d (d)}<span class="text-muted tabular-nums">{d}</span>{/each}
  </div>
{/if}
</div>
