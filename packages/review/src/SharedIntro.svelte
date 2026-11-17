<script lang="ts">
  // A shared review's intro (`/review#packed=…`, Hedge School's design 13, item 8, Cyanotype's design 33): what the
  // link holds, that this browser reviews the game again, and what the sender's review ran with, before anything runs.
  // Each site reads the link and keeps the game (Hedge School's Arrival.svelte, Cyanotype's SharedArrival.svelte), and
  // gives this its game's words and its own names for the network and the depth. "Review it" calls `onreview`.
  import type { GameWords } from "./game.ts";

  interface Props {
    players: { blue: string; red: string }; // the players' names, from the game's tags
    moves: number; // the game's moves
    branches: number; // the moves in the sender's variations
    words: GameWords; // the game's word for a move
    network: string | null; // the sender's network, by its name on this site. null: this site no longer has it
    depth: string; // the sender's review's depth, in words
    sameEngine: boolean; // whether this site's engine is the sender's
    onreview: () => void;
  }
  let { players, moves, branches, words, network, depth, sameEngine, onreview }: Props = $props();
</script>

<!-- Text that a player follows: strict Simplified Technical English. -->
<h1 class="text-2xl font-bold">A shared review</h1>
<p><strong>{players.blue} against {players.red}</strong>, {moves} {moves === 1 ? words.move : words.moves}{branches
  ? `, with ${branches} ${branches === 1 ? "move" : "moves"} in the sender's variations` : ""}.</p>
<p>The link carries the game, not the engine's work. <strong>Your browser reviews the game again</strong>, as it does
  a game that you import. The review shows each result when the engine finds it. With the sender's engine, network
  and depth, your review is the same as the sender's: the same quality labels, lines and accuracy. A GPU computes
  the network a little differently, so on a GPU a close call can rarely give another result.</p>
<p>The sender's review: {network ?? "a network that this site no longer has"}, at
  {depth}.
  {#if !network}The review uses your network, so its quality labels can differ.
  {:else}The game keeps them for its review. Other games review as before.{/if}
  {#if !sameEngine}This site's engine changed after the sender made the link, so some quality labels
    can differ.{/if}</p>
<div><button class="btn-primary" type="button" onclick={onreview}>Review it</button></div>
