<script lang="ts">
  // Tak's board (docs/design/34-tak-site.md, "The board"), drawn from a position: the squares with their files and ranks,
  // and each square's stack (pieces.ts). It has no rules and takes no move. The board is one stop of the Tab key, and the
  // arrow keys, Home and End walk its squares as the screen shows them (squares.ts). Each square says its stack in words.
  // The board tells the page which square is pointed at, for the line with its whole stack (squares.ts, stackLine).
  import { drawStack, overhang, raisedLine } from "./pieces.ts";
  import { PLAYER_NAMES, type BoardPosition } from "./position.ts";
  import { fileName, squareAt, squareByKey, squareWords } from "./squares.ts";

  interface Props {
    position: BoardPosition;
    turned?: boolean; // seen from Black's side
    /** The square under the mouse, else the one with the keyboard's focus or the last one tapped, else null. */
    onpoint?: (square: number | null) => void;
  }
  let { position, turned = false, onpoint }: Props = $props();

  const size = $derived(position.size);
  const side = $derived(size * 100);
  // The room of the files and the ranks, and their letters' size: a part of the board's side, so that they are as large
  // on a board of 8x8 as on one of 3x3. The room over the board is for the tallest pile of the row farthest away.
  const margin = $derived(side * 0.052), letter = $derived(side * 0.035);
  const room = $derived(overhang(size) + 2);
  const indexes = $derived(Array.from({ length: size }, (_, i) => i));

  let width = $state(0); // the board's width in pixels, 0 before the page has measured it
  const pixels = $derived(width ? (width / (side + margin + 1)) * 100 : 90); // a square's side

  let walked = $state(0); // the square that the Tab key comes to
  const current = $derived(walked < size * size ? walked : 0);

  let hovered: number | null = null; // under the mouse
  let held: number | null = null; // with the focus, or tapped
  function point(to: { hovered?: number | null; held?: number | null }) {
    ({ hovered = hovered, held = held } = to);
    onpoint?.(hovered ?? held);
  }

  function onkeydown(ev: KeyboardEvent & { currentTarget: SVGGElement }, square: number) {
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    const to = squareByKey(size, square, ev.key, turned);
    if (to === null) return;
    walked = to;
    ev.currentTarget.ownerSVGElement?.querySelector<SVGGElement>(`[data-square="${to}"]`)?.focus();
    // The page's own keys (the review's arrows walk the game) stay out of a key that the board takes.
    ev.preventDefault();
    ev.stopPropagation();
  }
</script>

<div role="presentation" bind:clientWidth={width} onpointerleave={() => point({ hovered: null })}>
  <svg class="board" viewBox="{-margin} {-room} {side + margin + 1} {side + margin + room}" role="grid"
       aria-label="Tak board, {size} by {size}, {PLAYER_NAMES[position.mover]} to move"
       style:--raised="{raisedLine(pixels)}px">
    <!-- The rows from the one farthest away: a pile can reach into the square behind it, and paints over it. -->
    {#each indexes as row (row)}
      <g role="row">
        {#each indexes as column (column)}
          {@const square = squareAt(size, column, row, turned)}
          {@const stack = position.squares[square]}
          {@const drawing = drawStack(stack, size, pixels)}
          <g role="gridcell" tabindex={square === current ? 0 : -1} data-square={square}
             aria-label={squareWords(size, square, stack)} transform="translate({column * 100} {row * 100})"
             onkeydown={ev => onkeydown(ev, square)}
             onpointerenter={ev => { if (ev.pointerType === "mouse") point({ hovered: square }); }}
             onpointerdown={() => point({ held: square })}
             onfocus={() => { walked = square; point({ held: square }); }}
             onblur={() => { if (held === square) point({ held: null }); }}>
            <rect class="square" width="100" height="100" />
            {#each drawing.shapes as { shape: [tag, attributes], owner, part }, i (i)}
              <svelte:element this={tag} {...attributes} class={["piece", part, owner ? "black" : "white"]} />
            {/each}
            {#if drawing.count}
              {@const { text, x, y, size: font, on } = drawing.count}
              <text class={["count", on === null ? "on-square" : on ? "on-black" : "on-white"]} {x} {y} font-size={font}
                    text-anchor={on === null ? "start" : "middle"}>{text}</text>
            {/if}
            <rect class="focus" x="3" y="3" width="94" height="94" rx="4" />
          </g>
        {/each}
      </g>
    {/each}
    <g class="edge" aria-hidden="true" font-size={letter}>
      {#each indexes as i (i)}
        {@const file = turned ? size - 1 - i : i}
        <text x={i * 100 + 50} y={side + margin * 0.76} text-anchor="middle">{fileName(file)}</text>
        <text x={-margin / 2} y={i * 100 + 50 + letter * 0.35} text-anchor="middle">{turned ? i + 1 : size - i}</text>
      {/each}
    </g>
  </svg>
</div>

<style>
  .board { display: block; width: 100%; height: auto; user-select: none; }
  .square { fill: var(--board-bg); stroke: var(--board-line); stroke-width: 1.5; }
  [role="gridcell"]:focus { outline: none; }
  .focus { fill: none; stroke: none; pointer-events: none; }
  [role="gridcell"]:focus-visible .focus { stroke: var(--accent); stroke-width: 5; }
  .piece { stroke-width: 1.25px; vector-effect: non-scaling-stroke; }
  .piece.raised { stroke-width: var(--raised); }
  .piece.pile { stroke-width: 0.9px; }
  .piece.bar { stroke-width: 0.6px; }
  .white { fill: var(--piece-white); stroke: var(--piece-white-line); }
  .black { fill: var(--piece-black); stroke: var(--piece-black-line); }
  /* The height, only while the square is pointed at with a mouse or has the keyboard's focus. */
  .count { display: none; font-weight: 700; pointer-events: none; }
  [role="gridcell"]:focus-visible .count { display: inline; }
  @media (hover: hover) { [role="gridcell"]:hover .count { display: inline; } }
  .on-square { fill: var(--text); }
  .on-white { fill: var(--piece-black); }
  .on-black { fill: var(--piece-white); }
  .edge text { fill: var(--muted); }
</style>
