<script lang="ts" module>
  import type { ExportItem, ExportKind, ExportResult } from "./exports.ts";
  /** A game of the list: its id, its name, the address that opens it, a line on it (its moves, its result, when it came)
   *  and its Export menu (ExportMenu.svelte), which opens once its review is done (`ready`), else says why. */
  export interface GameRow {
    id: string; title: string; href: string; detail: string;
    exports: { run: (kind: ExportKind) => Promise<ExportResult | void>; items: ExportItem[]; ready: boolean; why: string;
               ontrack?: (kind: ExportKind, result: ExportResult | void) => void };
  }
</script>

<script lang="ts">
  // The player's games in the Review tab (Hedge School's designs 11 and 22), kept in this browser
  // (@abstractclass/analysis/games.ts): each game with its link, its Export and its Delete, and a line on what the
  // browser answered to the request to keep them (@abstractclass/storage/persist.ts). Each site's Review tab gives its
  // games' rows. A Delete asks first (ConfirmDialog). A confirmed delete calls `ondelete`, which deletes the game and
  // takes its row out at once: the dialog takes a double click's second click, so no other row moves under it.
  // `ondecide` takes each answer, for a site's analytics: a "no" is a delete that the question stopped, and an
  // "undecided", the second click of a double click, is no decision.
  import ExportMenu from "./ExportMenu.svelte";
  import ConfirmDialog, { type Answer } from "@abstractclass/site/ConfirmDialog.svelte";

  let { games, kept, site, ondelete, ondecide }:
    { games: GameRow[]; kept: boolean; site: string; ondelete: (id: string) => Promise<void>;
      ondecide?: (answer: Answer) => void } = $props();

  // The game whose Delete was clicked, while its question shows.
  let deleting = $state<{ id: string; name: string } | null>(null);
  async function answerDelete(answer: Answer) {
    const id = deleting?.id;
    deleting = null;
    if (!id) return;
    ondecide?.(answer);
    if (answer === "yes") await ondelete(id);
  }
</script>

{#if games.length}
  <section class="bg-panel border border-line rounded-lg px-5 py-5">
    <h2 class="mb-2 text-lg font-bold">Your games</h2>
    <ul class="grid gap-1.25 mb-1.5">
      {#each games as game (game.id)}
        <!-- A game's link leaves its click to the browser, not to the router (data-sveltekit-reload): a change of the
             `#` alone, which the review page answers with its review of that game (its hashchange). -->
        <li class="flex flex-wrap items-baseline gap-2.5">
          <a href={game.href} data-sveltekit-reload>{game.title}</a>
          <span class="text-sm text-muted">{game.detail}</span>
          <span class="ml-auto flex items-center gap-1.5"><ExportMenu side="bottom" {...game.exports} />
            <button type="button" class="px-2 py-0 text-xs" aria-label="Delete {game.title}"
                    onclick={() => (deleting = { id: game.id, name: game.title })}>Delete</button></span>
        </li>
      {/each}
    </ul>
    <p class="text-sm text-muted">
      {#if kept}Kept in this browser until you delete them.
      {:else}Kept in this browser only, which may clear them when its disk is almost full, or Safari after seven days
        without a visit. Export the games you want to keep.{/if}
    </p>
  </section>
{/if}
<!-- Text that a player follows: strict Simplified Technical English. -->
<ConfirmDialog open={!!deleting} title="Delete this game?" action="Delete" onanswer={answerDelete}>
  {site} will delete the game <strong>{deleting?.name}</strong> from this browser. You cannot undo this action.
</ConfirmDialog>
