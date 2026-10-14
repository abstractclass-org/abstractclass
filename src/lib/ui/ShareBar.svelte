<script lang="ts">
  // A share between Blue and Red as a bar: Blue's part from the left, or, upright as a gauge beside the board, from the
  // bottom (Lichess's and chess.com's gauge), and Red's the rest. The review's win chance, and Practice's points. Each
  // side's text at its own end, where it has room. `sub`: a second, thinner lane beside the bar, each side's part as a
  // share of its own part of the bar (Practice's areas, against each player's points), from the same end.
  interface Props {
    share: number; // Blue's share, 0 to 1. NaN: none yet
    upright?: boolean;
    labels?: [string, string] | null; // Blue's text, then Red's
    empty?: string; // the text of a bar with no share yet
    sub?: [number, number] | null; // each side's part of its own part, 0 to 1
    title: string; // what the bar shows: its tooltip, and the gauge's name
  }
  let { share, upright = false, labels = null, empty = "", sub = null, title }: Props = $props();

  const GAUGE_TEXT_PX = 40; // the length of a side's part of the gauge that has room for its text, written up
  const GAUGE_TEXT = "absolute left-1/2 -translate-x-1/2 rotate-180 [writing-mode:vertical-rl] text-[0.6rem] leading-none font-semibold tracking-[0.1em] text-white tabular-nums";
  const none = $derived(Number.isNaN(share));
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  let height = $state(0);
</script>

{#if !upright}
  <div class="grid gap-0.5 min-w-0" {title}>
    <div class={["flex rounded-[3px] overflow-hidden", sub ? "h-3" : "h-[1.15rem]", none ? "items-center justify-center bg-panel-2" : "bg-red"]}>
      {#if !none}
        <div class="flex items-center pl-1.5 text-xs font-bold text-white bg-blue transition-[width] duration-200" style="width: {100 * share}%">
          {#if labels && share >= 0.12}<span>{labels[0]}</span>{/if}
        </div>
        <div class="flex flex-1 items-center justify-end pr-1.5 text-xs font-bold text-white bg-red">
          {#if labels && share <= 0.88}<span>{labels[1]}</span>{/if}
        </div>
      {:else}
        <span class="text-xs text-muted">{empty}</span>
      {/if}
    </div>
    {#if sub}
      <div class="flex justify-between h-1.5 rounded-[2px] overflow-hidden bg-panel-2">
        {#if !none}
          <div class="bg-blue transition-[width] duration-200" style="width: {100 * share * clamp(sub[0])}%"></div>
          <div class="bg-red transition-[width] duration-200" style="width: {100 * (1 - share) * clamp(sub[1])}%"></div>
        {/if}
      </div>
    {/if}
  </div>
{:else}
  <div class="flex flex-none self-stretch gap-0.5 mr-1.5">
    <div class={["relative flex flex-col-reverse w-4 rounded-[3px] overflow-hidden", none ? "bg-panel-2" : "bg-red"]}
         role="img" aria-label={title} bind:clientHeight={height}>
      {#if !none}
        <div class="bg-blue transition-[height] duration-200" style="height: {100 * share}%"></div>
        <!-- Each side's text at its own end, inside the gauge. Small and written up the gauge, so that it can be narrow. -->
        {#if labels && (1 - share) * height >= GAUGE_TEXT_PX}<span class="{GAUGE_TEXT} top-1.25">{labels[1]}</span>{/if}
        {#if labels && share * height >= GAUGE_TEXT_PX}<span class="{GAUGE_TEXT} bottom-1.25">{labels[0]}</span>{/if}
      {/if}
    </div>
    {#if sub}
      <div class="flex flex-col-reverse justify-between w-1.5 rounded-[2px] overflow-hidden bg-panel-2" aria-hidden="true">
        {#if !none}
          <div class="bg-blue transition-[height] duration-200" style="height: {100 * share * clamp(sub[0])}%"></div>
          <div class="bg-red transition-[height] duration-200" style="height: {100 * (1 - share) * clamp(sub[1])}%"></div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
