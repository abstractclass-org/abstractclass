<script lang="ts">
  // The Analysis board (Hedge School's design 21, design 33): a free board in the browser, from the standard start, or
  // a line brought after the `#` (`#record=`: a record, whose moves become the main line, and `&at=`, the place on it),
  // or the lines of a shared analysis or an analysis file loaded (`#packed=`, game/board.ts, with `&at=`).
  // The engine checks a record brought as the review checks a game: it plays each move, and confirms each capture mark
  // (design 33, item 6). A record that fails leaves the board kept here, with a notice. A record that passes asks first
  // when the board kept here has moves, as Hedge School's board does ("Replace your analysis?").
  // The engine searches the position on screen only, and the moves the player asks to evaluate: no pass runs over the
  // line (GameAnalysis's board form). The tree is the player's: its first line is the main line, which "Make main line"
  // changes. One board in each browser, kept as the player leaves it. The engine's settings are the review's, and it
  // runs on the CPU until Blueprints has a GPU build for the browser (abscls-wqdl, abscls-8tl1.29). The New menu starts
  // the board again: from the standard start, or from an analysis file. The Export menu shares the board by link, or
  // saves it as an analysis file or as an annotated record (Hedge School's design 21, item 7).
  import { onDestroy, onMount, untrack } from "svelte";
  import { replaceState } from "$app/navigation";
  import ReviewView, { reviewSkeleton } from "@abstractclass/review/ReviewView.svelte";
  import ReplaceAnalysis, { ReplaceQuestion } from "@abstractclass/review/ReplaceAnalysis.svelte";
  import { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
  import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
  import { BOARD_ID, boardOfLine, type KeptBoard } from "@abstractclass/analysis/kept.ts";
  import { onlyJudged, review, type Unit } from "@abstractclass/analysis/model.ts";
  import { EngineSession } from "@abstractclass/analysis/session.svelte.ts";
  import { mainIndex, pathKey } from "@abstractclass/analysis/tree.ts";
  import { modelOf } from "@abstractclass/engine/client.ts";
  import ExportMenu from "@abstractclass/review/ExportMenu.svelte";
  import NewMenu from "@abstractclass/review/NewMenu.svelte";
  import { BOARD_EXPORTS, type ExportKind, type ExportResult } from "@abstractclass/review/exports.ts";
  import { shippedModels } from "@abstractclass/analysis/files.ts";
  import { download } from "@abstractclass/site/download.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
  import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { blueprints, type Blueprints, type ReviewData } from "#lib/review/blueprints.ts";
  import { blueprintsView } from "#lib/review/blueprintsView.ts";
  import { loadDisplay } from "#lib/review/display.ts";
  import { describeBy, recordProblem } from "#lib/review/recordCheck.ts";
  import { loadEngine, networkName, reviewVisits, saveEngine, type EngineSettings } from "#lib/analysis/engineSettings.ts";
  import { parseRecord, type GameRecord } from "#lib/game/record.ts";
  import { boardLink, readBoardLink } from "#lib/game/board.ts";
  import { analysisFileName, exportAnalysis, openAnalysisFile } from "#lib/game/analysisFile.ts";
  import { annotatedRecord } from "#lib/review/annotate.ts";
  import { BOARD_AT_KEY, SITE_NAME, SITE_VERSION } from "#lib/site.ts";

  const MESSAGE = "box-content max-w-184 mx-auto my-8 px-4";
  const PLAYERS: ReviewData["players"] = { blue: "Blue", red: "Red" };

  let game = $state<GameAnalysis<Blueprints> | null>(null);
  let error = $state("");
  let notice = $state(""); // a line brought that could not open: the board kept here opens
  let start = $state<string[] | null>(null); // where the view opens
  let current = $state<string[]>([]); // the position on screen
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));
  const budget = $derived(reviewVisits(engine)); // "Evaluate quality" searches to the review's depth
  const session = new EngineSession({ settings: () => engine, game: () => game, position: () => current, releaseIdle: false });
  const failure = $derived(error || session.error);

  const data = $derived(game?.data(PLAYERS) ?? null);
  // The review of the main line, with labels only on the moves evaluated (Hedge School's design 21).
  const fullReview = $derived(data && review(blueprints, data, "lead", LABEL_VISITS));
  const R = $derived.by(() => {
    const g = game;
    if (!fullReview || !g) return null;
    const judged = g.judgedMain, keys = g.mainKeys;
    return onlyJudged(fullReview, i => !!judged[keys[i + 1]] && !g.awaitsGreat(keys[i + 1]));
  });

  // The position on screen, kept for the next visit.
  $effect(() => {
    const key = pathKey(current);
    untrack(() => { if (game?.rulesReady) writeLocal(BOARD_AT_KEY, key); });
  });

  /** The board kept here, at its kept place, and a board brought after the `#`, which leaves the address: a record's
   *  line (`record`), which replaces the kept board once the engine has checked it (recordCheck.ts), or a link's or a
   *  file's lines, once they are read. Each asks first where the kept board has moves. */
  async function chooseBoard(): Promise<{ kept: KeptBoard | null; at: string[];
                                          brought?: { board: KeptBoard; at: number; record?: GameRecord } }> {
    const kept = (await dbGet<KeptBoard>(STORES.branches, BOARD_ID)) ?? null;
    const at = readLocal(BOARD_AT_KEY), keptAt = at ? at.split(" ") : [];
    const p = new URLSearchParams(location.hash.slice(1)), text = p.get("record"), packed = p.get("packed");
    if (text === null && packed === null) return { kept, at: keptAt };
    await replaceState("/analysis", {}); // async: the address changes only once it resolves
    if (text === null) {
      try {
        return { kept, at: keptAt, brought: readBoardLink(packed ?? "", p.get("at")) };
      } catch (e) {
        notice = `The Analysis board cannot load this ${p.get("via") === "analysis_file" ? "file" : "link"}: ${sentence(errorText(e))} Your own analysis is here instead.`;
        return { kept, at: keptAt };
      }
    }
    try {
      const record = parseRecord(text);
      const atMain = Math.max(0, Math.floor(Number(p.get("at") ?? record.moves.length)) || 0);
      return { kept, at: keptAt, brought: { board: boardOfLine(record.moves), at: atMain, record } };
    } catch (e) {
      refuse(errorText(e));
      return { kept, at: keptAt };
    }
  }
  const sentence = (text: string) => text.replace(/\.?$/, "."); // an error's text, ended by one period
  /** The notice of a record that the board cannot open. */
  const refuse = (problem: string) =>
    (notice = `The Analysis board cannot open this record: ${sentence(problem)} Your own analysis is here instead.`);
  // A record's board, when the board kept here has moves of its own: the player chooses which to keep.
  const question = new ReplaceQuestion();

  onMount(async () => {
    try {
      await session.load();
      const opening = chooseBoard();
      const g = await session.start(pool => new GameAnalysis(blueprints, pool, [], BOARD_ID), async (g, pool) => {
        const chosen = await opening, b = chosen.brought;
        await g.start();
        const problem = b?.record && g.rulesReady ? await recordProblem(describeBy(pool.rules), b.record) : null;
        if (problem) refuse(problem);
        // Only a record that the engine accepted replaces the board kept here: without the rules, the page shows why
        const offered = !!b && (!b.record || (g.rulesReady && !problem));
        const brought = offered && (!chosen.kept?.nodes.length || await question.ask()) ? b : undefined;
        const board = brought?.board ?? chosen.kept;
        if (board) await g.loadBoard(board);
        const model = modelOf(session.manifest!, session.network)?.sha256;
        if (g.rulesReady && pool.search && model) await g.fromStore(pool.search, model).catch(() => {});
        if (brought) await dbPut(STORES.branches, BOARD_ID, g.keptBoard()); // a brought board is now this browser's
        const at = brought ? g.mainNames.slice(0, brought.at)
          : mainIndex(chosen.at, g.mainNames) !== null || pathKey(chosen.at) in g.branches ? chosen.at : [];
        start = at;
        current = at;
        game = g;
      });
      if (!g) return;
      await g.sweep(); // the board's sweep makes the engine ready
    } catch (e) {
      error = errorText(e);
    }
  });
  onDestroy(() => session.end());

  /** A new board from the standard start, in the place of the board kept here. */
  async function newBoard() {
    // The New menu's ways each ask first where the board has moves, as Hedge School's (its design 21, item 5).
    if (game?.keptBoard().nodes.length && !(await question.ask())) return;
    await dbPut(STORES.branches, BOARD_ID, boardOfLine([]));
    writeLocal(BOARD_AT_KEY, "");
    location.reload();
  }

  /** An analysis file loaded from the New menu: its results go to this browser's store, and its lines to the board's
   *  address, so that the page's opening reads them and asks before it replaces the board kept here. */
  async function loadFile(file: File) {
    notice = "";
    try {
      history.replaceState(null, "", await openAnalysisFile(await file.text(), session.manifest)); // `/analysis#packed=…`
      location.reload();
    } catch (e) {
      notice = `The Analysis board cannot load this file: ${sentence(errorText(e))}`;
    }
  }

  /** The board shared or exported (Hedge School's design 21, item 7): a link to it, its analysis file, or its record
   *  with the lines as variations, labelled by the view's unit. */
  async function exportAs(kind: ExportKind, unit: Unit): Promise<ExportResult | void> {
    const g = game, r = R;
    if (!g || !r) return;
    if (kind === "share_link") {
      const link = boardLink(location.origin, g.keptBoard(), mainIndex(current, g.mainNames) ?? 0);
      await navigator.clipboard.writeText(link);
      return { linkLength: link.length };
    }
    if (kind === "analysis_file") {
      download(analysisFileName(), JSON.stringify(await exportAnalysis(g.keptBoard(), SITE_VERSION, shippedModels(session.manifest))));
      return;
    }
    const text = annotatedRecord({ R: r, unit, tags: {}, result: "*", branches: g.branches, annotator: SITE_NAME,
                                   note: `${SITE_NAME}'s Analysis board, with ${networkName(session.network)} (the network ${session.network}).` });
    if (kind === "record_copy") await navigator.clipboard.writeText(text);
    else download("analysis.txt", text, "text/plain");
  }
</script>

<PageMeta title="Analysis board · {SITE_NAME}"
          description="A free Blueprints Analysis board: play any line, and Stamp Duty, the engine in your browser, searches the position on screen." />

{#if failure}
  <p class="{MESSAGE} text-blunder" role="alert">{failure}</p>
{:else if game?.error && !game.rulesReady}
  <p class="{MESSAGE} text-blunder" role="alert">The engine could not read this board: {game.error}</p>
{:else if R && game && start}
  {@const g = game}
  {#if notice}<p class="{MESSAGE} mb-0 text-blunder" role="alert">{notice}</p>{/if}
  <ReviewView view={blueprintsView} {R} game={g} deepVisits={engine.visits} onposition={path => (current = path)} {start}
              onplay={path => g.playLine(path)} reviewVisits={budget} labelVisits={LABEL_VISITS} {engine}
              onengine={(change: Partial<EngineSettings>) => Object.assign(engine, change)}
              board={{ judged: g.judgedMain, onmain: path => g.setMain(path) }}>
    {#snippet tools(unit)}
      <!-- New (Hedge School's design 21): the standard start, or an analysis file. The board editor and the Import wait
           for a position's notation (abscls-8tl1.39). -->
      <NewMenu site={SITE_NAME} onstart={newBoard} onload={loadFile} />
      <!-- Export: the link, the analysis file, or the annotated record, labelled by the view's unit. -->
      <ExportMenu icon run={kind => exportAs(kind, unit)} items={BOARD_EXPORTS} />
    {/snippet}
  </ReviewView>
{:else}
  {@render reviewSkeleton(blueprintsView, false, loadDisplay().win === "gauge", PLAYERS, true)}
{/if}

<ReplaceAnalysis {question} />
