<script lang="ts">
  // The import page (Hedge School's designs 21 and 22, design 33): a game that comes in from outside, after the `#`
  // (@abstractclass/import's importHash.ts). The bookmarklet and the userscript (src/lib/game/tools.ts) send a
  // strategyjam.org game with the position that its page showed. The game leaves the address at once, as on Hedge
  // School. The engine's rules then check the record once, with each move's capture mark (recordCheck.ts, design 33,
  // item 11): a record that they refuse shows why, and opens nothing. Else the player chooses the review or the
  // Analysis board. The review's choice keeps the game in this browser here, as Hedge School's import page does
  // (game/import.ts, keepChecked, with this page's check), then opens its review by the game's id (openReview). A
  // browser that cannot keep the game stays on this page, with why: the tools page does not help it, so the page does
  // not offer it there. The Analysis board opens by its own address with the record, at the position that the
  // game's page showed, and asks before the game replaces the board kept here. A game from a set-up start offers the
  // board only: the review refuses it, so the choice says so before the click (setUpProblem). For an out-of-date tool,
  // the page also says how to update it, and counts it. The page counts the import as Hedge School's does (its design
  // 17): the review's import once the game is kept, by its source, and the board's by the source that its address
  // names (`via`), which the board counts. A game that the page cannot read, open or keep counts as a failed import to
  // the review. The analytics start once the game has left the address. The page alone goes to the tools, and counts
  // nothing.
  import { onMount } from "svelte";
  import { replaceState } from "$app/navigation";
  import { BOOKMARK_VERSION } from "@abstractclass/import/bookmarklet.ts";
  import { analysisAddress, holdsGame, readImportHash, staleTool, type ImportHash,
           type Tool } from "@abstractclass/import/importHash.ts";
  import { openReview } from "@abstractclass/import/openReview.ts";
  import ToolChoice from "@abstractclass/import/ToolChoice.svelte";
  import { errorSentence } from "@abstractclass/engine/errors.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import type { Checked } from "#lib/game/check.ts";
  import { keepChecked } from "#lib/game/import.ts";
  import { turnFromCount } from "#lib/game/notation.ts";
  import { parseRecord, playerNames, setUpProblem, type GameRecord } from "#lib/game/record.ts";
  import { checkRecordMarks } from "#lib/review/recordCheck.ts";
  import { startAnalytics, track } from "#lib/analytics.svelte.ts";
  import { toolSource, trackImport, trackImportFailed, type ImportFailure, type ImportSource } from "#lib/game/sources.ts";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  const MESSAGE = "box-content max-w-184 mx-auto my-6 px-4 grid gap-4";

  // What the page shows: the game while the engine checks it, then the choice with the check's answer, the review's
  // wait while the game is kept, or why the page opens nothing. `keeping`: the failure came while the page kept the
  // game, not while it read or checked it. `source`: the import's source, for its events.
  type Phase = { at: "reading" } | { at: "checking"; sent: ImportHash; record: GameRecord; source: ImportSource }
    | { at: "choose"; sent: ImportHash; record: GameRecord; source: ImportSource; checked: Checked } | { at: "keeping" }
    | { at: "failed"; message: string; keeping: boolean };
  let phase = $state.raw<Phase>({ at: "reading" });
  let stale = $state<Tool | null>(null); // the tool, when it is out of date

  onMount(async () => {
    if (!holdsGame(location.hash)) { location.replace("/tools"); return; }
    const hash = location.hash.slice(1);
    await replaceState(location.pathname, {}); // async: the address changes only once it resolves
    startAnalytics();
    // A failure by the step that fails (Hedge School's design 17): the address, then the record, then the rules.
    let sent: ImportHash, record: GameRecord, source: ImportSource = "site_link", failure: ImportFailure = "link";
    try {
      sent = readImportHash(hash);
      if (sent.tool) source = toolSource(sent.tool);
      // A partner's page that sends a kept review (`from=`) and a shared review (`packed=`) come with Hedge School's
      // partners, which Cyanotype does not have.
      if (sent.from || !sent.record) throw new Error("this link does not hold a game record");
      // Cyanotype's tools always send their version, so a record with no tool (a link's) has no tool to update.
      const old = staleTool(sent, { bookmarklet: String(BOOKMARK_VERSION), userscript: __USERSCRIPT_CODE__ });
      stale = old === "older" ? null : old;
      if (stale) track("tool_out_of_date", { stale_tool: stale });
      failure = "record";
      record = parseRecord(sent.record);
    } catch (e) {
      phase = { at: "failed", keeping: false,
                message: `${SITE_NAME} could not read the game: ${errorSentence(e)}` };
      trackImportFailed("review", source, failure);
      return;
    }
    phase = { at: "checking", sent, record, source };
    const checked = await checkRecordMarks(record);
    if (checked.problem) trackImportFailed("review", source, "rejected");
    phase = checked.problem
      ? { at: "failed", message: `${SITE_NAME} cannot open this game: ${errorSentence(checked.problem)}`, keeping: false }
      : { at: "choose", sent, record, source, checked };
  });

  // Each choice replaces this page in the history: Back then leads to the page before it.
  /** The review: the game kept with this page's check, then its review. The import counts by its source and the
   *  game's length, and a failure as rejected (Hedge School's design 17). A failure says why in Hedge School's words
   *  ("… could not import the game:"), then the import's own (game/import.ts), in whole sentences. */
  async function reviewChosen() {
    if (phase.at !== "choose") return;
    const { sent, record, source, checked } = phase;
    phase = { at: "keeping" };
    try {
      const id = await keepChecked(sent.record, record, checked);
      trackImport("review", source, record.moves.length);
      openReview(id);
    } catch (e) {
      phase = { at: "failed", keeping: true,
                message: `${SITE_NAME} could not import the game: ${errorSentence(e)}` };
      trackImportFailed("review", source, "rejected");
    }
  }
  /** The Analysis board, by its own address: the board counts the import, by the source that the address names. */
  const analyzeChosen = (sent: ImportHash, record: GameRecord, source: ImportSource) =>
    location.replace(analysisAddress(sent, record.moves.length, source));
  // What each choice does, in strict Simplified Technical English: the player follows it.
  const REVIEW_TEXT = `The engine examines all the moves of the game. It gives a quality label to each move. ${SITE_NAME} `
    + "keeps the game in this browser.";
  const analyzeText = (sent: ImportHash) => `The Analysis board shows ${sent.at === null
    ? "the position after the last move of the game" : "the position that you saw on strategyjam.org"}. Make your own `
    + "moves to examine other lines.";

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
</script>

<PageMeta title={SITE_NAME} noindex /> <!-- a game that a link carries, nothing to index (design 23) -->

<main class={MESSAGE}>
  <!-- The texts that a player follows, in strict Simplified Technical English. -->
  {#if stale}
    <p class="px-4 py-3 bg-panel border border-accent rounded-lg" role="status">
      {#if stale === "bookmarklet"}Your bookmarklet is an old version. Go to the <a href="/tools">tools page</a>. Drag
        the button to the bookmarks bar again. Then delete the old bookmark.
      {:else}Your userscript is older than the userscript on this site. Tampermonkey updates it at its next check. To
        update it now, open the Cyanotype userscript on the <a href="/tools">tools page</a>. Tampermonkey then
        shows the update.{/if}
    </p>
  {/if}
  {#if phase.at === "reading"}
    <p class="text-muted">Opening the game…</p>
  {:else if phase.at === "keeping"}
    <p class="text-muted">Importing the game…</p>
  {:else if phase.at === "failed"}
    <p class="text-blunder" role="alert">{phase.message}</p>
    {#if !phase.keeping}<p>The newest bookmarklet and userscript are on the <a href="/tools">tools page</a>.</p>{/if}
  {:else}
    {@const { sent, record, source } = phase}
    {@const names = playerNames(record.tags)}
    {@const moves = record.moves.length}
    <ToolChoice heading={sent.site === "strategyjam.org" ? "A game from strategyjam.org" : "A game"}
                players="{names.blue} against {names.red}" length="{moves} {moves === 1 ? 'move' : 'moves'}"
                pending={phase.at === "checking" ? "The engine examines the moves of the game…" : undefined}
                review={{ label: "Review the game", text: REVIEW_TEXT, onclick: reviewChosen,
                          refusal: setUpProblem(record, SITE_NAME) }}
                analyze={{ label: "Analyze on the board", text: analyzeText(sent), onclick: () => analyzeChosen(sent, record, source) }}>
      {#if sent.tool}<p>{shown(sent.at, moves)}</p>{/if}
    </ToolChoice>
    <details>
      <summary class="cursor-pointer">The record</summary>
      <!-- `anywhere`: the Site tag's address breaks, so that the record fits a phone's width. -->
      <pre class="mt-2 p-3 bg-panel border border-line rounded font-mono text-sm whitespace-pre-wrap
                  [overflow-wrap:anywhere]">{sent.record}</pre>
    </details>
  {/if}
</main>
<SiteFooter />
