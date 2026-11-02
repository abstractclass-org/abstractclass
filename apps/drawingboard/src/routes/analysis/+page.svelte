<script lang="ts">
  // The Analysis board (Hedge School's design 21, design 33): a free board in the browser, from the standard start, or
  // a line brought after the `#` (`#record=`: a record, whose moves become the main line, and `&at=`, the place on it).
  // The engine checks a record brought as the review checks a game: it plays each move, and confirms each capture mark
  // (design 33, item 6). A record that fails leaves the board kept here, with a notice. A record that passes asks first
  // when the board kept here has moves, as Hedge School's board does ("Replace your analysis?").
  // The engine searches the position on screen only, and the moves the player asks to evaluate: no pass runs over the
  // line (GameAnalysis's board form). The tree is the player's: its first line is the main line, which "Make main line"
  // changes. One board in each browser, kept as the player leaves it. The engine's settings are the review's, and it
  // runs on the CPU only.
  import { onDestroy, onMount, untrack } from "svelte";
  import { replaceState } from "$app/navigation";
  import ReviewView, { reviewSkeleton } from "@abstractclass/review/ReviewView.svelte";
  import ReplaceAnalysis, { ReplaceQuestion } from "@abstractclass/review/ReplaceAnalysis.svelte";
  import { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
  import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
  import { BOARD_ID, boardOfLine, type KeptBoard } from "@abstractclass/analysis/kept.ts";
  import { onlyJudged, review } from "@abstractclass/analysis/model.ts";
  import { EngineSession } from "@abstractclass/analysis/session.svelte.ts";
  import { mainIndex, pathKey } from "@abstractclass/analysis/tree.ts";
  import { modelOf } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
  import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";
  import Icon from "@abstractclass/site/Icon.svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { blueprints, type Blueprints, type ReviewData } from "#lib/review/blueprints.ts";
  import { blueprintsView } from "#lib/review/blueprintsView.ts";
  import { loadDisplay } from "#lib/review/display.ts";
  import { describeBy, recordProblem } from "#lib/review/recordCheck.ts";
  import { loadEngine, reviewVisits, saveEngine, type EngineSettings } from "#lib/analysis/engineSettings.ts";
  import { parseRecord, type GameRecord } from "#lib/game/record.ts";
  import { BOARD_AT_KEY, SITE_NAME } from "#lib/site.ts";

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

  /** The board kept here, at its kept place, and a line brought after the `#`, which leaves the address, and which
   *  replaces the kept board once the engine has checked it (recordCheck.ts), and the player agrees when the kept board
   *  has moves. */
  async function chooseBoard(): Promise<{ kept: KeptBoard | null; at: string[]; brought?: { record: GameRecord; at: number } }> {
    const kept = (await dbGet<KeptBoard>(STORES.branches, BOARD_ID)) ?? null;
    const at = readLocal(BOARD_AT_KEY), keptAt = at ? at.split(" ") : [];
    const p = new URLSearchParams(location.hash.slice(1)), text = p.get("record");
    if (text === null) return { kept, at: keptAt };
    await replaceState("/analysis", {}); // async: the address changes only once it resolves
    try {
      const record = parseRecord(text);
      return { kept, at: keptAt, brought: { record, at: Math.max(0, Math.floor(Number(p.get("at") ?? record.moves.length)) || 0) } };
    } catch (e) {
      refuse(errorText(e));
      return { kept, at: keptAt };
    }
  }
  /** The notice of a record that the board cannot open. */
  const refuse = (problem: string) =>
    (notice = `The Analysis board cannot open this record: ${problem.replace(/\.?$/, ".")} Your own analysis is here instead.`);
  // A record's board, when the board kept here has moves of its own: the player chooses which to keep.
  const question = new ReplaceQuestion();

  onMount(async () => {
    try {
      await session.load();
      const opening = chooseBoard();
      const g = await session.start(pool => new GameAnalysis(blueprints, pool, [], BOARD_ID), async (g, pool) => {
        const chosen = await opening;
        await g.start();
        const problem = chosen.brought && g.rulesReady ? await recordProblem(describeBy(pool.rules), chosen.brought.record) : null;
        if (problem) refuse(problem);
        // Only a record that the engine accepted replaces the board kept here: without the rules, the page shows why
        const replace = chosen.brought && g.rulesReady && !problem && (!chosen.kept?.nodes.length || await question.ask());
        const brought = replace ? chosen.brought : undefined, board = brought ? boardOfLine(brought.record.moves) : chosen.kept;
        if (board) await g.loadBoard(board);
        const model = modelOf(session.manifest!, session.network)?.sha256;
        if (g.rulesReady && pool.search && model) await g.fromStore(pool.search, model).catch(() => {});
        if (brought) await dbPut(STORES.branches, BOARD_ID, g.keptBoard()); // a link's board is now this browser's
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
    await dbPut(STORES.branches, BOARD_ID, boardOfLine([]));
    writeLocal(BOARD_AT_KEY, "");
    location.reload();
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
    {#snippet tools()}
      <!-- A new board from the standard start. -->
      <button class="btn-icon" onclick={newBoard} aria-label="New board" title="New board: the standard start"><Icon name="new" /></button>
    {/snippet}
  </ReviewView>
{:else}
  {@render reviewSkeleton(blueprintsView, false, loadDisplay().win === "gauge", PLAYERS, true)}
{/if}

<ReplaceAnalysis {question} />
