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

<div class="wrap" role="figure" aria-label="Advantage chart">
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg bind:this={svg} viewBox="0 0 {W} {H}" preserveAspectRatio="none" class="graph" onclick={ev => onjump(at(ev))}
     onmousemove={ev => (hovered = at(ev))} onmouseleave={() => (hovered = null)}>
  <defs>
    <clipPath id="above"><rect x="0" y="0" width={W} height={H / 2} /></clipPath>
    <clipPath id="below"><rect x="0" y={H / 2} width={W} height={H / 2} /></clipPath>
  </defs>
  <path d={area} class="blue" clip-path="url(#above)" />
  <path d={area} class="red" clip-path="url(#below)" />
  <line x1="0" y1={H / 2} x2={W} y2={H / 2} class="mid" />
  {#if showScore}<path d={scoreLine} class="score" />{/if}
  <path d={winLine} class="win" />
  {#each moments.filter(m => !Number.isNaN(blueWin[m.index + 1])) as m (m.index)}
    <circle cx={x(m.index + 1)} cy={yWin(blueWin[m.index + 1])} r="3.5" class="moment {m.label}" />
  {/each}
  <line x1={x(current)} y1="0" x2={x(current)} y2={H} class="cursor" />
  {#if hovered !== null}
    <line x1={x(hovered)} y1="0" x2={x(hovered)} y2={H} class="hover" />
  {/if}
</svg>
{#if hovered !== null && !Number.isNaN(blueWin[hovered])}
  <!-- A dot drawn in HTML, since the SVG stretches and would draw an ellipse. -->
  <span class="dot" style="left: {(100 * hovered) / n}%; top: {100 * (1 - blueWin[hovered])}%"></span>
{/if}
{#if tip}
  <div class="tip" style={tip.left ? `left: calc(${tip.at}% + 10px)` : `right: calc(${100 - tip.at}% + 10px)`}>
    <strong>{tip.title}</strong>
    <span>{tip.value}</span>
  </div>
{/if}
</div>

<style>
  .wrap { position: relative; }
  .graph { width: 100%; height: 7.5rem; display: block; cursor: pointer; background: var(--panel); border-radius: 4px; }
  .blue { fill: var(--blue); fill-opacity: 0.35; }
  .red { fill: var(--red); fill-opacity: 0.35; }
  .mid { stroke: var(--muted); stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
  .win { fill: none; stroke: var(--text); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  .score { fill: none; stroke: var(--accent); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  .cursor { stroke: var(--last); stroke-width: 2; vector-effect: non-scaling-stroke; }
  .hover { stroke: var(--muted); stroke-width: 1; vector-effect: non-scaling-stroke; pointer-events: none; }
  .dot { position: absolute; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: var(--text);
         border: 1.5px solid var(--panel); pointer-events: none; }
  .tip { position: absolute; top: 0.4rem; display: flex; flex-direction: column; gap: 0.1rem; padding: 0.3rem 0.5rem;
         background: var(--panel); border: 1px solid var(--border); border-radius: 4px; font-size: 0.82em;
         white-space: nowrap; pointer-events: none; box-shadow: 0 2px 6px rgb(0 0 0 / 0.25); }
  .tip strong { font-family: ui-monospace, monospace; }
  .tip span { color: var(--muted); font-variant-numeric: tabular-nums; }
  .moment { stroke: var(--panel); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .moment.inaccuracy { fill: var(--inaccuracy); }
  .moment.mistake { fill: var(--mistake); }
  .moment.blunder { fill: var(--blunder); }
</style>
