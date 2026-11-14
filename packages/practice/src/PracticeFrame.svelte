<script lang="ts">
  // The practice game's frame (Hedge School's design 24): the review's layout (design 06). The row above the board (the
  // players and the score's bar), the board's box, and a side column of Lichess's width (250 to 350 pixels), which ends
  // with the review's step bar: the steps through the positions on the left and the game's actions on the right. One
  // column below 800 pixels (`one-column-layout`, the query of ONE_COLUMN), as the review and the fixed step bar
  // (review.css in packages/review). The board's box has one of two forms:
  // - "square": the window's height, less the row above it, or the width that the side column leaves at its least, as
  //   on Lichess's game page (Hedge School: Enclosure's board). With the gauge, the board's column is the gauge's width
  //   wider, and the row starts at the board's edge.
  // - "fill": the window's height, less the row, and all the width that the side column leaves at its widest
  //   (Cyanotype: Blueprints' board has no edge). In one column, the height that the site gives (`fillHeight`). With
  //   the gauge, it is left of the board's box and as high, the box is the gauge's width narrower, and the row starts
  //   at the box's edge.
  // The site gives the content: the row, the gauge, the board, the side column's content and the bar's tools.
  import type { Snippet } from "svelte";
  import { stripBox } from "@abstractclass/review/PlayerCard.svelte";
  import StepBar from "@abstractclass/review/StepBar.svelte";

  interface Props {
    form?: "square" | "fill";
    gauge?: boolean; // the score's gauge beside the board, `gaugeWidth` wide with its gap
    gaugeWidth?: string;
    fillHeight?: string; // the box's height in one column ("fill"), as a CSS length
    strip: Snippet; // the row above the board
    beside?: Snippet; // left of the board: the gauge
    board: Snippet; // in the board's box
    side: Snippet; // the side column's content, above the step bar
    above?: Snippet; // in the step bar, above the steps: a status line
    tools?: Snippet; // in the step bar, right of the steps: the game's actions
    shown: number; // the position on the board, from 0 at the start
    last: number; // the game's latest position
    onstep: (to: number) => void; // a step to a position: the site keeps it from 0 to `last`
  }
  let { form = "square", gauge = false, gaugeWidth = "0px", fillHeight, strip, beside, board, side, above, tools, shown,
        last, onstep }: Props = $props();

  let stripHeight = $state(0);
  const stripRoom = $derived(stripHeight ? `calc(${stripHeight}px + 0.5rem)` : "3.3125rem");
</script>

{#if form === "square"}
  <main class="grid items-start justify-center gap-x-5 gap-y-3 my-4 px-4 select-none
               [--tall:calc(100vh-var(--site-header)-var(--strip)-2rem)] [--broad:calc(100cqw-250px-1.25rem-var(--gauge-w)-2rem-20px)]
               [--board:min(var(--tall),var(--broad))] grid-cols-[calc(var(--board)+var(--gauge-w))_minmax(250px,350px)]
               one-column-layout:[--board:calc(100cqw-2rem-var(--gauge-w))] one-column-layout:grid-cols-1"
        style:--strip={stripRoom} style:--gauge-w={gaugeWidth}>
    {@render boardColumn("relative w-(--board) one-column-layout:flex-1 aspect-square rounded overflow-hidden bg-board")}
    <section class="flex flex-col min-h-0 h-[calc(var(--strip)+var(--board))] one-column-layout:h-auto px-4 py-3 bg-panel border border-line rounded-md">
      {@render sideAndBar()}
    </section>
  </main>
{:else}
  <main class="grid items-start gap-x-5 gap-y-3 my-4 px-4 select-none grid-cols-[minmax(0,1fr)_minmax(250px,350px)]
               [--tall:calc(100vh-var(--site-header)-var(--strip)-2rem)] one-column-layout:grid-cols-1"
        style:--strip={stripRoom} style:--fill-h={fillHeight} style:--gauge-w={gaugeWidth}>
    {@render boardColumn("relative flex-1 min-w-0 min-h-0 h-(--tall) one-column-layout:h-(--fill-h)")}
    <section class="flex flex-col min-h-0 h-[calc(var(--strip)+var(--tall))] one-column-layout:h-auto px-4 py-3 bg-panel border border-line rounded-md">
      {@render sideAndBar()}
    </section>
  </main>
{/if}

<!-- The board's column, in either form: the row above the board, then the gauge (`beside`) left of the board's box, whose
     classes the form gives. -->
{#snippet boardColumn(box: string)}
  <section class="min-w-0">
    <div class={["mb-2 ml-(--gauge-w)", stripBox(gauge)]} bind:offsetHeight={stripHeight}>{@render strip()}</div>
    <div class="flex">
      {@render beside?.()}
      <div class={box}>{@render board()}</div>
    </div>
  </section>
{/snippet}

<!-- The side column's content, then the step bar (the review's StepBar), whose actions go under the steps when the column
     is too narrow for one row. On a phone it is fixed to the bottom of the window. -->
{#snippet sideAndBar()}
  {@render side()}
  <StepBar class="mt-2 pt-2 border-t border-line" onfirst={() => onstep(0)} onback={() => onstep(shown - 1)}
           onforward={() => onstep(shown + 1)} onlast={() => onstep(last)} atStart={shown === 0} atEnd={shown === last}
           {above} {tools} />
{/snippet}
