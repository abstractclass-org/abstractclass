<script lang="ts">
  // The section "A link to the Analysis board" of the sites' pages for developers (Hedge School's design 21): a game or
  // a line on the free board, from a set-up start too, at a position. `moves` is the site's word for a game's moves
  // ("edges" on Hedge School).
  let { live, moves }: { live: string; moves: string } = $props();
  const link = $derived(`const link = "${live}/analysis#" + new URLSearchParams({ record });
// opened at the position after the first 12 ${moves}:
const link = "${live}/analysis#" + new URLSearchParams({ record, at: "12" });`);
</script>

<h2 id="analysis">A link to the Analysis board</h2>
<p>A link to the Analysis board opens a game, or any line from the start, on a free board: the player explores it with
  the engine, which searches only the position on screen. The board reviews nothing, and the game does not go into
  the player's list of games.</p>
<pre>{link}</pre>
<ul>
  <li><strong><code>record</code>:</strong> as for a review. A record that has not ended is welcome: its result is
    <code>*</code>.</li>
  <li><strong><code>position</code>:</strong> a start other than the standard one, in the
    <a href="/notation">position notation</a>, for a line from a set-up position. Alone, it opens the board at that
    position. With <code>record</code>, the record's moves start there (or put it in the record's
    <code>Position</code> tag). The engine checks that a game can reach it.</li>
  <li><strong><code>at</code>:</strong> the position that the board opens at, as a number of {moves} from the start.
    Without it, the board opens at the start.</li>
</ul>
