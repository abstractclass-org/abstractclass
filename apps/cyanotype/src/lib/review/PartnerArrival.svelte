<script lang="ts">
  // A review that a partner site kept, sent back (`#from=<origin>`, with the partner's `save=`: design 33, "Partner
  // sites", item 7, on Hedge School's design 18). The partner's page opened this one with window.open. The review page
  // and the import page show this once the address has lost its `#` part and the analytics have started, as Hedge
  // School's arrival step (Arrival.svelte) takes `from=` on both. The shared step (game/partners.ts, receiveKeptReview)
  // finds the partner by the page's origin, posts `cyanotype:ready` to it, and takes the review file from that page
  // only. The file loads as one that the Review tab loads (game/reviewFile.ts), and the game keeps the link's save page
  // when it is the partner's. Then the review opens at once: with the file's results it searches nothing, and a review
  // by an earlier engine opens as its snapshot. The load and a failure count as Hedge School's do (its design 17).
  import { onMount } from "svelte";
  import { loadManifest } from "@abstractclass/engine/client.ts";
  import { errorSentence } from "@abstractclass/engine/errors.ts";
  import { openReview } from "@abstractclass/import/openReview.ts";
  import { receiveKeptReview } from "#lib/game/partners.ts";
  import { parseRecord } from "#lib/game/record.ts";
  import { loadReviewFile } from "#lib/game/reviewFile.ts";
  import { setGamePartner } from "#lib/game/store.ts";
  import { trackLoad, trackLoadFailed } from "#lib/game/sources.ts";
  import { SITE_NAME } from "#lib/site.ts";

  let { from, save }: { from: string; save: string | null } = $props();

  let phase = $state.raw<{ at: "reading" } | { at: "receiving"; sender: string } | { at: "failed"; message: string }>(
    { at: "reading" });

  onMount(async () => {
    try {
      const { id, file } = await receiveKeptReview(from, save, {
        waiting: sender => { phase = { at: "receiving", sender }; },
        load: async text => loadReviewFile(text, await loadManifest()),
        keep: setGamePartner,
      });
      trackLoad("partner_review", parseRecord(file.record).moves.length, { with_results: file.analyses.length > 0 });
      openReview(id);
    } catch (e) {
      phase = { at: "failed", message: `${SITE_NAME} could not load the review: ${errorSentence(e)}` };
      trackLoadFailed("partner_review", "rejected");
    }
  });
</script>

<!-- The lines go in the page's message box (the review's or the import page's), which is a grid. -->
{#if phase.at === "reading"}
  <p class="text-muted">Reading the link…</p>
{:else if phase.at === "receiving"}
  <p class="text-muted">Waiting for {phase.sender} to send the review…</p>
{:else}
  <p class="text-blunder" role="alert">{phase.message}</p>
  <p>You can paste a game record in the <a href="/review" data-sveltekit-reload>Review tab</a>, or bring games from
    strategyjam.org with the <a href="/tools">tools</a>.</p>
{/if}
