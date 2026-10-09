<script lang="ts">
  // The game graph: Blue's win chance by position as an area around 50% (Lichess's chart), the score difference so
  // far as a line (Enclosure pays points every turn), the key moments as dots, and the current position as a marker.
  // A click jumps to the position.
  import type { Label } from "./model.ts";

  interface Props {
    blueWin: number[];
    scoreDiff: number[]; // Blue minus Red, by position
    current: number;
    moments: { index: number; label: Label }[];
    showScore: boolean;
    onjump: (position: number) => void;
  }
  let { blueWin, scoreDiff, current, moments, showScore, onjump }: Props = $props();

  const W = 600, H = 120;
  const n = $derived(blueWin.length - 1);
  const x = (i: number) => (i / n) * W;
  const yWin = (v: number) => H - v * H;
  const scoreMax = $derived(Math.max(1, ...scoreDiff.map(Math.abs)));
  const yScore = (d: number) => H / 2 - (d / scoreMax) * (H / 2 - 6);
  // The area around 50%, one closed shape for each run of analysed positions (NaN: not analysed yet).
  const area = $derived.by(() => {
    const runs: number[][] = [];
    blueWin.forEach((v, i) => {
      if (Number.isNaN(v)) return;
      const run = runs.at(-1);
      if (run && run.at(-1) === i - 1) run.push(i); else runs.push([i]);
    });
    return runs.map(r => `M${x(r[0])},${H / 2} ` + r.map(i => `L${x(i)},${yWin(blueWin[i])}`).join(" ") +
                         ` L${x(r.at(-1)!)},${H / 2} Z`).join(" ");
  });
  const scoreLine = $derived(scoreDiff.map((d, i) => `${i ? "L" : "M"}${x(i)},${yScore(d)}`).join(" "));

  let svg: SVGSVGElement;
  function click(ev: MouseEvent) {
    const r = svg.getBoundingClientRect();
    onjump(Math.round(((ev.clientX - r.left) / r.width) * n));
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg bind:this={svg} viewBox="0 0 {W} {H}" preserveAspectRatio="none" class="graph" onclick={click}>
  <defs>
    <clipPath id="above"><rect x="0" y="0" width={W} height={H / 2} /></clipPath>
    <clipPath id="below"><rect x="0" y={H / 2} width={W} height={H / 2} /></clipPath>
  </defs>
  <path d={area} class="blue" clip-path="url(#above)" />
  <path d={area} class="red" clip-path="url(#below)" />
  <line x1="0" y1={H / 2} x2={W} y2={H / 2} class="mid" />
  {#if showScore}<path d={scoreLine} class="score" />{/if}
  {#each moments.filter(m => !Number.isNaN(blueWin[m.index + 1])) as m (m.index)}
    <circle cx={x(m.index + 1)} cy={yWin(blueWin[m.index + 1])} r="3.5" class="moment {m.label}" />
  {/each}
  <line x1={x(current)} y1="0" x2={x(current)} y2={H} class="cursor" />
</svg>

<style>
  .graph { width: 100%; height: 7.5rem; display: block; cursor: pointer; background: var(--panel); border-radius: 4px; }
  .blue { fill: var(--blue); fill-opacity: 0.35; }
  .red { fill: var(--red); fill-opacity: 0.35; }
  .mid { stroke: var(--muted); stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
  .score { fill: none; stroke: var(--text); stroke-width: 1.5; stroke-opacity: 0.7; vector-effect: non-scaling-stroke; }
  .cursor { stroke: var(--last); stroke-width: 2; vector-effect: non-scaling-stroke; }
  .moment { stroke: var(--panel); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .moment.inaccuracy { fill: var(--inaccuracy); }
  .moment.mistake { fill: var(--mistake); }
  .moment.blunder { fill: var(--blunder); }
</style>
