<script lang="ts">
  // The Export menu (Hedge School's designs 13 and 21), the same on the review page, on the Analysis board, and beside
  // each game on Hedge School's home page: each page gives its entries (exports.ts). A note says what it did, or why it
  // failed, in a box at the foot of the window (a toast, as Gmail's "Link copied"): beside the button, in a game's row
  // or the review's bar, it had no room for the link's length or a warning. It opens only once the game's review is
  // done (`ready`): before, `why` says what to do. In the step bar its button is an icon (`icon`), as New's beside it,
  // so that the bar's tools fit beside the steps on a phone (Hedge School's design 06, item 4). In a game's row it keeps
  // its word. `ontrack` takes each export done, for a site's analytics.
  import { DropdownMenu } from "bits-ui";
  import Icon from "@abstractclass/site/Icon.svelte";
  import Toast from "@abstractclass/site/Toast.svelte";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import type { ExportItem, ExportKind, ExportResult } from "./exports.ts";
  let { run, items, side = "top", icon = false, ready = true, why = "", ontrack }:
    { run: (kind: ExportKind) => Promise<ExportResult | void>; items: ExportItem[]; side?: "top" | "bottom"; icon?: boolean;
      ready?: boolean; why?: string; ontrack?: (kind: ExportKind, result: ExportResult | void) => void } = $props();
  let note = $state(""), failed = $state(false), busy = $state(false);

  async function choose(kind: ExportKind, done: string) {
    busy = true;
    note = "";
    failed = false;
    try {
      const r = await run(kind);
      note = r?.note || done;
      ontrack?.(kind, r);
    } catch (e) {
      note = `Export failed: ${errorText(e)}`;
      failed = true;
    } finally {
      busy = false;
    }
  }
</script>

<span class="flex items-center gap-1.5" title={ready ? undefined : why}>
  {#if !ready && why}<span class="sr-only">{why}</span>{/if}
  <DropdownMenu.Root>
    <!-- The icon's tooltip names the button while it opens: before, the box's title says why it does not. -->
    <DropdownMenu.Trigger disabled={busy || !ready} aria-label={icon ? "Export" : undefined} title={icon && ready ? "Export" : undefined}
                          class={["data-[state=open]:border-accent data-[state=open]:text-accent",
                                  icon ? "btn-icon" : "px-2 py-0 text-xs"]}>
      {#if icon}<Icon name="export" />{:else}Export{/if}
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content {side} align="end" sideOffset={4}
                            class="z-10 min-w-72 max-w-[90vw] menu-box">
        {#each items as [kind, label, hint, done] (kind)}
          <DropdownMenu.Item class="menu-item" onSelect={() => choose(kind, done)}>
            {label}{#if hint}<span class="block text-xs text-muted">{hint}</span>{/if}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
</span>
{#if busy || note}
  <Toast text={busy ? "Exporting…" : note} {failed} onclose={busy ? undefined : () => (note = "")} />
{/if}
