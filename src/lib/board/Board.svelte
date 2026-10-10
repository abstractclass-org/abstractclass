<script lang="ts" module>
  import type { Edge, Label, Position } from "#lib/review/model.ts";

  /** An engine candidate: its rank (1 is the engine's first choice) and a note shown on hover. */
  export interface BoardCandidate { edge: Edge; rank: number; note: string }
  /** A label badge on a played edge, at its midpoint: an end point is a node that several edges share. */
  export interface BoardMark { edge: Edge; label: Label; glyph: string }
  export interface BoardLayers { regions: boolean; protected: boolean; candidates: boolean; marks: boolean; coordinates: boolean }
</script>

<script lang="ts">
  // The Enclosure board as SVG: the lattice, each player's regions and edges, the protected edges, the last edge and
  // the edge it cut, the engine's candidates numbered by rank, a preview edge, label badges on the edges of the turn
  // just played, and a ghost edge (the game's edge in a retry). Points are 0-18 with y up, as in the engine.
  import { pointName, sameEdge } from "#lib/review/model.ts";

  interface Props {
    position: Position;
    lastEdge?: Edge | null;
    cut?: Edge | null;
    candidates?: BoardCandidate[];
    highlight?: Edge | null; // a candidate pointed at from outside the board (a row of the candidates table)
    preview?: Edge | null;
    previewPlayer?: 0 | 1;
    marks?: BoardMark[];
    ghost?: BoardMark | null; // an edge not on the board, with its label: the game's edge during a retry
    layers?: BoardLayers;
    pending?: [number, number] | null; // the first point of an edge being entered
    view?: [number, number, number, number]; // the points shown: x0, y0, x1, y1 (a crop for lessons)
    targets?: Edge[]; // edges to point at, drawn as a soft glow (a lesson's hint)
    onpoint?: (x: number, y: number) => void;
    oncandidate?: (edge: Edge | null) => void;
  }
  let {
    position, lastEdge = null, cut = null, candidates = [], highlight = null, preview = null, previewPlayer = 0, marks = [], ghost = null,
    layers = { regions: true, protected: true, candidates: true, marks: true, coordinates: true },
    pending = null, view = [0, 0, 18, 18], targets = [], onpoint, oncandidate,
  }: Props = $props();

  const N = 19;
  const sy = (y: number) => N - 1 - y;
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
  // Another position replaces the elements under the pointer, which then fire no mouseleave.
  $effect.pre(() => { void position; hoveredEdge = null; });
  function enter(c: BoardCandidate) { hoveredEdge = c.edge; oncandidate?.(c.edge); }
  function leave() { hoveredEdge = null; oncandidate?.(null); }
</script>

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
      {#each position.regions[p] as r, i (i)}
        <path d={r.rings.map(ringPath).join(" ")} class="region p{p}" fill-rule="evenodd" />
      {/each}
    {/each}
  {/if}

  {#each points as [x, y] (x * N + y)}
    <circle cx={x} cy={sy(y)} r="0.07" class="dot" />
  {/each}

  {#if cut}
    <line x1={cut[0]} y1={sy(cut[1])} x2={cut[2]} y2={sy(cut[3])} class="cut" />
    <text x={mid(cut)[0]} y={mid(cut)[1] + 0.17} class="cut-mark">×</text>
  {/if}

  {#if layers.protected}
    {#each position.protected as e, i (i)}
      <line x1={e[0]} y1={sy(e[1])} x2={e[2]} y2={sy(e[3])} class="protected" />
    {/each}
  {/if}
  {#each targets as t, i (i)}
    <line x1={t[0]} y1={sy(t[1])} x2={t[2]} y2={sy(t[3])} class="target" />
  {/each}

  {#if lastEdge}
    <line x1={lastEdge[0]} y1={sy(lastEdge[1])} x2={lastEdge[2]} y2={sy(lastEdge[3])} class="last" />
  {/if}

  {#each [0, 1] as p (p)}
    {#each position.edges[p] as e, i (i)}
      <line x1={e[0]} y1={sy(e[1])} x2={e[2]} y2={sy(e[3])} class="edge p{p}" />
    {/each}
    {#each nodes(position.edges[p]) as [x, y] (`${x},${y}`)}
      <circle cx={x} cy={sy(y)} r="0.16" class="node p{p}" />
    {/each}
  {/each}

  {#if preview}
    <line x1={preview[0]} y1={sy(preview[1])} x2={preview[2]} y2={sy(preview[3])} class="preview p{previewPlayer}" />
  {/if}

  {#if ghost}
    {@const [gx, gy] = mid(ghost.edge)}
    <line x1={ghost.edge[0]} y1={sy(ghost.edge[1])} x2={ghost.edge[2]} y2={sy(ghost.edge[3])} class="ghost" />
    <g class="mark {ghost.label}">
      <circle cx={gx} cy={gy} r="0.36" />
      <text x={gx} y={gy + 0.14}>{ghost.glyph}</text>
    </g>
  {/if}

  {#if layers.candidates}
    {#each ordered as c (c.rank)}
      {@const [mx, my] = mid(c.edge)}
      <g
        class="candidate"
        class:first={c.rank === 1}
        role="button"
        tabindex="-1"
        class:hovered={lit?.rank === c.rank}
        onmouseenter={() => enter(c)}
        onmouseleave={leave}
      >
        <line x1={c.edge[0]} y1={sy(c.edge[1])} x2={c.edge[2]} y2={sy(c.edge[3])} class="cand-hit" />
        <line x1={c.edge[0]} y1={sy(c.edge[1])} x2={c.edge[2]} y2={sy(c.edge[3])} class="cand-line" />
        <circle cx={mx} cy={my} r="0.38" class="cand-badge" />
        <text x={mx} y={my + 0.15} class="cand-rank">{c.rank}</text>
      </g>
    {/each}
  {/if}

  {#if layers.marks}
    {#each marks as m, i (i)}
      {@const [bx, by] = mid(m.edge)}
      <g class="mark {m.label}">
        <circle cx={bx} cy={by} r="0.36" />
        <text x={bx} y={by + 0.14}>{m.glyph}</text>
      </g>
    {/each}
  {/if}

  {#if layers.candidates && lit}
    {@const h = lit}
    {@const [mx, my] = mid(h.edge)}
    <g class="candidate top" class:first={h.rank === 1}>
      <line x1={h.edge[0]} y1={sy(h.edge[1])} x2={h.edge[2]} y2={sy(h.edge[3])} class="cand-halo" />
      <circle cx={mx} cy={my} r="0.56" class="cand-halo-ring" />
      <line x1={h.edge[0]} y1={sy(h.edge[1])} x2={h.edge[2]} y2={sy(h.edge[3])} class="cand-line" />
      <circle cx={mx} cy={my} r="0.38" class="cand-badge" />
      <text x={mx} y={my + 0.15} class="cand-rank">{h.rank}</text>
    </g>
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
  {/if}

  {#if onpoint}
    {#each points as [x, y] (x * N + y)}
      <circle
        cx={x} cy={sy(y)} r="0.45" class="hit"
        role="button" tabindex="-1" aria-label={pointName(x, y)}
        onclick={() => onpoint?.(x, y)}
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

  /* Label badges on the turn just played. */
  .mark circle { stroke: var(--board-bg); stroke-width: 0.06; }
  .mark text { font-size: 0.4px; fill: var(--on-badge); text-anchor: middle; font-weight: 800; font-family: system-ui, sans-serif; }
  .mark.great circle { fill: var(--great); }
  .mark.best circle { fill: var(--best); }
  .mark.excellent circle { fill: var(--excellent); }
  .mark.good circle { fill: var(--good); }
  .mark.inaccuracy circle { fill: var(--inaccuracy); }
  .mark.mistake circle { fill: var(--mistake); }
  .mark.blunder circle { fill: var(--blunder); }

  .pending { fill: none; stroke: var(--last); stroke-width: 0.1; }
  .hit { fill: transparent; cursor: crosshair; }
  .hit:hover { fill: var(--last); fill-opacity: 0.25; }
  .hit:focus, .candidate:focus { outline: none; }
</style>
