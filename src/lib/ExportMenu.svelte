<script lang="ts">
  // The Export menu (design 13), the same on the review page and beside each game on the home page: the review file,
  // with the engine's results, or the annotated record, copied or as a file. A short note beside it says what it did,
  // or why it failed. It opens only once the game's review is done (`ready`): before, `why` says what to do.
  import { DropdownMenu } from "bits-ui";
  import { errorText } from "#lib/errors.ts";
  import type { ExportKind } from "#lib/game/reviewFile.ts";
  let { run, side = "top", small = false, ready = true, why = "" }:
    { run: (kind: ExportKind) => Promise<void>; side?: "top" | "bottom"; small?: boolean; ready?: boolean; why?: string } = $props();

  const ITEMS: [ExportKind, string, string][] = [
    ["file", "Review file, to import elsewhere", "Review file saved"],
    ["copy", "Copy the annotated record", "Annotated record copied"],
    ["text", "Annotated record as a file", "Annotated record saved"],
  ];
  const ITEM = "px-2.5 py-1.5 rounded cursor-pointer outline-none data-highlighted:bg-panel";
  let note = $state(""), busy = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function choose(kind: ExportKind, done: string) {
    busy = true;
    note = "";
    try {
      await run(kind);
      note = done;
    } catch (e) {
      note = `Export failed: ${errorText(e)}`;
    } finally {
      busy = false;
    }
    clearTimeout(timer);
    timer = setTimeout(() => (note = ""), 4000);
  }
</script>

<span class="flex items-center gap-1.5" title={ready ? undefined : why}>
  {#if !ready && why}<span class="sr-only">{why}</span>{/if}
  {#if busy}<span class="text-xs text-muted" role="status">Exporting…</span>{:else if note}<span class="text-xs text-muted" role="status">{note}</span>{/if}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger disabled={busy || !ready}
                          class={["data-[state=open]:border-accent data-[state=open]:text-accent", small ? "px-2 py-0 text-xs" : "text-sm"]}>Export</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content {side} align="end" sideOffset={4}
                            class="z-10 min-w-56 p-1 bg-panel-2 border border-muted/50 rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.4)] text-sm">
        {#each ITEMS as [kind, label, done] (kind)}
          <DropdownMenu.Item class={ITEM} onSelect={() => choose(kind, done)}>{label}</DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
</span>
