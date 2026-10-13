<script lang="ts">
  // The review's ways in (design 22), when the review's address holds a game after its `#` (importHash.ts):
  // - a record from the meaf.us bookmarklet or userscript (bookmarklet.ts, userscript.ts), or from another site's link
  //   (`record=`, design 18): checked with the engine's rules, given its cut marks, kept in this browser, and reviewed.
  //   A record from an out-of-date tool is kept too, and the page then says how to update the tool, with the review a
  //   click away. Another site's link keeps the partner's save page with the game when it names one;
  // - a shared review (`packed=`, share.ts): what it holds, and that this browser reviews it again, then kept on a
  //   click, with the sender's network and depth. The old import page's `s=` links are not read: they say so;
  // - a partner's page that kept a review (`from=`): it sends the review file once this page asks.
  // The game leaves the address at once, then the analytics start. Once the game is kept, the review opens it.
  import { onMount } from "svelte";
  import { parseRecord, playerNames } from "#lib/game/record.ts";
  import { importRecord } from "#lib/game/import.ts";
  import { errorText } from "#lib/errors.ts";
  import { BOOKMARK_VERSION } from "#lib/game/bookmarklet.ts";
  import { readImportHash, staleTool, type Tool } from "#lib/game/importHash.ts";
  import { gamePartner, partnerOf, receiveFromPartner } from "#lib/game/partners.ts";
  import { setGamePartner } from "#lib/game/store.ts";
  import { decodeShare, type SharedReview } from "#lib/game/share.ts";
  import { importReview, importShare, readReviewFile, shippedModels, shippedModule } from "#lib/game/reviewFile.ts";
  import { loadManifest, moduleOf, modelOf } from "#lib/engine/client.ts";
  import { NETWORKS, networkName, reviewDepthText } from "#lib/analysis/engineSettings.ts";
  import { startAnalytics, track } from "#lib/analytics.svelte.ts";
  import { EDGE_RANGES, range } from "#lib/measure.ts";

  const MESSAGE = "box-content max-w-184 mx-auto my-6 px-4 grid gap-4";

  let phase = $state<"importing" | "receiving" | "failed" | "stale" | "share">("importing");
  let sender = $state(""); // the partner whose page sends a review that it kept
  let problem = $state("");
  let stale = $state<Tool | "older" | null>(null);
  let imported = $state(""); // the game's id, for the review's link while the page asks to update a tool
  // A shared review, and what this site makes of it: its network here (null when the site no longer has it), and
  // whether the site's engine is the sender's.
  let shared = $state.raw<SharedReview | null>(null);
  let sharedHere = $state.raw<{ network: string | null; sameEngine: boolean } | null>(null);

  onMount(() => {
    const hash = location.hash.slice(1);
    history.replaceState(null, "", location.pathname); // the game is kept below, not in the address
    startAnalytics(); // after the game has left the address (design 22)
    void arrive(hash);
  });

  /** Opens the review of a game now kept in this browser: the review's own address, loaded again. */
  function review(id: string) {
    history.replaceState(null, "", `/review#game=${id}`);
    location.reload();
  }

  async function arrive(hash: string) {
    const p = /^[A-Za-z_]+=/.test(hash) ? new URLSearchParams(hash) : null, packed = p?.get("packed");
    if (packed) { await readShared(packed); return; }
    if (p?.has("s")) { // the old import page's shared review
      phase = "failed";
      problem = "this share link is from an earlier version of Hedge School, and no longer opens. Ask its sender for a new one.";
      track("import_failed", { import_source: "share_link", import_failure: "link" });
      return;
    }
    let source = "older_tool";
    try {
      const sent = readImportHash(hash), text = sent.record;
      if (sent.from) { await receiveReview(sent.from, sent.save); return; }
      source = sent.link ? "site_link" : sent.tool ?? source;
      if (sent.link && !text) throw new Error("the link has no record=, which carries the game");
      const record = parseRecord(text), id = await importRecord(text, record);
      const partner = sent.link ? gamePartner(sent.save) : null;
      if (partner) await setGamePartner(id, partner);
      stale = staleTool(sent, { bookmarklet: String(BOOKMARK_VERSION), userscript: __USERSCRIPT_CODE__ });
      // The import by its tool and the game's length, and an out-of-date tool by its kind (design 17).
      track("import_game", { import_source: source, edges: range(record.moves.length, EDGE_RANGES) });
      if (stale) track("tool_out_of_date", { stale_tool: stale });
      if (stale) { imported = id; phase = "stale"; return; }
      review(id);
    } catch (e) {
      phase = "failed";
      problem = errorText(e);
      track("import_failed", { import_source: source, import_failure: "rejected" });
    }
  }

  async function readShared(text: string) {
    try {
      const s = decodeShare(text), manifest = await loadManifest();
      const network = manifest ? NETWORKS.map(n => n.id).find(id => modelOf(manifest, id)?.sha256.startsWith(s.model)) ?? null : null;
      shared = s;
      sharedHere = { network, sameEngine: !!manifest && !!moduleOf(manifest)?.sha256.startsWith(s.module) };
      phase = "share";
      track("share_open", { network_found: !!network, same_engine: sharedHere.sameEngine });
    } catch (e) {
      phase = "failed";
      problem = `the share link cannot be read: ${errorText(e)}`;
      track("import_failed", { import_source: "share_link", import_failure: "link" });
    }
  }

  /** Keeps the shared game, its branches and the sender's network and depth for it, and opens the review. */
  async function reviewShared() {
    if (!shared || !sharedHere) return;
    phase = "importing";
    try {
      const id = await importShare(shared, sharedHere.network);
      track("import_game", { import_source: "share_link", edges: range(shared.moves.length, EDGE_RANGES), with_branches: shared.branches.length > 0 });
      review(id);
    } catch (e) {
      phase = "failed";
      problem = errorText(e);
      track("import_failed", { import_source: "share_link", import_failure: "rejected" });
    }
  }

  /** A review that a partner site kept (design 18): its page opened this one, and sends the review file when this page
   *  asks. The file imports as on the home page, and the review opens at once. */
  async function receiveReview(from: string, save: string | null) {
    const partner = partnerOf(from);
    try {
      if (!partner) throw new Error("the link names a site that is not one of Hedge School's partners");
      sender = partner.name;
      phase = "receiving";
      const sent = await receiveFromPartner(partner, from);
      const file = readReviewFile(typeof sent === "string" ? sent : JSON.stringify(sent));
      const manifest = await loadManifest();
      const { id } = await importReview(file, shippedModels(manifest), shippedModule(manifest));
      const kept = gamePartner(save);
      if (kept) await setGamePartner(id, kept);
      track("import_game", { import_source: "site_review", edges: range(parseRecord(file.record).moves.length, EDGE_RANGES),
                             with_results: file.analyses.length > 0 });
      review(id);
    } catch (e) {
      phase = "failed";
      problem = errorText(e);
      track("import_failed", { import_source: "site_review", import_failure: "rejected" });
    }
  }
</script>

<main class={MESSAGE}>
  {#if phase === "importing"}
    <p class="text-muted">Importing the game…</p>
  {:else if phase === "receiving"}
    <p class="text-muted">Waiting for {sender} to send the review…</p>
  {:else if phase === "share" && shared && sharedHere}
    {@const names = playerNames(shared.tags)}
    <h1 class="text-2xl font-bold">A shared review</h1>
    <p><strong>{names.blue} against {names.red}</strong>, {shared.moves.length} edges{shared.branches.length
      ? `, with ${shared.branches.length} ${shared.branches.length === 1 ? "move" : "moves"} in the sender's branches` : ""}.</p>
    <p>The link carries the game, not the engine's work: <strong>your browser reviews the game again</strong>, as it does a
      game you import, and the review fills in as the engine goes. With the sender's engine, network and depth, it comes
      out as the sender's review: the same labels, lines and accuracy. A GPU computes the network a little differently, so
      on one a close call can rarely come out otherwise.</p>
    <p>The sender's review: {sharedHere.network ? networkName(sharedHere.network) : "a network this site no longer has"}, at
      {reviewDepthText(shared.visits)}.
      {#if !sharedHere.network}The review uses your network, so its labels can differ.
      {:else}The game keeps them for its review. Other games review as before.{/if}
      {#if !sharedHere.sameEngine}This site's engine has changed since the link was made, so some labels can differ.{/if}</p>
    <div><button class="btn-primary" type="button" onclick={reviewShared}>Review it</button></div>
  {:else if phase === "stale"}
    <div class="grid gap-2 px-4 py-3 bg-panel border border-accent rounded-lg" role="status">
      <p>
        {#if stale === "bookmarklet"}Your bookmarklet is an older one. On the <a href="/tools">tools page</a>, drag the
          button to the bookmarks bar again, in place of the old one.
        {:else if stale === "userscript"}Your userscript is older than this site's. Tampermonkey updates it when it next
          checks. To update it now, open the Hedge School userscript on the <a href="/tools">tools page</a>, and
          Tampermonkey offers the update.
        {:else}This game came from a bookmarklet or a userscript made before they could tell this site their version. On
          the <a href="/tools">tools page</a>, drag the bookmarklet to the bookmarks bar again, in place of the old one:
          it now loads its code from this site, so it stays up to date. For the userscript, open it there, and
          Tampermonkey offers the update.{/if}
      </p>
      <p>The game is imported. <a class="inline-block ml-1.5 px-3 py-1 rounded-full bg-accent text-on-accent font-semibold no-underline"
                                  href="/review#game={imported}" data-sveltekit-reload>Open the review</a></p>
    </div>
  {:else}
    <p class="text-blunder" role="alert">The game could not be imported: {problem}</p>
    <p>You can paste a game record on the <a href="/">home page</a>, or bring games from other sites with the
      <a href="/tools">tools</a>.</p>
  {/if}
</main>
