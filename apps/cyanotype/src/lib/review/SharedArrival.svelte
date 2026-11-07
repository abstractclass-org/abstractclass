<script lang="ts">
  // A review shared by link (`/review#packed=…`, Hedge School's design 13, item 8; design 33): the review page shows
  // this before anything runs. It says what the link holds, and that this browser reviews the game again. Its
  // review uses the recipient's engine settings: Cyanotype keeps no network and depth for one game yet (a game's own
  // settings, abscls-8tl1.38), so the page says when they differ from the sender's. "Review it" checks the game by the
  // engine's rules, as the import page checks a game and as Hedge School's import checks a shared review's, then keeps
  // the game and the sender's variations (beside the recipient's own for that game), and opens its review. A game that
  // the rules refuse leaves the game in review as it was.
  import { onMount } from "svelte";
  import { loadManifest, sameSearch } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { loadEngine, networkName, reviewDepthText, reviewVisits } from "#lib/analysis/engineSettings.ts";
  import { parseRecord, playerNames } from "#lib/game/record.ts";
  import { decodeShare, sharedRecord, type SharedReview } from "#lib/game/share.ts";
  import { keepShared } from "./keptGame.ts";
  import { checkRecord } from "./recordCheck.ts";
  import { SITE_NAME } from "#lib/site.ts";

  let { packed, class: box }: { packed: string; class: string } = $props();

  // The link's review, and what this site makes of it: the sender's network here (null when the site does not ship
  // it), whether the site's engine is the sender's, and the recipient's own network and depth.
  type Here = { network: string | null; sameEngine: boolean; own: { network: string; visits: number } };
  let phase = $state.raw<{ at: "reading" } | { at: "share"; shared: SharedReview; here: Here } | { at: "keeping" }
    | { at: "failed"; problem: string }>({ at: "reading" });

  onMount(async () => {
    try {
      const shared = decodeShare(packed), manifest = await loadManifest();
      const network = manifest?.artifacts.find(a => a.kind === "model" && a.sha256.startsWith(shared.model))?.id ?? null;
      const engine = loadEngine();
      phase = { at: "share", shared, here: { network, sameEngine: !!manifest && sameSearch(manifest, shared.module),
                                             own: { network: engine.network, visits: reviewVisits(engine) } } };
    } catch (e) {
      phase = { at: "failed", problem: errorText(e) };
    }
  });

  /** Checks the shared game by the engine's rules, keeps it and its variations, and opens its review. */
  async function review(shared: SharedReview) {
    phase = { at: "keeping" };
    try {
      const problem = await checkRecord(parseRecord(sharedRecord(shared)));
      if (problem) throw new Error(problem);
      await keepShared(shared);
      location.replace("/review");
    } catch (e) {
      phase = { at: "failed", problem: errorText(e) };
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
    {@const names = playerNames(shared.tags)}
    {@const same = here.network === here.own.network && shared.visits === here.own.visits}
    <!-- Text that explains: the sentence rules of Simplified Technical English. The button: strict. -->
    <h1 class="text-2xl font-bold">A shared review</h1>
    <p><strong>{names.blue} against {names.red}</strong>, {shared.moves.length} {shared.moves.length === 1 ? "move" : "moves"}{shared.branches.length
      ? `, with ${shared.branches.length} ${shared.branches.length === 1 ? "move" : "moves"} in the sender's variations` : ""}.</p>
    <p>The link carries the game, not the engine's work. <strong>Your browser reviews the game again</strong>, as it does
      a game that you import. The review shows each result when the engine finds it. With the sender's engine, network
      and depth, your review is the same as the sender's: the same quality labels, lines and accuracy.</p>
    <p>The sender's review: {here.network ? networkName(here.network) : "a network that this site no longer has"}, at
      {reviewDepthText(shared.visits)}. Your review uses your engine settings: {networkName(here.own.network)}, at
      {reviewDepthText(here.own.visits)}.
      {#if !here.sameEngine}This site's engine changed after the sender made the link.{/if}
      {#if !same || !here.sameEngine}So some quality labels can differ.{/if}</p>
    <div><button class="btn-primary" type="button" onclick={() => review(shared)}>Review it</button></div>
  {:else}
    <p class="text-blunder" role="alert">{SITE_NAME} could not load the review: {phase.problem}</p>
    <p>To review a game from strategyjam.org, use the <a href="/tools">tools</a>.</p>
  {/if}
</main>
