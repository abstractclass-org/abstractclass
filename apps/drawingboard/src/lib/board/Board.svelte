<script lang="ts" module>
  import type { Hex } from "./hex.ts";
  import type { BoardMove, Hand as HandOf, HandHex, Player, SitePosition } from "./position.ts";

  /** An engine candidate: its name (the move's string, its one spelling), its rank (1 is the engine's first choice),
   *  and a note shown on hover. */
  export interface BoardCandidate { name: string; move: BoardMove; rank: number; note: string }
  /** A move of the engine's line from the position, with its mover (in the move), and, once the engine's rules have
   *  played it, the hands after it: the board shows the hands after the line's last move drawn. */
  export interface BoardLineMove { move: BoardMove; hands?: readonly [HandOf, HandOf] }
  export interface BoardLayers { candidates: boolean; grid: boolean }
  export const DEFAULT_LAYERS: BoardLayers = { candidates: true, grid: true };
  /** A hex under the pointer: of the board (`hand` null), or of a blueprint's frame. */
  export type BoardHex = { hand: null; hex: Hex } | { hand: { player: Player } & HandHex; hex: Hex };
</script>

<script lang="ts">
  // Blueprints' board (docs/design/33-drawing-board.md), in Hedge School's style: the cells on an unbounded grid of
  // hexes, each player's hand beside it, the last move, the engine's candidates (each placement's outline, numbered by
  // rank, and the ranks in the hands), and the engine's line numbered from the candidate (design 07). The grid has no
  // edge, so the board pans, zooms and fits the cells. It fills the area that the page gives it (design 06): the hands
  // go in a column on each side of a wide area, Blue's on the left as Blue's cells start on the left, and in a row above
  // and below a tall one (a phone). Geometry only: what a move stamps and removes comes from the move's data.
  import Cell from "./Cell.svelte";
  import Hand, { blueprintBoxes, firstRing, PANEL_PAD, type HandEdit, type HandMarks } from "./Hand.svelte";
  import { boxOf, center, GRID_TILE, gridTilePath, hexAt, hexKey, hexPath, outlinePath, sameHex } from "./hex.ts";
  import { cellsOf } from "./position.ts";
  import { fit, pan, pinch, toArea, toPlane, viewBox, zoomAt, type View } from "./view.ts";

  interface Props {
    position: SitePosition;
    last?: BoardMove | null; // the move that led to the position
    candidates?: BoardCandidate[];
    highlight?: string | null; // a candidate pointed at from outside the board (a row of the candidates table)
    line?: BoardLineMove[] | null; // the line of the candidate pointed at, as far as drawn: numbered, the candidate first
    layers?: Partial<BoardLayers>; // the layers that differ from DEFAULT_LAYERS
    oncandidate?: (name: string | null) => void;
    oncandidateclick?: (name: string) => void;
    // The hex under a mouse's pointer, or null when it leaves: the board shows its coordinates, and the page may too.
    onhexat?: (at: BoardHex | null) => void;
  }
  let {
    position, last = null, candidates = [], highlight = null, line = null, layers: layersSet = {},
    oncandidate, oncandidateclick, onhexat,
  }: Props = $props();
  const layers = $derived({ ...DEFAULT_LAYERS, ...layersSet });

  const uid = $props.id();
  const gridId = `${uid}-grid`;
  const tile = gridTilePath();
  const players = [0, 1] as const;

  // The layout: the area's size, and the hands' column (a wide area) or row (a tall one).
  let width = $state(0), height = $state(0);
  const sides = $derived(width > 1.25 * height);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const GAP = 6;
  const handSize = $derived(sides ? clamp(width * 0.13, 72, 170) : clamp(height * 0.17, 52, 120));
  const field = $derived(sides ? { width: Math.max(0, width - 2 * (handSize + GAP)), height }
                               : { width, height: Math.max(0, height - 2 * (handSize + GAP)) });

  // The hands shown: the position's, or a line's after its last move drawn. A line's edits are in those hands' frames.
  const drawn = $derived(line ?? []);
  const hands = $derived(drawn.findLast(l => l.hands)?.hands ?? position.blueprints);
  // The board's cells, less the ones that the line removes: those are drawn removed, as the last move's are.
  const lineRemoved = $derived(drawn.flatMap(l => (l.move.type === "place" ? l.move.removed : [])));
  const cells = $derived.by(() => {
    const gone = new Set(lineRemoved.map(c => hexKey(c.hex)));
    return cellsOf(position).filter(c => !gone.has(hexKey(c.hex)));
  });
  const lastPlace = $derived(last?.type === "place" ? last : null);

  // The view. It fits the cells (and the cells that the last move removed) until the player pans or zooms, and again
  // after "Show all the cells", also when the position or the area changes.
  let view = $state<View>({ cx: 0, cy: 0, scale: 10 });
  let auto = $state(true);
  const fitBox = $derived(boxOf([...cellsOf(position).map(c => c.hex), ...(lastPlace?.removed ?? []).map(c => c.hex)])
    ?? boxOf([[-2, -2], [2, 2]])!);
  $effect.pre(() => { if (auto && field.width > 0 && field.height > 0) view = fit(fitBox, field, 1.2); });
  const vb = $derived(viewBox(view, field));
  function zoomButton(factor: number) {
    auto = false;
    view = zoomAt(view, field, factor, field.width / 2, field.height / 2);
  }

  // The candidates: the one under the pointer (on its hex, or on its edit's new place in a hand), or else the one
  // pointed at from outside. A search in progress renews the candidates, so the hover is kept as a name.
  let hoverHex = $state<Hex | null>(null);
  let handHover = $state<{ player: Player; at: HandHex } | null>(null);
  const placeCandidates = $derived(layers.candidates ? candidates.filter(c => c.move.type === "place") : []);
  /** The best placement whose first cell or whose rank is on a hex of the board. */
  const placementAt = (h: Hex) => placeCandidates
    .filter(c => c.move.type === "place" && (sameHex(c.move.at, h) || sameHex(rankPlaces.get(c.name) ?? c.move.at, h)))
    .sort((a, b) => a.rank - b.rank)[0] ?? null;
  const hoveredName = $derived.by(() => {
    if (hoverHex) return placementAt(hoverHex)?.name ?? null;
    return handHover ? handCandidate(handHover.player, handHover.at)?.name ?? null : null;
  });
  /** The candidate whose edit takes a cell from a hex of a hand (where the hand shows its rank) or puts it there. */
  function handCandidate(player: Player, at: HandHex): BoardCandidate | null {
    if (!layers.candidates) return null;
    const on = (h: HandHex) => h.blueprint === at.blueprint && sameHex(h.hex, at.hex);
    return candidates.find(c => c.move.type === "edit" && c.move.player === player && (on(c.move.from) || on(c.move.to)))
      ?? null;
  }
  const hovered = $derived(hoveredName ? candidates.find(c => c.name === hoveredName) ?? null : null);
  const lit = $derived(hovered ?? (highlight ? candidates.find(c => c.name === highlight) ?? null : null));
  let told: string | null = null; // the candidate last given to oncandidate
  $effect(() => { if (hoveredName !== told) oncandidate?.((told = hoveredName)); });
  const editOf = (m: BoardMove): HandEdit | null => (m.type === "edit" ? { from: m.from, to: m.to, kind: m.kind } : null);
  const lineHasEdit = $derived(drawn.some(l => l.move.type === "edit"));
  const marks = $derived(players.map((p): HandMarks => ({
    // The last move's edit is in the position's frames: a line that edits a hand shows other frames.
    last: last?.player === p && !lineHasEdit ? editOf(last) : null,
    // A candidate's edit is in the position's frames, so a line, which shows its own hands, hides them.
    candidates: layers.candidates && !drawn.length
      ? candidates.flatMap(c => c.move.player === p && c.move.type === "edit" ? [{ ...editOf(c.move)!, name: c.name, rank: c.rank }] : [])
      : [],
    placed: layers.candidates && !drawn.length
      ? candidates.flatMap(c => c.move.player === p && c.move.type === "place" ? [{ blueprint: c.move.blueprint, name: c.name, rank: c.rank }] : [])
      : [],
    line: drawn.flatMap((l, i) => l.move.player === p && l.move.type === "edit" ? [{ ...editOf(l.move)!, n: i + 1 }] : []),
  })));
  const boxes = $derived(players.map(p => blueprintBoxes(hands[p], marks[p])));
  // One scale for the six blueprints: the largest at which each fits its panel, a hex at most 36 pixels across.
  const unit = $derived.by(() => {
    const pw = sides ? handSize : width / 3, ph = sides ? height / 3 : handSize;
    let u = 18;
    for (const b of boxes.flat()) u = Math.min(u, (pw - 2 * PANEL_PAD) / (b.x1 - b.x0), (ph - 2 * PANEL_PAD) / (b.y1 - b.y0));
    return Math.max(1, u);
  });

  // Draw the first choice last, so that it stays on top.
  const ordered = $derived([...placeCandidates].sort((a, b) => b.rank - a.rank));
  // Where each placement's rank goes: on its footprint's hex nearest the footprint's middle, or on the next nearest
  // that keeps clear of the better candidates' ranks, since candidates overlap.
  const rankPlaces = $derived.by(() => {
    const out = new Map<string, Hex>(), taken: Hex[] = [];
    // Ranks on two hexes never meet: a rank's badge is 1.2 wide and high, and two hexes' centres are √3 apart across,
    // or 1.5 apart up and down.
    for (const c of [...placeCandidates].sort((a, b) => a.rank - b.rank)) {
      if (c.move.type !== "place") continue;
      let hexes: Hex[] = [c.move.at];
      if (c.move.stamped.length) {
        const points = c.move.stamped.map(s => center(s.hex));
        const mx = points.reduce((a, p) => a + p[0], 0) / points.length, my = points.reduce((a, p) => a + p[1], 0) / points.length;
        const off = (h: Hex) => { const [x, y] = center(h); return Math.hypot(x - mx, y - my); };
        hexes = c.move.stamped.map(s => s.hex).sort((a, b) => off(a) - off(b));
      }
      const at = hexes.find(h => !taken.some(t => sameHex(t, h))) ?? hexes[0];
      taken.push(at);
      out.set(c.name, at);
    }
    return out;
  });

  // Another position replaces the hexes under the pointer.
  $effect.pre(() => { void position; hoverHex = null; handHover = null; });
  function pointAt(next: Hex | null) {
    if (next && hoverHex && sameHex(next, hoverHex)) return;
    hoverHex = next;
    onhexat?.(next ? { hand: null, hex: next } : null);
  }
  function handAt(player: Player, at: HandHex | null) {
    handHover = at ? { player, at } : null;
    onhexat?.(at ? { hand: { player, ...at }, hex: at.hex } : null);
  }
  const readout = $derived(hoverHex ? hexKey(hoverHex)
    : handHover ? `${handHover.player === 0 ? "Blue" : "Red"} ${handHover.at.blueprint}:${hexKey(handHover.at.hex)}` : "");

  // The pointer on the field. A mouse's drag or one finger pans, two fingers pinch, the wheel zooms round the pointer.
  // A press and release that does not move is a click: on a candidate's hex, it clicks the candidate.
  let el: HTMLDivElement;
  const DRAG_PX = 4; // a press that moves less is a click
  const pointers = new Map<number, { x: number; y: number }>();
  let gesture: { kind: "press"; x: number; y: number; moved: boolean; start: View }
             | { kind: "pinch"; from: { x: number; y: number; d: number }; start: View } | null = null;
  const local = (ev: PointerEvent | WheelEvent) => {
    const r = el.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };
  const hexUnder = (p: { x: number; y: number }) => hexAt(...toPlane(view, field, p.x, p.y));
  function twoFingers() {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
  }
  function down(ev: PointerEvent) {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    if ((ev.target as Element).closest("button")) return; // the field's buttons take their own clicks
    try { el.setPointerCapture(ev.pointerId); } catch { /* not down any more */ }
    pointers.set(ev.pointerId, local(ev));
    if (pointers.size === 1) gesture = { kind: "press", ...local(ev), moved: false, start: view };
    else if (pointers.size === 2) gesture = { kind: "pinch", from: twoFingers(), start: view };
  }
  function move(ev: PointerEvent) {
    const p = local(ev);
    if (ev.pointerType === "mouse") pointAt(hexUnder(p));
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, p);
    if (gesture?.kind === "pinch" && pointers.size === 2) {
      auto = false;
      view = pinch(gesture.start, field, gesture.from, twoFingers());
    } else if (gesture?.kind === "press") {
      if (!gesture.moved && Math.hypot(p.x - gesture.x, p.y - gesture.y) > DRAG_PX) { gesture.moved = true; auto = false; }
      if (gesture.moved) view = pan(gesture.start, p.x - gesture.x, p.y - gesture.y);
    }
  }
  function up(ev: PointerEvent, click: boolean) {
    if (!pointers.delete(ev.pointerId)) return;
    if (gesture?.kind === "press" && !gesture.moved && click) {
      const h = hexUnder(local(ev));
      const c = placementAt(h);
      if (c) oncandidateclick?.(c.name);
    }
    // One finger left of a pinch goes on panning, and is not a click.
    const rest = [...pointers.values()][0];
    gesture = rest ? { kind: "press", ...rest, moved: true, start: view } : null;
  }
  // The wheel zooms: a mouse's wheel by steps, a touchpad's pinch (the wheel with Ctrl) by its small steps.
  $effect(() => {
    const wheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const dy = ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 400 : 1);
      const p = local(ev);
      auto = false;
      view = zoomAt(view, field, Math.exp(-dy * (ev.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
    };
    el.addEventListener("wheel", wheel, { passive: false }); // a passive listener cannot keep the page from scrolling
    return () => el.removeEventListener("wheel", wheel);
  });

  /** A note beside a hex, in the area's pixels: on its right, or on its left near the area's right edge. */
  const noteAt = (h: Hex) => {
    const [x, y] = toArea(view, field, ...center(h));
    return { x, y, left: x > field.width * 0.6 };
  };
</script>

<!-- A candidate's rank in a rounded square: the engine's line numbers its moves in circles (Go's numbered stones), so
     the candidates take another shape, as on Hedge School's board. -->
{#snippet rankBadge(h: Hex, rank: number)}
  {@const [x, y] = center(h)}
  <rect x={x - 0.6} y={y - 0.6} width="1.2" height="1.2" rx="0.28" class="cand-badge" />
  <text {x} y={y + 0.27} class="badge-number">{rank}</text>
{/snippet}

<div class="board" class:sides bind:clientWidth={width} bind:clientHeight={height}
     style:--hand="{handSize}px" style:--gap="{GAP}px">
  {#each players as p (p)}
    <div class="hand-area p{p}">
      {#if width > 0 && height > 0}
        <Hand hand={hands[p]} player={p} width={sides ? handSize : width} height={sides ? height : handSize}
              direction={sides ? "column" : "row"} {unit} boxes={boxes[p]} marks={marks[p]}
              hover={handHover?.player === p ? handHover.at : null} onhover={at => handAt(p, at)}
              onpick={at => { const c = handCandidate(p, at); if (c) oncandidateclick?.(c.name); }} />
      {/if}
    </div>
  {/each}

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="field" bind:this={el} onpointerdown={down} onpointermove={move} onpointerup={ev => up(ev, true)}
       onpointercancel={ev => up(ev, false)} onpointerleave={ev => { if (ev.pointerType === "mouse") pointAt(null); }}>
    {#if field.width > 0 && field.height > 0}
      <svg width={field.width} height={field.height} viewBox={vb.join(" ")} role="img" aria-label="Blueprints board">
        <defs>
          <pattern id={gridId} patternUnits="userSpaceOnUse" width={GRID_TILE.width} height={GRID_TILE.height}>
            <path d={tile} class="grid" />
          </pattern>
        </defs>
        <rect x={vb[0]} y={vb[1]} width={vb[2]} height={vb[3]} class="bg" />
        <!-- The grid, while its hexes are large enough to read (a hex 8 pixels across), and a dot on the origin's hex
             while it is empty: the board's coordinates count from it. -->
        {#if layers.grid && view.scale >= 4}
          <rect x={vb[0]} y={vb[1]} width={vb[2]} height={vb[3]} fill="url(#{gridId})" />
          <circle r="0.16" class="origin" />
        {/if}

        {#each cells as c (hexKey(c.hex))}
          <Cell hex={c.hex} owner={c.owner} kind={c.kind} />
        {/each}

        <!-- The last move: a placement's stamped hexes ringed, its first cell's hex (the hex its name gives) more
             strongly, and the cells that it removed, drawn removed. -->
        {#if lastPlace}
          {#each lastPlace.removed as c (hexKey(c.hex))}
            <Cell hex={c.hex} owner={c.owner} kind={c.kind} look="removed" />
          {/each}
          {#each lastPlace.stamped as s (hexKey(s.hex))}
            <path d={hexPath(...center(s.hex), 0.86)} class="last" class:anchor={sameHex(s.hex, lastPlace.at)} />
          {/each}
        {/if}

        <!-- The candidates: each placement's footprint as an outline, the cells of the one pointed at faded in the mover's
             colour, then all the ranks over them. While a line shows, the candidates are hidden, so that the board's
             only numbers are the line's. -->
        {#if layers.candidates && !drawn.length}
          {#each ordered as c (c.name)}
            {#if c.move.type === "place"}
              {@const isLit = lit?.name === c.name}
              <g class="candidate" class:first={c.rank === 1} class:lit={isLit}>
                <path d={outlinePath(c.move.stamped.map(s => s.hex))} class="footprint" />
                {#if isLit}
                  {#each c.move.stamped as s (hexKey(s.hex))}
                    <Cell hex={s.hex} owner={c.move.player} kind={s.kind} look="ghost" />
                  {/each}
                {/if}
              </g>
            {/if}
          {/each}
          {#each ordered as c (c.name)}
            {#if c.move.type === "place"}
              <g class="candidate" class:first={c.rank === 1} class:lit={lit?.name === c.name}>
                {@render rankBadge(rankPlaces.get(c.name) ?? c.move.at, c.rank)}
              </g>
            {/if}
          {/each}
        {/if}

        <!-- The engine's line from the candidate pointed at (KaTrain's and Lizzie's way): each placement's cells faded
             and dashed in the mover's colour, numbered from the candidate, which is 1, on its hex. The cells that it
             removes are drawn removed. A line's edits are numbered in the hands. -->
        {#if drawn.length}
          <g class="line">
            {#each lineRemoved as c, i (i)}
              <Cell hex={c.hex} owner={c.owner} kind={c.kind} look="removed" />
            {/each}
            {#each drawn as l, i (i)}
              {#if l.move.type === "place"}
                {#each l.move.stamped as s (hexKey(s.hex))}
                  <Cell hex={s.hex} owner={l.move.player} kind={s.kind} look="ghost" />
                {/each}
              {/if}
            {/each}
            {#each drawn as l, i (i)}
              {#if l.move.type === "place"}
                {@const [x, y] = center(l.move.at)}
                <circle cx={x} cy={y} r="0.6" class="line-badge p{l.move.player}" />
                <text {x} y={y + 0.25} class="badge-number line-number">{i + 1}</text>
              {/if}
            {/each}
          </g>
        {/if}

        <!-- The first cell's hex of the candidate pointed at or pinned, ringed as the hands ring a blueprint's first cell:
             its name (K@q,r) names that hex. -->
        {#if layers.candidates && lit?.move.type === "place"}
          {@const ring = firstRing(...center(lit.move.at), view.scale)}
          <path d={ring.d} class="first-ring" stroke-width={ring.width} />
        {/if}

        {#if hoverHex}
          <path d={hexPath(...center(hoverHex))} class="hover" />
        {/if}
      </svg>

      {#if hovered?.move.type === "place" && hovered.note}
        {@const n = noteAt(hovered.move.at)}
        <div class="note" class:first={hovered.rank === 1} class:left={n.left}
             style:left="{n.left ? undefined : n.x + 0.9 * view.scale}px"
             style:right="{n.left ? field.width - n.x + 0.9 * view.scale : undefined}px" style:top="{n.y}px">{hovered.note}</div>
      {/if}
      {#if readout}<div class="readout">{readout}</div>{/if}
      <div class="tools">
        <button type="button" onclick={() => zoomButton(1.4)} aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" onclick={() => zoomButton(1 / 1.4)} aria-label="Zoom out" title="Zoom out">−</button>
        <button type="button" onclick={() => (auto = true)} aria-label="Show all the cells" title="Show all the cells"
                class:on={auto}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4" />
          </svg>
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  /* The area that the page gives: its height, else a square. */
  .board {
    width: 100%; height: 100%; aspect-ratio: 1; min-height: 0; display: grid; gap: var(--gap);
    grid-template-columns: 1fr; grid-template-rows: var(--hand) 1fr var(--hand);
    grid-template-areas: "blue" "field" "red";
  }
  .board.sides { grid-template-columns: var(--hand) 1fr var(--hand); grid-template-rows: 1fr; grid-template-areas: "blue field red"; }
  .hand-area { min-width: 0; min-height: 0; overflow: hidden; }
  .hand-area.p0 { grid-area: blue; }
  .hand-area.p1 { grid-area: red; }
  .field {
    grid-area: field; position: relative; min-width: 0; min-height: 0; overflow: hidden; border-radius: 6px;
    touch-action: none; /* a drag pans the board, not the page */ user-select: none; cursor: grab;
  }
  .field:active { cursor: grabbing; }
  .field > svg { display: block; }
  .bg { fill: var(--board-bg); }
  .grid { fill: none; stroke: var(--board-dot); stroke-width: 0.04; opacity: 0.7; }
  .origin { fill: var(--board-dot); }
  .last { fill: none; stroke: var(--last); stroke-width: 0.12; pointer-events: none; }
  .last.anchor { stroke-width: 0.24; }
  .hover { fill: var(--last); fill-opacity: 0.25; stroke: var(--last); stroke-width: 0.08; pointer-events: none; }

  /* Candidates: the first choice in the engine's colour, thicker, the others grey and faded until hover. */
  .candidate { opacity: 0.6; transition: opacity 0.12s; pointer-events: none; }
  .candidate.first { opacity: 0.95; }
  .candidate.lit { opacity: 1; }
  .footprint { fill: none; stroke: var(--candidate); stroke-width: 0.12; stroke-linecap: round; }
  .first .footprint { stroke: var(--engine); stroke-width: 0.2; }
  .first-ring { fill: none; stroke: var(--text); opacity: 0.75; pointer-events: none; }
  .cand-badge { fill: var(--candidate); stroke: var(--board-bg); stroke-width: 0.08; }
  .first .cand-badge { fill: var(--engine); }
  .lit .cand-badge { stroke: var(--text); stroke-width: 0.1; }
  .badge-number { font-size: 0.8px; fill: var(--on-badge); text-anchor: middle; font-weight: 700; font-family: system-ui, sans-serif; }
  .line { pointer-events: none; }
  .line-badge { stroke: var(--board-bg); stroke-width: 0.08; }
  .line-badge.p0 { fill: var(--blue); }
  .line-badge.p1 { fill: var(--red); }
  .line-number { font-size: 0.72px; }

  .note {
    position: absolute; transform: translateY(-50%); pointer-events: none; white-space: nowrap;
    padding: 2px 8px; border-radius: 6px; font: 13px system-ui, sans-serif;
    background: var(--panel); border: 1px solid var(--border); color: var(--text);
  }
  /* Number 1's note gives its own values, the others' notes their difference from number 1. */
  .note.first { background: color-mix(in srgb, var(--engine) 35%, var(--panel)); border-color: var(--engine); font-weight: 600; }
  .readout {
    position: absolute; left: 6px; top: 6px; pointer-events: none; padding: 1px 6px; border-radius: 4px;
    font: 12px ui-monospace, monospace; background: color-mix(in srgb, var(--panel) 85%, transparent); color: var(--text);
  }
  .tools { position: absolute; right: 6px; bottom: 6px; display: flex; gap: 4px; }
  .tools button {
    width: 30px; height: 30px; display: grid; place-items: center; border-radius: 6px; cursor: pointer;
    font: 600 17px/1 system-ui, sans-serif; color: var(--text);
    background: color-mix(in srgb, var(--panel) 90%, transparent); border: 1px solid var(--border);
  }
  .tools button:hover { background: var(--panel-2); }
  .tools button.on { color: var(--muted); }
  .tools svg path { fill: none; stroke: currentColor; stroke-width: 1.6; }
</style>
