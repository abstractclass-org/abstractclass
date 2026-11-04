<script lang="ts">
  // The import page's choice for a tool's game (Hedge School's designs 21 and 22, Cyanotype's design 33): the
  // notice for an out-of-date tool, the game in one line, then the two ways for the game, the review and the Analysis
  // board, each with what it does. Each site gives its own words: the texts that a player follows, in strict
  // Simplified Technical English.
  import type { Snippet } from "svelte";

  /** A way for the game: its button's label, what it does, and the action. */
  interface Way { label: string; text: string; onclick: () => void }
  let { notice, heading, players, length, children, pending, review, analyze }: {
    /** The notice for an out-of-date tool, when it is one. */
    notice?: Snippet;
    heading: string;
    /** The players ("Ann against Bo") and the game's length ("3 edges"). */
    players: string;
    length: string;
    /** More about the game, under its line. */
    children?: Snippet;
    /** What the page does before it offers the ways (Cyanotype's check of the record): it shows in their place. */
    pending?: string;
    review: Way;
    analyze: Way;
  } = $props();
</script>

{#if notice}
  <p class="px-4 py-3 bg-panel border border-accent rounded-lg" role="status">{@render notice()}</p>
{/if}
<h1 class="text-2xl font-bold">{heading}</h1>
<p><strong>{players}</strong>, {length}.</p>
{@render children?.()}
{#if pending}
  <p class="text-muted" role="status">{pending}</p>
{:else}
  <div class="grid gap-3 sm:grid-cols-2">
    <section class="grid content-start gap-2 p-4 bg-panel border border-line rounded-lg">
      <!-- svelte-ignore a11y_autofocus: the page holds only this choice, and Enter then reviews, as the tools did -->
      <button class="btn-primary justify-self-start" type="button" autofocus onclick={review.onclick}>{review.label}</button>
      <p class="text-sm">{review.text}</p>
    </section>
    <section class="grid content-start gap-2 p-4 bg-panel border border-line rounded-lg">
      <button class="btn-primary justify-self-start" type="button" onclick={analyze.onclick}>{analyze.label}</button>
      <p class="text-sm">{analyze.text}</p>
    </section>
  </div>
{/if}
