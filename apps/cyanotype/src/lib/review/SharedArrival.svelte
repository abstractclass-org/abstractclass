<script lang="ts">
  // A review shared by link (`/review#packed=…`, Hedge School's design 13, item 8; design 33): the review page shows
  // this before anything runs. Its intro (@abstractclass/review/SharedIntro.svelte, Hedge School's too) says what the
  // link holds, and that this browser reviews the game again. "Review it" keeps the game in the player's games
  // (game/import.ts), as Hedge School's shared review does: the engine's rules check it, as the import page checks a
  // game, then the list keeps the game, the sender's variations (beside the recipient's own for that game) and the
  // sender's network and depth for its review, when this site ships that network (a game's own settings, Hedge
  // School's design 09). Other games review as before. A game that the rules refuse is not kept: the page says why.
  // The link's open, its load and a failure count as Hedge School's do (its design 17): the review page has started
  // the analytics, after the link left the address.
  import { onMount } from "svelte";
  import { loadManifest, sameSearch } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { openReview } from "@abstractclass/import/openReview.ts";
  import { networkName, reviewDepthText } from "#lib/analysis/engineSettings.ts";
  import { playerNames } from "#lib/game/record.ts";
  import { decodeShare, type SharedReview } from "#lib/game/share.ts";
  import { importShare } from "#lib/game/import.ts";
  import { SITE_NAME } from "#lib/site.ts";
  import { track } from "#lib/analytics.svelte.ts";
  import { trackLoad, trackLoadFailed } from "#lib/game/sources.ts";
  import SharedIntro from "@abstractclass/review/SharedIntro.svelte";
  import { WORDS } from "./blueprints.ts";

  let { packed, class: box }: { packed: string; class: string } = $props();

  // The link's review, and what this site makes of it: the sender's network here (null when the site does not ship
  // it), and whether the site's engine is the sender's. A failure says what went wrong, in a whole sentence: the
  // import's own (game/import.ts), or why the link does not read.
  type Here = { network: string | null; sameEngine: boolean };
  let phase = $state.raw<{ at: "reading" } | { at: "share"; shared: SharedReview; here: Here } | { at: "keeping" }
    | { at: "failed"; message: string }>({ at: "reading" });

  onMount(async () => {
    try {
      const shared = decodeShare(packed), manifest = await loadManifest();
      const network = manifest?.artifacts.find(a => a.kind === "model" && a.sha256.startsWith(shared.model))?.id ?? null;
      const here = { network, sameEngine: !!manifest && sameSearch(manifest, shared.module) };
      phase = { at: "share", shared, here };
      track("review_share_open", { network_found: !!network, same_engine: here.sameEngine });
    } catch (e) {
      phase = { at: "failed", message: `${SITE_NAME} could not load the review: ${errorText(e)}` };
      trackLoadFailed("review_share_link", "link");
    }
  });

  /** Keeps the shared game, its variations and the sender's network and depth for it, and opens its review
   *  (openReview). */
  async function review(shared: SharedReview, here: Here) {
    phase = { at: "keeping" };
    try {
      const id = await importShare(shared, here.network);
      trackLoad("review_share_link", shared.moves.length, { with_branches: shared.branches.length > 0 });
      openReview(id);
    } catch (e) {
      phase = { at: "failed", message: errorText(e) };
      trackLoadFailed("review_share_link", "rejected");
    }
  }
</script>

<main class={["grid gap-4", box]}>
  {#if phase.at === "reading"}
    <p class="text-muted">Reading the link…</p>
  {:else if phase.at === "keeping"}
    <p class="text-muted">Loading the review…</p>
  {:else if phase.at === "share"}
    {@const { shared, here } = phase}
    <SharedIntro players={playerNames(shared.tags)} moves={shared.moves.length} branches={shared.branches.length}
                 words={WORDS} network={here.network ? networkName(here.network) : null}
                 depth={reviewDepthText(shared.visits)} sameEngine={here.sameEngine}
                 onreview={() => review(shared, here)} />
  {:else}
    <p class="text-blunder" role="alert">{phase.message}</p>
    <p>You can paste a game record in the <a href="/review" data-sveltekit-reload>Review tab</a>, or bring games from
      strategyjam.org with the <a href="/tools">tools</a>.</p>
  {/if}
</main>
