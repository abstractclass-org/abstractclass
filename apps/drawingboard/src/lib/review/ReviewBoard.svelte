<script lang="ts" module>
  import type { LineMove } from "@abstractclass/review/game.ts";
  import type { BoardLineMove } from "../board/Board.svelte";
  import { boardMove } from "../board/described.ts";
  import type { Hand } from "../board/position.ts";
  import { moveName } from "../game/notation.ts";
  import { engineStep, moveBefore, type Blueprints } from "./blueprints.ts";

  /** A line as the board draws it, from the hands `hands` where it starts: each move that the rules have played with
   *  what it did and the hands after it, and the others where they stand. */
  function boardLine(line: readonly LineMove<Blueprints>[], hands: readonly [Hand, Hand]): BoardLineMove[] {
    let before = hands;
    return line.map(l => {
      if (!l.step) return { move: moveBefore(l.move, l.player, before) };
      const move = boardMove(engineStep(moveName(l.move), l.player, l.step), before, "after");
      before = l.step.blueprints;
      return { move, hands: l.step.blueprints };
    });
  }
</script>

<script lang="ts">
  // Blueprints' board in the review and on the Analysis board (design 33): the view's board (@abstractclass/review/
  // game.ts, BoardProps) as Drawing Board's board takes it (board/Board.svelte). Each move goes to the board with what
  // the board draws of it: a move played with what it did (the engine's describe_game), and a candidate or a line's
  // move that the rules have not played yet on its anchor hex, with no captures. The hands go in a panel over the board
  // on a computer, and under it in one column (keptPanel.svelte.ts), as on Practice, with the panel's place and size
  // kept in this browser. The area map's switch and legend take the strip along the field's foot. The moves of the turn
  // so far are marked together: the last move and an earlier one of its turn. The player's notes go to the board as
  // they are: the view keeps them by position, and gives none while a preview shows another position.
  import type { BoardProps } from "@abstractclass/review/game.ts";
  import { innerWidth } from "svelte/reactivity/window";
  import Board, { type BoardCandidate, type BoardLabel } from "../board/Board.svelte";
  import { handsAt, keptPanel } from "../board/keptPanel.svelte.ts";
  import { moves } from "../game/notation.ts";

  let { position, last, earlier, candidates, pointed, line, marks, layers, input, inputOn, areaMap, areaOf, oncandidate,
        oncandidateclick, onpointat, mapControls, notes, onnotes }: BoardProps<Blueprints> = $props();

  const hands = $derived(handsAt(innerWidth.current ?? 0));
  const panel = keptPanel();

  const boardCandidates = $derived(candidates.map((c): BoardCandidate =>
    ({ name: moveName(c.move), move: moveBefore(c.move, position.player, position.blueprints), rank: c.rank, note: c.note })));
  const boardLines = $derived(line ? boardLine(line, position.blueprints) : null);
  // The quality labels of the turn just played, on its moves as they were played (the last move and the earlier one of
  // its turn), else where they stand in the position's hands.
  const turn = $derived([...earlier, ...(last ? [last] : [])]);
  const labels = $derived(!layers.marks ? [] : marks.map((m): BoardLabel => ({
    move: turn.find(p => p.edge && moves.equal(p.edge, m.move))?.drawn
      ?? moveBefore(m.move, last?.player ?? position.player, position.blueprints),
    label: m.label, note: m.note,
  })));
</script>

<Board {position} last={last?.drawn ?? null} earlier={earlier.map(m => m.drawn)} candidates={boardCandidates}
       pointed={pointed && moveName(pointed)} line={boardLines}
       layers={{ candidates: layers.candidates }} {input} {inputOn} {hands} bind:place={panel.place} bind:size={panel.size}
       {labels} {areaMap} {areaOf} controls={mapControls} {notes} {onnotes}
       oncandidate={name => oncandidate(name ? moves.parseMove(name) : null)}
       oncandidateclick={name => oncandidateclick(moves.parseMove(name))}
       onhexat={at => onpointat(at && !at.hand ? at.hex : null)} />
