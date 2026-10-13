<script lang="ts">
  // The Export menu (design 13), the same on the review page and beside each game on the home page: a link that shares
  // the review, the review file, with the engine's results, or the annotated record, copied or as a file. A note says
  // what it did, or why it failed, in a box at the foot of the window (a toast, as Gmail's "Link copied"): beside the
  // button, in a game's row or the review's bar, it had no room for the link's length or a warning. It opens only once
  // the game's review is done (`ready`): before, `why` says what to do.
  import { DropdownMenu } from "bits-ui";
  import { errorText } from "#lib/errors.ts";
  import type { ExportKind, ExportResult } from "#lib/game/reviewFile.ts";
  import { track } from "#lib/analytics.svelte.ts";
  import { DISCORD_LIMIT } from "#lib/game/share.ts";
  import { LINK_RANGES, range } from "#lib/measure.ts";
  let { run, side = "top", small = false, ready = true, why = "", partner = null, items }:
    { run: (kind: ExportKind) => Promise<ExportResult | void>; side?: "top" | "bottom"; small?: boolean; ready?: boolean; why?: string;
      partner?: string | null; items?: [ExportKind, string, string, string][] } = $props();

  // Each kind: its entry, a line on what the other end gets (the link and the file differ most there: the link holds
  // no results, design 13), and the note after it.
  // A game that came from a partner site by its link (design 18) can go back to it: the review file, to the player's
  // account there, first in the menu.
  // `items` replaces them for another page's export (the Analysis board's, design 21).
  const ITEMS = $derived<[ExportKind, string, string, string][]>(items ?? [
    ...(partner ? [["partner_save", `Save to ${partner}`, `The review file, to your account there.`, `Saved to ${partner}`] as [ExportKind, string, string, string]] : []),
    ["share_link", "Copy a link to share the review", "Short. The recipient's browser reviews the game again.", "Link copied"],
    ["review_file", "Review file, to import elsewhere", "With the engine's results: the review opens at once.", "Review file saved"],
    ["record_copy", "Copy the annotated record", "", "Annotated record copied"],
    ["record_file", "Annotated record as a file", "", "Annotated record saved"],
  ]);
  const ITEM = "px-2.5 py-1.5 rounded cursor-pointer outline-none data-highlighted:bg-panel";
  let note = $state(""), failed = $state(false), busy = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function choose(kind: ExportKind, done: string) {
    busy = true;
    note = "";
    failed = false;
    clearTimeout(timer);
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
    timer = setTimeout(() => (note = ""), note.length > 40 ? 10000 : 4000); // a longer note takes longer to read
  }
</script>

<span class="flex items-center gap-1.5" title={ready ? undefined : why}>
  {#if !ready && why}<span class="sr-only">{why}</span>{/if}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger disabled={busy || !ready}
                          class={["data-[state=open]:border-accent data-[state=open]:text-accent", small ? "px-2 py-0 text-xs" : "text-sm"]}>Export</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content {side} align="end" sideOffset={4}
                            class="z-10 min-w-72 max-w-[90vw] p-1 bg-panel-2 border border-muted/50 rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.4)] text-sm">
        {#each ITEMS as [kind, label, hint, done] (kind)}
          <DropdownMenu.Item class={ITEM} onSelect={() => choose(kind, done)}>
            {label}{#if hint}<span class="block text-xs text-muted">{hint}</span>{/if}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
</span>
{#if busy || note}
  <div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 w-max max-w-[min(32rem,calc(100vw-2rem))]
              px-4 py-2.5 bg-panel-2 border border-muted/50 rounded-lg shadow-[0_6px_20px_rgb(0_0_0/0.4)] text-sm"
       role="status" aria-live="polite">
    <p class={failed ? "text-blunder" : "text-ink"}>{busy ? "Exporting…" : note}</p>
    {#if !busy}<button type="button" class="-mr-1 px-1.5 py-0 text-muted bg-transparent border-0" aria-label="Close"
                       onclick={() => { clearTimeout(timer); note = ""; }}>×</button>{/if}
  </div>
{/if}
