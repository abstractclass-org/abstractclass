<script lang="ts">
  // The bar under the moves, on the review, the Analysis board and Practice (design 06): the four steps through the
  // positions on the left, and the page's tools on the right. When the column is too narrow for one row, the tools go
  // under the steps as a group, and the steps then span the bar's width, as Lichess's do. The bar measures whether the
  // tools fit beside the steps at their own width, and so it does not stay wrapped once the steps are wide.
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";

  interface Props {
    onfirst: () => void;
    onback: () => void;
    onforward: () => void;
    onlast: () => void;
    atStart?: boolean; // the first position shows: First and Back are off
    atEnd?: boolean; // the last position shows: Forward and Last are off
    tools?: Snippet;
  }
  let { onfirst, onback, onforward, onlast, atStart = false, atEnd = false, tools }: Props = $props();

  const GAP = 8; // gap-x-2, between the steps and the tools
  let wrapped = $state(false);

  /** Watches the bar and its tools. The steps' own width is measured while they are not stretched (the first layout),
   *  and the tools' whenever they change (a tool that comes or goes). */
  function watch(bar: HTMLElement) {
    const steps = bar.firstElementChild as HTMLElement, toolbox = bar.lastElementChild as HTMLElement;
    let own = steps.offsetWidth;
    const check = () => {
      if (!wrapped) own = steps.offsetWidth;
      wrapped = bar.clientWidth < own + GAP + toolbox.offsetWidth;
    };
    const observer = new ResizeObserver(check);
    observer.observe(bar);
    observer.observe(toolbox);
    return () => observer.disconnect();
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5" {@attach watch}>
  <div class={["flex gap-1", wrapped && "basis-full"]}>
    {#each [["first", "First", onfirst, atStart], ["back", "Back", onback, atStart], ["forward", "Forward", onforward, atEnd],
            ["last", "Last", onlast, atEnd]] as const as [icon, name, act, off] (icon)}
      <button class={["btn-icon", wrapped && "flex-1"]} onclick={act} aria-label={name} title={name} disabled={off}><Icon name={icon} /></button>
    {/each}
  </div>
  <div class="flex items-center gap-1 ml-auto">{@render tools?.()}</div>
</div>
