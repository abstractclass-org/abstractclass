<script lang="ts">
  // The book's table (design 32, items 3, 7, 9, 10 and 11), in the analysis column in the place of the engine's
  // candidates. Its title row has the switch "Book" or "Candidates", then the position with its symbol and its win
  // chance. The heading's title gives the book's source. Then the book's rows in their groups (rows.ts), or the page's
  // candidates (`candidates`), and under the table a slot for the sentence of the row pointed at or of the best move
  // (`sentence`). Outside the book the table shows the candidates alone, as the page does with no book (item 8). The
  // page owns the choice that the browser keeps (`show`), the key o, the board and what a played move does (`onplay`).
  // The table and the board point at each other through `pointed`: the table sets it on hover and focus, and the
  // board's numbers set it from outside. By turn (`byTurn`), each row is a whole turn: it names its two edges, and it
  // plays both. The best turns show, and the rest after "Show more" (`more`).
  //
  // The keys (item 9): Tab puts the focus on the table's row (one stop for the whole table), the up and down keys move
  // between the rows, Enter or Space plays the row's edges (or a trap and its refutation), and Escape returns the focus
  // to the page. When the key o hides the rows while one has the focus, the focus goes to the switch. A move out of
  // the book removes the table, and the focus returns to the page. On a phone (item 10), a tap anywhere on a row plays
  // it.
  import type { Snippet } from "svelte";
  import LabelBadge from "@abstractclass/review/LabelBadge.svelte";
  import { LABEL_TEXT, moverWin, pct, PLAYER_NAME } from "#lib/review/enclosure.ts";
  import { playerOf } from "#lib/engine/position.ts";
  import BookSymbol from "./BookSymbol.svelte";
  import type { BookAt } from "./lookup.svelte.ts";
  import type { BookPosition, BookSource } from "./form.ts";
  import { bookCount, GROUP_TITLES, positionTitle, shownRows, TURN_GROUP_TITLES, type BookRow } from "./rows.ts";
  import { endSentence, refutationText } from "./sentences.ts";
  import { positionSymbol } from "./symbols.ts";
  import type { Label } from "@abstractclass/analysis/labels.ts";

  interface Props {
    /** The book at the position on screen (lookup.svelte.ts, OpeningBook `at`). */
    at: BookAt;
    /** Where the book comes from (OpeningBook `source`). */
    source: BookSource | null;
    /** The position's rows (rows.ts, bookRows or turnRows): the page computes them once, for the table and for the
     *  board. */
    rows: BookRow[];
    /** The rows are whole turns (rows.ts, turnRows). */
    byTurn?: boolean;
    /** By turn, "Show more" is open: the table shows the rows after the best turns too. The page keeps it, for the
     *  board's numbers. */
    more?: boolean;
    /** What the table shows: the player's choice, which the page keeps. Outside the book: the candidates alone. */
    show: "book" | "candidates";
    /** The row pointed at by its name, in the table or on the board (its number): it is lit, and the board draws its
     *  line. */
    pointed: string | null;
    /** Plays edges from the position on screen: a row's edges, or a trap with its refutation (`refutation`). */
    onplay: (edges: string[], refutation: boolean) => void;
    /** "Try again" after a failed load (OpeningBook `retry`). */
    onretry: () => void;
    /** The engine's candidates: shown when the player chooses "Candidates", and outside the book. */
    candidates: Snippet;
    /** Under the table, where the position has book moves: the sentence of the book move pointed at or focused, or of
     *  the best move (null). */
    sentence?: Snippet<[BookRow | null, BookPosition]>;
  }
  let {
    at, source, rows, byTurn = false, more = $bindable(false), show = $bindable(), pointed = $bindable(), onplay,
    onretry, candidates, sentence,
  }: Props = $props();

  const position = $derived(at.state === "in" ? at.position : null);
  const mover = $derived(position ? playerOf(position.mover) : 0);
  const side = $derived(PLAYER_NAME[mover]);
  const showsBook = $derived(at.state !== "out" && show === "book");
  const moverPct = (blueWin: number) => pct(moverWin(blueWin, mover));
  /** Blue's bounds as the mover's, the title of a win chance: "Between 38.7% and 64.2%." (KataGo's book bounds). */
  const bounds = (low: number, high: number) => {
    const [a, b] = mover === 0 ? [low, high] : [1 - high, 1 - low];
    return `Between ${pct(a)} and ${pct(b)}.`;
  };
  // The book's source, the heading's title
  const about = $derived(source ? [
    "This book comes from the engine's analysis, not from games that people played.", `${source.name}.`, source.note,
    `Network ${source.network}, ${source.visits} visits for each position.`,
    `Book of ${new Date(source.made).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`,
  ].filter(Boolean).join(" ") : undefined);

  // The rows that show: by turn, the best turns until the player opens "Show more". Its button comes after the last
  // book turn that shows (`moreAfter`), before the traps.
  const shown = $derived(shownRows(rows, more));
  const hidden = $derived(rows.length - shown.length);
  const moreAfter = $derived(hidden ? shown.findLastIndex(r => r.group === "fine" || r.group === "other") : -1);
  const titles = $derived(byTurn ? TURN_GROUP_TITLES : GROUP_TITLES);
  // The rows that take the focus, in order: each row, and each trap's refutation under it.
  type Item = { row: BookRow; refutation: boolean };
  const items = $derived<Item[]>(shown.flatMap(row => [{ row, refutation: false },
    ...(row.trap?.refutation.length ? [{ row, refutation: true }] : [])]));
  let active = $derived((void rows, 0)); // the item that takes the focus at Tab: the first, at each position
  let box = $state<HTMLElement | null>(null);
  // A key played a move: the focus goes to the first row of the new position once its rows show, also after its part
  // loads
  let refocus = false;
  $effect(() => {
    if (!rows.length || !refocus) return;
    refocus = false;
    queueMicrotask(() => box?.querySelector<HTMLElement>('[data-item="0"]')?.focus());
  });
  // The rows go: no row stays pointed at. After the key o, a row that had the focus gives it to the switch's chosen
  // side, which stays, not to the page's start. Before the update, while the row is still there.
  let chips = $state<HTMLElement | null>(null);
  $effect.pre(() => {
    if (showsBook) return;
    pointed = null;
    if (!box?.contains(document.activeElement)) return;
    refocus = false;
    queueMicrotask(() => chips?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus());
  });
  const edgesOf = (item: Item) => (item.refutation ? [...item.row.edges, ...item.row.trap!.refutation] : item.row.edges);
  const play = (item: Item) => { pointed = null; onplay(edgesOf(item), item.refutation); };

  function onkeydown(e: KeyboardEvent) {
    const k = Number((e.target as HTMLElement).dataset.item);
    if (Number.isNaN(k)) return;
    const focus = (j: number) => box?.querySelector<HTMLElement>(`[data-item="${j}"]`)?.focus(); // its onfocus sets active
    if (e.key === "ArrowDown" && k < items.length - 1) focus(k + 1);
    else if (e.key === "ArrowUp" && k > 0) focus(k - 1);
    else if (e.key === "Home") focus(0);
    else if (e.key === "End") focus(items.length - 1);
    else if (e.key === "Enter" || e.key === " ") { refocus = true; play(items[k]); }
    else if (e.key === "Escape") { pointed = null; (e.target as HTMLElement).blur(); }
    else if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    e.stopPropagation();
  }

  // A row pointed at on the board comes into view in the table's box
  let inside = false; // the pointer is on the table
  $effect(() => {
    if (!pointed || inside || !box) return;
    box.querySelector(`[data-move="${pointed}"]`)?.scrollIntoView({ block: "nearest" });
  });

  // The sentence's row: the book move or turn pointed at or focused, else null for the best one's sentence
  const sentenceRow = $derived(rows.find(r => r.move === pointed && r.book) ?? null);
  // The polite count of the position's book moves or turns, once a step (item 9). A live region speaks when its text
  // changes, and two steps can have the same count: so the text is emptied at each new position, then set a moment
  // later.
  let live = $state<HTMLElement | null>(null);
  $effect(() => {
    const text = position ? bookCount(rows, byTurn ? "turn" : "move") : "", region = live;
    if (!region) return;
    region.textContent = "";
    const later = setTimeout(() => (region.textContent = text), 100);
    return () => clearTimeout(later);
  });
  const ROW = "cursor-pointer border-b border-line outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2";
  const CHIP = "px-2 py-0.5 text-xs font-medium border border-line first:rounded-l-md last:rounded-r-md -ml-px first:ml-0 aria-pressed:bg-accent aria-pressed:border-accent aria-pressed:text-on-badge";
</script>

{#if at.state === "out"}
  {@render candidates()}
{:else}
<section class="flex flex-col min-h-0 text-sm" aria-label="Opening book">
  <!-- The title row: the table's name and its switch, then the position with its symbol and its win chance. They stay
       above the table, so they keep their place as the table changes height. -->
  <div class="flex items-center gap-2">
    <h2 class="flex-1 font-semibold" title={about}>Opening book</h2>
    <div class="flex" role="group" aria-label="The table shows" bind:this={chips}>
      <button type="button" class={CHIP} aria-pressed={showsBook} title="The book's moves (o)"
              onclick={() => (show = "book")}>Book</button>
      <button type="button" class={CHIP} aria-pressed={!showsBook} title="The engine's candidates (o)"
              onclick={() => (show = "candidates")}>Candidates</button>
    </div>
  </div>
  {#if showsBook && position}
    {@const symbol = positionSymbol(position)}
    <p class="mt-0.5 mb-1.5 text-xs text-muted">
      {positionTitle(position)} · <BookSymbol {symbol} /> · {@render winChance(position.value.blueWin, position.value, `${side} `)}
    </p>
  {/if}

  {#if !showsBook}
    {@render candidates()}
  {:else if at.state === "loading"}
    <p class="py-2 text-muted" role="status">Loading the book…</p>
  {:else if at.state === "failed"}
    <div class="py-2" role="alert">
      <p>The book did not load. Check your connection, then try again.</p>
      <button type="button" class="btn-secondary mt-1.5 px-3 py-0.5 text-xs" onclick={onretry}>Try again</button>
    </div>
  {:else if position && !rows.length}
    <p class="py-2">{endSentence(position)}</p>
  {:else if position}
    <!-- The end of the book: its text, then the best move outside the book in its row -->
    {#if !position.moves.length}<p class="py-2">{endSentence(position)}</p>{/if}
    <div class="min-h-0 overflow-y-auto [scrollbar-gutter:stable]" bind:this={box} role="presentation"
         onpointerenter={() => (inside = true)} onpointerleave={() => { inside = false; pointed = null; }}>
      <table class="w-full border-collapse [&_:is(th,td)]:px-1 [&_:is(th,td)]:py-1 [&_:is(th,td)]:align-top [&_:is(th,td)]:text-left">
        <thead>
          <tr class="[&>th]:sticky [&>th]:top-0 [&>th]:z-1 [&>th]:bg-panel [&>th]:font-medium [&>th]:text-muted [&>th]:border-b [&>th]:border-line [&>th]:whitespace-nowrap">
            <!-- Each head stays on one line. "Line ends" is as narrow as it can be on one line: its symbols are narrower
                 than its head, and the edge's or the turn's column takes the rest -->
            <th class="w-7">#</th><th>{byTurn ? "Turn" : "Edge"}</th><th class="w-18">{side} wins</th><th class="w-0">Line ends</th>
          </tr>
        </thead>
        <tbody>
          {#each shown as row, k (row.move)}
            {#if k === 0 || shown[k - 1].group !== row.group}
              <tr><th colspan="4" scope="rowgroup" class="pt-2! text-xs font-semibold text-muted">{titles[row.group]}</th></tr>
            {/if}
            {@const item = items.findIndex(i => i.row === row && !i.refutation)}
            {@render moveRow(row, item)}
            {#if row.trap?.refutation.length}
              {@render refutationRow(row, item + 1, refutationText(position, row.edges.length, row.trap.refutation))}
            {/if}
            {#if k === moreAfter}{@render showMore()}{/if}
          {/each}
        </tbody>
      </table>
    </div>
    {#if sentence && position.moves.length}<div class="mt-1.5">{@render sentence(sentenceRow, position)}</div>{/if}
  {/if}
  <p class="sr-only" aria-live="polite" bind:this={live}></p>
</section>
{/if}

<!-- A win chance for the side to move, with the book's bounds as its title only (KataGo's book bounds): for assistive
     technology, the bounds follow it in words. The best move outside the book has no bounds. -->
{#snippet winChance(blueWin: number, value: { low: number; high: number } | undefined, prefix = "")}
  {@const title = value && bounds(value.low, value.high)}
  <span {title}>{prefix}{moverPct(blueWin)}{#if title}<span class="sr-only"> {title}</span>{/if}</span>
{/snippet}

<!-- A row: its number as the board draws it, the edge with its quality label's badge after it, its win chance and the
     position symbol at its line's end, in a shade of its side's colour. Each edge takes the width of the longest edge
     (A10-D10, 7 characters of the monospaced font), so the badges line up. By turn, the row names its two edges. When
     the column has no room for both on one line, as in a window 360 pixels wide, the second edge and the badge go
     under the first edge: so the heads stay on one line, and the badges line up there too. The badge and the symbol
     show no words: their words are their titles and their names (design 32, item 3). A last line gives words only: a
     trap, or the book's end. -->
{#snippet moveRow(row: BookRow, item: number)}
  {@const lit = pointed === row.move}
  {@const note = row.trap ? "a trap" : row.ends ? "the book ends here" : ""}
  {@const edge = ["flex-none w-[7ch] font-mono", row.n === 1 && row.book && "font-semibold"]}
  <tr data-item={item} data-move={row.move} tabindex={item === active ? 0 : -1}
      class={[ROW, lit && "bg-panel-2"]}
      onpointerenter={() => (pointed = row.move)} onfocus={() => { active = item; pointed = row.move; }}
      onclick={() => play(items[item])} {onkeydown}>
    <td><span class={["inline-flex items-center justify-center min-w-[1.3em] h-[1.3em] px-[0.2em] rounded-[0.3em] text-[0.8em] font-bold leading-none text-on-badge",
                      row.n === 1 ? "bg-engine" : "bg-candidate"]}>{row.n}</span></td>
    <td>
      <div class="flex flex-col">
        <span class="flex flex-wrap items-center gap-x-1.5">
          {#if byTurn}<span class={edge}>{row.edges[0]}</span>{/if}
          <span class="flex items-center gap-1.5">
            <span class={edge}>{row.edges[byTurn ? 1 : 0] ?? ""}</span>
            {@render badge(row.label)}
          </span>
        </span>
        {#if note}<span class="text-xs text-muted">{note}</span>{/if}
        {#if row.trap}
          <span class="text-xs">Seems good: {side} {moverPct(row.trap.short)}. Is not: {side} {moverPct(row.blueWin)}.</span>
        {/if}
      </div>
    </td>
    <td class="tabular-nums">{@render winChance(row.blueWin, row.book?.value)}</td>
    <td>{#if row.symbol}<BookSymbol symbol={row.symbol} alone />{:else}<span class="text-muted">—</span>{/if}</td>
  </tr>
{/snippet}

<!-- A quality label's badge with its word as its title and its name: the row shows the badge only (design 32, item 3).
     LabelBadge itself stays hidden from assistive technology, for the move list and the Report, which give the word in
     their own text. -->
{#snippet badge(label: Label)}
  <span role="img" aria-label={LABEL_TEXT[label]} title={LABEL_TEXT[label]}><LabelBadge {label} /></span>
{/snippet}

<!-- A trap's refutation, in a row of its own under the trap, so that the player reads it before playing it. The row
     plays the trap's edges and its refutation, edge by edge. -->
{#snippet refutationRow(row: BookRow, item: number, refutation: string)}
  <tr data-item={item} tabindex={item === active ? 0 : -1}
      class={[ROW, "hover:bg-panel-2"]}
      onpointerenter={() => (pointed = row.move)} onfocus={() => { active = item; pointed = row.move; }}
      onclick={() => play(items[item])} {onkeydown}>
    <td></td>
    <td colspan="3">
      <span class="inline-block px-2 py-0.5 rounded-md border border-line bg-panel-2 text-xs">Play the refutation: {refutation}</span>
    </td>
  </tr>
{/snippet}

<!-- By turn: the button that shows the rest of the book turns, after the best ones. -->
{#snippet showMore()}
  <tr class="border-b border-line">
    <td></td>
    <td colspan="3">
      <button type="button" class="btn-secondary px-2 py-0.5 text-xs" onclick={() => (more = true)}>Show {hidden} more turn{hidden === 1 ? "" : "s"}</button>
    </td>
  </tr>
{/snippet}
