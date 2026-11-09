<script lang="ts">
  // The Analysis board (Hedge School's design 21, design 33): a free board in the browser, from the standard start, a
  // set-up position, or a line brought after the `#`: `#record=` (a record, whose moves become the main line, and
  // `&at=`, the place on it), `#position=` (a set-up start, from the board editor or the Import, in the position's
  // notation, game/position.ts; with `record=`, the record's start), or the lines of a shared analysis or an analysis
  // file loaded (`#packed=`, game/board.ts, with `&at=`), which can name a set-up start too.
  // The engine checks a record brought as the review checks a game: it plays each move from the record's start, and
  // confirms each capture mark (design 33, item 6). It reads a start, brought alone or as a record's, and checks that a
  // game can reach it (protocol 0.8.0's check), so it analyzes no position that no game reaches. A record or a start
  // that fails leaves the board kept here, with a notice. One that passes asks first when the board kept here has
  // moves, as Hedge School's board does ("Replace your analysis?"). A board kept here whose start fails the check (one
  // kept before the check) gives way to a new board, with a notice.
  // The engine searches the position on screen only, and the moves the player asks to evaluate: no pass runs over the
  // line (GameAnalysis's board form). The tree is the player's: its first line is the main line, which "Make main line"
  // changes. One board in each browser, kept as the player leaves it. The engine's settings are the review's, and the
  // GPU worker joins as it does there (Hedge School's design 15). The New menu starts the board again: from the
  // standard start, the board editor, a position or moves imported, or an analysis file. The Export menu shares the
  // board by link, or saves it as an analysis file or as an annotated record (Hedge School's design 21, item 7), with
  // the board's set-up start.
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
  import ImportDialog from "@abstractclass/review/ImportDialog.svelte";
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
  import { checkRecord, checkStart, recordProblem, rulesBy, startProblem } from "#lib/review/recordCheck.ts";
  import { loadEngine, networkName, reviewVisits, saveEngine, type EngineSettings } from "#lib/analysis/engineSettings.ts";
  import { startTags, type GameRecord } from "#lib/game/record.ts";
  import { readPasted } from "#lib/game/paste.ts";
  import { setUpStart, STANDARD_START, writePosition } from "#lib/game/position.ts";
  import { boardLink, boardOfRecord, readBoardLink, recordKomiProblem, refuseKomi } from "#lib/game/board.ts";
  import { analysisFileName, exportAnalysis, openAnalysisFile } from "#lib/game/analysisFile.ts";
  import { annotatedRecord } from "#lib/review/annotate.ts";
  import { BOARD_AT_KEY, SITE_NAME, SITE_VERSION } from "#lib/site.ts";

  const MESSAGE = "box-content max-w-184 mx-auto my-8 px-4";
  const PLAYERS: ReviewData["players"] = { blue: "Blue", red: "Red" };

  let game = $state<GameAnalysis<Blueprints> | null>(null);
  let error = $state("");
  let notice = $state(""); // a line brought, or a kept board (refuseKomi), that could not open
  let start = $state<string[] | null>(null); // where the view opens
  let current = $state<string[]>([]); // the position on screen
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));
  const budget = $derived(reviewVisits(engine)); // "Evaluate quality" searches to the review's depth
  const session = new EngineSession({ settings: () => engine, game: () => game, position: () => current });
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

  /** A board brought after the `#`: its tree, its place on the main line, what it is (for a notice), and the record
   *  whose moves the engine checks, else the start that the engine reads. */
  interface Brought { board: KeptBoard; at: number; kind: "record" | "position" | "link" | "file"; record?: GameRecord }
  /** The board kept here, at its kept place, and a board brought after the `#`, which leaves the address: a record's
   *  line (`record`, from its `Position` tag or from `position`), a set-up start alone (`position`), or a link's or a
   *  file's lines, once they are read. The engine checks it before it replaces the kept board (recordCheck.ts). */
  async function chooseBoard(): Promise<{ kept: KeptBoard | null; at: string[]; brought?: Brought }> {
    let kept = (await dbGet<KeptBoard>(STORES.branches, BOARD_ID)) ?? null;
    // A kept board with a komi (Hedge School's design 24), which the board cannot analyze, does not open: a defence, as
    // only a board at komi 0 is kept here. A new board opens, and replaces it in the store at its first change.
    try {
      refuseKomi(kept?.komi);
    } catch (e) {
      notice = `The Analysis board cannot open your own analysis: ${sentence(errorText(e))} A new board is here instead.`;
      kept = null;
    }
    const at = readLocal(BOARD_AT_KEY), keptAt = at ? at.split(" ") : [];
    const p = new URLSearchParams(location.hash.slice(1)), text = p.get("record"), packed = p.get("packed");
    const position = p.get("position");
    if (text === null && packed === null && position === null) return { kept, at: keptAt };
    await replaceState("/analysis", {}); // async: the address changes only once it resolves
    if (text === null && position === null) {
      const kind = p.get("via") === "analysis_file" ? "file" : "link";
      try {
        return { kept, at: keptAt, brought: { ...readBoardLink(packed ?? "", p.get("at")), kind } };
      } catch (e) {
        refuse(errorText(e), kind);
        return { kept, at: keptAt };
      }
    }
    if (text === null) return { kept, at: keptAt, brought: { board: boardOfLine([], setUpStart(position)), at: 0, kind: "position" } };
    try {
      const record = readPasted(text, position).record, komi = recordKomiProblem(record);
      if (komi) throw new Error(komi);
      const atMain = Math.max(0, Math.floor(Number(p.get("at") ?? record.moves.length)) || 0);
      return { kept, at: keptAt, brought: { board: boardOfRecord(record), at: atMain, kind: "record", record } };
    } catch (e) {
      refuse(errorText(e), "record");
      return { kept, at: keptAt };
    }
  }
  const sentence = (text: string) => text.replace(/\.?$/, "."); // an error's text, ended by one period
  /** The notice of a board brought that cannot open: the board kept here opens. Where the kept board could not open
   *  either (chooseBoard's notice, a kept board with a komi), that notice stays first and names the new board. */
  function refuse(problem: string, kind: Brought["kind"]) {
    const verb = kind === "link" || kind === "file" ? "load" : "open";
    const why = `The Analysis board cannot ${verb} this ${kind}: ${sentence(problem)}`;
    notice = notice ? `${notice} ${why}` : `${why} Your own analysis is here instead.`;
  }
  // A board brought, when the board kept here has moves of its own: the player chooses which to keep.
  const question = new ReplaceQuestion();

  onMount(async () => {
    try {
      await session.load();
      const opening = chooseBoard();
      let board: KeptBoard | null = null, brought: Brought | undefined, keptAt: string[] = [];
      // The analysis starts from the board's start, so the engine's rules check a board brought first, once they work:
      // a record's moves from its start, or a start alone. Only a board that they accept replaces the board kept here.
      const g = await session.start(async pool => {
        const chosen = await opening, b = chosen.brought, rules = rulesBy(pool.rules);
        // A kept board whose start no game reaches (kept before protocol 0.8.0's check) does not open, as a kept board
        // with a komi does not (chooseBoard): a new board opens, and replaces it in the store at its first change.
        let kept = chosen.kept;
        const keptProblem = kept?.start ? await startProblem(rules, kept.start, "its start") : null;
        if (keptProblem) {
          notice = `The Analysis board cannot open your own analysis: ${sentence(keptProblem)} A new board is here instead.`;
          kept = null;
        }
        // The notice says what cannot open, so the problem names the start by it: "this position: no game can reach
        // it", "this link: no game can reach its start".
        const problem = !b ? null : b.record ? await recordProblem(rules, b.record)
          : b.board.start ? await startProblem(rules, b.board.start, b.kind === "position" ? "it" : "its start") : null;
        if (b && problem) refuse(problem, b.kind);
        brought = b && !problem && (!kept?.nodes.length || await question.ask()) ? b : undefined;
        board = brought?.board ?? kept;
        keptAt = chosen.at;
        return new GameAnalysis(blueprints, pool, [], BOARD_ID, board?.start ?? null);
      }, async (g, pool) => {
        await g.start();
        if (board) await g.loadBoard(board);
        const model = modelOf(session.manifest!, session.network)?.sha256;
        if (g.rulesReady && pool.search && model) await g.fromStore(pool.search, model).catch(() => {});
        if (brought) await dbPut(STORES.branches, BOARD_ID, g.keptBoard()); // a brought board is now this browser's
        const at = brought ? g.mainNames.slice(0, brought.at)
          : mainIndex(keptAt, g.mainNames) !== null || pathKey(keptAt) in g.branches ? keptAt : [];
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

  // The position on screen in the notation, which the board editor starts from (Lichess's editor starts from its board).
  const onScreen = $derived.by(() => {
    const p = game?.positionAt(current);
    return p ? writePosition(p) : null;
  });
  const editorHref = $derived(onScreen ? `/editor#${new URLSearchParams({ position: onScreen })}` : "/editor");

  // The board's Import (Hedge School's design 21, item 5): a position, moves or both pasted, checked here by the
  // engine's rules in a worker of their own, as an import is. Then they go after the `#`, and the page loads again, so
  // that its opening checks them with the board's rules and asks before it replaces the analysis kept here.
  let importing = $state(false);
  async function importPasted(position: string, pasted: string) {
    if (!pasted.trim()) {
      const start = setUpStart(position), problem = start ? await checkStart(start) : null;
      if (problem) throw new Error(`${SITE_NAME} cannot open this position: ${sentence(problem)}`);
      importAddress(new URLSearchParams({ position: start ?? STANDARD_START }));
      return;
    }
    const read = readPasted(pasted, position || null);
    const problem = recordKomiProblem(read.record) ?? await checkRecord(read.record, "their start");
    if (problem) throw new Error(`${SITE_NAME} cannot open these moves: ${sentence(problem)}`);
    importAddress(new URLSearchParams({ record: read.recordText, ...(position ? { position } : {}) }));
  }
  function importAddress(hash: URLSearchParams) {
    history.replaceState(null, "", `/analysis#${hash}`);
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
    const text = annotatedRecord({ R: r, unit, tags: startTags(g.startPosition, g.komi), result: "*",
                                   branches: g.branches, annotator: SITE_NAME,
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
              onengine={(change: Partial<EngineSettings>) => Object.assign(engine, change)} gpu={session.gpuView}
              board={{ judged: g.judgedMain, onmain: path => g.setMain(path) }}>
    {#snippet tools(unit)}
      <!-- New (Hedge School's design 21): the standard start, the board editor from the position on screen, a
           position or moves imported, or an analysis file. -->
      <NewMenu site={SITE_NAME} editor={editorHref} onstart={newBoard} onload={loadFile}
               importer={{ open: () => (importing = true), hint: "A game record, finished or not, a list of moves, or a position." }} />
      <!-- Export: the link, the analysis file, or the annotated record, labelled by the view's unit. -->
      <ExportMenu icon run={kind => exportAs(kind, unit)} items={BOARD_EXPORTS} />
    {/snippet}
  </ReviewView>
{:else}
  {@render reviewSkeleton(blueprintsView, false, loadDisplay().win === "gauge", PLAYERS, true)}
{/if}

<ReplaceAnalysis {question} />

<!-- The board's Import: a position, moves, or both pasted (Hedge School's design 21). An analysis file has its own
     Load. The examples: the start of the standard start, and the first moves of Stamp Duty's own game. -->
<ImportDialog bind:open={importing} editor={editorHref} positionExample="-10,-1w;-9,-1s;-6,-1;… b1 0/0 0"
              movesExample="1. 1@-1,1 2. 1@1,-3 1@1,2 …" moveWord="moves" onimport={importPasted} />
