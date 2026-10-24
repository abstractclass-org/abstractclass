<script lang="ts">
  // The book's table lab (design 32, item 3): the board and the book's table (BookTable) on the test book, so that the
  // table can be checked and looked at before the review, the Analysis board and Openings take it (beads abscls-tpaj.6,
  // .7 and .12). The dev and preview servers serve the test book at /test-book/ (vite.config.ts, `testBook`), and no
  // build holds it: where it is not served, the page goes home.
  //
  // The page has no engine. It draws the board from the book's positions, which the book's moves reach by their
  // notation, with no regions. A move outside the book shows on the board as a preview edge on the position before
  // it, and the page goes no further. The review and the boards draw the engine's positions.
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Board from "#lib/board/Board.svelte";
  import StepBar from "#lib/ui/StepBar.svelte";
  import PageMeta from "#lib/PageMeta.svelte";
  import BookTable from "#lib/book/BookTable.svelte";
  import { OpeningBook, type BookAt } from "#lib/book/lookup.svelte.ts";
  import { bookRows, bookTo, rowBoardLine, rowCandidates, type BookRow, type GameMove } from "#lib/book/rows.ts";
  import { bestMoveSentence, moveSentence } from "#lib/book/sentences.ts";
  import type { BookPosition } from "#lib/book/form.ts";
  import { edgeName, sameEdge, type Edge, type Position } from "#lib/review/enclosure.ts";
  import { parseEdge } from "#lib/engine/notation.ts";
  import { moverOf, readPosition } from "#lib/editor/position.ts";
  import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";

  const BOOKS = { prototype: "/test-book/prototype/index.json", cases: "/test-book/cases/index.json" } as const;
  type Which = keyof typeof BOOKS;
  const KEPT = "hs-lab-book-table"; // the table's choices, as the review and the boards keep theirs, each apart
  const kept = readLocalJson<{ show?: "book" | "candidates"; values?: boolean }>(KEPT) ?? {};

  let which = $state<Which>("prototype");
  let book = $state.raw(new OpeningBook(BOOKS.prototype));
  let show = $state<"book" | "candidates">(kept.show ?? "book");
  let values = $state(kept.values ?? false);
  let pointed = $state<string | null>(null);
  let path = $state<string[]>([]); // the edges played from the start
  let at = $state(0); // the edges of the path on screen
  let gameMove = $state(""); // a game's move at the position on screen, for the table's row "Your game"
  $effect(() => writeLocal(KEPT, JSON.stringify({ show, values })));

  onMount(() => {
    // A deployed site does not serve the test book: the lab is for the dev and preview servers.
    fetch(BOOKS.prototype, { method: "HEAD" }).then(r => { if (r.status === 404) goto("/", { replaceState: true }); }, () => {});
  });

  function choose(w: Which) {
    which = w;
    book = new OpeningBook(BOOKS[w]);
    path = [];
    at = 0;
  }

  // The positions on the path, from the start: each one's notation (null after a move outside the book), and the book
  // there (undefined while its part loads). A move whose position still loads ends the path that the page knows.
  const start = $derived(book.book?.start);
  const walk = $derived.by(() => {
    const notations: (string | null)[] = [], positions: (BookPosition | null | undefined)[] = [];
    let n: string | null | undefined = start;
    for (let k = 0; n !== undefined; k++) {
      const a: BookAt | null = n === null ? null : book.at(n);
      const p: BookPosition | null | undefined = a?.state === "in" ? a.position : a?.state === "out" || n === null ? null : undefined;
      notations.push(n);
      positions.push(p);
      if (k === path.length) break;
      n = p ? bookTo(p, path[k]) ?? null : p === null ? null : undefined;
    }
    return { notations, positions };
  });
  const positions = $derived(walk.positions);
  const here = $derived(positions[at]);
  const view = $derived<BookAt>(!start ? book.at("") : walk.notations[at] === null ? { state: "out" }
    : walk.notations[at] === undefined ? { state: "loading" } : book.at(walk.notations[at]!));
  // The last book position on the path, for the line outside the book
  const lastIn = $derived(positions.slice(0, at + 1).findLastIndex(p => !!p));
  const game = $derived.by<GameMove | null>(() => {
    const move = gameMove.trim().toUpperCase();
    if (!here || !/^[A-HJ-T]\d{1,2}-[A-HJ-T]\d{1,2}$/.test(move)) return null;
    return { move: edgeName(parseEdge(move)), label: "good", blueWin: here.value.blueWin };
  });
  const rows = $derived(view.state === "in" ? bookRows(view.position, game) : []);
  const showsBook = $derived(view.state === "in" && show === "book");

  // The board: the book's position, or the last book position with the move outside the book as a preview
  function boardOf(notation: string): Position {
    const p = readPosition(notation), { player, left } = moverOf(p.count);
    const of = (side: 0 | 1, marked?: boolean) => p.edges.filter(e => e.player === side && (marked === undefined || e.marked === marked)).map(e => e.edge);
    return {
      edges: [of(0), of(1)], protected: of((1 - player) as 0 | 1, true), placed: of(player, true), scores: p.scores,
      player, movesLeft: left, regions: [[], []], count: p.count, notation,
    };
  }
  const shown = $derived(here ?? (lastIn >= 0 ? positions[lastIn] : undefined));
  const board = $derived(shown ? boardOf(shown.position) : start ? boardOf(start) : null);
  const outsideEdge = $derived<Edge | null>(here === null && lastIn === at - 1 ? parseEdge(path[at - 1]) : null);
  const pointedRow = $derived(rows.find(r => r.move === pointed));
  const line = $derived(showsBook && pointedRow && book.book && here ? rowBoardLine(book.book, here, pointedRow) : null);

  // Plays edges from the position on screen, edge by edge (a trap and its refutation), at the review's pace
  let playing: ReturnType<typeof setInterval> | undefined;
  function play(edges: string[]) {
    clearInterval(playing);
    pointed = null;
    path = [...path.slice(0, at), ...edges];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || edges.length === 1) { at = path.length; return; }
    at++;
    playing = setInterval(() => { if (at < path.length) at++; else clearInterval(playing); }, 450);
  }
  const step = (k: number) => { clearInterval(playing); pointed = null; at = Math.max(0, Math.min(path.length, k)); };
  const playRow = (r: BookRow) => play([r.move]);

  function onkeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (e.ctrlKey || e.metaKey || e.altKey || target.closest("input, select, textarea")) return;
    if (e.key === "ArrowLeft") step(at - 1);
    else if (e.key === "ArrowRight") step(at + 1);
    else if (e.key === "Home") step(0);
    else if (e.key === "End") step(path.length);
    else if (e.key === "o") show = show === "book" ? "candidates" : "book";
    else return;
    e.preventDefault();
  }
</script>

<svelte:window {onkeydown} />
<PageMeta title="Book table lab · Hedge School" noindex />

<main class="mx-auto max-w-6xl px-4 py-4">
  <h1 class="text-lg font-semibold">The book's table</h1>
  <p class="mb-3 text-sm text-muted">
    The table on the test book, not the engine's book. Point at a row to draw its line, click it to play it. Tab puts
    the focus in the table: the up and down keys, Enter and Escape. The left and right keys step, and o turns the
    book on and off.
  </p>
  <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3 text-sm">
    <label class="flex items-center gap-1.5">Book
      <select class="input py-0.5" value={which} onchange={e => choose(e.currentTarget.value as Which)}>
        <option value="prototype">The third prototype's book</option>
        <option value="cases">The hand-made cases (a part fails)</option>
      </select>
    </label>
    <label class="flex items-center gap-1.5">The game's move here
      <input class="input w-28 py-0.5 font-mono" placeholder="D10-G13" bind:value={gameMove} />
    </label>
  </div>

  <div class="grid gap-4 min-[800px]:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
    <div class="max-w-[640px] w-full">
      {#if board}
        <Board position={board} candidates={showsBook ? rowCandidates(rows) : []} highlight={pointed ? parseEdge(pointed) : null}
               {line} preview={outsideEdge} previewPlayer={board.player}
               oncandidate={e => (pointed = e ? edgeName(e) : null)}
               oncandidateclick={e => { const r = rows.find(x => sameEdge(parseEdge(x.move), e)); if (r) playRow(r); }} />
      {:else}
        <div class="aspect-square rounded-md bg-panel-2"></div>
      {/if}
    </div>

    <div class="flex flex-col gap-3 min-w-0 min-[800px]:max-h-[44rem]">
      <BookTable at={view} source={book.source} {rows} bind:show bind:values bind:pointed onplay={play} onretry={() => book.retry()}>
        {#snippet candidates()}
          <p class="py-2 text-sm text-muted">The lab has no engine. On the review and the Analysis board, the engine's candidates show here.</p>
        {/snippet}
        {#snippet outside()}
          {#if lastIn >= 0 && positions[lastIn]}
            <p class="mt-0.5 text-xs text-muted">Last book position: turn {positions[lastIn]!.turn}.
              <button type="button" class="text-accent underline" onclick={() => step(lastIn)}>Go there</button></p>
          {/if}
        {/snippet}
        {#snippet sentence(row, p)}
          <p class="text-sm">{row?.book ? moveSentence(p, row.book) : bestMoveSentence(p)}</p>
        {/snippet}
      </BookTable>

      <div class="pt-1.5 border-t border-line">
        <p class="mb-1.5 text-xs text-muted font-mono break-words" aria-label="The path">
          {path.length ? path.map((e, k) => (k < at ? e : `(${e})`)).join(" ") : "The start"}
        </p>
        <StepBar onfirst={() => step(0)} onback={() => step(at - 1)} onforward={() => step(at + 1)} onlast={() => step(path.length)}
                 atStart={at === 0} atEnd={at === path.length} />
      </div>
    </div>
  </div>
</main>
