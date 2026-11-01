<script lang="ts">
  // The import page (Hedge School's designs 21 and 22, design 33): a game that comes in from outside, after the `#`
  // (@abstractclass/import's importHash.ts). The bookmarklet and the userscript (src/lib/game/tools.ts) send a
  // strategyjam.org game with the position that its page showed. The game leaves the address at once, as on Hedge
  // School. The engine's rules then check the record (recordCheck.ts, design 33, item 11): a record that they refuse
  // shows why, and opens nothing. Else the player chooses the review, which keeps the game in this browser, or the
  // Analysis board at the position that the game's page showed, in place of the board kept here. Each goes to its
  // page's own address with the record, and that page takes it out of the address again. For an out-of-date tool, the
  // page also says how to update it. Drawing Board has no analytics yet, so the import counts no event. The page alone
  // goes to the tools.
  import { onDestroy, onMount } from "svelte";
  import { replaceState } from "$app/navigation";
  import { BOOKMARK_VERSION } from "@abstractclass/import/bookmarklet.ts";
  import { analysisAddress, holdsGame, readImportHash, staleTool, type ImportHash,
           type Tool } from "@abstractclass/import/importHash.ts";
  import ToolChoice from "@abstractclass/import/ToolChoice.svelte";
  import { EngineWorker, loadManifest } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { turnFromCount } from "#lib/game/notation.ts";
  import { parseRecord, playerNames, type GameRecord } from "#lib/game/record.ts";
  import { describeBy, recordProblem } from "#lib/review/recordCheck.ts";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  const MESSAGE = "box-content max-w-184 mx-auto my-6 px-4 grid gap-4";

  // What the page shows: the game while the engine checks it, then the choice, or why it opens nothing (`read`: the
  // record was read, and the engine refused it).
  type Phase = { at: "reading" }
    | { at: "checking"; sent: ImportHash; record: GameRecord }
    | { at: "choose"; sent: ImportHash; record: GameRecord }
    | { at: "failed"; read: boolean; problem: string };
  let phase = $state.raw<Phase>({ at: "reading" });
  let stale = $state<Tool | null>(null); // the tool, when it is out of date
  let rules: EngineWorker | null = null;

  onMount(async () => {
    if (!holdsGame(location.hash)) { location.replace("/tools"); return; }
    const hash = location.hash.slice(1);
    await replaceState(location.pathname, {}); // async: the address changes only once it resolves
    let sent: ImportHash, record: GameRecord;
    try {
      sent = readImportHash(hash);
      // A partner's page that sends a kept review (`from=`) and a shared review (`packed=`) come with Hedge School's
      // partners, which Drawing Board does not have.
      if (sent.from || !sent.record) throw new Error("this link does not hold a game record");
      // Drawing Board's tools always send their version, so a record with no tool (a link's) has no tool to update.
      const old = staleTool(sent, { bookmarklet: String(BOOKMARK_VERSION), userscript: __USERSCRIPT_CODE__ });
      stale = old === "older" ? null : old;
      record = parseRecord(sent.record);
    } catch (e) {
      phase = { at: "failed", read: false, problem: errorText(e) };
      return;
    }
    phase = { at: "checking", sent, record };
    const problem = await check(record);
    phase = problem ? { at: "failed", read: true, problem: problem.replace(/\.?$/, ".") }
      : { at: "choose", sent, record };
  });
  onDestroy(() => rules?.terminate());

  /** What is wrong with the record by the engine's rules, or null, in a rules worker of the page's own, which ends
   *  after the check. */
  async function check(record: GameRecord): Promise<string | null> {
    try {
      const manifest = await loadManifest();
      if (!manifest) return "this site has no engine files";
      rules = new EngineWorker();
      await rules.init(manifest);
      return await recordProblem(describeBy(rules), record);
    } catch (e) {
      return errorText(e);
    } finally {
      rules?.terminate();
      rules = null;
    }
  }

  // Each choice replaces this page in the history: Back then leads to the game's page.
  const reviewChosen = (sent: ImportHash) =>
    location.replace("/review#" + new URLSearchParams({ record: sent.record }));
  const analyzeChosen = (sent: ImportHash, record: GameRecord) =>
    location.replace(analysisAddress(sent, record.moves.length));
  // What each choice does, in strict Simplified Technical English: the player follows it.
  const REVIEW_TEXT = `The engine examines all the moves of the game. It gives a quality label to each move. ${SITE_NAME} `
    + "keeps the game in this browser.";
  const analyzeText = (sent: ImportHash) => `The Analysis board shows ${sent.at === null
    ? "the position after the last move of the game" : "the position that you saw on strategyjam.org"}. Make your own `
    + "moves to examine other lines. The game replaces the moves on your Analysis board.";

  /** The position that the game's page showed, in words: `at` is the game's moves before it, as strategyjam.org's
   *  slider counts them. The record numbers turns: Blue's first turn has one move, each later turn two. */
  function shown(at: number | null, moves: number): string {
    if (at === null) return "The game's page did not tell which position it showed.";
    if (at === 0) return "The game's page showed the start of the game.";
    if (at >= moves) return "The game's page showed the position after the last move.";
    const { turn, first } = turnFromCount(at - 1);
    return `The game's page showed the position after move ${at}. Move ${at} is the ${first ? "first" : "second"} move `
      + `of turn ${turn} in the record.`;
  }
  const heading = (sent: ImportHash) => (sent.site === "strategyjam.org" ? "A game from strategyjam.org" : "A game");
  const length = (record: GameRecord) => `${record.moves.length} ${record.moves.length === 1 ? "move" : "moves"}`;
</script>

<PageMeta title={SITE_NAME} noindex /> <!-- a game that a link carries, nothing to index (design 23) -->

<!-- The texts that a player follows, in strict Simplified Technical English. -->
{#snippet staleNotice()}
  {#if stale === "bookmarklet"}Your bookmarklet is an old version. Go to the <a href="/tools">tools page</a>. Drag the
    button to the bookmarks bar again. Then delete the old bookmark.
  {:else}Your userscript is older than the userscript on this site. Tampermonkey updates it at its next check. To update
    it now, open the Drawing Board userscript on the <a href="/tools">tools page</a>. Tampermonkey then shows the
    update.{/if}
{/snippet}
{#snippet noticeBox()}
  <p class="px-4 py-3 bg-panel border border-accent rounded-lg" role="status">{@render staleNotice()}</p>
{/snippet}
{#snippet theRecord(text: string)}
  <details>
    <summary class="cursor-pointer">The record</summary>
    <!-- `anywhere`: the Site tag's address breaks, so that the record fits a phone's width. -->
    <pre class="mt-2 p-3 bg-panel border border-line rounded font-mono text-sm whitespace-pre-wrap
                [overflow-wrap:anywhere]">{text}</pre>
  </details>
{/snippet}

<main class={MESSAGE}>
  {#if phase.at === "reading"}
    <p class="text-muted">Opening the game…</p>
  {:else if phase.at === "checking"}
    {@const { sent, record } = phase}
    {@const names = playerNames(record.tags)}
    {#if stale}{@render noticeBox()}{/if}
    <h1 class="text-2xl font-bold">{heading(sent)}</h1>
    <p><strong>{names.blue} against {names.red}</strong>, {length(record)}.</p>
    {#if sent.tool}<p>{shown(sent.at, record.moves.length)}</p>{/if}
    <p class="text-muted" role="status">The engine examines the moves of the game…</p>
  {:else if phase.at === "choose"}
    {@const { sent, record } = phase}
    {@const names = playerNames(record.tags)}
    <ToolChoice heading={heading(sent)} players="{names.blue} against {names.red}" length={length(record)}
                notice={stale ? staleNotice : undefined}
                review={{ label: "Review the game", text: REVIEW_TEXT, onclick: () => reviewChosen(sent) }}
                analyze={{ label: "Analyze on the board", text: analyzeText(sent), onclick: () => analyzeChosen(sent, record) }}>
      {#if sent.tool}<p>{shown(sent.at, record.moves.length)}</p>{/if}
    </ToolChoice>
    {@render theRecord(sent.record)}
  {:else}
    {#if stale}{@render noticeBox()}{/if}
    <p class="text-blunder" role="alert">{SITE_NAME} {phase.read ? "cannot open this game" : "could not read the game"}:
      {phase.problem}</p>
    <p>The newest bookmarklet and userscript are on the <a href="/tools">tools page</a>.</p>
  {/if}
</main>
<SiteFooter />
