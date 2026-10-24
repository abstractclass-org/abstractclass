<script lang="ts">
  // The Export menu (design 13), the same on the review page and beside each game on the home page: a link that shares
  // the review, the review file, with the engine's results, or the annotated record, copied or as a file. A note says
  // what it did, or why it failed, in a box at the foot of the window (a toast, as Gmail's "Link copied"): beside the
  // button, in a game's row or the review's bar, it had no room for the link's length or a warning. It opens only once
  // the game's review is done (`ready`): before, `why` says what to do. In the step bar its button is an icon (`icon`),
  // as New's beside it, so that the bar's tools fit beside the steps on a phone (design 06, item 4). In a game's row it
  // keeps its word.
  import { DropdownMenu } from "bits-ui";
  import Icon from "#lib/ui/Icon.svelte";
  import Toast from "#lib/ui/Toast.svelte";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { reviewExports, type ExportItem, type ExportKind, type ExportResult } from "#lib/game/reviewFile.ts";
  import { track } from "#lib/analytics.svelte.ts";
  import { DISCORD_LIMIT } from "#lib/game/share.ts";
  import { LINK_RANGES, range } from "#lib/measure.ts";
  // The entries: the review's (reviewFile.ts, reviewExports), or another page's (the Analysis board's, design 21).
  let { run, side = "top", small = false, icon = false, ready = true, why = "", items = reviewExports() }:
    { run: (kind: ExportKind) => Promise<ExportResult | void>; side?: "top" | "bottom"; small?: boolean; icon?: boolean; ready?: boolean;
      why?: string; items?: ExportItem[] } = $props();
  let note = $state(""), failed = $state(false), busy = $state(false);

  async function choose(kind: ExportKind, done: string) {
    busy = true;
    note = "";
    failed = false;
    try {
      const r = await run(kind);
      note = r?.note || done;
      // Each export by its kind, and a link by its length (design 17).
      track("export", r?.linkLength ? { export_kind: kind, link_length: range(r.linkLength, LINK_RANGES), link_too_long: r.linkLength > DISCORD_LIMIT }
                                    : { export_kind: kind });
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
                                  icon ? "btn-icon" : small ? "px-2 py-0 text-xs" : "text-sm"]}>
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
