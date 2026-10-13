<script lang="ts">
  // Import: a game record after the `#` (from the meaf.us bookmarklet or userscript, src/lib/game/bookmarklet.ts and
  // userscript.ts) is checked with the engine's rules, given its cut marks, kept in this browser, and opened in the
  // review. Without one, the page shows the bookmarklet and the userscript, and how to install them. A record from an
  // out-of-date tool (importHash.ts) is kept too, and the page then says how to update the tool, with the review a
  // click away. A shared review's link (`#s=`, share.ts) shows what it holds and that this browser reviews it again,
  // and imports it on a click, with the sender's network and depth. Another site's link (`#record=…`, design 18) imports
  // its game and opens the review, and keeps the partner's save page with the game when the link names one. A partner's
  // page that kept a review opens this page with `#from=` and its origin, and sends the review file once this page asks.
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { parseRecord } from "#lib/game/record.ts";
  import { importRecord } from "#lib/game/import.ts";
  import { errorText } from "#lib/errors.ts";
  import { BOOKMARK_VERSION, bookmarkletHref } from "#lib/game/bookmarklet.ts";
  import { readImportHash, staleTool, type Tool } from "#lib/game/importHash.ts";
  import { gamePartner, partnerOf, receiveFromPartner } from "#lib/game/partners.ts";
  import { setGamePartner } from "#lib/game/store.ts";
  import { decodeShare, type SharedReview } from "#lib/game/share.ts";
  import { importReview, importShare, readReviewFile, shippedModels, shippedModule } from "#lib/game/reviewFile.ts";
  import { playerNames } from "#lib/game/record.ts";
  import { loadManifest, moduleOf, modelOf } from "#lib/engine/client.ts";
  import { NETWORKS, networkName, reviewDepthText } from "#lib/analysis/engineSettings.ts";
  import { startAnalytics, track } from "#lib/analytics.svelte.ts";
  import { EDGE_RANGES, range } from "#lib/measure.ts";

  let phase = $state<"install" | "importing" | "receiving" | "failed" | "stale" | "share">("install");
  let sender = $state(""); // the partner whose page sends a review that it kept
  let problem = $state("");
  let href = $state("");
  let stale = $state<Tool | "older" | null>(null);
  let imported = $state(""); // the game's id, for the review's link while the page asks to update a tool
  // A shared review, and what this site makes of it: its network here (null when the site no longer has it), and
  // whether the site's engine is the sender's.
  let shared = $state.raw<SharedReview | null>(null);
  let sharedHere = $state.raw<{ network: string | null; sameEngine: boolean } | null>(null);

  onMount(() => {
    href = bookmarkletHref(location.origin);
    importFromHash();
    startAnalytics(); // after the record has left the address (design 11)
    // A tab already on this page gets a new record by its `#` alone, with no new load.
    window.addEventListener("hashchange", importFromHash);
    return () => window.removeEventListener("hashchange", importFromHash);
  });

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
      await goto(`/review#game=${id}`, { replaceState: true });
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
      const review = readReviewFile(typeof sent === "string" ? sent : JSON.stringify(sent));
      const manifest = await loadManifest();
      const { id } = await importReview(review, shippedModels(manifest), shippedModule(manifest));
      const kept = gamePartner(save);
      if (kept) await setGamePartner(id, kept);
      track("import_game", { import_source: "site_review", edges: range(parseRecord(review.record).moves.length, EDGE_RANGES),
                             with_results: review.analyses.length > 0 });
      await goto(`/review#game=${id}`, { replaceState: true });
    } catch (e) {
      phase = "failed";
      problem = errorText(e);
      track("import_failed", { import_source: "site_review", import_failure: "rejected" });
    }
  }

  async function importFromHash() {
    const hash = location.hash.slice(1);
    if (!hash) return;
    phase = "importing";
    history.replaceState(null, "", location.pathname); // the record is kept below, not in the address
    if (hash.startsWith("s=")) { await readShared(hash.slice(2)); return; }
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
      await goto(`/review#game=${id}`, { replaceState: true });
    } catch (e) {
      phase = "failed";
      problem = errorText(e);
      track("import_failed", { import_source: source, import_failure: "rejected" });
    }
  }
</script>

<svelte:head><title>Import a game</title></svelte:head>

<main class="box-content max-w-184 mx-auto my-6 px-4 grid gap-4">
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
  {:else}
    {#if phase === "failed"}<p class="text-blunder" role="alert">The game could not be imported: {problem}</p>{/if}
    {#if phase === "stale"}
      <div class="grid gap-2 px-4 py-3 bg-panel border border-accent rounded-lg" role="status">
        <p>
          {#if stale === "bookmarklet"}Your bookmarklet is an older one. Drag the button below to the bookmarks bar again,
            in place of the old one.
          {:else if stale === "userscript"}Your userscript is older than this site's. Tampermonkey updates it when it next
            checks. To update it now, open the Hedge School userscript below, and Tampermonkey offers the update.
          {:else}This game came from a bookmarklet or a userscript made before they could tell this site their version.
            Drag the bookmarklet below to the bookmarks bar again, in place of the old one: it now loads its code from
            this site, so it stays up to date. For the userscript, open it below, and Tampermonkey offers the update.{/if}
        </p>
        <p>The game is imported. <a class="inline-block ml-1.5 px-3 py-1 rounded-full bg-accent text-on-accent font-semibold no-underline" href="/review#game={imported}">Open the review</a></p>
      </div>
    {/if}
    <h1 class="text-2xl font-bold">Bring your meaf.us games</h1>
    <p>
      meaf.us does not let other sites read its games, so this site cannot fetch them. A bookmarklet can: you keep it
      in your browser's bookmarks bar, and click it on a meaf.us game. It reads the game from that page, and opens it
      here for review. It sends nothing to meaf.us and reads nothing from your login. At each click it loads its code
      from this site, so it stays up to date.
    </p>
    <ol class="grid gap-2.5 pl-5 list-decimal">
      <li>Show the bookmarks bar (Ctrl+Shift+B in Chrome and Edge, Ctrl+Shift+B or View in Firefox).</li>
      <li>
        Drag this button to the bookmarks bar:
        {#if href}<a class="inline-block ml-1.5 px-3 py-1 rounded-full bg-accent text-on-accent font-semibold no-underline cursor-grab"
                     {href} onclick={e => e.preventDefault()}>Review in Hedge School</a>{/if}
      </li>
      <li>On meaf.us, open a game: one you play or watch, or a finished one from the archive.</li>
      <li>Click <strong>Review in Hedge School</strong> in the bookmarks bar. The review opens in a new tab.</li>
      <li>On your own game just after it ends, meaf.us shows the game without its moves. The bookmarklet then reloads the
        page as a watcher's view, which has them. When the game shows again, click <strong>Review in Hedge School</strong>
        once more.</li>
    </ol>
    <h2 class="mt-2 text-lg font-bold">Or with Tampermonkey</h2>
    <p>
      With the Tampermonkey extension, a userscript does the same: a button with the collie on meaf.us's game pages,
      and an entry in Tampermonkey's menu. It updates itself, and it opens the review of your own finished game in one
      click. It sends nothing to meaf.us and reads nothing from your login.
    </p>
    <ol class="grid gap-2.5 pl-5 list-decimal">
      <li>Install <a href="https://www.tampermonkey.net/">Tampermonkey</a>. In Chrome and Edge from version 138, also turn on
        <strong>Allow User Scripts</strong> in Tampermonkey's details on the browser's extensions page.</li>
      <li>Open <a href="/hedge-school.user.js" data-sveltekit-reload>the Hedge School userscript</a>. Tampermonkey shows it
        with an <strong>Install</strong> button.</li>
      <li>On meaf.us, open a game, then click the collie in the page's lower right corner, or <strong>Review this game in
        Hedge School</strong> in Tampermonkey's menu. The review opens in a new tab.</li>
    </ol>
    <p class="text-sm text-muted">
      Both depend on how meaf.us builds its page. If meaf.us changes, they may find no game until they are updated
      here, and both then update themselves. You can always paste a game record on the <a href="/">home page</a>.
    </p>
  {/if}
</main>
