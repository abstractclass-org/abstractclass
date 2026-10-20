<script lang="ts">
  // The arrival step, when the address holds a game after its `#` (importHash.ts, design 22): on the import page, every
  // game that comes in from outside, and on the review, its own ways in (reviewArrives).
  // - a record from the bookmarklet or the userscript on meaf.us or strategyjam.org (bookmarklet.ts, userscript.ts), on
  //   the import page, or on the review for a tool from before the import page: the player chooses to review it or to
  //   analyze it on the board (design 21). A review keeps it in this browser first. The board keeps no game in the
  //   list: the record goes to the board's address, at the position that the game's page showed (analysisAddress). For
  //   an out-of-date tool, the page also says how to update it;
  // - a record from another site's link (`record=`, design 18), on the import page: checked with the engine's rules,
  //   given its cut marks, kept in this browser, and reviewed, with the partner's save page when the link names one;
  // - a shared review (`packed=`, share.ts): what it holds, and that this browser reviews it again, then kept on a
  //   click, with the sender's network and depth;
  // - a partner's page that kept a review (`from=`): it sends the review file once this page asks.
  // The game leaves the address at once, then the analytics start. Once the game is kept, the review opens it.
  import { onMount } from "svelte";
  import { parseRecord, playerNames, type GameRecord } from "#lib/game/record.ts";
  import { importRecord } from "#lib/game/import.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { BOOKMARK_VERSION } from "#lib/game/bookmarklet.ts";
  import { analysisAddress, hashParams, readImportHash, staleTool, toolSource, type ImportHash,
           type Tool } from "#lib/game/importHash.ts";
  import { gamePartner, partnerOf, receiveFromPartner } from "#lib/game/partners.ts";
  import { setGamePartner } from "#lib/game/store.ts";
  import { decodeShare, type SharedReview } from "#lib/game/share.ts";
  import { importShare, loadReviewFile } from "#lib/game/reviewFile.ts";
  import { loadManifest, sameSearch } from "@abstractclass/engine/client.ts";
  import { networkName, reviewDepthText } from "#lib/analysis/engineSettings.ts";
  import { startAnalytics, track } from "#lib/analytics.svelte.ts";
  import { trackImport, trackImportFailed, trackLoad, trackLoadFailed, type ImportFailure,
           type ImportSource } from "#lib/game/importEvents.ts";

  const MESSAGE = "box-content max-w-184 mx-auto my-6 px-4 grid gap-4";

  // What the page does, and what each step shows.
  type Phase = { at: "importing" } | { at: "loading" }
    | { at: "receiving"; sender: string } // the partner whose page sends a review that it kept
    // A shared review, and what this site makes of it: its network here (null when the site no longer has it), and
    // whether the site's engine is the sender's.
    | { at: "share"; shared: SharedReview; here: SharedHere }
    // A tool's game: the review or the board, and the tool when it is out of date.
    | { at: "choose"; sent: ImportHash; record: GameRecord; source: ImportSource; stale: Tool | "older" | null }
    // `load`: the way in was a load (design 22), a shared review or a review that a partner kept, not an import.
    | { at: "failed"; load: boolean; problem: string };
  type SharedHere = { network: string | null; sameEngine: boolean };
  let phase = $state.raw<Phase>({ at: "importing" });

  onMount(() => {
    const hash = location.hash.slice(1);
    history.replaceState(null, "", location.pathname); // the game is kept below, not in the address
    startAnalytics(); // after the game has left the address (design 22)
    void arrive(hash);
  });

  /** Opens the review of a game now kept in this browser: the review's address, loaded, in place of this one. */
  function review(id: string) {
    history.replaceState(null, "", `/review#game=${id}`);
    location.reload();
  }

  async function arrive(hash: string) {
    const packed = hashParams(hash)?.get("packed");
    if (packed) { await readShared(packed); return; }
    // A failure by the step that fails (design 17): the address, then the record, then the rules or the storage.
    let source: ImportSource = "older_tool", failure: ImportFailure = "link";
    try {
      const sent = readImportHash(hash), text = sent.record;
      if (!sent.from) source = sent.link ? "site_link" : sent.tool ? toolSource(sent.tool, sent.site) : source;
      if (sent.from) { await receiveReview(sent.from, sent.save); return; }
      if (sent.link && !text) throw new Error("the link has no record=, which carries the game");
      failure = "record";
      const record = parseRecord(text);
      failure = "rejected";
      // Another site's link goes straight to the review (design 18). A tool's game, also an older tool's bare record,
      // asks first (design 21).
      if (sent.link) { await reviewImport(sent, record, source); return; }
      // An out-of-date tool by its kind (design 17), as the page asks to update it.
      const stale = staleTool(sent, { bookmarklet: String(BOOKMARK_VERSION), userscript: __USERSCRIPT_CODE__ });
      if (stale) track("tool_out_of_date", { stale_tool: stale });
      phase = { at: "choose", sent, record, source, stale };
    } catch (e) {
      importFailed(source, e, failure);
    }
  }

  /** Keeps an imported game, with its partner's save page when a link names one, and reviews it. The import counts by
   *  its source and the game's length (design 17). */
  async function reviewImport(sent: ImportHash, record: GameRecord, source: ImportSource) {
    const id = await importRecord(sent.record, record);
    const partner = gamePartner(sent.save);
    if (partner) await setGamePartner(id, partner);
    trackImport("review", source, record.moves.length);
    review(id);
  }

  /** An import that failed: the page says why, and the event names its source and why (design 17). */
  function importFailed(source: ImportSource, e: unknown, failure: ImportFailure = "rejected") {
    phase = { at: "failed", load: false, problem: errorText(e) };
    trackImportFailed("review", source, failure);
  }

  /** A tool's game, reviewed: kept first, as a link's is. */
  function reviewChosen(sent: ImportHash, record: GameRecord, source: ImportSource) {
    phase = { at: "importing" };
    reviewImport(sent, record, source).catch(e => importFailed(source, e));
  }

  /** A tool's game, on the Analysis board, by the board's own address: the board checks the record, asks before it
   *  replaces the player's board, and counts the import (design 21). Back then leads to the page before this one. */
  function analyzeChosen(sent: ImportHash, record: GameRecord, source: ImportSource) {
    location.replace(analysisAddress(sent, record.moves.length, source));
  }

  async function readShared(text: string) {
    try {
      const s = decodeShare(text), manifest = await loadManifest();
      // Any network the site ships, also one off the menus (engineSettings.ts, shipsNetwork).
      const network = manifest?.artifacts.find(a => a.kind === "model" && a.sha256.startsWith(s.model))?.id ?? null;
      const here = { network, sameEngine: !!manifest && sameSearch(manifest, s.module) };
      phase = { at: "share", shared: s, here };
      track("review_share_open", { network_found: !!network, same_engine: here.sameEngine });
    } catch (e) {
      phase = { at: "failed", load: true, problem: errorText(e) };
      trackLoadFailed("review_share_link", "link");
    }
  }

  /** Keeps the shared game, its branches and the sender's network and depth for it, and opens the review. */
  async function reviewShared(shared: SharedReview, here: SharedHere) {
    phase = { at: "loading" };
    try {
      const id = await importShare(shared, here.network);
      trackLoad("review_share_link", shared.moves.length, { with_branches: shared.branches.length > 0 });
      review(id);
    } catch (e) {
      phase = { at: "failed", load: true, problem: errorText(e) };
      trackLoadFailed("review_share_link", "rejected");
    }
  }

  /** A review that a partner site kept (design 18): its page opened this one, and sends the review file when this page
   *  asks. The file loads as in the Review tab, and the review opens at once. */
  async function receiveReview(from: string, save: string | null) {
    const partner = partnerOf(from);
    try {
      if (!partner) throw new Error("the link names a site that is not one of Hedge School's partners");
      phase = { at: "receiving", sender: partner.name };
      const sent = await receiveFromPartner(partner, from);
      const { id, file } = await loadReviewFile(typeof sent === "string" ? sent : JSON.stringify(sent), await loadManifest());
      const kept = gamePartner(save);
      if (kept) await setGamePartner(id, kept);
      trackLoad("partner_review", parseRecord(file.record).moves.length, { with_results: file.analyses.length > 0 });
      review(id);
    } catch (e) {
      phase = { at: "failed", load: true, problem: errorText(e) };
      trackLoadFailed("partner_review", "rejected");
    }
  }
</script>

<main class={MESSAGE}>
  {#if phase.at === "importing"}
    <p class="text-muted">Importing the game…</p>
  {:else if phase.at === "loading"}
    <p class="text-muted">Loading the review…</p>
  {:else if phase.at === "receiving"}
    <p class="text-muted">Waiting for {phase.sender} to send the review…</p>
  {:else if phase.at === "share"}
    {@const { shared, here } = phase}
    {@const names = playerNames(shared.tags)}
    <h1 class="text-2xl font-bold">A shared review</h1>
    <p><strong>{names.blue} against {names.red}</strong>, {shared.moves.length} edges{shared.branches.length
      ? `, with ${shared.branches.length} ${shared.branches.length === 1 ? "move" : "moves"} in the sender's branches` : ""}.</p>
    <p>The link carries the game, not the engine's work. <strong>Your browser reviews the game again</strong>, as it does
      a game you import. The review shows each result as the engine finds it. With the sender's engine, network and
      depth, your review is the same as the sender's: the same labels, lines and accuracy. A GPU computes the network a
      little differently, so on a GPU a close call can rarely give another result.</p>
    <p>The sender's review: {here.network ? networkName(here.network) : "a network this site no longer has"}, at
      {reviewDepthText(shared.visits)}.
      {#if !here.network}The review uses your network, so its labels can differ.
      {:else}The game keeps them for its review. Other games review as before.{/if}
      {#if !here.sameEngine}This site's engine changed after the sender made the link, so some labels can differ.{/if}</p>
    <div><button class="btn-primary" type="button" onclick={() => reviewShared(shared, here)}>Review it</button></div>
  {:else if phase.at === "choose"}
    {@const { sent, record, source, stale } = phase}
    {@const names = playerNames(record.tags)}
    {@const site = sent.site === "strategyjam.org" ? "strategyjam.org" : "meaf.us"}
    <!-- `site`: one of the two sites, as the import's source names them (toolSource), never the link's own text. -->
    {#if stale}
      <p class="px-4 py-3 bg-panel border border-accent rounded-lg" role="status">
        {#if stale === "bookmarklet"}Your bookmarklet is an older one. On the <a href="/tools">tools page</a>, drag the
          button to the bookmarks bar again, in place of the old one.
        {:else if stale === "userscript"}Your userscript is older than this site's. Tampermonkey updates it when it next
          checks. To update it now, open the Hedge School userscript on the <a href="/tools">tools page</a>.
          Tampermonkey then offers the update.
        {:else}This game came from a bookmarklet or a userscript made before they could tell this site their version. On
          the <a href="/tools">tools page</a>, drag the bookmarklet to the bookmarks bar again, in place of the old one.
          The new bookmarklet loads its code from this site, so it stays up to date. For the userscript, open it on the
          <a href="/tools">tools page</a>. Tampermonkey then offers the update.{/if}
      </p>
    {/if}
    <h1 class="text-2xl font-bold">A game from {site}</h1>
    <p><strong>{names.blue} against {names.red}</strong>, {record.moves.length} {record.moves.length === 1 ? "edge" : "edges"}.</p>
    <!-- Two ways for the game (design 21): the text that a player follows, in strict Simplified Technical English. -->
    <div class="grid gap-3 sm:grid-cols-2">
      <section class="grid content-start gap-2 p-4 bg-panel border border-line rounded-lg">
        <!-- svelte-ignore a11y_autofocus: the page holds only this choice, and Enter then reviews, as the tools did -->
        <button class="btn-primary justify-self-start" type="button" autofocus
                onclick={() => reviewChosen(sent, record, source)}>Review the game</button>
        <p class="text-sm">The engine examines all the moves of the game. It gives a label to each move. Hedge School
          keeps the game in your list of games.</p>
      </section>
      <section class="grid content-start gap-2 p-4 bg-panel border border-line rounded-lg">
        <button class="btn-primary justify-self-start" type="button"
                onclick={() => analyzeChosen(sent, record, source)}>Analyze on the board</button>
        <p class="text-sm">The Analysis board shows {sent.at === null ? "the position after the last move of the game"
          : `the position that you saw on ${site}`}. Make your own moves to examine other lines. Hedge School does not
          keep the game in your list of games.</p>
      </section>
    </div>
  {:else}
    <p class="text-blunder" role="alert">{phase.load ? "Hedge School could not load the review" : "Hedge School could not import the game"}: {phase.problem}</p>
    <p>You can paste a game record in the <a href="/review" data-sveltekit-reload>Review tab</a>, or bring games from other sites with the
      <a href="/tools">tools</a>.</p>
  {/if}
</main>
