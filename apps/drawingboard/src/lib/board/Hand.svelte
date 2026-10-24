<script lang="ts" module>
  import { boxOf, center, GRID_TILE, GRID_TILE_PATH, hexAt, hexPath, type Box, type Hex } from "./hex.ts";
  import { piecesOf, PLAYER_NAMES, sameHandHex, type BlueprintNumber, type Hand, type HandHex, type Player } from "./position.ts";
  import type { Size } from "./view.ts";
  import Cell from "./Cell.svelte";
  import FirstRing from "./FirstRing.svelte";

  /** A cell moved within the hand, as the hand draws it: the last move's edit, a candidate's, or a line's. */
  export interface HandEdit { from: HandHex; to: HandHex }
  export interface HandMarks {
    last: HandEdit | null;
    candidates: (HandEdit & { name: string; rank: number })[];
    placed: { blueprint: BlueprintNumber; name: string; rank: number }[]; // the placements' blueprints, for their chips
    line: (HandEdit & { n: number })[];
  }
  /** The part of each blueprint's frame that the hand shows: its cells, its first cell (0, 0) also when it is empty,
   *  and the hexes of the edits drawn on it. */
  export function blueprintBoxes(hand: Hand, marks: HandMarks): Box[] {
    const edits = [marks.last, ...marks.candidates, ...marks.line].filter(e => !!e);
    return hand.map((b, i) => {
      const n = (i + 1) as BlueprintNumber;
      const hexes: Hex[] = [[0, 0], ...piecesOf(b).map(p => p.hex)];
      for (const e of edits) for (const h of [e.from, e.to]) if (h.blueprint === n) hexes.push(h.hex);
      return boxOf(hexes)!;
    });
  }
  /** In pixels: the room round a blueprint in its panel, the gap between two panels, the panel's label (and a chip),
   *  and the label's room from the panel's corner. */
  const PANEL_PAD = 6;
  const PANEL_GAP = 3;
  const LABEL = 16;
  const INSET = 3;
  type Direction = "row" | "column";
  /** A blueprint's panel: a third of the hand's row or column. */
  const panelSize = ({ width, height }: Size, direction: Direction): Size =>
    direction === "row" ? { width: width / 3, height } : { width, height: height / 3 };
  /** The most pixels per unit at which each blueprint's box fits its panel, in a hand of this size. */
  export function fitUnit(size: Size, direction: Direction, boxes: Box[]): number {
    const panel = panelSize(size, direction);
    return Math.min(...boxes.map(b =>
      Math.min((panel.width - 2 * PANEL_PAD) / (b.x1 - b.x0), (panel.height - 2 * PANEL_PAD) / (b.y1 - b.y0))));
  }
</script>

<script lang="ts">
  // A player's hand: the three blueprints, numbered 1 to 3, each in its own panel in the player's colour, in a row or
  // in a column. Each panel draws the blueprint's frame: its grid, and its first cell (0, 0) ringed, so that a reader
  // can count an edit's coordinates (`I:q,r>J:q,r`, design 33, item 5). The edits drawn: the last move's (the cell
  // ringed at its new place, its old place dashed, and an arrow between them), the candidates' (the rank on the cell
  // that the edit moves, an arrow, and its new place dashed), and a line's (its numbers). A chip with a placement's
  // rank goes on the blueprint that it places, so that a reader sees which blueprint each candidate takes. All hands of
  // a board share one scale (`unit`), so that the same shape has the same size.
  interface Props {
    hand: Hand;
    player: Player;
    width: number;
    height: number;
    direction: Direction;
    unit: number; // pixels per unit (a hex's radius)
    boxes: Box[]; // blueprintBoxes(hand, marks)
    marks: HandMarks;
    hover?: HandHex | null;
    onhover?: (at: HandHex | null) => void;
    onpick?: (at: HandHex) => void; // a click on a hex of a blueprint's frame
  }
  let { hand, player, width, height, direction, unit, boxes, marks, hover = null, onhover, onpick }: Props = $props();

  const uid = $props.id();
  const gridId = `${uid}-grid`;
  const pieces = $derived(hand.map(piecesOf));
  // Each panel's place in the hand, the box that it draws (`inner`: less half the gap all round), and the point of the
  // panel where the blueprint's frame has its origin, so that the blueprint's box sits in the panel's middle.
  const panels = $derived(boxes.map((box, i) => {
    const { width: w, height: h } = panelSize({ width, height }, direction);
    const x = direction === "row" ? i * w : 0, y = direction === "row" ? 0 : i * h;
    const ox = x + w / 2 - ((box.x0 + box.x1) / 2) * unit, oy = y + h / 2 - ((box.y0 + box.y1) / 2) * unit;
    const inner = { left: x + PANEL_GAP / 2, top: y + PANEL_GAP / 2, width: w - PANEL_GAP, height: h - PANEL_GAP };
    return { n: (i + 1) as BlueprintNumber, x, y, w, h, ox, oy, inner };
  }));
  /** A hex of a blueprint, in the hand's pixels. */
  const at = (h: HandHex): [number, number] => {
    const p = panels[h.blueprint - 1], [x, y] = center(h.hex);
    return [p.ox + x * unit, p.oy + y * unit];
  };
  const chipsOf = (n: BlueprintNumber) => marks.placed.filter(c => c.blueprint === n).sort((a, b) => a.rank - b.rank);

  let svg: SVGSVGElement;
  function pointed(ev: MouseEvent): HandHex | null {
    const r = svg.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
    const p = panels.find(p => px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + p.h);
    return p ? { blueprint: p.n, hex: hexAt((px - p.ox) / unit, (py - p.oy) / unit) } : null;
  }
  function move(ev: PointerEvent) {
    if (ev.pointerType !== "mouse") return;
    const h = pointed(ev);
    if (h && hover ? !sameHandHex(h, hover) : h !== hover) onhover?.(h);
  }
</script>

<!-- An arrow from a cell's old place to its new place, with its head short of the new place's centre. -->
{#snippet arrow(e: HandEdit, cls: string)}
  {@const [x1, y1] = at(e.from)}
  {@const [x2, y2] = at(e.to)}
  {@const d = Math.hypot(x2 - x1, y2 - y1)}
  {#if d > unit}
    {@const ux = (x2 - x1) / d}
    {@const uy = (y2 - y1) / d}
    {@const tx = x2 - ux * 0.55 * unit}
    {@const ty = y2 - uy * 0.55 * unit}
    {@const head = 5}
    <line {x1} {y1} x2={tx - ux * head} y2={ty - uy * head} class="arrow {cls}" />
    <polygon points="{tx},{ty} {tx - ux * head * 1.6 - uy * head},{ty - uy * head * 1.6 + ux * head} {tx - ux * head * 1.6 + uy * head},{ty - uy * head * 1.6 - ux * head}"
             class="arrow-head {cls}" />
  {/if}
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
<svg class="hand p{player}" {width} {height} role="img" bind:this={svg} onpointermove={move}
     onclick={ev => { const h = pointed(ev); if (h) onpick?.(h); }}
     onpointerleave={() => { if (hover) onhover?.(null); }}
     aria-label="{PLAYER_NAMES[player]}'s blueprints">
  <defs>
    <pattern id={gridId} patternUnits="userSpaceOnUse" width={GRID_TILE.width} height={GRID_TILE.height}>
      <path d={GRID_TILE_PATH} class="grid" />
    </pattern>
  </defs>

  {#each panels as p (p.n)}
    {@const d = p.inner}
    <rect x={d.left} y={d.top} width={d.width} height={d.height} rx="6" class="panel" />
    <svg x={d.left} y={d.top} width={d.width} height={d.height} overflow="hidden">
      <g transform="translate({p.ox - d.left} {p.oy - d.top}) scale({unit})">
        <rect x={(p.x - p.ox) / unit} y={(p.y - p.oy) / unit} width={p.w / unit} height={p.h / unit} fill="url(#{gridId})" />
        {#each pieces[p.n - 1] as c (`${c.hex}`)}
          <Cell hex={c.hex} owner={player} kind={c.kind} />
        {/each}
        <FirstRing {unit} />
      </g>
    </svg>
    <rect x={d.left + INSET} y={d.top + INSET} width={LABEL} height={LABEL} rx="3" class="label" />
    <text x={d.left + INSET + LABEL / 2} y={d.top + INSET + LABEL / 2 + 4} class="label-number">{p.n}</text>
    <!-- The placements of this blueprint among the candidates: their ranks, at the panel's other corner. -->
    {#each chipsOf(p.n) as c, k (c.name)}
      {@const x = d.left + d.width - INSET - (k + 1) * LABEL - 2 * k}
      <g class:first={c.rank === 1}>
        <rect {x} y={d.top + INSET} width={LABEL} height={LABEL} rx="4" class="cand-badge" />
        <text x={x + LABEL / 2} y={d.top + INSET + LABEL / 2 + 4} class="label-number">{c.rank}</text>
      </g>
    {/each}
  {/each}

  <!-- The last move's edit: the cell's old place dashed, the cell ringed at its new place, an arrow between them. -->
  {#if marks.last}
    {@const e = marks.last}
    <path d={hexPath(...at(e.from), 0.86 * unit)} class="old-place" />
    <path d={hexPath(...at(e.to), 0.86 * unit)} class="new-place" />
    {@render arrow(e, "last")}
  {/if}

  <!-- The candidates' edits: the rank on the cell that the edit moves, an arrow, and the cell's new place dashed. -->
  {#each marks.candidates.toSorted((a, b) => b.rank - a.rank) as c (c.name)}
    {@const [x, y] = at(c.to)}
    {@const [fx, fy] = at(c.from)}
    <g class:first={c.rank === 1}>
      <path d={hexPath(x, y, 0.86 * unit)} class="target" />
      {@render arrow(c, "cand")}
      <rect x={fx - 0.6 * unit} y={fy - 0.6 * unit} width={1.2 * unit} height={1.2 * unit} rx={0.3 * unit} class="cand-badge" />
      <text x={fx} y={fy + 0.29 * unit} font-size={0.8 * unit} class="badge-number">{c.rank}</text>
    </g>
  {/each}

  {#each marks.line as l (l.n)}
    {@const [x, y] = at(l.to)}
    {@render arrow(l, "line")}
    <circle cx={x} cy={y} r={0.8 * unit} class="line-badge" />
    <text {x} y={y + 0.32 * unit} font-size={0.9 * unit} class="badge-number">{l.n}</text>
  {/each}

  {#if hover}
    <path d={hexPath(...at(hover), unit)} class="hover" />
  {/if}
</svg>

<style>
  .hand { display: block; user-select: none; }
  .hand.p0 { --own: var(--blue); }
  .hand.p1 { --own: var(--red); }
  .panel { fill: var(--board-bg); }
  .grid { fill: none; stroke: var(--board-dot); stroke-width: 0.04; opacity: 0.6; }
  .label { fill: var(--own); stroke: none; }
  .label-number { fill: var(--on-badge); font: 700 11px system-ui, sans-serif; text-anchor: middle; pointer-events: none; }
  .old-place { fill: none; stroke: var(--last); stroke-width: 1.5; stroke-dasharray: 3 2; }
  .new-place { fill: none; stroke: var(--last); stroke-width: 2.5; }
  .arrow { stroke-width: 1.5; fill: none; }
  .arrow.last { stroke: var(--last); }
  .arrow.cand { stroke: var(--candidate); stroke-width: 2.5; }
  .first .arrow.cand { stroke: var(--engine); }
  .arrow.line { stroke: var(--own); stroke-dasharray: 3 2; }
  .arrow-head { stroke: none; }
  .arrow-head.last { fill: var(--last); }
  .arrow-head.cand { fill: var(--candidate); }
  .first .arrow-head.cand { fill: var(--engine); }
  .arrow-head.line { fill: var(--own); }
  .target { fill: none; stroke: var(--candidate); stroke-width: 1.5; stroke-dasharray: 2 2; }
  .first .target { stroke: var(--engine); }
  .cand-badge { fill: var(--candidate); stroke: var(--board-bg); stroke-width: 1; }
  .first .cand-badge { fill: var(--engine); }
  .line-badge { fill: var(--own); stroke: var(--board-bg); stroke-width: 1; }
  .badge-number { fill: var(--on-badge); font-weight: 700; font-family: system-ui, sans-serif; text-anchor: middle; pointer-events: none; }
  .hover { fill: var(--last); fill-opacity: 0.25; stroke: var(--last); stroke-width: 1.5; pointer-events: none; }
</style>
