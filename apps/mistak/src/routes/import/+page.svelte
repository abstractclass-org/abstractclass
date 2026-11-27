<script lang="ts">
  // The import page (docs/design/34-tak-site.md, item 10; design 22): where a game from outside arrives, after the `#`
  // (@abstractclass/import's importHash.ts). It takes a playtak game's number (`playtak=`, a parameter that its payload
  // names), which the site's Function fetches, a game from the tools for playtak's pages (src/lib/import/tools.ts),
  // with the tool, its version and the position that the page showed, and a record as the other sites take it
  // (`record=`, from another site's link). The game leaves the address at once, and the visit counts start after that.
  // Until the review exists, a game that the site takes shows its tags and its moves (BroughtGame.svelte), and nothing
  // is kept. For an out-of-date tool, the page also says how to update it. The page alone goes to the tools page, as on
  // the two other sites. The texts are strict Simplified Technical English.
  import { onMount } from "svelte";
  import { goto, replaceState } from "$app/navigation";
  import { holdsGame } from "@abstractclass/site/addressHash.ts";
  import { BOOKMARK_VERSION } from "@abstractclass/import/bookmarklet.ts";
  import { readImportHash, staleTool, type FetchHash, type Tool } from "@abstractclass/import/importHash.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { startAnalytics } from "#lib/analytics.svelte.ts";
  import BroughtGame from "#lib/import/BroughtGame.svelte";
  import { bringPlaytak, bringRecord, type Brought } from "#lib/import/ways.ts";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  type Phase = { at: "opening" | "playtak" } | { at: "game"; brought: Brought } | { at: "refused"; why: string };
  let phase = $state.raw<Phase>({ at: "opening" });
  let sent = $state.raw<FetchHash | null>(null); // what the address held
  // The tool, when it is out of date. Mistak's tools always send their version, so a record with no tool (a link's,
  // which staleTool calls "older") has no tool to update.
  const stale = $derived.by((): Tool | null => {
    const old = sent && staleTool(sent, { bookmarklet: String(BOOKMARK_VERSION), userscript: __USERSCRIPT_CODE__ });
    return old === "older" ? null : old;
  });

  onMount(async () => {
    if (!holdsGame(location.hash)) return goto("/tools", { replaceState: true });
    const hash = location.hash.slice(1);
    let read: FetchHash | null = null;
    try { read = readImportHash(hash, "playtak"); } catch { /* the address is not one that the page can read */ }
    sent = read;
    if (read?.id != null) phase = { at: "playtak" };
    await replaceState(location.pathname, {});
    startAnalytics();
    try {
      if (!read) throw new URIError();
      phase = { at: "game", brought: read.id === null ? readGame(read) : await bringPlaytak(read.id, fetch) };
    } catch (e) {
      phase = { at: "refused", why: e instanceof URIError ? "The site cannot read this link." : (e as Error).message };
    }
  });
  /** The game whose record the address holds. */
  function readGame({ record }: FetchHash): Brought {
    if (!record.trim()) throw new Error("This link holds no game.");
    return bringRecord(record, false);
  }
  /** A link with a game opened in this tab: a change of the `#` alone loads nothing. */
  const linked = () => { if (holdsGame(location.hash)) location.reload(); };

  /** The position that the game's page showed, in words: `at` is the moves before it. PTN numbers two moves a number,
   *  White's first. */
  function shown(at: number | null, moves: number): string {
    if (at === null) return "The playtak.com page did not tell which position it showed.";
    if (at === 0) return "The playtak.com page showed the start of the game.";
    if (at >= moves) return "The playtak.com page showed the position after the last move.";
    return `The playtak.com page showed the position after ${at % 2 === 1 ? "White's" : "Black's"} move `
      + `${Math.ceil(at / 2)}.`;
  }
</script>

<svelte:window onhashchange={linked} />

<PageMeta title={SITE_NAME} noindex /> <!-- a game that a link carries, nothing to index (design 23) -->

{#snippet notice()}
  {#if stale}
    <p class="px-4 py-3 bg-panel border border-accent rounded-lg" role="status">
      {#if stale === "bookmarklet"}Your bookmarklet is an old version. Go to the <a href="/tools">tools page</a>. Drag
        the button to the bookmarks bar again. Then delete the old bookmark.
      {:else}Your userscript is older than the userscript on this site. Tampermonkey updates it at its next check. To
        update it now, open the Mistak userscript on the <a href="/tools">tools page</a>. Tampermonkey then shows the
        update.{/if}
    </p>
  {/if}
{/snippet}

{#if phase.at === "game"}
  {@const brought = phase.brought}
  <BroughtGame {brought}>
    {#snippet note()}
      {@render notice()}
      {#if sent?.tool}<p>{shown(sent.at, brought.game.moves.length)}</p>{/if}
    {/snippet}
    <a href="/review">Review another game</a>
  </BroughtGame>
{:else}
  <main class="box-content max-w-184 mx-auto my-6 px-4 grid gap-4">
    {@render notice()}
    {#if phase.at === "refused"}
      <h1 class="text-2xl font-bold">The site did not take this game</h1>
      <p class="[overflow-wrap:anywhere]" role="alert">{phase.why}</p>
      {#if sent?.tool}<p>The newest bookmarklet and userscript are on the <a href="/tools">tools page</a>.</p>{/if}
      <p><a href="/review">Review another game</a></p>
    {:else}
      <p class="text-muted" role="status">{phase.at === "playtak" ? "Getting the game from playtak…" : `Opening ${SITE_NAME}…`}</p>
    {/if}
  </main>
  <SiteFooter />
{/if}
