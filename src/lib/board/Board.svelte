<script lang="ts" module>
  import type { Edge, Glyph, Label, Position } from "#lib/review/model.ts";

  /** An engine candidate: its rank (1 is the engine's first choice) and a note shown on hover. */
  export interface BoardCandidate { edge: Edge; rank: number; note: string }
  /** A label badge on a played edge, at its midpoint: an end point is a node that several edges share. */
  export interface BoardMark { edge: Edge; label: Label; glyph: Glyph }
  /** An edge of the engine's line from the position, with its mover, and, once the engine's rules have played it, the
   *  edge it cuts and the regions after it. */
  export interface BoardLineEdge { edge: Edge; player: 0 | 1; cut?: Edge | null; regions?: Position["regions"] }
  export interface BoardLayers { regions: boolean; protected: boolean; candidates: boolean; marks: boolean; coordinates: boolean }
  export const DEFAULT_LAYERS: BoardLayers = { regions: true, protected: true, candidates: true, marks: true, coordinates: true };
</script>

<script lang="ts">
  // The Enclosure board as SVG: the lattice, each player's regions and edges, the protected edges, the last edge and
  // the edge it cut, the engine's candidates numbered by rank, a preview edge, label badges on the edges of the turn
  // just played, and a ghost edge (the game's edge in a retry). During edge input: the first point, the points that
  // complete a legal edge from it (dots), and the edge to the marked point under the pointer. Points are 0-18 with y
  // up, as in the engine.
  import { pointName, sameEdge } from "#lib/review/model.ts";

  interface Props {
    position: Position;
    lastEdge?: Edge | null;
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
    onpoint?: (x: number, y: number) => void;
    oncandidate?: (edge: Edge | null) => void;
    oncandidateclick?: (edge: Edge) => void;
  }
  let {
    position, lastEdge = null, cut = null, candidates = [], highlight = null, line = null,
    preview = null, previewPlayer = 0, marks = [], ghost = null,
    layers: layersSet = {},
    pending = null, ends = null, active = null, view = [0, 0, 18, 18], targets = [], onpoint, oncandidate, oncandidateclick,
  }: Props = $props();

  const layers = $derived({ ...DEFAULT_LAYERS, ...layersSet });
  const N = 19;
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
  const lit = $derived(hovered ?? (highlight ? candidates.find(c => sameEdge(c.edge, highlight!)) ?? null : null));
  // The board as the line leaves it: the edges it cuts are off the board and drawn as cut (as the last edge's cut is),
  // and the regions are the ones after its last edge, once the engine's rules have played it.
  const drawnLine = $derived(line ?? []);
  const lineCuts = $derived(drawnLine.flatMap(l => (l.cut ? [l.cut] : [])));
  const shownEdges = $derived(([0, 1] as const).map(p => position.edges[p].filter(e => !lineCuts.some(c => sameEdge(c, e)))));
  const shownRegions = $derived(drawnLine.at(-1)?.regions ?? position.regions);
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
</script>

<!-- A label badge at an edge's midpoint. -->
<!-- A candidate's rank in a rounded square: the engine's line numbers its edges in circles (Go's numbered stones), so the
     candidates take another shape. -->
{#snippet rankBadge(x: number, y: number, rank: number)}
  <rect x={x - 0.36} y={y - 0.36} width="0.72" height="0.72" rx="0.17" class="cand-badge" />
  <text x={x} y={y + 0.15} class="cand-rank">{rank}</text>
{/snippet}

{#snippet badge(m: BoardMark)}
  {@const [bx, by] = mid(m.edge)}
  <g class="mark">
    <circle cx={bx} cy={by} r="0.36" style:fill="var(--{m.label})" />
    {#if typeof m.glyph === "string"}
      <text x={bx} y={by + 0.14}>{m.glyph}</text>
    {:else}
      <!-- The icon's 24-unit square, 0.4 units wide, centred on the badge. -->
      <path d={m.glyph.path} transform="translate({bx - 0.2} {by - 0.2}) scale({0.4 / 24})" />
    {/if}
  </g>
{/snippet}

<svg class="board" viewBox={box} role="img" aria-label="Enclosure board">
  <rect x="-1.3" y="-1.3" width="20.6" height="20.6" class="bg" />

  {#if layers.coordinates}
    {#each Array.from({ length: view[2] - view[0] + 1 }, (_, i) => view[0] + i) as i (i)}
      <text x={i} y={sy(view[1]) + 0.95} class="coord">{pointName(i, 0)[0]}</text>
    {/each}
    {#each Array.from({ length: view[3] - view[1] + 1 }, (_, i) => view[1] + i) as i (i)}
      <text x={view[0] - 0.85} y={sy(i) + 0.15} class="coord">{i + 1}</text>
    {/each}
  {/if}

  {#if layers.regions}
    {#each [0, 1] as p (p)}
      {#each shownRegions[p] as r, i (i)}
        <path d={r.rings.map(ringPath).join(" ")} class="region p{p}" fill-rule="evenodd" />
      {/each}
    {/each}
  {/if}

  {#each points as [x, y] (x * N + y)}
    <circle cx={x} cy={sy(y)} r="0.07" class="dot" />
  {/each}

  {#if cut}
    <line {...seg(cut)} class="cut" />
    <text x={mid(cut)[0]} y={mid(cut)[1] + 0.17} class="cut-mark">×</text>
  {/if}

  {#if layers.protected}
    {#each position.protected as e, i (i)}
      <line {...seg(e)} class="protected" />
    {/each}
  {/if}
  {#each targets as t, i (i)}
    <line {...seg(t)} class="target" />
  {/each}

  {#if lastEdge}
    <line {...seg(lastEdge)} class="last" />
  {/if}

  {#each [0, 1] as p (p)}
    {#each shownEdges[p] as e, i (i)}
      <line {...seg(e)} class="edge p{p}" />
    {/each}
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
    {#each ordered as c (c.rank)}
      {@const [mx, my] = mid(c.edge)}
      <!-- While a line shows, the other candidates are hidden, so that the board's only numbers are the line's. The lit
           one stays, so that the pointer keeps its hover. -->
      <g
        class="candidate"
        class:first={c.rank === 1}
        class:off={!!line?.length && lit?.rank !== c.rank}
        role="button"
        tabindex="-1"
        class:hovered={lit?.rank === c.rank}
        onmouseenter={() => enter(c)}
        onmouseleave={leave}
        onclick={() => oncandidateclick?.(c.edge)}
        onkeydown={() => {}}
      >
        <line {...seg(c.edge)} class="cand-hit" />
        <line {...seg(c.edge)} class="cand-line" />
        {@render rankBadge(mx, my, c.rank)}
      </g>
    {/each}
  {/if}

  {#if layers.marks}
    {#each marks as m, i (i)}
      {@render badge(m)}
    {/each}
  {/if}

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

  {#if layers.candidates && lit}
    {@const h = lit}
    {@const [mx, my] = mid(h.edge)}
    {#if hovered === h}
      {@const w = 0.25 * h.note.length + 0.4}
      {@const nx = mx + 0.62 + w > N ? mx - 0.62 - w : mx + 0.62}
      <g class="cand-note" class:first={h.rank === 1}>
        <rect x={nx} y={my - 0.38} width={w} height="0.76" rx="0.15" />
        <text x={nx + 0.2} y={my + 0.14}>{h.note}</text>
      </g>
    {/if}
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
      <circle
        cx={x} cy={sy(y)} r="0.45" class={["hit", !on && "inert"]}
        role="button" tabindex="-1" aria-label={pointName(x, y)}
        onclick={() => onpoint?.(x, y)}
        onmouseenter={() => (hoverPoint = [x, y])}
        onmouseleave={() => (hoverPoint = null)}
        onkeydown={() => {}}
      />
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
  .edge { stroke-width: 0.13; stroke-linecap: round; }
  .edge.p0 { stroke: var(--blue); }
  .edge.p1 { stroke: var(--red); }
  .node.p0 { fill: var(--blue); }
  .node.p1 { fill: var(--red); }
  .protected { stroke: var(--protected); stroke-width: 0.42; stroke-linecap: round; stroke-opacity: 0.55; }
  .last { stroke: var(--last); stroke-width: 0.5; stroke-linecap: round; stroke-opacity: 0.85; }
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
  .mark text { font-size: 0.4px; fill: var(--on-badge); text-anchor: middle; font-weight: 800; font-family: system-ui, sans-serif; }
  .mark path { fill: var(--on-badge); }

  .pending { fill: none; stroke: var(--last); stroke-width: 0.1; }
  /* The points that complete a legal edge from the first point: dots in the mover's colour, smaller and fainter than
     a node (0.16), as a chess site marks the legal moves. */
  .end { fill-opacity: 0.55; pointer-events: none; }
  .end.p0 { fill: var(--blue); }
  .end.p1 { fill: var(--red); }
  .hit { fill: transparent; cursor: crosshair; }
  .hit:hover { fill: var(--last); fill-opacity: 0.25; }
  .hit.inert { cursor: default; }
  .hit.inert:hover { fill: transparent; }
  .hit:focus, .candidate:focus { outline: none; }
</style>
