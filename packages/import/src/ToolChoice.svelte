<script lang="ts">
  // The import page's choice for a tool's game (Hedge School's designs 21 and 22, Cyanotype's design 33): the
  // notice for an out-of-date tool, the game in one line, then the two ways for the game, the review and the Analysis
  // board, each with what it does. Each site gives its own words: the texts that a player follows, in strict
  // Simplified Technical English.
  import type { Snippet } from "svelte";

  /** A way for the game: its button's label, what it does, and the action. A way that the site refuses for this game
   *  has the reason in `refusal`: its button is off, and the reason takes the place of what it does. */
  interface Way { label: string; text: string; onclick: () => void; refusal?: string | null }
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
  // The first way that the site offers for the game takes the focus: the review, else the Analysis board
  const focused = $derived([review, analyze].find(w => !w.refusal));
</script>

{#snippet way(w: Way)}
  <section class="grid content-start gap-2 p-4 bg-panel border border-line rounded-lg">
    <!-- svelte-ignore a11y_autofocus: the page holds only this choice, and Enter then reviews, as the tools did, or
         opens the board where the review is refused -->
    <button class="btn-primary justify-self-start" type="button" autofocus={w === focused} disabled={!!w.refusal}
            onclick={w.onclick}>{w.label}</button>
    <p class="text-sm">{w.refusal ?? w.text}</p>
  </section>
{/snippet}

{#if notice}
  <p class="px-4 py-3 bg-panel border border-accent rounded-lg" role="status">{@render notice()}</p>
{/if}
<h1 class="text-2xl font-bold">{heading}</h1>
<p><strong>{players}</strong>, {length}.</p>
{@render children?.()}
{#if pending}
  <p class="text-muted" role="status">{pending}</p>
{:else}
  <div class="grid gap-3 sm:grid-cols-2">{@render way(review)}{@render way(analyze)}</div>
{/if}
