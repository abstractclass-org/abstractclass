<script lang="ts">
  // The bar under the moves, on the review, the Analysis board and Practice (design 06): the four steps through the
  // positions on the left, and the page's tools on the right. When the column is too narrow for one row, the tools go
  // under the steps as a group, and the steps then span the bar's width, as Lichess's do. The bar measures whether the
  // tools fit beside the steps at their own width, and so it does not stay wrapped once the steps are wide.
  // In one column (below 800 pixels) the bar is fixed to the bottom of the window, as the Lichess app's bottom bar, so
  // that the step back is in view whenever the board is (the dock, app.css). The page's area then keeps room for it at
  // its end, as high as the bar: the bar sets --step-dock on the document for the room and for the scroll padding.
  import { untrack, type Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import Icon from "./Icon.svelte";

  interface Props {
    onfirst: () => void;
    onback: () => void;
    onforward: () => void;
    onlast: () => void;
    atStart?: boolean; // the first position shows: First and Back are off
    atEnd?: boolean; // the last position shows: Forward and Last are off
    above?: Snippet; // over the steps, in the bar: the review's status line
    tools?: Snippet;
    class?: ClassValue; // the bar's place in its column, where it is not fixed: its margin, border and padding
  }
  let { onfirst, onback, onforward, onlast, atStart = false, atEnd = false, above, tools, class: place }: Props = $props();

  /** Gives the bar's height to the page (--step-dock), and again whenever it changes. The observer's first call comes
   *  after the first frame's layout: the room is at the page's end, and nothing after it moves when it grows. A read
   *  as the bar mounts would force a second layout of the whole page in its first frame, after the write. The height
   *  comes with the observer's entry, so that a layout that the other observer (watch) dirties is not forced here. */
  function dock(box: HTMLElement) {
    const root = document.documentElement.style;
    const observer = new ResizeObserver(([entry]) => root.setProperty("--step-dock", `${entry.borderBoxSize[0].blockSize}px`));
    observer.observe(box);
    return () => { observer.disconnect(); root.removeProperty("--step-dock"); };
  }

  const GAP = 8; // gap-x-2, between the steps and the tools
  let wrapped = $state(false);

  /** Watches the bar and its tools. The steps' own width is measured while they are not stretched (the first layout),
   *  and the tools' whenever they change (a tool that comes or goes). The bar decides at once, before its first frame,
   *  where it is drawn: the observer's first call comes after the frame's layout, and a change then moves the buttons
   *  (a layout shift). */
  function watch(bar: HTMLElement) {
    const steps = bar.firstElementChild as HTMLElement, toolbox = bar.lastElementChild as HTMLElement;
    let own = steps.offsetWidth;
    const check = () => {
      if (!wrapped) own = steps.offsetWidth;
      wrapped = bar.clientWidth < own + GAP + toolbox.offsetWidth;
    };
    // Untracked, so that the attachment does not run again when `wrapped` changes. A hidden bar has no width: the
    // observer decides once it shows.
    if (own) untrack(check);
    const observer = new ResizeObserver(check);
    observer.observe(bar);
    observer.observe(toolbox);
    return () => observer.disconnect();
  }
</script>

<div class={["step-dock", place]} {@attach dock}>
  {@render above?.()}
  <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5" {@attach watch}>
    <div class={["flex gap-1", wrapped && "basis-full"]}>
      {#each [["first", "First", onfirst, atStart], ["back", "Back", onback, atStart], ["forward", "Forward", onforward, atEnd],
              ["last", "Last", onlast, atEnd]] as const as [icon, name, act, off] (icon)}
        <button class={["btn-icon", wrapped && "flex-1"]} onclick={act} aria-label={name} title={name} disabled={off}><Icon name={icon} /></button>
      {/each}
    </div>
    <div class="flex items-center gap-1 ml-auto">{@render tools?.()}</div>
  </div>
</div>
