<script lang="ts">
  // The book's table lab (design 32, item 3 and "The table"): the board and the book's table (BookTable) on the test
  // book, so that the table can be checked and looked at before the review, the Analysis board and Openings take it
  // (beads abscls-tpaj.6, .7 and .12). Each row shows its label's badge and its symbol with no words, as their
  // titles hold them, and its win chance with the bounds as its title (beads abscls-tpaj.16). The dev and preview
  // servers serve the test book at /test-book/ (vite.config.ts, `testBook`), and no build holds it: where it is not
  // served, the page goes home.
  //
  // The page has no engine. It draws the board from the book's positions, which the book's moves reach by their
  // notation, with no regions. A move outside the book shows on the board as a preview edge on the position before
  // it, and the page goes no further. The review and the boards draw the engine's positions.
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Board from "#lib/board/Board.svelte";
  import StepBar from "@abstractclass/review/StepBar.svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import BookTable from "#lib/book/BookTable.svelte";
  import { OpeningBook, type BookAt } from "#lib/book/lookup.svelte.ts";
  import { bookMove } from "#lib/book/book.ts";
  import { bookRows, rowBoardLine, rowCandidates } from "#lib/book/rows.ts";
  import { bestMoveSentence, moveSentence } from "#lib/book/sentences.ts";
  import { edgeName, sameEdge, type Edge, type Position } from "#lib/review/enclosure.ts";
  import { LINE_STEP_MS } from "@abstractclass/review/lineDrawing.svelte.ts";
  import { parseEdge } from "#lib/engine/notation.ts";
  import { readPosition } from "#lib/editor/position.ts";
  import { lineBoard } from "#lib/learn/lessons.ts";
  import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";

  const BOOKS = { prototype: "/test-book/prototype/index.json", cases: "/test-book/cases/index.json" } as const;
  type Which = keyof typeof BOOKS;
  const KEPT = "hedge-school:lab-book-table:1"; // the table's choice, as the review and the boards keep theirs, each apart
  const kept = readLocalJson<{ show?: "book" | "candidates" }>(KEPT) ?? {};

  let which = $state<Which>("prototype");
  let book = $state.raw(new OpeningBook(BOOKS.prototype));
  let show = $state<"book" | "candidates">(kept.show ?? "book");
  let pointed = $state<string | null>(null);
  let path = $state<string[]>([]); // the edges played from the start
  let at = $state(0); // the edges of the path on screen
  $effect(() => writeLocal(KEPT, JSON.stringify({ show })));

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

  // The book at each position of the path, from the start: out after a move outside the book, loading while its part
  // loads. A position that does not hold the book yet ends the path that the page knows.
  const start = $derived(book.book?.start);
  const ats = $derived.by(() => {
    const list: BookAt[] = [];
    let n: string | null | undefined = start;
    for (let k = 0; n !== undefined; k++) {
      const a: BookAt = n === null ? { state: "out" } : book.at(n);
      list.push(a);
      if (k === path.length) break;
      n = a.state === "in" ? bookMove(a.position, path[k])?.to ?? null : a.state === "out" ? null : undefined;
    }
    return list;
  });
  // The book's positions on the path: null outside the book, undefined while a part loads
  const positions = $derived(ats.map(a => (a.state === "in" ? a.position : a.state === "out" ? null : undefined)));
  const here = $derived(positions[at]);
  const view = $derived<BookAt>(!start ? book.at("") : ats[at] ?? { state: "loading" });
  // The last book position on the path, which the board shows outside the book
  const lastIn = $derived(positions.slice(0, at + 1).findLastIndex(p => !!p));
  const rows = $derived(view.state === "in" ? bookRows(view.position) : []);
  const showsBook = $derived(view.state === "in" && show === "book");

  // The board: the book's position, or the last book position with the move outside the book as a preview
  const boardOf = (notation: string): Position => ({ ...lineBoard(notation), count: readPosition(notation).count, notation });
  const shown = $derived(positions[lastIn]); // here, or the last book position before it
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
    playing = setInterval(() => { if (at < path.length) at++; else clearInterval(playing); }, LINE_STEP_MS);
  }
  const step = (k: number) => { clearInterval(playing); pointed = null; at = Math.max(0, Math.min(path.length, k)); };

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
    The table on the test book, not the engine's book. Point at a row to show its line on the board. Point at a label
    or at a symbol to show its words, and at a win chance to show its bounds. Click a row to play its move. Press Tab to put the focus on the table. Press the up and down keys to go to a different row, Enter
    to play the move, and Escape to remove the focus from the table. Press the left and right keys to go back or
    forward one edge. Press o to show or hide the book.
  </p>
  <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3 text-sm">
    <label class="flex items-center gap-1.5">Book
      <select class="input py-0.5" value={which} onchange={e => choose(e.currentTarget.value as Which)}>
        <option value="prototype">The third prototype's book</option>
        <option value="cases">The hand-made cases (a part fails)</option>
      </select>
    </label>
  </div>

  <div class="grid gap-4 min-[800px]:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
    <div class="max-w-[640px] w-full">
      {#if board}
        <Board position={board} candidates={showsBook ? rowCandidates(rows) : []} highlight={pointed ? parseEdge(pointed) : null}
               {line} preview={outsideEdge} previewPlayer={board.player}
               oncandidate={e => (pointed = e ? edgeName(e) : null)}
               oncandidateclick={e => { const r = rows.find(x => sameEdge(parseEdge(x.move), e)); if (r) play([r.move]); }} />
      {:else}
        <div class="aspect-square rounded-md bg-panel-2"></div>
      {/if}
    </div>

    <div class="flex flex-col gap-3 min-w-0 min-[800px]:max-h-[44rem]">
      <BookTable at={view} source={book.source} {rows} bind:show bind:pointed onplay={play} onretry={() => book.retry()}>
        {#snippet candidates()}
          <p class="py-2 text-sm text-muted">The lab has no engine. On the review and the Analysis board, the engine's candidates show here.</p>
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
