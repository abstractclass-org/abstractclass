<script lang="ts">
  // Openings (design 32, items 2 and 5): the opening book's own page. It has the Analysis board's layout and controls
  // (ReviewView in its board form, design 21), with a board of its own (OPENINGS_ID), so that a visit never changes the
  // player's lines on the Analysis board. The book is always on: its table starts on "Book" at each visit, and the
  // live engine waits at a book position while the table shows the book, because the book's searches are deeper.
  // "Candidates" starts it. Outside the book it searches, as on the Analysis board. At a book position the board shows
  // the book's area map and win chance. The area map is on at each visit.
  //
  // The move list holds the book's tree (book/tree.ts): the main line, and under each move the other book moves at the
  // position after it, folded. A fold opens for this visit only: the page adds each of its moves' lines to the board,
  // and the next visit opens with every fold closed. The path to the position on screen is always open. A line that
  // reaches a position by another way than its canonical parent ends with "Continues in …". A book move played adds its
  // line to the end of its main line. The board, with its lines, is kept in the browser, as the Analysis board is, and
  // the next visit opens at the position where this one ended.
  //
  // The addresses (design 22): `/openings` opens the kept board, `#record=<record>` the end of a line, `&at=<n>` a
  // position on it, and `&via=` the page that sent it ("Study in Openings", for the analytics).
  import { onDestroy, onMount, untrack } from "svelte";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import { replaceState } from "$app/navigation";
  import ReviewView, { reviewSkeleton, type MoveFold } from "@abstractclass/review/ReviewView.svelte";
  import { enclosureView } from "#lib/review/enclosureView.ts";
  import { loadDisplay } from "#lib/review/display.ts";
  import { STANDARD_START } from "#lib/engine/notation.ts";
  import { enclosure, moveName, onlyJudged, review, type Enclosure, type ReviewData } from "#lib/review/enclosure.ts";
  import { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
  import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
  import { EngineSession } from "@abstractclass/analysis/session.svelte.ts";
  import { modelOf } from "@abstractclass/engine/client.ts";
  import { loadEngine, networkName, reviewVisits, saveEngine, type EngineSettings } from "#lib/analysis/engineSettings.ts";
  import { trackSettingChange } from "#lib/analysis/settingChanges.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { OPENINGS_ID, type KeptBoard } from "#lib/game/store.ts";
  import { boardOfRecord } from "#lib/game/board.ts";
  import { readPasted } from "#lib/game/paste.ts";
  import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
  import { mainIndex, pathKey, sharedLength } from "@abstractclass/analysis/tree.ts";
  import { startAnalytics, track, trackOnce } from "#lib/analytics.svelte.ts";
  import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";
  import { POSITION_RANGES, range } from "#lib/measure.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { siteBook } from "#lib/book/place.svelte.ts";
  import { OpeningsPlace } from "#lib/book/openings.svelte.ts";
  import OpeningsBookTable from "#lib/book/OpeningsBookTable.svelte";
  import { decodeArea } from "#lib/book/area.ts";
  import { alsoReached, bookLine, canonical, continues, folded, foldText, mainEdges, positionsAlong, type LineLink }
    from "#lib/book/tree.ts";
  import { bookMove, type Book } from "#lib/book/book.ts";
  import type { BookPosition } from "#lib/book/form.ts";

  const MESSAGE = "box-content max-w-[1100px] mx-auto my-8 px-4";
  const PLAYERS: ReviewData["players"] = { blue: "Blue", red: "Red" };
  // The position on screen, kept in this browser for the next visit (a convenience: the page opens at the start
  // without it).
  const AT_KEY = "hedge-school:openings-at";
  /** Where a visit came from (design 17, `openings_open`): the page's own address (the header's tab, a bookmark),
   *  "Study in Openings" in the review or on the Analysis board, or another link with a record. */
  type From = "page" | "review" | "analysis" | "link";
  const WAITS = "The engine waits at a book position. To search, select Candidates.";

  let game = $state<GameAnalysis<Enclosure> | null>(null);
  let error = $state("");
  let notice = $state(""); // a line brought that could not open: the board kept here opens
  let broughtKomi = $state(false); // a record brought with a komi: the book is at komi 0 (design 24)
  let start = $state<string[] | null>(null); // where the view opens
  let current = $state<string[]>([]); // the position on screen
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));
  const budget = $derived(reviewVisits(engine)); // "Evaluate quality" searches to the review's depth
  const book = siteBook(); // the site's book: none in the build's prerender

  // The view, and its book's place on this page: ReviewView makes the place from the view (`book.place`), with its own
  // path and "Review by", and gives it back (bookPlace). The display settings are the site's, but the area map is on at
  // each visit (design 32, item 5): the page keeps no choice of the map, and leaves the Analysis board's as it is.
  let view = $state<ReviewView<Enclosure> | undefined>();
  const openingsView: typeof enclosureView = {
    ...enclosureView,
    display: {
      load: () => { const d = enclosureView.display.load(); return { ...d, areaMap: { ...d.areaMap, board: true } }; },
      save: d => enclosureView.display.save({ ...d, areaMap: { ...d.areaMap, board: enclosureView.display.load().areaMap.board } }),
    },
    book: enclosureView.book && {
      ...enclosureView.book,
      place: (_page, notations, unit) => {
        const b = siteBook();
        return b && new OpeningsPlace(b, notations, unit, to => void view?.visit(to));
      },
      Table: OpeningsBookTable as typeof enclosureView.book.Table,
    },
  };
  const place = $derived((view?.bookPlace() ?? null) as OpeningsPlace | null);
  // The engine waits while the table shows the book at a book position (design 32, item 5). It searches where the
  // position's part of the book did not load: the boards work while the book fails (item 11).
  const waits = $derived(!!place?.showsBook && place.at.state !== "failed");
  const session = new EngineSession({ settings: () => (waits ? { ...engine, on: false } : engine), game: () => game,
                                      position: () => current, tracker: { track, networkName } });
  const failure = $derived(error || session.error);

  const data = $derived(game?.data(PLAYERS) ?? null);
  // The review of the main line, with labels only on the moves evaluated (design 21).
  const fullReview = $derived(data && review(data, "lead", LABEL_VISITS));
  const R = $derived.by(() => {
    const g = game;
    if (!fullReview || !g) return null;
    const judged = g.judgedMain, keys = g.mainKeys;
    return onlyJudged(fullReview, i => !!judged[keys[i + 1]] && !g.awaitsGreat(keys[i + 1]));
  });
  const mainNames = $derived(data ? data.moves.map(m => moveName(m.edge)) : []);
  /** The notation of a position of the board's tree, by its path. */
  const notationAt = (p: string[]): string | undefined => game?.positionAt(p)?.notation;
  /** The book at a position of the tree, once its part has loaded: null elsewhere. */
  function bookAt(p: string[]): BookPosition | null {
    const n = notationAt(p), a = n && book ? book.at(n) : null;
    return a?.state === "in" ? a.position : null;
  }
  const known = (p: string[]) => !!game?.positionAt(p); // a position of the board's tree
  // The book's values at each position that it holds, which the board shows ahead of a search's (GameAnalysis
  // `viewValues`): its area map and its win chance, also while the engine waits. They give no label.
  const maps = new Map<string, number[]>();
  function bookValues(path: string[]) {
    const q = bookAt(path);
    if (!q) return undefined;
    let ownership = maps.get(q.position);
    if (!ownership) maps.set(q.position, (ownership = decodeArea(q.area)));
    return { ownership, blueWin: q.value.blueWin };
  }

  // The position on screen, kept for the next visit, and the positions looked at in this visit (design 17): an event
  // when their count reaches the start of each range after the first.
  const seen = new Set<string>();
  $effect(() => {
    const key = pathKey(current);
    untrack(() => {
      if (!game?.rulesReady) return;
      writeLocal(AT_KEY, key); // storage blocked: the start next time
      if (seen.has(key)) return;
      seen.add(key);
      if (POSITION_RANGES.slice(1).includes(seen.size)) track("openings_positions", { positions: range(seen.size, POSITION_RANGES) });
    });
  });

  // The book's main line, the board's main line at each visit, once its parts have loaded
  let main = $state.raw<string[] | null>(null);
  /** The edges of the book's main line. Null where the book or a part of the line does not load. */
  async function bookMain(): Promise<string[] | null> {
    const b = await book?.opened();
    return b ? mainEdges(b).catch(() => null) : null;
  }
  let mainSetting: Promise<void> | null = null; // the main line on its way to the board: one at a time
  function setMain(g: GameAnalysis<Enclosure>, edges = bookMain()): Promise<void> {
    return (mainSetting ??= (async () => {
      const line = await edges;
      if (!line?.length) return;
      main = line;
      if (line.length === g.mainNames.length && line.every((e, k) => e === g.mainNames[k])) return;
      await g.playLine(line);
      await g.setMain(line);
    })().finally(() => (mainSetting = null)));
  }
  // A book that loads again after "Try again": the main line once it can
  $effect(() => {
    if (main || !game || !place || place.at.state !== "in") return;
    untrack(() => void setMain(game!));
  });

  // The folds (design 32, items 5 and 9): open for this visit only.
  const opened = new SvelteSet<string>();
  const links = new SvelteMap<string, LineLink | null>(), asked = new Set<string>();
  /** Adds the book moves' lines from a position to the board (tree.ts, `bookLine`): the lines found together, then
   *  added one after another. A line that the book or the rules refuse is left out. */
  async function addLines(b: Book, p: string[], q: BookPosition, moves: BookPosition["moves"]) {
    const g = game;
    if (!g) return;
    const lines = await Promise.all(moves.filter(m => !known([...p, m.move])).map(m => bookLine(b, q, m).catch(() => null)));
    for (const line of lines) if (line) await g.playLine([...p, ...line]).catch(() => {});
  }
  const fold: MoveFold = {
    at(p, next) {
      const q = bookAt(p), moves = q ? folded(q, next).map(m => m.move) : [];
      return moves.length ? { moves, text: foldText(moves.length, next, p.at(-1) ?? null), open: opened.has(pathKey(p)) } : null;
    },
    toggle(p, next) {
      const key = pathKey(p), q = bookAt(p), b = book?.book;
      if (opened.has(key)) { opened.delete(key); return; }
      opened.add(key);
      trackOnce("openings fold opened", "feature", { feature_name: "fold opened" });
      if (q && b) void addLines(b, p, q, folded(q, next));
    },
    // A move that reaches a book position by another way than its canonical parent, where the book goes on from there,
    // ends with a link to the canonical line (tree.ts, `continues`): the book's positions tell at once, and the link's
    // words come once its line is found.
    link(p) {
      const q = bookAt(p), before = bookAt(p.slice(0, -1)), b = book?.book;
      if (!q || !before || !b || !q.moves.length || canonical(q, before.position, p.at(-1)!)) return null;
      const key = pathKey(p);
      if (!asked.has(key)) {
        asked.add(key);
        continues(b, q, mainNames).then(l => links.set(key, l), () => asked.delete(key));
      }
      return links.get(key) ?? null;
    },
  };

  // "Also reached by": the other move orders across turns at the position on screen. The path's notations as one
  // string, so that the book is asked again only when the path changes, not at each result of the engine.
  const notations = $derived.by(() => {
    const all = [[], ...current.map((_, k) => current.slice(0, k + 1))].map(notationAt);
    return all.every(n => n !== undefined) ? all.join("\n") : "";
  });
  $effect(() => {
    const pl = place, b = book?.book, at = pl?.at, path = current, ns = notations;
    if (!pl) return;
    const q = at?.state === "in" ? at.position : null;
    if (!b || !q || !path.length || !ns) { pl.also = []; return; }
    let stale = false;
    alsoReached(b, q, path, ns.split("\n")).then(also => { if (!stale) pl.also = also; }, () => { if (!stale) pl.also = []; });
    return () => { stale = true; };
  });

  /** Plays a line from the start (the view's `onplay`): a book move played goes on to the end of its main line, as
   *  the fold's lines do. A line that is in the tree already only goes there. */
  async function play(path: string[]) {
    const g = game;
    if (!g || known(path)) return;
    let line = path;
    const b = book?.book;
    if (b) {
      try {
        // The book's position before the last edge, as the player reaches it: the line goes on only where each edge
        // before is a book move
        const along = await positionsAlong(b, path.slice(0, -1)), q = along.length === path.length ? along.at(-1)! : null;
        const m = q && bookMove(q, path.at(-1)!);
        if (q && m) line = [...path, ...(await bookLine(b, q, m)).slice(1)];
      } catch { /* the book's part did not load: the line alone */ }
    }
    await g.playLine(line);
  }

  /** "Back to the main line" (design 32, item 5): the last position of the path on the main line, where the path left
   *  it. The path's own edges count, so a move order or a mirror image that reaches a position of the main line has
   *  left it at its first edge that differs. */
  const offMain = $derived(mainIndex(current, mainNames) === null);
  function backToMain() {
    void view?.visit(current.slice(0, sharedLength(current, mainNames)));
    trackOnce("openings back to main", "feature", { feature_name: "back to main line" });
  }
  // "Open in Analysis" (design 32, item 2): the path on the Analysis board, as a record that it opens at its end
  const analysisHref = $derived(`/analysis#${new URLSearchParams(current.length
    ? { record: current.join(" "), at: String(current.length), via: "openings" } : { position: STANDARD_START, via: "openings" })}`);

  /** Where the view opens: the kept place, or the end of a brought line (or `at` on it), and where the visit came
   *  from. */
  interface Opening { at: string[]; line?: string[]; from: From }
  const cannotOpen = (e: unknown) =>
    `Openings cannot open this record: ${errorText(e).replace(/\.?$/, ".")} Openings shows your last position instead.`;
  async function chooseOpening(): Promise<Opening> {
    const at = readLocal(AT_KEY), keptAt = at ? at.split(" ") : [];
    const hash = location.hash.slice(1);
    if (!hash) { startAnalytics(); return { at: keptAt, from: "page" }; }
    const p = new URLSearchParams(hash), record = p.get("record"), via = p.get("via");
    await replaceState("/openings", {}); // async: the address changes only once it resolves
    startAnalytics();
    const from: From = via === "review" || via === "analysis" ? via : "link";
    if (!record) return { at: [], from };
    try {
      const { main: line, start, komi } = boardOfRecord(readPasted(record).record);
      if (start) throw new Error("the book starts at the standard start, and this record does not");
      broughtKomi = !!komi;
      const n = Math.floor(Number(p.get("at") ?? line.length));
      return { at: keptAt, line: line.slice(0, Number.isNaN(n) ? line.length : Math.max(0, n)), from };
    } catch (e) {
      notice = cannotOpen(e);
      return { at: keptAt, from };
    }
  }

  onMount(async () => {
    const mainLoad = bookMain(); // the book's main line loads while the engine does
    try {
      await session.load();
      const opening = chooseOpening(), kept = dbGet<KeptBoard>(STORES.branches, OPENINGS_ID);
      const options = { board: true, fixedMain: true, viewValues: bookValues };
      const g = await session.start(pool => new GameAnalysis(enclosure, pool, [], OPENINGS_ID, null, options), async (g, pool) => {
        const [chosen, board] = await Promise.all([opening, kept]);
        await g.start();
        if (board) await g.loadBoard(board);
        game = g; // the main line's book moves need the tree's notation (notationAt)
        await setMain(g, mainLoad);
        // The stored results of the board's lines, read before the board shows, as the Analysis board reads its own
        const model = modelOf(session.manifest!, session.network)?.sha256;
        if (g.rulesReady && pool.search && model) await g.fromStore(pool.search, model).catch(() => {});
        let at = chosen.at;
        if (chosen.line) {
          try {
            await play(chosen.line);
            at = chosen.line;
          } catch (e) {
            notice = cannotOpen(e);
          }
        }
        await dbPut(STORES.branches, OPENINGS_ID, g.keptBoard());
        start = current = known(at) ? at : [];
      });
      if (!g) return; // another network took over
      track("openings_open", { openings_from: (await opening).from });
      await g.sweep();
    } catch (e) {
      error = errorText(e);
      track("engine_error", { error_kind: "load" });
    }
  });
  onDestroy(() => session.end());
</script>

<PageMeta title="Openings · Hedge School"
          description="The opening book of Enclosure: the engine's main line, every fine move near the start, and the traps with their refutations." />

{#if failure}
  <p class="{MESSAGE} text-blunder">{failure}</p>
{:else if game?.error && !game.rulesReady}
  <p class="{MESSAGE} text-blunder">The engine could not read this board: {game.error}</p>
{:else if R && game && start}
  {@const g = game}
  {#if notice}<p class="{MESSAGE} mb-0 text-blunder" role="alert">{notice}</p>{/if}
  {#if broughtKomi}
    <p class="{MESSAGE} mb-0" role="status">The opening book is at komi 0. Openings does not use the komi of this record.</p>
  {/if}
  <!-- The engine header's note says why the engine waits, only while its switch is on: with the switch off, the header
       says what it says on the Analysis board. -->
  <ReviewView bind:this={view} view={openingsView} {R} game={g} deepVisits={engine.visits} onposition={path => (current = path)} {start}
              onplay={play} reviewVisits={budget} labelVisits={LABEL_VISITS} {engine} {fold} engineNote={waits && engine.on ? WAITS : null}
              onengine={(change: Partial<EngineSettings>) => { trackSettingChange(change, engine, false); Object.assign(engine, change); }}
              onfeature={name => trackOnce(`openings ${name}`, "feature", { feature_name: name })} gpu={session.gpuView}
              board={{ judged: g.judgedMain }}>
      <!-- The way back and the Analysis board, in the step bar: on a phone it is fixed to the window's foot, so the way
           back is in view whenever the board is. There each takes its short words, so that the bar keeps two rows:
           its full words stay its name. -->
      {#snippet tools()}
        <button class="px-2.5 whitespace-nowrap" disabled={!offMain} onclick={backToMain} aria-label="Back to the main line"
                title="Back to the main line"><span class="sm:hidden">Main line</span><span class="max-sm:hidden">Back to the main line</span></button>
        <a class="inline-block px-2.5 py-[0.3rem] text-ink whitespace-nowrap no-underline bg-panel-2 border border-line rounded hover:border-accent"
           href={analysisHref} aria-label="Open in Analysis" title="Open in Analysis"><span class="sm:hidden">Analysis</span><span class="max-sm:hidden">Open in Analysis</span></a>
      {/snippet}
    </ReviewView>
{:else}
  <!-- The board's skeleton until the board shows, from the prerendered page on, as the Analysis board's. -->
  {@render reviewSkeleton(enclosureView, false, loadDisplay().win === "gauge", PLAYERS, true)}
{/if}
