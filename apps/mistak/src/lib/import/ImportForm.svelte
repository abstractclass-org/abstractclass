<script lang="ts">
  // The form of the import (docs/design/34-tak-site.md, item 10), in the Import dialog and on the import page: one box
  // for a playtak game's number, a ptn.ninja link or PTN (ways.ts tells them apart). A game that the site does not take
  // shows why under the box, and the text stays, so that the player can correct it. The box's border is then red and the
  // reason is in the text's own colour: the shared red is too light for small text. The texts are strict Simplified
  // Technical English: the player follows them.
  import type { Snippet } from "svelte";
  import { bringGame, type Brought } from "./ways.ts";
  let { start = "", refused = "", onimport, children }: {
    start?: string; // the text in the box at first
    refused?: string; // why the site did not take that text
    onimport: (brought: Brought) => void; // the game that the site took
    children?: Snippet; // what stands beside the button
  } = $props();

  const id = $props.id();
  const EXAMPLE = '[Size "6"]\n[Komi "2"]\n\n1. a1 f6\n2. c3 d4';
  // svelte-ignore state_referenced_locally
  let given = $state(start), problem = $state(refused), busy = $state(false);
  const number = $derived(/^\s*\d+\s*$/.test(given));

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    problem = "";
    busy = true;
    try {
      onimport(await bringGame(given, fetch));
    } catch (e) {
      problem = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<form onsubmit={submit}>
  <label for="{id}-game" class="block text-sm">The game</label>
  <p id="{id}-hint" class="mb-1 text-xs text-muted">The number of a finished game on playtak, a link of PTN Ninja, or a
    record in <a href="/notation" target="_blank" rel="noopener noreferrer">PTN</a>.</p>
  <textarea id="{id}-game" rows="6" bind:value={given} oninput={() => (problem = "")} spellcheck="false" autocomplete="off"
            aria-describedby="{id}-hint" aria-invalid={problem !== ""}
            class="w-full px-2.5 py-2 font-mono text-sm/[1.4] bg-page text-ink border border-line aria-invalid:border-red rounded resize-y focus:outline-2 focus:outline-accent"
            placeholder={EXAMPLE}></textarea>
  {#if problem}<p class="mt-1.5 text-sm font-medium [overflow-wrap:anywhere]" role="alert">{problem}</p>{/if}
  <div class="flex flex-wrap items-center gap-3 mt-2">
    <button class="btn-primary" type="submit" disabled={!given.trim() || busy}>{busy && number ? "Getting the game…" : "Import"}</button>
    {@render children?.()}
  </div>
</form>
