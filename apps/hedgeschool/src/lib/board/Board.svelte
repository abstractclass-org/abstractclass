<script lang="ts" module>
  import type { Edge, Label, Position } from "#lib/review/enclosure.ts";

  /** An engine candidate: its rank (1 is the engine's first choice) and a note shown on hover. */
  export interface BoardCandidate { edge: Edge; rank: number; note: string }
  /** A label badge on a played edge, at its midpoint: an end point is a node that several edges share. Its note shows
   *  under the pointer. Badges with the same `group` are one label, a turn's on both its edges: pointing at either
   *  lights both badges and both edges (design 10). */
  export interface BoardMark { edge: Edge; label: Label; note?: string; group?: number }
  /** An edge of the engine's line from the position, with its mover, and, once the engine's rules have played it, the
   *  edge it cuts and the regions after it. */
  export interface BoardLineEdge { edge: Edge; player: 0 | 1; cut?: Edge | null; regions?: Position["regions"] }
  /** `areaMap`: the area map given, in its style (design 30). */
  export interface BoardLayers { regions: boolean; protected: boolean; candidates: boolean; marks: boolean; coordinates: boolean; areaMap: boolean }
  export const DEFAULT_LAYERS: BoardLayers = { regions: true, protected: true, candidates: true, marks: true, coordinates: true, areaMap: true };
  export type { BoardNote, NoteBrush } from "./notes.ts";
  /** A click on a point: with the right button (only with `rightClicks`), and whether it begins an edge (a drag's press,
   *  whatever point is pending). */
  export interface PointClick { right: boolean; begin: boolean }
</script>

<script lang="ts">
  // The Enclosure board as SVG: the lattice, the area map's ownership style (design 30), each player's regions, its change style, the edges, the protected edges (the turn just
  // played and the mover's edges of this turn, on the edge itself, with no band behind any edge), the edge just cut, the engine's candidates numbered by rank, a preview edge, label badges on the edges of the turn
  // just played, and a ghost edge (the game's edge in a retry). During edge input: the first point, the points that
  // complete a legal edge from it (dots), and the edge to the marked point under the pointer. Points are 0-18 with y
  // up, as in the engine.
  import { pointName, sameEdge } from "#lib/review/enclosure.ts";
  import LabelMark from "#lib/review/LabelMark.svelte";
  import type { AreaMark } from "#lib/review/ownership.ts";
  import { brushFor, samePoint, toggleNote, type BoardNote, type NoteBrush } from "./notes.ts";

  interface Props {
    position: Position;
    cut?: Edge | null;
    candidates?: BoardCandidate[];
    highlight?: Edge | null; // a candidate pointed at from outside the board (a row of the candidates table)
    line?: BoardLineEdge[] | null; // the line of the candidate pointed at, as far as drawn: numbered, the candidate first
    preview?: Edge | null;
    previewPlayer?: 0 | 1;
    marks?: BoardMark[];
    ghost?: BoardMark | null; // an edge not on the board, with its label: the game's edge during a retry
    layers?: Partial<BoardLayers>; // the layers that differ from DEFAULT_LAYERS
    pending?: [number, number] | null; // the first point of an edge being entered
    ends?: [number, number][] | null; // the points that complete a legal edge from `pending`: dots, with a ghost edge on hover
    active?: [number, number][] | null; // the points a click acts on (null: every point); the others show no hover
    view?: [number, number, number, number]; // the points shown: x0, y0, x1, y1 (a crop for lessons)
    targets?: Edge[]; // edges to point at, drawn as a soft glow (a lesson's hint)
    onpoint?: (x: number, y: number, how: PointClick) => void;
    rightClicks?: boolean; // the right button clicks points too (PointClick's `right`): only on a board with no notes
    onlyActive?: boolean; // only the points a click acts on take the pointer, so that the candidates under the others keep it
    oncandidate?: (edge: Edge | null) => void;
    oncandidateclick?: (edge: Edge) => void;
    oncandidatedblclick?: (edge: Edge) => void;
    notes?: BoardNote[]; // the player's notes on this position
    onnotes?: (notes: BoardNote[]) => void; // a note drawn, changed or removed, or all cleared: right-drawing works only with it
    // The area map (design 30, the layer areaMap): by point (index y * 19 + x), its mark (ownership.ts, areaMap)
    areaMap?: (AreaMark | null)[] | null;
    // The lattice point under a mouse's pointer, or null when it leaves the board: the page shows its numbers. Touch
    // gives none, as a touch is edge input.
    onpointat?: (point: [number, number] | null) => void;
  }
  let {
    position, cut = null, candidates = [], highlight = null, line = null,
    preview = null, previewPlayer = 0, marks = [], ghost = null,
    layers: layersSet = {},
    pending = null, ends = null, active = null, view = [0, 0, 18, 18], targets = [], onpoint, rightClicks = false, onlyActive = false,
    oncandidate, oncandidateclick, oncandidatedblclick, notes = [], onnotes,
    areaMap = null, onpointat,
  }: Props = $props();

  const layers = $derived({ ...DEFAULT_LAYERS, ...layersSet });
  const uid = $props.id();
  const shadowId = `${uid}-badge-shadow`; // one board's filter: a page can show several boards
  const patternId = (m: AreaMark) => `${uid}-${m.kind}-${m.side}`;
  const blendId = `${uid}-area-blend`;
  const N = 19;
  // A label badge's radius. On a length-1 edge, whose line is 0.68 between its nodes, the badge sidesteps by 80% of its
  // radius (up from a horizontal edge, right from a vertical one), and stays over the line: 0.28 of the line shows.
  const MARK_R = 0.33;
  // The ownership style's strongest shading: KaTrain's 0.75 is for black and white on a wooden board. On this board the
  // players' colours at 0.45 leave the edges and the regions' shading readable.
  const AREA_ALPHA = 0.45;
  const markAt = (e: Edge) => {
    const [x, y] = mid(e), d = 0.8 * MARK_R;
    if (Math.abs(e[0] - e[2]) + Math.abs(e[1] - e[3]) !== 1) return [x, y] as const;
    return e[1] === e[3] ? ([x, y - d] as const) : ([x + d, y] as const);
  };
  const sy = (y: number) => N - 1 - y;
  /** An edge's line, in the SVG's coordinates. */
  const seg = (e: Edge) => ({ x1: e[0], y1: sy(e[1]), x2: e[2], y2: sy(e[3]) });
  const points = $derived(Array.from({ length: N * N }, (_, i) => [i % N, Math.floor(i / N)] as const)
    .filter(([x, y]) => x >= view[0] && x <= view[2] && y >= view[1] && y <= view[3]));
  const box = $derived(`${view[0] - 1.3} ${sy(view[3]) - 1.3} ${view[2] - view[0] + 2.6} ${view[3] - view[1] + 2.6}`);
  const ringPath = (ring: [number, number][]) => "M" + ring.map(([x, y]) => `${x},${sy(y)}`).join("L") + "Z";
  const mid = (e: Edge) => [(e[0] + e[2]) / 2, sy((e[1] + e[3]) / 2)] as const;
  const nodes = (edges: Edge[]) => {
    const seen = new Map<string, [number, number]>();
    for (const e of edges) { seen.set(`${e[0]},${e[1]}`, [e[0], e[1]]); seen.set(`${e[2]},${e[3]}`, [e[2], e[3]]); }
    return [...seen.values()];
  };
  // Draw the first choice last, so it stays on top. The lit candidate (hovered on the board, or highlighted from
  // outside) is drawn again above everything with a halo, so that no other candidate covers it. A hover on the board
  // also shows its note.
  const ordered = $derived([...candidates].sort((a, b) => b.rank - a.rank));
  // The hover is kept as an edge: a search in progress renews the candidates after each slice.
  let hoveredEdge = $state<Edge | null>(null);
  const hovered = $derived(hoveredEdge ? candidates.find(c => sameEdge(c.edge, hoveredEdge!)) ?? null : null);
  // A note's text width in the board's units, measured in the note's own font (.cand-note text) at 100 times its size,
  // so that its box fits the text, whatever the note says. The board draws the text smaller, where it can come out about
  // 2% wider, so the text is centred in its box and the difference splits between the two sides.
  let measurer: CanvasRenderingContext2D | null = null;
  function noteWidth(text: string): number {
    measurer ??= document.createElement("canvas").getContext("2d");
    if (!measurer) return 0.25 * text.length;
    measurer.font = "42px system-ui, sans-serif";
    return measurer.measureText(text).width / 100;
  }
  const lit = $derived(hovered ?? (highlight ? candidates.find(c => sameEdge(c.edge, highlight!)) ?? null : null));
  // The label badges by group: the badges of one turn are one label (BoardMark). The badge under the pointer lights its
  // group and shows its note beside it.
  const markGroups = $derived.by(() => {
    const out: BoardMark[][] = [];
    for (const m of marks) {
      const last = out.at(-1);
      if (last && m.group !== undefined && last[0].group === m.group) last.push(m);
      else out.push([m]);
    }
    return out;
  });
  let markHover = $state<{ group: number; mark: BoardMark } | null>(null);
  $effect(() => { void marks; markHover = null; });
  // The board as the line leaves it: the edges it cuts are off the board and drawn as cut (as the last edge's cut is),
  // and the regions are the ones after its last edge, once the engine's rules have played it.
  const drawnLine = $derived(line ?? []);
  const lineCuts = $derived(drawnLine.flatMap(l => (l.cut ? [l.cut] : [])));
  const shownEdges = $derived(([0, 1] as const).map(p => position.edges[p].filter(e => !lineCuts.some(c => sameEdge(c, e)))));
  const shownRegions = $derived(drawnLine.at(-1)?.regions ?? position.regions);
  const shownMap = $derived(layers.areaMap ? areaMap : null);
  // Edge input: the point under the pointer, for the ghost edge from `pending` to a legal end.
  const pointKey = (x: number, y: number) => x * N + y;
  const activeKeys = $derived(active ? new Set(active.map(([x, y]) => pointKey(x, y))) : null);
  const endKeys = $derived(new Set((ends ?? []).map(([x, y]) => pointKey(x, y))));
  let hoverPoint = $state<[number, number] | null>(null);
  const ghostEdge = $derived<Edge | null>(pending && hoverPoint && endKeys.has(pointKey(...hoverPoint))
    ? [pending[0], pending[1], hoverPoint[0], hoverPoint[1]] : null);
  // Another position replaces the elements under the pointer, which then fire no mouseleave.
  $effect.pre(() => { void position; hoveredEdge = null; hoverPoint = null; });
  function enter(c: BoardCandidate) { hoveredEdge = c.edge; oncandidate?.(c.edge); }
  function leave() { hoveredEdge = null; oncandidate?.(null); }

  // The pointer on the board. A press and release on a point is a click (onpoint). A press on a point and a drag (Lichess
  // drags a piece, as it also takes two clicks) begins the edge there (`begin`), and the release on a point completes
  // it: the dashed edge follows the pointer to a legal end, as on hover. A release elsewhere leaves the edge begun. With
  // `rightClicks`, the right button does the same, and the page reads `right`.
  let svg: SVGSVGElement;
  const same = (a: [number, number] | null | undefined, b: [number, number] | null | undefined) => !!a && !!b && samePoint(a, b);
  /** The lattice point nearest the pointer, within the points shown, or null off the board. */
  function pointAt(ev: PointerEvent): [number, number] | null {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    const x = Math.round(p.x), y = Math.round(N - 1 - p.y);
    return x >= view[0] && x <= view[2] && y >= view[1] && y <= view[3] ? [x, y] : null;
  }
  /** The pointer's later moves come to the board, wherever they go. A pointer that is no longer down cannot be held. */
  const capture = (ev: PointerEvent) => { try { svg.setPointerCapture(ev.pointerId); } catch { /* not down any more */ } };
  const DRAG_PX = 4; // a press that moves less is a click
  let press: { id: number; from: [number, number]; x: number; y: number; moved: boolean; right: boolean } | null = null;
  const rightPoints = $derived(rightClicks && !onnotes);
  function pressPoint(ev: PointerEvent, x: number, y: number) {
    if (ev.button !== 0 && !(ev.button === 2 && rightPoints)) return;
    press = { id: ev.pointerId, from: [x, y], x: ev.clientX, y: ev.clientY, moved: false, right: ev.button === 2 };
    capture(ev);
  }

  // The notes (notes.ts): the right button rings a point, and a right drag draws a line to another, as Lichess draws
  // circles and arrows. The left button clears the position's notes (chessground's eraseOnClick).
  let sketch = $state<{ id: number; from: [number, number]; to: [number, number]; brush: NoteBrush } | null>(null);
  // The note being drawn: a ring where the pointer has not left its point, else a line.
  const sketchNote = $derived<BoardNote | null>(sketch && (same(sketch.from, sketch.to) ? { at: sketch.from, brush: sketch.brush }
                                                                                      : { at: sketch.from, to: sketch.to, brush: sketch.brush }));
  const toggle = (note: BoardNote) => onnotes?.(toggleNote(notes, note));
  function down(ev: PointerEvent) {
    if (ev.button === 2 && onnotes) {
      const p = pointAt(ev);
      if (!p) return;
      ev.preventDefault();
      sketch = { id: ev.pointerId, from: p, to: p, brush: brushFor(ev) };
      capture(ev);
    } else if (ev.button === 0 && notes.length) onnotes?.([]);
  }
  function move(ev: PointerEvent) {
    if (onpointat && ev.pointerType === "mouse") onpointat(pointAt(ev));
    if (sketch && ev.pointerId === sketch.id) sketch.to = pointAt(ev) ?? sketch.to;
    if (!press || ev.pointerId !== press.id) return;
    if (!press.moved && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > DRAG_PX) {
      press.moved = true;
      if (!same(pending, press.from)) onpoint?.(...press.from, { right: press.right, begin: true }); // the edge begins here
    }
    if (press.moved) hoverPoint = pointAt(ev);
  }
  function up(ev: PointerEvent) {
    if (sketch && ev.pointerId === sketch.id) {
      const note = sketchNote!;
      sketch = null;
      toggle(note);
    }
    if (!press || ev.pointerId !== press.id) return;
    const p = press;
    press = null;
    if (!p.moved) { onpoint?.(...p.from, { right: p.right, begin: false }); return; }
    hoverPoint = null;
    const q = pointAt(ev);
    if (q && !same(q, p.from) && same(pending, p.from)) onpoint?.(...q, { right: p.right, begin: false });
  }
  function cancel(ev: PointerEvent) {
    if (sketch?.id === ev.pointerId) sketch = null;
    if (press?.id === ev.pointerId) { press = null; hoverPoint = null; }
  }
</script>

<!-- A note beside a point of the board: a candidate's or a label badge's. On its right, or on its left near the board's
     right edge. -->
{#snippet notePopup(x: number, y: number, text: string, first = false)}
  {@const w = noteWidth(text) + 0.4}
  {@const nx = x + 0.62 + w > N ? x - 0.62 - w : x + 0.62}
  <g class="cand-note" class:first>
    <rect x={nx} y={y - 0.38} width={w} height="0.76" rx="0.15" />
    <text x={nx + w / 2} y={y + 0.14} text-anchor="middle">{text}</text>
  </g>
{/snippet}

<!-- A label badge at an edge's midpoint. -->
<!-- A candidate's rank in a rounded square: the engine's line numbers its edges in circles (Go's numbered stones), so the
     candidates take another shape. -->
{#snippet rankBadge(x: number, y: number, rank: number)}
  <rect x={x - 0.36} y={y - 0.36} width="0.72" height="0.72" rx="0.17" class="cand-badge" />
  <text x={x} y={y + 0.15} class="cand-rank">{rank}</text>
{/snippet}

{#snippet badge(m: BoardMark)}
  {@const [bx, by] = markAt(m.edge)}
  <g class="mark">
    <circle cx={bx} cy={by} r={MARK_R} style:fill="var(--{m.label}-fill)" filter="url(#{shadowId})" />
    <!-- The mark's 24-unit square (labelShapes.ts) over the disc, as the move list's badges draw it. -->
    <LabelMark label={m.label} transform="translate({bx - MARK_R} {by - MARK_R}) scale({(2 * MARK_R) / 24})" />
  </g>
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svg class="board" viewBox={box} role="img" aria-label="Enclosure board" bind:this={svg}
     onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={cancel} onpointerleave={() => onpointat?.(null)}
     oncontextmenu={ev => { if (onnotes || rightPoints) ev.preventDefault(); }}>
  <rect x="-1.3" y="-1.3" width="20.6" height="20.6" class="bg" />
  <!-- The label badges' shadow, as Lichess's board draws under its glyph badges (chessground's glyph.ts:
       feDropShadow dx 4, dy 7, deviation 5, opacity 0.5 on a disc of radius 50), scaled to the badge's radius of
       0.33. The shadow sets a badge apart from the edges and regions under it, on both themes. -->
  <defs>
    <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0.027" dy="0.046" stdDeviation="0.033" flood-opacity="0.5" />
    </filter>
    <filter id={blendId}><feGaussianBlur stdDeviation="0.3" /></filter>
    <!-- The change style's two marks, in each player's colour (design 30): dots on open area that a side will close, and
         hatching on closed area that its owner will lose. Unlike the regions' solid fill, they read as a forecast. The
         tiles are in the board's units, so that the marks of next points join, and no dot falls on a lattice point. -->
    {#each ([0, 1] as const) as side (side)}
      <pattern id={patternId({ kind: "close", side })} class="change p{side}" patternUnits="userSpaceOnUse" width="0.5" height="0.5">
        <circle cx="0.25" cy="0.25" r="0.075" />
      </pattern>
      <pattern id={patternId({ kind: "lose", side })} class="change p{side}" patternUnits="userSpaceOnUse" width="0.4" height="0.4"
               patternTransform="rotate(45)">
        <line x1="0" y1="0.2" x2="0.4" y2="0.2" />
      </pattern>
    {/each}
  </defs>

  {#if layers.coordinates}
    {#each Array.from({ length: view[2] - view[0] + 1 }, (_, i) => view[0] + i) as i (i)}
      <text x={i} y={sy(view[1]) + 0.95} class="coord">{pointName(i, 0)[0]}</text>
    {/each}
    {#each Array.from({ length: view[3] - view[1] + 1 }, (_, i) => view[1] + i) as i (i)}
      <text x={view[0] - 0.85} y={sy(i) + 0.15} class="coord">{i + 1}</text>
    {/each}
  {/if}

  <!-- The ownership style (design 30), under everything else, as KaTrain draws its territory first: a square on each
       point, in the colour of the side that holds it and as strong as it holds it (KaTrain's OWNERSHIP_GAMMA), blended
       by a blur as KaTrain blends its texture. -->
  {#if shownMap}
    <g filter="url(#{blendId})">
      {#each points as [x, y] (pointKey(x, y))}
        {@const m = shownMap[y * N + x]}
        {#if m?.kind === "hold"}
          <rect x={x - 0.5} y={sy(y) - 0.5} width="1" height="1" style:fill={m.side === 0 ? "var(--blue)" : "var(--red)"}
                fill-opacity={AREA_ALPHA * m.strength} />
        {/if}
      {/each}
    </g>
  {/if}

  {#if layers.regions}
    {#each [0, 1] as p (p)}
      {#each shownRegions[p] as r, i (i)}
        <path d={r.rings.map(ringPath).join(" ")} class="region p{p}" fill-rule="evenodd" />
      {/each}
    {/each}
  {/if}

  <!-- The change style (design 30), over the regions' fill and under the edges: a square on each point marked, filled
       with its mark's pattern. -->
  {#if shownMap}
    {#each points as [x, y] (pointKey(x, y))}
      {@const m = shownMap[y * N + x]}
      {#if m && m.kind !== "hold"}
        <rect x={x - 0.5} y={sy(y) - 0.5} width="1" height="1" fill="url(#{patternId(m)})" />
      {/if}
    {/each}
  {/if}

  {#each points as [x, y] (x * N + y)}
    <circle cx={x} cy={sy(y)} r="0.07" class="dot" />
  {/each}

  {#if cut}
    <line {...seg(cut)} class="cut" />
    <text x={mid(cut)[0]} y={mid(cut)[1] + 0.17} class="cut-mark">×</text>
  {/if}

  {#each targets as t, i (i)}
    <line {...seg(t)} class="target" />
  {/each}

  {#each [0, 1] as p (p)}
    {#each shownEdges[p] as e, i (i)}
      <line {...seg(e)} class="edge p{p}" />
    {/each}
    <!-- A protected edge, on the edge itself: wider in its side's colour, with a white line along it. The mover's
         edges of this turn (placed) too: no one can cut them before the turn ends, and then they are protected. So the
         marked edges are the turns just played, and no band marks the last edge. -->
    {#if layers.protected}
      {#each shownEdges[p].filter(e => [...position.protected, ...position.placed].some(q => sameEdge(q, e))) as e, i (i)}
        <line {...seg(e)} class="protected p{p}" /><line {...seg(e)} class="protected-core" />
      {/each}
    {/if}
    {#each nodes(shownEdges[p]) as [x, y] (`${x},${y}`)}
      <circle cx={x} cy={sy(y)} r="0.16" class="node p{p}" />
    {/each}
  {/each}

  {#if preview}
    <line {...seg(preview)} class="preview p{previewPlayer}" />
  {/if}

  {#if ghost}
    <line {...seg(ghost.edge)} class="ghost" />
    {@render badge(ghost)}
  {/if}

  {#if layers.candidates}
    {#each ordered as c (`${c.rank} ${c.edge.join(",")}`)}
      {@const [mx, my] = mid(c.edge)}
      <!-- While a line shows, the other candidates are hidden, so that the board's only numbers are the line's. The lit
           one stays, so that the pointer keeps its hover. -->
      <g
        class="candidate"
        class:first={c.rank === 1}
        class:off={!!line?.length && !(lit && sameEdge(lit.edge, c.edge))}
        role="button"
        tabindex="-1"
        class:hovered={!!lit && sameEdge(lit.edge, c.edge)}
        onmouseenter={() => enter(c)}
        onmouseleave={leave}
        onclick={() => oncandidateclick?.(c.edge)}
        ondblclick={() => oncandidatedblclick?.(c.edge)}
        onkeydown={() => {}}
      >
        <line {...seg(c.edge)} class="cand-hit" />
        <line {...seg(c.edge)} class="cand-line" />
        {@render rankBadge(mx, my, c.rank)}
      </g>
    {/each}
  {/if}

  {#if layers.marks}
    {#each markGroups as g, gi (gi)}
      <g class="mark-group" class:lit={markHover?.group === gi}>
        {#each g as m, i (i)}<line {...seg(m.edge)} class="mark-lit" style:stroke="var(--{m.label})" />{/each}
        {#each g as m, i (i)}
          <g role="img" aria-label={m.note ?? m.label} onmouseenter={() => (markHover = { group: gi, mark: m })}
             onmouseleave={() => (markHover = null)}>
            {@render badge(m)}
          </g>
        {/each}
      </g>
    {/each}
  {/if}

  <!-- The lit candidate: the edge pointed at, alone. A symmetric twin has the same rank but is another edge, so it is
       not lit, and while the line shows it leaves the board as the other candidates do. -->
  {#if layers.candidates && lit}
    {@const h = lit}
    {@const [mx, my] = mid(h.edge)}
    <g class="candidate top" class:first={h.rank === 1}>
      <line {...seg(h.edge)} class="cand-halo" />
      <rect x={mx - 0.55} y={my - 0.55} width="1.1" height="1.1" rx="0.28" class="cand-halo-ring" />
      <line {...seg(h.edge)} class="cand-line" />
      {#if !line?.length}
        {@render rankBadge(mx, my, h.rank)}
      {/if}
    </g>
  {/if}

  <!-- The engine's line from the candidate pointed at (KaTrain's and Lizzie's way): its edges dashed in each mover's
       colour, numbered from the candidate, which is 1. The badges go last, so that no edge covers a number. -->
  {#if drawnLine.length}
    <g class="line">
      {#each lineCuts as c, i (i)}
        <line {...seg(c)} class="cut" />
        <text x={mid(c)[0]} y={mid(c)[1] + 0.17} class="cut-mark">×</text>
      {/each}
      {#each drawnLine as l, i (i)}
        <line {...seg(l.edge)} class="line-edge p{l.player}" />
      {/each}
      {#each drawnLine as l, i (i)}
        {@const [lx, ly] = mid(l.edge)}
        <circle cx={lx} cy={ly} r="0.3" class="line-badge p{l.player}" />
        <text x={lx} y={ly + 0.13} class="line-number">{i + 1}</text>
      {/each}
    </g>
  {/if}

  {#if layers.candidates && hovered}
    {@const [mx, my] = mid(hovered.edge)}
    {@render notePopup(mx, my, hovered.note, hovered.rank === 1)}
  {/if}

  <!-- The player's notes, and the one being drawn, over the board: they take no pointer events. -->
  {#each sketchNote ? [...notes, sketchNote] : notes as n, i (i)}
    {#if n.to}
      <line x1={n.at[0]} y1={sy(n.at[1])} x2={n.to[0]} y2={sy(n.to[1])} class={["note-line", n.brush, sketch && i === notes.length && "drawing"]} />
    {:else}
      <circle cx={n.at[0]} cy={sy(n.at[1])} r="0.42" class={["note-ring", n.brush, sketch && i === notes.length && "drawing"]} />
    {/if}
  {/each}

  <!-- The note of the badge under the pointer, beside it, as a candidate's note. -->
  {#if layers.marks && markHover?.mark.note}
    {@const [bx, by] = mid(markHover.mark.edge)}
    {@render notePopup(bx, by, markHover.mark.note)}
  {/if}

  {#if pending}
    <circle cx={pending[0]} cy={sy(pending[1])} r="0.35" class="pending" />
    {#each ends ?? [] as [x, y] (pointKey(x, y))}
      <circle cx={x} cy={sy(y)} r="0.12" class="end p{previewPlayer}" />
    {/each}
    {#if ghostEdge}
      <line {...seg(ghostEdge)} class="preview p{previewPlayer}" />
    {/if}
  {/if}

  {#if onpoint}
    {#each points as [x, y] (pointKey(x, y))}
      {@const on = !activeKeys || activeKeys.has(pointKey(x, y))}
      {#if on || !onlyActive}
      <circle
        cx={x} cy={sy(y)} r="0.45" class={["hit", !on && "inert"]}
        role="button" tabindex="-1" aria-label={pointName(x, y)}
        onpointerdown={ev => pressPoint(ev, x, y)}
        onmouseenter={() => (hoverPoint = [x, y])}
        onmouseleave={() => (hoverPoint = null)}
        onkeydown={() => {}}
      />
      {/if}
    {/each}
  {/if}
</svg>

<style>
  .board { width: 100%; height: auto; display: block; user-select: none; }
  .bg { fill: var(--board-bg); }
  .coord { font-size: 0.42px; fill: var(--muted); text-anchor: middle; font-family: system-ui, sans-serif; }
  .dot { fill: var(--board-dot); }
  .region { stroke: none; }
  .region.p0 { fill: var(--blue); fill-opacity: 0.16; }
  .region.p1 { fill: var(--red); fill-opacity: 0.16; }
  .change circle { stroke: none; }
  .change.p0 circle { fill: var(--blue); }
  .change.p1 circle { fill: var(--red); }
  .change line { stroke-width: 0.07; }
  .change.p0 line { stroke: var(--blue); }
  .change.p1 line { stroke: var(--red); }
  .edge { stroke-width: 0.13; stroke-linecap: round; }
  .edge.p0 { stroke: var(--blue); }
  .edge.p1 { stroke: var(--red); }
  .node.p0 { fill: var(--blue); }
  .node.p1 { fill: var(--red); }
  .protected { stroke-width: 0.2; stroke-linecap: round; }
  .protected.p0 { stroke: var(--blue); }
  .protected.p1 { stroke: var(--red); }
  .protected-core { stroke: #fff; stroke-width: 0.055; stroke-linecap: round; }
  .cut { stroke: var(--muted); stroke-width: 0.1; stroke-dasharray: 0.2 0.15; }
  .cut-mark { font-size: 0.7px; fill: var(--muted); text-anchor: middle; font-weight: 700; }
  .target { stroke: var(--accent); stroke-width: 0.55; stroke-linecap: round; stroke-opacity: 0.35; }
  .ghost { stroke: var(--muted); stroke-width: 0.13; stroke-dasharray: 0.25 0.15; stroke-linecap: round; }
  .preview { stroke-width: 0.16; stroke-dasharray: 0.3 0.15; stroke-linecap: round; }
  .preview.p0 { stroke: var(--blue); }
  .preview.p1 { stroke: var(--red); }

  /* Candidates: the first choice in the engine's colour, the others grey. All are faded until hover, so that none
     hides a short edge under it. */
  .candidate { cursor: pointer; opacity: 0.38; transition: opacity 0.12s; }
  .candidate:hover, .candidate.hovered { opacity: 1; }
  .candidate.top { opacity: 1; pointer-events: none; }
  .candidate.off { visibility: hidden; }
  .cand-hit { stroke: transparent; stroke-width: 0.6; }
  .cand-line { stroke: var(--candidate); stroke-width: 0.11; stroke-linecap: round; stroke-dasharray: 0.32 0.14; }
  .first .cand-line { stroke: var(--engine); stroke-width: 0.17; stroke-dasharray: none; }
  .cand-badge { fill: var(--candidate); stroke: var(--board-bg); stroke-width: 0.06; }
  .first .cand-badge { fill: var(--engine); }
  /* The lit candidate's halo: a wide soft band under its line and a ring around its badge. */
  .cand-halo { stroke: var(--candidate); stroke-width: 0.55; stroke-linecap: round; stroke-opacity: 0.3; }
  .cand-halo-ring { fill: none; stroke: var(--candidate); stroke-width: 0.1; }
  .first .cand-halo { stroke: var(--engine); }
  .first .cand-halo-ring { stroke: var(--engine); }
  .cand-rank { font-size: 0.44px; fill: var(--on-badge); text-anchor: middle; font-weight: 700; font-family: system-ui, sans-serif; pointer-events: none; }
  .cand-note { pointer-events: none; }
  .cand-note rect { fill: var(--panel); stroke: var(--border); stroke-width: 0.04; }
  .cand-note text { font-size: 0.42px; fill: var(--text); font-family: system-ui, sans-serif; }
  /* Number 1's note gives its own values, the others' notes give their difference from number 1: the colour of
     number 1's note box tells them apart. */
  .cand-note.first rect { fill: color-mix(in srgb, var(--engine) 35%, var(--panel)); stroke: var(--engine); }
  .cand-note.first text { font-weight: 600; }

  /* The engine's line. It takes no pointer events, so that it never takes the hover from the candidate under it. */
  .line { pointer-events: none; }
  .line-edge { stroke-width: 0.13; stroke-dasharray: 0.28 0.12; stroke-linecap: round; }
  .line-edge.p0 { stroke: var(--blue); }
  .line-edge.p1 { stroke: var(--red); }
  .line-badge { stroke: var(--board-bg); stroke-width: 0.05; }
  .line-badge.p0 { fill: var(--blue); }
  .line-badge.p1 { fill: var(--red); }
  .line-number { font-size: 0.36px; fill: var(--on-badge); text-anchor: middle; font-weight: 700; font-family: system-ui, sans-serif; }

  /* Label badges on the turn just played. */
  .mark circle { stroke: var(--board-bg); stroke-width: 0.06; }
  /* A turn's badges light together (design 10): a band in the label's colour under each of its edges, and a ring on
     each badge. */
  .mark-lit { stroke-width: 0.55; stroke-linecap: round; opacity: 0; pointer-events: none; }
  .mark-group.lit .mark-lit { opacity: 0.45; }
  .mark-group.lit .mark circle { stroke: var(--text); stroke-width: 0.08; }

  .pending { fill: none; stroke: var(--last); stroke-width: 0.1; }
  /* The points that complete a legal edge from the first point: dots in the mover's colour, smaller and fainter than
     a node (0.16), as a chess site marks the legal moves. */
  .end { fill-opacity: 0.55; pointer-events: none; }
  .end.p0 { fill: var(--blue); }
  .end.p1 { fill: var(--red); }
  /* The player's notes: wide, soft strokes over the board, as Lichess's shapes. */
  .note-line, .note-ring { fill: none; stroke-linecap: round; pointer-events: none; opacity: 0.8; }
  .note-line { stroke-width: 0.2; }
  .note-ring { stroke-width: 0.1; }
  .drawing { opacity: 0.55; }
  .purple { stroke: var(--note-purple); }
  .yellow { stroke: var(--note-yellow); }
  .green { stroke: var(--note-green); }
  .grey { stroke: var(--note-grey); }
  .hit { fill: transparent; cursor: crosshair; touch-action: none; } /* a drag from a point plays, not scrolls */
  .hit:hover { fill: var(--last); fill-opacity: 0.25; }
  .hit.inert { cursor: default; }
  .hit.inert:hover { fill: transparent; }
  .hit:focus, .candidate:focus { outline: none; }
</style>
