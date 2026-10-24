<script lang="ts">
  // The book's table (design 32, items 3, 7, 9, 10 and 11), in the analysis column in the place of the engine's
  // candidates. Its title row has the switch "Book" or "Candidates", the position with its symbol, the book's source
  // and "Show the values". Then the book's rows in their groups (rows.ts), or the page's candidates (`candidates`),
  // and under the table a slot for the sentence of the row pointed at or of the best move (`sentence`). The page owns
  // the choices that the browser keeps (`show`, `values`), the key o, the board and what a played move does
  // (`onplay`). The table and the board point at each other through `pointed`: the table sets it on hover and focus,
  // and the board's numbers set it from outside.
  //
  // The keys (item 9): Tab puts the focus on the table's row (one stop for the whole table), the up and down keys move
  // between the rows, Enter or Space plays the row's move (or a trap and its refutation), and Escape returns the focus
  // to the page. When the rows go while one has the focus, the focus goes to the switch. On a phone (item 10), a tap
  // anywhere on a row plays it.
  import type { Snippet } from "svelte";
  import { Switch } from "bits-ui";
  import { SWITCH, SWITCH_THUMB } from "#lib/ui/settings.ts";
  import LabelBadge from "#lib/review/LabelBadge.svelte";
  import { LABEL_TEXT, moverWin, pct, PLAYER_NAME } from "#lib/review/enclosure.ts";
  import { playerOf } from "#lib/engine/position.ts";
  import BookSymbol from "./BookSymbol.svelte";
  import type { BookAt } from "./lookup.svelte.ts";
  import type { BookPosition, BookSource } from "./form.ts";
  import { bookCount, GROUP_TITLES, positionTitle, type BookRow } from "./rows.ts";
  import { endSentence, refutationText } from "./sentences.ts";
  import { positionSymbol } from "./symbols.ts";

  interface Props {
    /** The book at the position on screen (lookup.svelte.ts, OpeningBook `at`). */
    at: BookAt;
    /** Where the book comes from (OpeningBook `source`). */
    source: BookSource | null;
    /** The position's rows (rows.ts, bookRows): the page computes them once, for the table and for the board. */
    rows: BookRow[];
    /** What the table shows: the player's choice, which the page keeps. Outside the book it shows the candidates. */
    show: "book" | "candidates";
    /** "Show the values": the win chances, the bounds and the book's depth. Closed by default. */
    values: boolean;
    /** The edge pointed at, in the table or on the board (its number): its row is lit, and the board draws its line. */
    pointed: string | null;
    /** Plays edges from the position on screen: a row's move, or a trap with its refutation. */
    onplay: (edges: string[]) => void;
    /** "Try again" after a failed load (OpeningBook `retry`). */
    onretry: () => void;
    /** The engine's candidates: shown when the player chooses "Candidates", and outside the book. */
    candidates: Snippet;
    /** Under the title row outside the book: the line that names the last book position on the path (design 32,
     *  item 8). */
    outside?: Snippet;
    /** Under the table, where the position has book moves: the sentence of the book move pointed at or focused, or of
     *  the best move (null). */
    sentence?: Snippet<[BookRow | null, BookPosition]>;
  }
  let {
    at, source, rows, show = $bindable(), values = $bindable(), pointed = $bindable(),
    onplay, onretry, candidates, outside, sentence,
  }: Props = $props();

  const uid = $props.id();
  const position = $derived(at.state === "in" ? at.position : null);
  const mover = $derived(position ? playerOf(position.mover) : 0);
  const side = $derived(PLAYER_NAME[mover]);
  const showsBook = $derived(at.state !== "out" && show === "book");
  const moverPct = (blueWin: number) => pct(moverWin(blueWin, mover));
  /** Blue's bounds as the mover's: "38.7–64.2%". */
  const bounds = (low: number, high: number) => {
    const [a, b] = mover === 0 ? [low, high] : [1 - high, 1 - low];
    return `${(100 * a).toFixed(1)}–${pct(b)}`;
  };
  const made = $derived(source ? new Date(source.made).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

  // The rows that take the focus, in order: each row, and each trap's refutation under it.
  type Item = { row: BookRow; refutation: boolean };
  const items = $derived<Item[]>(rows.flatMap(row => [{ row, refutation: false },
    ...(row.book?.trap ? [{ row, refutation: true }] : [])]));
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
  // The rows go (the key o, or a move out of the book): no row stays pointed at, and a row that had the focus gives it
  // to the switch's chosen side, which stays, not to the page's start. Before the update, while the row is still there.
  let chips = $state<HTMLElement | null>(null);
  $effect.pre(() => {
    if (showsBook) return;
    pointed = null;
    if (!box?.contains(document.activeElement)) return;
    refocus = false;
    queueMicrotask(() => chips?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus());
  });
  const edgesOf = (item: Item) => (item.refutation ? [item.row.move, ...item.row.book!.trap!.refutation] : [item.row.move]);
  const play = (item: Item) => { pointed = null; onplay(edgesOf(item)); };

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

  // The sentence's row: the book move pointed at or focused, else null for the best move's sentence
  const sentenceRow = $derived(rows.find(r => r.move === pointed && r.book) ?? null);
  // The polite count of the position's book moves, once a step (item 9). A live region speaks when its text changes, and
  // two steps can have the same count: so the text is emptied at each new position, then set a moment later.
  let live = $state<HTMLElement | null>(null);
  $effect(() => {
    const text = position ? bookCount(position) : "", region = live;
    if (!region) return;
    region.textContent = "";
    const later = setTimeout(() => (region.textContent = text), 100);
    return () => clearTimeout(later);
  });
  const cols = $derived(values ? 5 : 3);
  const ROW = "cursor-pointer border-b border-line outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2";
  const CHIP = "px-2 py-0.5 text-xs font-medium border border-line first:rounded-l-md last:rounded-r-md -ml-px first:ml-0 disabled:cursor-not-allowed disabled:text-muted aria-pressed:bg-accent aria-pressed:border-accent aria-pressed:text-on-badge";
</script>

<section class="flex flex-col min-h-0 text-sm" aria-label="Opening book">
  <!-- The title row: the table's name and its switch, then the position, the source and "Show the values". They stay
       above the table, so they keep their place as the table changes height. -->
  <div class="flex items-center gap-2">
    <h2 class="flex-1 font-semibold" id="{uid}-title">{at.state === "out" ? "Not in the book" : "Opening book"}</h2>
    <div class="flex" role="group" aria-label="The table shows" bind:this={chips}>
      <button type="button" class={CHIP} aria-pressed={showsBook} disabled={at.state === "out"}
              title={at.state === "out" ? "Not in the book" : "The book's moves (o)"}
              aria-describedby={at.state === "out" ? `${uid}-title` : undefined}
              onclick={() => (show = "book")}>Book</button>
      <!-- Outside the book the candidates show already: a click there keeps the player's choice of "Book" -->
      <button type="button" class={CHIP} aria-pressed={!showsBook} title="The engine's candidates (o)"
              onclick={() => { if (at.state !== "out") show = "candidates"; }}>Candidates</button>
    </div>
  </div>
  {#if at.state === "out"}
    {@render outside?.()}
  {:else if showsBook}
    {#if position}
      {@const symbol = positionSymbol(position)}
      <p class="mt-0.5 text-xs text-muted">
        {positionTitle(position)} · <BookSymbol {symbol} />{values ? ` · ${side} ${moverPct(position.value.blueWin)} (${bounds(position.value.low, position.value.high)})` : ""}
      </p>
    {/if}
    <div class="flex items-center gap-2 mt-0.5 mb-1.5">
      <p class="flex-1 text-xs text-muted" title={source ? [`${source.name}.`, source.note, `Network ${source.network}, ${source.visits} visits for each position.`].filter(Boolean).join(" ") : undefined}>
        From the engine's analysis, not from games that people played.{source ? ` Book of ${made}.` : ""}
      </p>
      <label class="flex-none flex items-center gap-1.5 text-xs cursor-pointer">
        <Switch.Root checked={values} onCheckedChange={v => (values = v)} class={SWITCH}><Switch.Thumb class={SWITCH_THUMB} /></Switch.Root>
        Show the values
      </label>
    </div>
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
    <!-- The end of the book: its text, then the best move outside the book (and the game's move) in their rows -->
    {#if !position.moves.length}<p class="py-2">{endSentence(position)}</p>{/if}
    <div class="min-h-0 overflow-y-auto [scrollbar-gutter:stable]" bind:this={box} role="presentation"
         onpointerenter={() => (inside = true)} onpointerleave={() => { inside = false; pointed = null; }}>
      <table class="w-full border-collapse [&_:is(th,td)]:px-1 [&_:is(th,td)]:py-1 [&_:is(th,td)]:align-top [&_:is(th,td)]:text-left">
        <thead>
          <tr class="[&>th]:sticky [&>th]:top-0 [&>th]:z-1 [&>th]:bg-panel [&>th]:font-medium [&>th]:text-muted [&>th]:border-b [&>th]:border-line">
            <th class="w-7">#</th><th>Edge</th>
            {#if values}<th class="w-18">{side} wins</th><th class="w-16">Goes on</th>{/if}
            <th>Line ends</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row, k (row.move)}
            {#if k === 0 || rows[k - 1].group !== row.group}
              <tr><th colspan={cols} scope="rowgroup" class="pt-2! text-xs font-semibold text-muted">{GROUP_TITLES[row.group]}</th></tr>
            {/if}
            {@const item = items.findIndex(i => i.row === row && !i.refutation)}
            {@render moveRow(row, item)}
            {#if row.book?.trap}{@render refutationRow(row, item + 1, refutationText(position, row.book))}{/if}
          {/each}
        </tbody>
      </table>
    </div>
    {#if sentence && position.moves.length}<div class="mt-1.5">{@render sentence(sentenceRow, position)}</div>{/if}
  {/if}
  <p class="sr-only" aria-live="polite" bind:this={live}></p>
</section>

<!-- A move's row: its number as the board draws it, the edge with its label, then its values and the symbol at its
     line's end. A row outside the book and the game's row have "—" where the book has no value. -->
{#snippet moveRow(row: BookRow, item: number)}
  {@const lit = pointed === row.move}
  <tr data-item={item} data-move={row.move} tabindex={item === active ? 0 : -1}
      class={[ROW, lit && "bg-panel-2", row.game && "shadow-[inset_3px_0_0_var(--accent)]"]}
      onpointerenter={() => (pointed = row.move)} onfocus={() => { active = item; pointed = row.move; }}
      onclick={() => play(items[item])} {onkeydown}>
    <td><span class={["inline-flex items-center justify-center min-w-[1.3em] h-[1.3em] px-[0.2em] rounded-[0.3em] text-[0.8em] font-bold leading-none text-on-badge",
                      row.n === 1 ? "bg-engine" : "bg-candidate"]}>{row.n}</span></td>
    <td>
      <div class="flex flex-col">
        <span class={["font-mono", row.n === 1 && row.book && "font-semibold"]}>{row.move}</span>
        <span class="text-xs text-muted">
          {#if row.group === "yours" && row.game}
            {#if row.game.label}<LabelBadge label={row.game.label} />{/if}
            In your review: {row.game.label ? `${LABEL_TEXT[row.game.label]}, ` : ""}{row.game.blueWin !== undefined ? `${side} ${moverPct(row.game.blueWin)}` : ""} · not in the book
          {:else if row.label}
            <!-- In expressions: Svelte trims the white space at the start of a block -->
            <LabelBadge label={row.label} /> {LABEL_TEXT[row.label]}{row.book?.trap ? " · a trap" : row.ends ? " · the book ends here" : ""}{row.game ? " · your game" : ""}
          {/if}
        </span>
        {#if row.book?.trap}
          <span class="text-xs">Seems good: {side} {moverPct(row.book.trap.short)}. Is not: {side} {moverPct(row.book.value.blueWin)}.</span>
        {/if}
      </div>
    </td>
    {#if values}
      <td class="tabular-nums">
        {#if row.blueWin !== undefined}
          {moverPct(row.blueWin)}
          {#if row.book}
            <span class="block text-xs text-muted whitespace-nowrap">{bounds(row.book.value.low, row.book.value.high)}</span>
          {/if}
        {:else}<span class="text-muted">—</span>{/if}
      </td>
      <td>{#if row.turns !== undefined}{row.turns === 0 ? "This turn" : `${row.turns} turn${row.turns === 1 ? "" : "s"}`}{:else}<span class="text-muted">—</span>{/if}</td>
    {/if}
    <td>{#if row.symbol}<BookSymbol symbol={row.symbol} words={values ? "under" : "phone-under"} />{:else}<span class="text-muted">—</span>{/if}</td>
  </tr>
{/snippet}

<!-- A trap's refutation, in a row of its own under the trap, so that the player reads it before playing it. The row
     plays the trap and its refutation, edge by edge. -->
{#snippet refutationRow(row: BookRow, item: number, refutation: string)}
  <tr data-item={item} tabindex={item === active ? 0 : -1}
      class={[ROW, "hover:bg-panel-2"]}
      onpointerenter={() => (pointed = row.move)} onfocus={() => { active = item; pointed = row.move; }}
      onclick={() => play(items[item])} {onkeydown}>
    <td></td>
    <td colspan={cols - 1}>
      <span class="inline-block px-2 py-0.5 rounded-md border border-line bg-panel-2 text-xs">Play the refutation: {refutation}</span>
    </td>
  </tr>
{/snippet}
