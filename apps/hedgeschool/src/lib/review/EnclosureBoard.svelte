<script lang="ts" module>
  import type { BoardLineEdge } from "#lib/board/Board.svelte";
  import type { LineMove } from "@abstractclass/review/game.ts";
  import type { Enclosure } from "./enclosure.ts";

  /** A line of the view as Hedge School's board draws it: each edge with its mover, and, once the rules have played
   *  it, the edge it cuts and the regions after it. The area map and the image of a line draw it so too. */
  export const boardLine = (line: LineMove<Enclosure>[]): BoardLineEdge[] =>
    line.map(l => ({ edge: l.move, player: l.player, cut: l.step?.cut, regions: l.step?.regions }));
</script>

<script lang="ts">
  // Enclosure's board in the review's view (@abstractclass/review/game.ts, the game's `Board`): the view's props as
  // Hedge School's board takes them (board/Board.svelte), with the edge input (the player's own edges), and the area
  // map's switch and legend in the board's empty margin above its top row (design 30).
  import Board from "#lib/board/Board.svelte";
  import type { BoardProps } from "@abstractclass/review/game.ts";

  let { position, last, candidates, pointed, line, lineShape, preview, previewPlayer, marks, layers, input, inputOn, areaMap,
        notes, onnotes, oncandidate, oncandidateclick, oncandidatedblclick, onpointat, mapControls }: BoardProps<Enclosure> = $props();
  const numbers = $derived(candidates.map(c => ({ edge: c.move, rank: c.rank, note: c.note })));
  const labels = $derived(marks.map(m => ({ edge: m.move, label: m.label, note: m.note, group: m.group })));
  const drawn = $derived(line && boardLine(line));
</script>

<Board
  {position}
  cut={last?.cut ?? null}
  candidates={numbers}
  highlight={pointed}
  line={drawn}
  {lineShape}
  {oncandidateclick}
  {oncandidatedblclick}
  pending={input.pending}
  ends={input.ends}
  active={input.active}
  onpoint={inputOn ? input.click : undefined}
  onlyActive
  {preview}
  {previewPlayer}
  marks={labels}
  {layers}
  {areaMap}
  {onpointat}
  {oncandidate}
  {notes}
  {onnotes}
/>
{#if mapControls}
  <div class="map-margin absolute inset-x-0 top-0 flex items-center gap-2 px-1 pointer-events-none">{@render mapControls()}</div>
{/if}

<style>
  /* The margin's row is the board's margin above its top row: 1.3 of the board's 20.6 units. */
  .map-margin { height: calc(100% * 1.3 / 20.6); }
</style>
