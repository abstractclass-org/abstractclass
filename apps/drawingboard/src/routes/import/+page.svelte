<script lang="ts">
  // The import page (design 22, design 33): a game that comes in from outside, after the `#`
  // (@abstractclass/import's importHash.ts). The bookmarklet and the userscript (src/lib/game/tools.ts) send a
  // strategyjam.org game with the position that its page showed. Until the review and the Analysis board come
  // (abscls-8tl1.7), the page shows the record that it read and that position, and says that the review comes later.
  // For an out-of-date tool, the page also says how to update it. The page alone goes to the tools. The game stays in
  // the address: the site has no analytics yet, and keeps no game, so a reload shows the game again.
  import { onMount } from "svelte";
  import { BOOKMARK_VERSION } from "@abstractclass/import/bookmarklet.ts";
  import { holdsGame, readImportHash, staleTool, type ImportHash, type Tool } from "@abstractclass/import/importHash.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { turnFromCount } from "#lib/game/notation.ts";
  import { parseRecord, playerNames, type GameRecord } from "#lib/game/record.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  const MESSAGE = "box-content max-w-184 mx-auto my-6 px-4 grid gap-4";

  // What the page shows: the game that it read, with the tool when it is out of date, or why it cannot read one.
  type Phase = { at: "reading" }
    | { at: "read"; sent: ImportHash; record: GameRecord; stale: Tool | null }
    | { at: "failed"; problem: string };
  let phase = $state.raw<Phase>({ at: "reading" });

  onMount(() => {
    if (!holdsGame(location.hash)) { location.replace("/tools"); return; }
    try {
      const sent = readImportHash(location.hash.slice(1));
      // A partner's page that sends a kept review (`from=`) and a shared review (`packed=`) come with the review.
      if (sent.from || !sent.record) throw new Error("this link does not hold a game record");
      // Drawing Board's tools always send their version, so a record with no tool (a link's) has no tool to update.
      const stale = staleTool(sent, { bookmarklet: String(BOOKMARK_VERSION), userscript: __USERSCRIPT_CODE__ });
      phase = { at: "read", sent, record: parseRecord(sent.record), stale: stale === "older" ? null : stale };
    } catch (e) {
      phase = { at: "failed", problem: errorText(e) };
    }
  });

  /** The position that the game's page showed, in words: `at` is the game's moves before it, as strategyjam.org's
   *  slider counts them. The record numbers turns: Blue's first turn has one move, each later turn two. */
  function shown(at: number | null, moves: number): string {
    if (at === null) return "The game's page did not tell which position it showed.";
    if (at === 0) return "The game's page showed the start of the game.";
    if (at >= moves) return "The game's page showed the position after the last move.";
    const { turn, first } = turnFromCount(at - 1);
    return `The game's page showed the position after move ${at}. Move ${at} is the ${first ? "first" : "second"} move of turn ${turn} in the record.`;
  }
</script>

<PageMeta title="Drawing Board" noindex /> <!-- a game that a link carries, nothing to index (design 23) -->

<main class={MESSAGE}>
  {#if phase.at === "reading"}
    <p class="text-muted">Opening the game…</p>
  {:else if phase.at === "read"}
    {@const { sent, record, stale } = phase}
    {@const names = playerNames(record.tags)}
    <!-- The texts that a player follows, in strict Simplified Technical English. -->
    {#if stale}
      <p class="px-4 py-3 bg-panel border border-accent rounded-lg" role="status">
        {#if stale === "bookmarklet"}Your bookmarklet is an old version. Go to the <a href="/tools">tools page</a>. Drag
          the button to the bookmarks bar again. Then delete the old bookmark.
        {:else}Your userscript is older than the userscript on this site. Tampermonkey updates it at its next check. To
          update it now, open the Drawing Board userscript on the <a href="/tools">tools page</a>. Tampermonkey then
          shows the update.{/if}
      </p>
    {/if}
    <h1 class="text-2xl font-bold">{sent.site === "strategyjam.org" ? "A game from strategyjam.org" : "A game"}</h1>
    <p><strong>{names.blue} against {names.red}</strong>, {record.moves.length} {record.moves.length === 1 ? "move" : "moves"}.</p>
    {#if sent.tool}<p>{shown(sent.at, record.moves.length)}</p>{/if}
    <p class="px-4 py-3 bg-panel border border-line rounded-lg">Drawing Board cannot review games yet. The review and the
      Analysis board come later. Then this page opens the game in them.</p>
    <section class="grid gap-2">
      <h2 class="text-lg font-bold">The record</h2>
      <!-- `anywhere`: the Site tag's address breaks, so that the record fits a phone's width. -->
      <pre class="p-3 bg-panel border border-line rounded font-mono text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{sent.record}</pre>
    </section>
  {:else}
    <p class="text-blunder" role="alert">Drawing Board could not read the game: {phase.problem}</p>
    <p>The newest bookmarklet and userscript are on the <a href="/tools">tools page</a>.</p>
  {/if}
</main>
<SiteFooter />