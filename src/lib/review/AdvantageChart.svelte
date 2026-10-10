<script lang="ts">
  // The advantage chart, named as Lichess names its own ("Advantage"): Blue's win chance by position as a line, with
  // the area between it and 50% in the colour of the side ahead (Lichess's chart), the score difference so far as a
  // second line in another colour (Enclosure pays points every turn), the key moments as dots, and the current position as a marker.
  // The pointer snaps to the nearest position and shows its note (Lichess's chart tooltip). A click jumps there.
  import type { Label } from "./model.ts";

  interface Props {
    blueWin: number[];
    scoreDiff: number[]; // Blue minus Red, by position
    current: number;
    moments: { index: number; label: Label }[];
    showScore: boolean;
    tips: { title: string; value: string }[]; // by position: the hover note
    onjump: (position: number) => void;
  }
  let { blueWin, scoreDiff, current, moments, showScore, tips, onjump }: Props = $props();

  const W = 600, H = 120;
  const n = $derived(blueWin.length - 1);
  const x = (i: number) => (i / n) * W;
  const yWin = (v: number) => H - v * H;
  const scoreMax = $derived(Math.max(1, ...scoreDiff.map(Math.abs)));
  const yScore = (d: number) => H / 2 - (d / scoreMax) * (H / 2 - 6);
  // The runs of analysed positions (NaN: not analysed yet).
  const runs = $derived.by(() => {
    const out: number[][] = [];
    blueWin.forEach((v, i) => {
      if (Number.isNaN(v)) return;
      const run = out.at(-1);
      if (run && run.at(-1) === i - 1) run.push(i); else out.push([i]);
    });
    return out;
  });
  // The area around 50%, one closed shape for each run.
  const area = $derived.by(() => {
    return runs.map(r => `M${x(r[0])},${H / 2} ` + r.map(i => `L${x(i)},${yWin(blueWin[i])}`).join(" ") +
                         ` L${x(r.at(-1)!)},${H / 2} Z`).join(" ");
  });
  // The win chance as a line, one piece for each run of analysed positions.
  const winLine = $derived(runs.map(r => r.map((i, k) => `${k ? "L" : "M"}${x(i)},${yWin(blueWin[i])}`).join(" ")).join(" "));
  const scoreLine = $derived(scoreDiff.map((d, i) => `${i ? "L" : "M"}${x(i)},${yScore(d)}`).join(" "));

  let svg: SVGSVGElement;
  let hovered = $state<number | null>(null);
  const at = (ev: MouseEvent) => {
    const r = svg.getBoundingClientRect();
    return Math.max(0, Math.min(n, Math.round(((ev.clientX - r.left) / r.width) * n)));
  };
  // The note sits beside the snapped point, on the side with more room.
  const tip = $derived(hovered === null ? null : { ...tips[hovered], left: hovered / n <= 0.5, at: (100 * hovered) / n });
</script>

<div class="relative" role="figure" aria-label="Advantage chart">
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg bind:this={svg} viewBox="0 0 {W} {H}" preserveAspectRatio="none" class="block w-full h-30 bg-panel rounded cursor-pointer"
     onclick={ev => onjump(at(ev))} onmousemove={ev => (hovered = at(ev))} onmouseleave={() => (hovered = null)}>
  <defs>
    <clipPath id="above"><rect x="0" y="0" width={W} height={H / 2} /></clipPath>
    <clipPath id="below"><rect x="0" y={H / 2} width={W} height={H / 2} /></clipPath>
  </defs>
  <path d={area} class="fill-blue" fill-opacity="0.35" clip-path="url(#above)" />
  <path d={area} class="fill-red" fill-opacity="0.35" clip-path="url(#below)" />
  <line x1="0" y1={H / 2} x2={W} y2={H / 2} class="stroke-muted" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" />
  {#if showScore}<path d={scoreLine} class="fill-none stroke-accent" stroke-width="1.5" vector-effect="non-scaling-stroke" />{/if}
  <path d={winLine} class="fill-none stroke-ink" stroke-width="1.5" vector-effect="non-scaling-stroke" />
  {#each moments.filter(m => !Number.isNaN(blueWin[m.index + 1])) as m (m.index)}
    <circle cx={x(m.index + 1)} cy={yWin(blueWin[m.index + 1])} r="3.5" class="stroke-panel" style:fill="var(--{m.label})"
            vector-effect="non-scaling-stroke" />
  {/each}
  <line x1={x(current)} y1="0" x2={x(current)} y2={H} class="stroke-last" stroke-width="2" vector-effect="non-scaling-stroke" />
  {#if hovered !== null}
    <line x1={x(hovered)} y1="0" x2={x(hovered)} y2={H} class="stroke-muted pointer-events-none" vector-effect="non-scaling-stroke" />
  {/if}
</svg>
{#if hovered !== null && !Number.isNaN(blueWin[hovered])}
  <!-- A dot drawn in HTML, since the SVG stretches and would draw an ellipse. -->
  <span class="absolute size-2 -mt-1 -ml-1 rounded-full bg-ink border-[1.5px] border-panel pointer-events-none"
        style="left: {(100 * hovered) / n}%; top: {100 * (1 - blueWin[hovered])}%"></span>
{/if}
{#if tip}
  <div class="absolute top-1.5 flex flex-col gap-0.5 px-2 py-1 text-xs whitespace-nowrap bg-panel border border-line rounded shadow-[0_2px_6px_rgb(0_0_0/0.25)] pointer-events-none"
       style={tip.left ? `left: calc(${tip.at}% + 10px)` : `right: calc(${100 - tip.at}% + 10px)`}>
    <strong class="font-mono">{tip.title}</strong>
    <span class="text-muted tabular-nums">{tip.value}</span>
  </div>
{/if}
</div>
