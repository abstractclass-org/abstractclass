<script lang="ts" module>
  import { boxOf, center, GRID_TILE, gridTilePath, hexAt, hexPath, outlinePath, sameHex, type Box, type Hex } from "./hex.ts";
  import type { BlueprintNumber, Hand, HandHex, Kind, Player } from "./position.ts";
  import { piecesOf } from "./position.ts";
  import Cell, { CELL_SIZE } from "./Cell.svelte";
  import { DEFAULT_VARIANT, type CandidateLook, type FirstMark } from "./variants.ts";

  /** A cell moved within the hand, as the hand draws it: the last move's edit, a candidate's, or a line's. */
  export interface HandEdit { from: HandHex; to: HandHex; kind: Kind }
  export interface HandMarks {
    last?: HandEdit | null;
    candidates?: (HandEdit & { name: string; rank: number })[];
    placed?: { blueprint: BlueprintNumber; name: string; rank: number }[]; // the placements' blueprints, for their chips
    lit?: string | null; // the candidate pointed at
    line?: (HandEdit & { n: number })[];
  }
  /** The part of each blueprint's frame that the hand shows: its cells, its first cell (0, 0) also when it is empty,
   *  and the hexes of the edits drawn on it, with room above for the first cell's mark. */
  export function blueprintBoxes(hand: Hand, marks: HandMarks, first: FirstMark = DEFAULT_VARIANT.first): Box[] {
    const above = first === "pointer" ? 0.8 : first === "outline" ? 0.3 : 0;
    const edits = [marks.last, ...(marks.candidates ?? []), ...(marks.line ?? [])].filter(e => !!e);
    return hand.map((b, i) => {
      const n = (i + 1) as BlueprintNumber;
      const hexes: Hex[] = [[0, 0], ...piecesOf(b).map(p => p.hex)];
      for (const e of edits) for (const h of [e.from, e.to]) if (h.blueprint === n) hexes.push(h.hex);
      const box = boxOf(hexes)!;
      return { ...box, y0: Math.min(box.y0, -1 - above) };
    });
  }
  /** The room round a blueprint in its panel, in pixels, and the panel's label. */
  export const PANEL_PAD = 6;
  const LABEL = 16;
</script>

<script lang="ts">
  // A player's hand: the three blueprints, numbered 1 to 3, each in its own panel in the player's colour, in a row or
  // in a column. Each panel draws the blueprint's frame: its grid, and its first cell (0, 0) ringed, so that a reader
  // can count an edit's coordinates (`I:q,r>J:q,r`, design 33, item 5). The edits drawn: the last move's (the cell
  // ringed at its new place, its old place dashed, and an arrow between them), the candidates' (their ranks), and a
  // line's (its numbers). All hands of a board share one scale (`unit`), so that the same shape has the same size.
  interface Props {
    hand: Hand;
    player: Player;
    width: number;
    height: number;
    direction: "row" | "column";
    unit: number; // pixels per unit (a hex's radius)
    boxes: Box[]; // blueprintBoxes(hand, marks)
    marks?: HandMarks;
    hover?: HandHex | null;
    onhover?: (at: HandHex | null) => void;
    onpick?: (at: HandHex) => void; // a click on a hex of a blueprint's frame
    first?: FirstMark; // the first cell's mark (lib/board/variants.ts)
    look?: CandidateLook; // the candidates' look: its `hand` puts chips in the hand
  }
  let {
    hand, player, width, height, direction, unit, boxes, marks = {}, hover = null, onhover, onpick,
    first = DEFAULT_VARIANT.first, look = DEFAULT_VARIANT.candidates,
  }: Props = $props();

  const uid = $props.id();
  const gridId = `${uid}-grid`;
  const tile = gridTilePath();
  // Each panel's place in the hand, and the point of the panel where the blueprint's frame has its origin, so that the
  // blueprint's box sits in the panel's middle.
  const panels = $derived(hand.map((b, i) => {
    const w = direction === "row" ? width / 3 : width, h = direction === "row" ? height : height / 3;
    const x = direction === "row" ? i * w : 0, y = direction === "row" ? 0 : i * h;
    const box = boxes[i];
    const ox = x + w / 2 - ((box.x0 + box.x1) / 2) * unit, oy = y + h / 2 - ((box.y0 + box.y1) / 2) * unit;
    return { n: (i + 1) as BlueprintNumber, x, y, w, h, ox, oy, pieces: piecesOf(b) };
  }));
  /** A hex of a blueprint, in the hand's pixels. */
  const at = (h: HandHex): [number, number] => {
    const p = panels[h.blueprint - 1], [x, y] = center(h.hex);
    return [p.ox + x * unit, p.oy + y * unit];
  };
  const gap = 3; // between two panels
  // The first cell's marks, in the frame's units, with a least width in pixels for a small hand (a phone).
  const ringWidth = $derived(Math.max(0.12, 1.6 / unit));
  const outlineWidth = $derived(Math.max(0.16, 2.2 / unit));
  const dot = $derived(Math.max(0.3, 3.5 / unit));
  // The ring is inside the cell's edge, so that a neighbour's edge or the grid never meets it: its width is the same
  // all round. A path's stroke is centred on it, and the hex's radius is its side's distance times 2 / √3.
  const ringPath = $derived(hexPath(0, 0, CELL_SIZE - ringWidth / Math.sqrt(3)));
  const chipsOf = (n: BlueprintNumber) => (marks.placed ?? []).filter(c => c.blueprint === n).sort((a, b) => a.rank - b.rank);

  let svg: SVGSVGElement;
  function pointed(ev: MouseEvent): HandHex | null {
    const r = svg.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
    const p = panels.find(p => px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + p.h);
    return p ? { blueprint: p.n, hex: hexAt((px - p.ox) / unit, (py - p.oy) / unit) } : null;
  }
  const sameAt = (a: HandHex | null, b: HandHex | null) =>
    a === b || (!!a && !!b && a.blueprint === b.blueprint && sameHex(a.hex, b.hex));
  function move(ev: PointerEvent) {
    if (ev.pointerType !== "mouse") return;
    const h = pointed(ev);
    if (!sameAt(h, hover)) onhover?.(h);
  }
</script>

<!-- An arrow from a cell's old place to its new place, with its head short of the new place's centre. -->
{#snippet arrow(e: HandEdit, cls: string, solid = false)}
  {@const [x1, y1] = at(e.from)}
  {@const [x2, y2] = at(e.to)}
  {@const d = Math.hypot(x2 - x1, y2 - y1)}
  {#if d > unit}
    {@const ux = (x2 - x1) / d}
    {@const uy = (y2 - y1) / d}
    {@const tx = x2 - ux * 0.55 * unit}
    {@const ty = y2 - uy * 0.55 * unit}
    {@const head = 5}
    <line {x1} {y1} x2={tx - ux * head} y2={ty - uy * head} class="arrow {cls}" class:solid />
    <polygon points="{tx},{ty} {tx - ux * head * 1.6 - uy * head},{ty - uy * head * 1.6 + ux * head} {tx - ux * head * 1.6 + uy * head},{ty - uy * head * 1.6 - ux * head}"
             class="arrow-head {cls}" />
  {/if}
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
<svg class="hand p{player}" {width} {height} role="img" bind:this={svg} onpointermove={move}
     onclick={ev => { const h = pointed(ev); if (h) onpick?.(h); }}
     onpointerleave={() => { if (hover) onhover?.(null); }}
     aria-label="{player === 0 ? 'Blue' : 'Red'}'s blueprints">
  <defs>
    <pattern id={gridId} patternUnits="userSpaceOnUse" width={GRID_TILE.width} height={GRID_TILE.height}>
      <path d={tile} class="grid" />
    </pattern>
  </defs>

  {#each panels as p (p.n)}
    {@const empty = !p.pieces.length}
    <rect x={p.x + gap / 2} y={p.y + gap / 2} width={p.w - gap} height={p.h - gap} rx="6" class="panel" />
    <svg x={p.x + gap / 2} y={p.y + gap / 2} width={p.w - gap} height={p.h - gap} overflow="hidden">
      <g transform="translate({p.ox - p.x - gap / 2} {p.oy - p.y - gap / 2}) scale({unit})">
        <rect x={(p.x - p.ox) / unit} y={(p.y - p.oy) / unit} width={p.w / unit} height={p.h / unit} fill="url(#{gridId})" />
        {#each p.pieces as c (`${c.hex}`)}
          <Cell hex={c.hex} owner={player} kind={c.kind} first={first === "fill" && c.hex[0] === 0 && c.hex[1] === 0} />
        {/each}
        <!-- An empty blueprint takes a cell only at its 0,0: its hex dashed, with the mark. -->
        {#if empty && first !== "ring"}
          <path d={hexPath(0, 0, CELL_SIZE)} class="empty-first" stroke-width={ringWidth} />
        {/if}
        {#if first === "ring"}
          <path d={ringPath} class="first-ring" stroke-width={ringWidth} />
        {:else if first === "outline"}
          {#if !empty}<path d={outlinePath(p.pieces.map(c => c.hex))} class="blueprint-outline" stroke-width={outlineWidth} />{/if}
          <circle cy="-1" r={dot} class="first-dot" />
        {:else if first === "pointer"}
          <path d="M0,-1.1L0.42,-1.8L-0.42,-1.8Z" class="first-dot" />
        {/if}
      </g>
    </svg>
    <rect x={p.x + gap / 2 + 3} y={p.y + gap / 2 + 3} width={LABEL} height={LABEL} rx="3" class="label" />
    <text x={p.x + gap / 2 + 3 + LABEL / 2} y={p.y + gap / 2 + 3 + LABEL / 2 + 4} class="label-number">{p.n}</text>
    <!-- The placements of this blueprint among the candidates: their ranks, at the panel's other corner. -->
    {#if look.hand && !marks.line?.length}
      {#each chipsOf(p.n) as c, k (c.name)}
        {@const x = p.x + p.w - gap / 2 - 3 - (k + 1) * LABEL - 2 * k}
        <g class="candidate chip" class:first={c.rank === 1} class:lit={marks.lit === c.name}>
          <rect {x} y={p.y + gap / 2 + 3} width={LABEL} height={LABEL} rx="4" class="cand-badge" />
          <text x={x + LABEL / 2} y={p.y + gap / 2 + 3 + LABEL / 2 + 4} class="label-number">{c.rank}</text>
        </g>
      {/each}
    {/if}
  {/each}

  <!-- The last move's edit: the cell's old place dashed, the cell ringed at its new place, an arrow between them. -->
  {#if marks.last}
    {@const e = marks.last}
    <g class="last-edit">
      <path d={hexPath(...at(e.from), 0.86 * unit)} class="old-place" />
      <path d={hexPath(...at(e.to), 0.86 * unit)} class="new-place" />
      {@render arrow(e, "last")}
    </g>
  {/if}

  <!-- The candidates' edits: the rank at the cell's new place, as the board shows a placement's rank at its hex. The
       candidate pointed at shows its arrow too. While a line shows, the line draws its edits, and no candidate shows. -->
  {#each [...(marks.candidates ?? [])].sort((a, b) => b.rank - a.rank) as c (c.name)}
    {@const [x, y] = at(c.to)}
    {@const lit = marks.lit === c.name}
    {#if !marks.line?.length && look.hand}
      <!-- The rank on the cell that the edit moves, with its arrow and its target always drawn. -->
      {@const [fx, fy] = at(c.from)}
      <g class="candidate chip" class:first={c.rank === 1} class:lit>
        <path d={hexPath(x, y, 0.86 * unit)} class="old-place cand target" />
        {@render arrow(c, "cand", true)}
        <rect x={fx - 0.6 * unit} y={fy - 0.6 * unit} width={1.2 * unit} height={1.2 * unit} rx={0.3 * unit} class="cand-badge" />
        <text x={fx} y={fy + 0.29 * unit} font-size={0.8 * unit} class="badge-number">{c.rank}</text>
      </g>
    {:else if !marks.line?.length}
      <g class="candidate" class:first={c.rank === 1} class:lit>
        {#if lit}
          <path d={hexPath(...at(c.from), 0.86 * unit)} class="old-place cand" />
          {@render arrow(c, "cand")}
        {/if}
        <rect x={x - 0.75 * unit} y={y - 0.75 * unit} width={1.5 * unit} height={1.5 * unit} rx={0.35 * unit} class="cand-badge" />
        <text {x} y={y + 0.32 * unit} font-size={0.95 * unit} class="badge-number">{c.rank}</text>
      </g>
    {/if}
  {/each}

  {#each marks.line ?? [] as l (l.n)}
    {@const [x, y] = at(l.to)}
    <g class="line-edit">
      {@render arrow(l, `line p${player}`)}
      <circle cx={x} cy={y} r={0.8 * unit} class="line-badge" />
      <text {x} y={y + 0.32 * unit} font-size={0.9 * unit} class="badge-number">{l.n}</text>
    </g>
  {/each}

  {#if hover}
    <path d={hexPath(...at(hover), unit)} class="hover" />
  {/if}
</svg>

<style>
  .hand { display: block; user-select: none; }
  .panel { fill: var(--board-bg); }
  .grid { fill: none; stroke: var(--board-dot); stroke-width: 0.04; opacity: 0.6; }
  .first-ring { fill: none; stroke: var(--text); opacity: 0.75; pointer-events: none; }
  .empty-first { fill: none; stroke: var(--text); stroke-dasharray: 0.2 0.12; opacity: 0.75; }
  .blueprint-outline { fill: none; stroke: var(--text); stroke-linecap: round; opacity: 0.8; }
  .first-dot { fill: var(--text); }
  .label { stroke: none; }
  .p0 .label { fill: var(--blue); }
  .p1 .label { fill: var(--red); }
  .label-number { fill: var(--on-badge); font: 700 11px system-ui, sans-serif; text-anchor: middle; pointer-events: none; }
  .old-place { fill: none; stroke: var(--last); stroke-width: 1.5; stroke-dasharray: 3 2; }
  .new-place { fill: none; stroke: var(--last); stroke-width: 2.5; }
  .arrow { stroke-width: 1.5; fill: none; }
  .arrow.last { stroke: var(--last); }
  .arrow.cand { stroke: var(--candidate); stroke-dasharray: 3 2; }
  .first .arrow.cand { stroke: var(--engine); }
  .arrow.line.p0 { stroke: var(--blue); stroke-dasharray: 3 2; }
  .arrow.line.p1 { stroke: var(--red); stroke-dasharray: 3 2; }
  .arrow-head { stroke: none; }
  .arrow-head.last { fill: var(--last); }
  .arrow-head.cand { fill: var(--candidate); }
  .first .arrow-head.cand { fill: var(--engine); }
  .arrow-head.line.p0 { fill: var(--blue); }
  .arrow-head.line.p1 { fill: var(--red); }
  .old-place.cand { stroke: var(--candidate); }
  .first .old-place.cand { stroke: var(--engine); }
  .candidate { opacity: 0.55; }
  .candidate.lit { opacity: 1; }
  .chip { opacity: 1; }
  .target { stroke-dasharray: 2 2; }
  .arrow.solid { stroke-width: 2.5; stroke-dasharray: none; }
  .cand-badge { fill: var(--candidate); stroke: var(--board-bg); stroke-width: 1; }
  .first .cand-badge { fill: var(--engine); }
  .line-badge { stroke: var(--board-bg); stroke-width: 1; }
  .p0 .line-badge { fill: var(--blue); }
  .p1 .line-badge { fill: var(--red); }
  .badge-number { fill: var(--on-badge); font-weight: 700; font-family: system-ui, sans-serif; text-anchor: middle; pointer-events: none; }
  .hover { fill: var(--last); fill-opacity: 0.25; stroke: var(--last); stroke-width: 1.5; pointer-events: none; }
</style>
