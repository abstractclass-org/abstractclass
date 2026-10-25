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
  /** A candidate that places a blueprint, and one that edits a blueprint. */
  type Placement = BoardCandidate & { move: Extract<BoardMove, { type: "place" }> };
  type Edit = BoardCandidate & { move: Extract<BoardMove, { type: "edit" }> };
</script>

<script lang="ts">
  // Blueprints' board (docs/design/33-drawing-board.md), in Hedge School's style: the cells on an unbounded grid of
  // hexes, each player's hand beside it, the last move, the engine's candidates (each placement's candidate outline
  // with its rank, and the rank chips in the hands), and the engine's line numbered from the candidate (design 07). The
  // grid has no edge, so the board pans, zooms and fits the cells. It fills the area that the page gives it (design
  // 06): the hands go in a column on each side of a wide area, Blue's on the left as Blue's cells start on the left,
  // and in a row above and below a tall one (a phone). Geometry only: a placement's footprint and its captured cells
  // come from the move's data.
  import Cell from "./Cell.svelte";
  import Hand, { blueprintBoxes, fitUnit, type HandMarks } from "./Hand.svelte";
  import { boxOf, center, fromMiddle, GRID_TILE, GRID_TILE_PATH, hexAt, hexKey, hexPath, outlinePath, sameHex } from "./hex.ts";
  import { cellsOf, PLAYER_NAMES, sameHandHex } from "./position.ts";
  import { clamp, fit, pan, pinch, toArea, toPlane, viewBox, zoomAt, type View } from "./view.ts";

  interface Props {
    position: SitePosition;
    last?: BoardMove | null; // the move that led to the position
    candidates?: BoardCandidate[];
    pinned?: string | null; // the candidate pinned: the page keeps its line drawn after a click
    line?: BoardLineMove[] | null; // the line of the candidate pointed at or pinned, as far as drawn: the candidate first
    layers?: Partial<BoardLayers>; // the layers that differ from DEFAULT_LAYERS
    oncandidate?: (name: string | null) => void;
    oncandidateclick?: (name: string) => void;
    // The hex under a mouse's pointer, or null when it leaves: the board shows its coordinates, and the page may too.
    onhexat?: (at: BoardHex | null) => void;
  }
  let {
    position, last = null, candidates = [], pinned = null, line = null, layers: layersSet = {},
    oncandidate, oncandidateclick, onhexat,
  }: Props = $props();
  const layers = $derived({ ...DEFAULT_LAYERS, ...layersSet });

  const uid = $props.id();
  const gridId = `${uid}-grid`, lastId = `${uid}-last`;
  const players = [0, 1] as const;

  // The layout: the area's size, and the hands' column (a wide area, 1.25 times as wide as high) or row (a tall one).
  // The hands take a share of the area, within limits in pixels. These are the board's own values, checked on the lab
  // page at 360, 800 and 1,400 pixels wide: on a phone, columns would leave the field half its width (design 33).
  let width = $state(0), height = $state(0);
  const sides = $derived(width > 1.25 * height);
  const GAP = 6; // between the hands and the field
  const handSize = $derived(sides ? clamp(width * 0.13, 72, 170) : clamp(height * 0.17, 52, 120));
  const handArea = $derived(sides ? { width: handSize, height } : { width, height: handSize });
  const direction = $derived(sides ? "column" : "row");
  const field = $derived(sides ? { width: Math.max(0, width - 2 * (handSize + GAP)), height }
                               : { width, height: Math.max(0, height - 2 * (handSize + GAP)) });

  // The hands shown: the position's, or a line's after its last move drawn. A line's edits are in those hands' frames.
  const drawn = $derived(line ?? []);
  const hands = $derived(drawn.findLast(l => l.hands)?.hands ?? position.blueprints);
  // The candidates show while no line does, so that the board's only numbers are the line's. Their edits are in the
  // position's frames too, and a line shows its own hands.
  const showCandidates = $derived(layers.candidates && !drawn.length);
  // The board's cells, less the ones that the line captures: those are drawn as captured, as the last move's are.
  const allCells = $derived(cellsOf(position));
  const lineCaptured = $derived(drawn.flatMap(l => (l.move.type === "place" ? l.move.captured : [])));
  const cells = $derived.by(() => {
    if (!lineCaptured.length) return allCells;
    const captured = new Set(lineCaptured.map(c => hexKey(c.hex)));
    return allCells.filter(c => !captured.has(hexKey(c.hex)));
  });
  const lastPlace = $derived(last?.type === "place" ? last : null);

  // The view. It fits the cells (and the cells that the last move captured) in the area, until the player pans or
  // zooms (`manual`), and again after "Show all the cells".
  let manual = $state.raw<View | null>(null);
  const fitBox = $derived(boxOf([...allCells.map(c => c.hex), ...(lastPlace?.captured ?? []).map(c => c.hex)])
    ?? boxOf([[-2, -2], [2, 2]])!);
  const view = $derived(manual ?? fit(fitBox, field, 1.2));
  const vb = $derived(viewBox(view, field));

  // The candidates: the placements, best first, and the edits. Where each placement's rank goes: on its footprint's hex
  // nearest the footprint's middle, or on the next nearest that keeps clear of the better candidates' ranks and anchor
  // hexes, since candidates overlap and the pointer finds a candidate on both. Ranks on two hexes never meet: a rank's
  // square is 1.2 wide and high, and two hexes' centres are √3 apart across, or 1.5 apart up and down.
  const placements = $derived(layers.candidates
    ? candidates.filter((c): c is Placement => c.move.type === "place").toSorted((a, b) => a.rank - b.rank) : []);
  const edits = $derived(layers.candidates ? candidates.filter((c): c is Edit => c.move.type === "edit") : []);
  const rankPlaces = $derived.by(() => {
    const out = new Map<string, Hex>(), taken: Hex[] = [];
    for (const c of placements) {
      const hexes = c.move.footprint.length ? fromMiddle(c.move.footprint.map(s => s.hex)) : [c.move.at];
      const at = hexes.find(h => !taken.some(t => sameHex(t, h))) ?? hexes[0];
      taken.push(at, c.move.at);
      out.set(c.name, at);
    }
    return out;
  });

  // The pointer: the hex under it, on the board or in a hand, and the candidate there, kept by its name, since a search
  // in progress renews the candidates. Another position clears them. The active candidate is the one under the pointer,
  // or else the pinned one.
  let hoverHex = $state<Hex | null>(null);
  let handHover = $state<{ player: Player; at: HandHex } | null>(null);
  let hoverName = $state<string | null>(null);
  $effect.pre(() => { void position; hoverHex = null; handHover = null; hoverName = null; });
  const hovered = $derived(layers.candidates && hoverName ? candidates.find(c => c.name === hoverName) ?? null : null);
  const active = $derived(hovered ?? (pinned ? candidates.find(c => c.name === pinned) ?? null : null));
  // While a line shows, the candidates are hidden, and the pointer finds only the active one, so that the candidate
  // whose line it is keeps its hover, as on Hedge School's board.
  const findable = (c: BoardCandidate) => showCandidates || c.name === active?.name;
  /** The best placement whose anchor hex or whose rank is on a hex of the board. */
  const placementAt = (h: Hex) =>
    placements.find(c => findable(c) && (sameHex(c.move.at, h) || sameHex(rankPlaces.get(c.name)!, h))) ?? null;
  /** The candidate whose edit takes a cell from a hex of a hand (where the hand shows its rank) or puts it there. */
  const handCandidate = (player: Player, at: HandHex) =>
    edits.find(c => findable(c) && c.move.player === player && (sameHandHex(c.move.from, at) || sameHandHex(c.move.to, at)))
      ?? null;
  function pointAt(next: Hex | null) {
    if (!(next && hoverHex && sameHex(next, hoverHex))) hoverHex = next;
    hoverName = next ? placementAt(next)?.name ?? null : null;
  }
  function handAt(player: Player, at: HandHex | null) {
    handHover = at ? { player, at } : null;
    hoverName = at ? handCandidate(player, at)?.name ?? null : null;
  }
  // The page hears of each change: of the hex, and of the candidate by its name.
  const pointer = $derived<BoardHex | null>(hoverHex ? { hand: null, hex: hoverHex }
    : handHover ? { hand: { player: handHover.player, ...handHover.at }, hex: handHover.at.hex } : null);
  $effect(() => { onhexat?.(pointer); });
  let told: string | null = null; // the candidate last given to oncandidate
  $effect(() => { const name = hovered?.name ?? null; if (name !== told) oncandidate?.((told = name)); });
  const readout = $derived(hoverHex ? hexKey(hoverHex)
    : handHover ? `${PLAYER_NAMES[handHover.player]} ${handHover.at.blueprint}:${hexKey(handHover.at.hex)}` : "");

  const lineHasEdit = $derived(drawn.some(l => l.move.type === "edit"));
  const marks = $derived(players.map((p): HandMarks => ({
    // The last move's edit is in the position's frames: a line that edits a hand shows other frames.
    last: last?.type === "edit" && last.player === p && !lineHasEdit ? last : null,
    candidates: showCandidates ? edits.filter(c => c.move.player === p).map(c => ({ ...c.move, name: c.name, rank: c.rank })) : [],
    placed: showCandidates
      ? placements.filter(c => c.move.player === p).map(c => ({ blueprint: c.move.blueprint, name: c.name, rank: c.rank }))
      : [],
    line: drawn.flatMap((l, i) => l.move.player === p && l.move.type === "edit" ? [{ ...l.move, n: i + 1 }] : []),
  })));
  const boxes = $derived(players.map(p => blueprintBoxes(hands[p], marks[p])));
  // One scale for the six blueprints: the largest at which each fits its panel, a hex at most 36 pixels across.
  const unit = $derived(Math.max(1, Math.min(18, ...boxes.map(b => fitUnit(handArea, direction, b)))));

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
      manual = pinch(gesture.start, field, gesture.from, twoFingers());
    } else if (gesture?.kind === "press") {
      if (!gesture.moved && Math.hypot(p.x - gesture.x, p.y - gesture.y) > DRAG_PX) gesture.moved = true;
      if (gesture.moved) manual = pan(gesture.start, p.x - gesture.x, p.y - gesture.y);
    }
  }
  function up(ev: PointerEvent, click: boolean) {
    if (!pointers.delete(ev.pointerId)) return;
    if (gesture?.kind === "press" && !gesture.moved && click) {
      const c = placementAt(hexUnder(local(ev)));
      if (c) oncandidateclick?.(c.name);
    }
    // One finger left of a pinch goes on panning, and is not a click.
    const rest = [...pointers.values()][0];
    gesture = rest ? { kind: "press", ...rest, moved: true, start: view } : null;
  }
  // The wheel zooms by d3-zoom's steps (its defaultWheelDelta, github.com/d3/d3-zoom): a pixel of the wheel is 0.002 of
  // a doubling, a line 0.05 and a page 1, and a touchpad's pinch (the wheel with Ctrl) ten times as much.
  $effect(() => {
    const wheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const doublings = -ev.deltaY * (ev.deltaMode === 1 ? 0.05 : ev.deltaMode ? 1 : 0.002) * (ev.ctrlKey ? 10 : 1);
      const p = local(ev);
      manual = zoomAt(view, field, 2 ** doublings, p.x, p.y);
    };
    el.addEventListener("wheel", wheel, { passive: false }); // a passive listener cannot keep the page from scrolling
    return () => el.removeEventListener("wheel", wheel);
  });

  /** A note beside a hex, in the area's pixels: on its right, or on its left near the area's right edge. */
  const noteAt = (h: Hex) => {
    const [x, y] = toArea(view, field, ...center(h));
    return { x, y, left: x > field.width * 0.6 };
  };
  // The zoom's buttons: two steps double the scale.
  const zoomBy = (factor: number) => { manual = zoomAt(view, field, factor, field.width / 2, field.height / 2); };
  const TOOL = ["grid size-[30px] place-items-center rounded-md border border-line bg-panel/90 p-0",
                "text-[17px] leading-none font-semibold hover:bg-panel-2"];
</script>

<!-- A candidate's rank in a rounded square: the engine's line numbers its moves in circles (Go's numbered stones), so
     the candidates take another shape, as on Hedge School's board. -->
{#snippet rankAt(h: Hex, rank: number)}
  {@const [x, y] = center(h)}
  <rect x={x - 0.6} y={y - 0.6} width="1.2" height="1.2" rx="0.28" class="rank" />
  <text {x} y={y + 0.27} class="badge-number">{rank}</text>
{/snippet}

<div class="board" class:sides bind:clientWidth={width} bind:clientHeight={height}
     style:--hand="{handSize}px" style:--gap="{GAP}px">
  {#each players as p (p)}
    <div class="hand-area p{p}">
      {#if width > 0 && height > 0}
        <Hand hand={hands[p]} player={p} width={handArea.width} height={handArea.height} {direction} {unit}
              boxes={boxes[p]} marks={marks[p]} hover={handHover?.player === p ? handHover.at : null}
              onhover={at => handAt(p, at)}
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
            <path d={GRID_TILE_PATH} class="grid" />
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

        <!-- The last move: one outline round a placement's footprint, and its captured cells. The outline is the edge
             of the footprint as a whole, as a candidate outline is, so that it has one width all round. Its stroke is
             centred on that edge and clipped to the footprint: the inner half shows, and the cells on the touching
             hexes stay clear. Round caps fill the inner corners. -->
        {#if lastPlace}
          {#each lastPlace.captured as c (hexKey(c.hex))}
            <Cell hex={c.hex} owner={c.owner} kind={c.kind} look="captured" />
          {/each}
          <clipPath id={lastId}>
            {#each lastPlace.footprint as s (hexKey(s.hex))}
              <path d={hexPath(...center(s.hex))} />
            {/each}
          </clipPath>
          <path d={outlinePath(lastPlace.footprint.map(s => s.hex))} clip-path="url(#{lastId})"
                class="last-move-outline" />
        {/if}

        <!-- The candidates: each placement's candidate outline, the cells of the active one faded in the mover's colour,
             then all the ranks over them. The first choice is drawn last, so that it stays on top. -->
        {#if showCandidates}
          {@const ordered = placements.toReversed()}
          {#each ordered as c (c.name)}
            {@const isActive = active?.name === c.name}
            <g class="candidate" class:first={c.rank === 1} class:active={isActive}>
              <path d={outlinePath(c.move.footprint.map(s => s.hex))} class="candidate-outline" />
              {#if isActive}
                {#each c.move.footprint as s (hexKey(s.hex))}
                  <Cell hex={s.hex} owner={c.move.player} kind={s.kind} look="ghost" />
                {/each}
              {/if}
            </g>
          {/each}
          {#each ordered as c (c.name)}
            <g class="candidate" class:first={c.rank === 1} class:active={active?.name === c.name}>
              {@render rankAt(rankPlaces.get(c.name)!, c.rank)}
            </g>
          {/each}
        {/if}

        <!-- The engine's line from the candidate pointed at or pinned (KaTrain's and Lizzie's way): each placement's
             cells faded and dashed in the mover's colour, numbered from the candidate, which is 1, on its hex. Its
             captured cells are drawn as the last move's are. A line's edits are numbered in the hands. -->
        {#if drawn.length}
          <g class="line">
            {#each lineCaptured as c, i (i)}
              <Cell hex={c.hex} owner={c.owner} kind={c.kind} look="captured" />
            {/each}
            {#each drawn as l, i (i)}
              {#if l.move.type === "place"}
                {#each l.move.footprint as s (hexKey(s.hex))}
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

        {#if hoverHex}
          <path d={hexPath(...center(hoverHex))} class="hover" />
        {/if}
      </svg>

      <!-- Number 1's note gives its own values, the others' notes their difference from number 1. -->
      {#if hovered?.move.type === "place" && hovered.note}
        {@const n = noteAt(hovered.move.at)}
        <div class={["pointer-events-none absolute -translate-y-1/2 rounded-md border px-2 py-0.5 text-[13px] leading-[normal]",
                     "whitespace-nowrap text-ink", hovered.rank === 1
                       ? "border-(--engine) bg-[color-mix(in_srgb,var(--engine)_35%,var(--panel))] font-semibold"
                       : "border-line bg-panel"]}
             style:left="{n.left ? undefined : n.x + 0.9 * view.scale}px"
             style:right="{n.left ? field.width - n.x + 0.9 * view.scale : undefined}px" style:top="{n.y}px">{hovered.note}</div>
      {/if}
      {#if readout}
        <div class="pointer-events-none absolute top-1.5 left-1.5 rounded bg-panel/85 px-1.5 py-px font-mono text-xs leading-[normal] text-ink">
          {readout}
        </div>
      {/if}
      <div class="absolute right-1.5 bottom-1.5 flex gap-1">
        <button type="button" class={[TOOL, "text-ink"]} onclick={() => zoomBy(Math.SQRT2)} aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" class={[TOOL, "text-ink"]} onclick={() => zoomBy(Math.SQRT1_2)} aria-label="Zoom out" title="Zoom out">−</button>
        <button type="button" class={[TOOL, manual ? "text-ink" : "text-muted"]} onclick={() => (manual = null)}
                aria-label="Show all the cells" title="Show all the cells">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4" fill="none" stroke="currentColor" stroke-width="1.6" />
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
  /* The last move's outline: 0.14 of a hex's radius shows, inside the footprint. */
  .last-move-outline { fill: none; stroke: var(--last); stroke-width: 0.28; stroke-linecap: round; pointer-events: none; }
  .hover { fill: var(--last); fill-opacity: 0.25; stroke: var(--last); stroke-width: 0.08; pointer-events: none; }

  /* Candidates: the first choice in the engine's colour, thicker, the others grey and faded until hover. */
  .candidate { opacity: 0.6; transition: opacity 0.12s; pointer-events: none; }
  .candidate.first { opacity: 0.95; }
  .candidate.active { opacity: 1; }
  .candidate-outline { fill: none; stroke: var(--candidate); stroke-width: 0.12; stroke-linecap: round; }
  .first .candidate-outline { stroke: var(--engine); stroke-width: 0.2; }
  .rank { fill: var(--candidate); stroke: var(--board-bg); stroke-width: 0.08; }
  .first .rank { fill: var(--engine); }
  .active .rank { stroke: var(--text); stroke-width: 0.1; }
  .badge-number { font-size: 0.8px; fill: var(--on-badge); text-anchor: middle; font-weight: 700; font-family: system-ui, sans-serif; }
  .line { pointer-events: none; }
  .line-badge { stroke: var(--board-bg); stroke-width: 0.08; }
  .line-badge.p0 { fill: var(--blue); }
  .line-badge.p1 { fill: var(--red); }
  .line-number { font-size: 0.72px; }
</style>
