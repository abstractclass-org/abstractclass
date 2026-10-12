<script lang="ts" module>
  /** Where the pointer is over a chart, in positions: `n` positions across its width. */
  export function pointerAt(ev: MouseEvent, chart: Element, n: number): number {
    const r = chart.getBoundingClientRect();
    return ((ev.clientX - r.left) / r.width) * n;
  }
</script>

<script lang="ts">
  // A chart's note, as Lichess's chart tooltip (the Advantage and Difficulty charts): over the chart, beside the point at
  // `at` percent of its width, on the side with more room. It takes at most the room on that side, and wraps there: a
  // chart can be as narrow as a side column.
  let { at, title, lines }: { at: number; title: string; lines: string[] } = $props();
</script>

<div class="absolute bottom-full mb-1.5 z-10 flex flex-col gap-0.5 w-max px-2 py-1 text-xs bg-panel border border-line rounded shadow-[0_2px_6px_rgb(0_0_0/0.25)] pointer-events-none"
     style={at <= 50 ? `left: calc(${at}% + 10px); max-width: calc(${100 - at}% - 10px)`
                     : `right: calc(${100 - at}% + 10px); max-width: calc(${at}% - 10px)`}>
  <strong class="font-mono">{title}</strong>
  {#each lines as line, i (i)}<span class="text-muted tabular-nums">{line}</span>{/each}
</div>
