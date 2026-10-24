<script lang="ts">
  // The board's lab (design 33): Blueprints' board on hand-made positions (lib/board/fixtures.ts), so that the board
  // can be checked and looked at before the review and the Analysis board take it. The page has its own small frame
  // until the site's shell (abscls-8tl1.2) gives one. It has no engine: the candidates and their lines are hand-made.
  // The address can choose the position, the theme and a candidate: ?p=1&theme=dark&c=3@3,1. A choice on the page goes
  // into the address, so that it can be shared.
  import { onMount } from "svelte";
  import Board, { type BoardHex } from "#lib/board/Board.svelte";
  import { FIXTURES } from "#lib/board/fixtures.ts";
  import { hexKey } from "#lib/board/hex.ts";
  import { SITE_NAME } from "#lib/site.ts";

  let index = $state(0);
  let theme = $state<"light" | "dark">("light");
  let showCandidates = $state(true);
  let chosen = $state<string | null>(null); // the candidate clicked: its line stays drawn
  let pointed = $state<string | null>(null); // the candidate under the pointer
  let at = $state<BoardHex | null>(null);
  const fixture = $derived(FIXTURES[index]);
  const shown = $derived(pointed ?? chosen);
  const line = $derived(shown && showCandidates ? fixture.lines?.[shown] ?? null : null);

  onMount(() => {
    const q = new URLSearchParams(location.search);
    const p = Number(q.get("p"));
    if (Number.isInteger(p) && p >= 0 && p < FIXTURES.length) index = p;
    theme = q.get("theme") === "dark" || (!q.get("theme") && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    chosen = q.get("c");
  });
  $effect(() => { document.documentElement.dataset.theme = theme; });
  function choose(i: number) { index = i; chosen = null; pointed = null; address({ p: i ? String(i) : null, c: null }); }
  /** The address with these parameters set, or removed (null). */
  function address(set: Record<string, string | null>) {
    const url = new URL(location.href);
    for (const [k, v] of Object.entries(set)) if (v === null) url.searchParams.delete(k); else url.searchParams.set(k, v);
    history.replaceState(history.state, "", url);
  }
  const where = (h: BoardHex | null) =>
    !h ? "" : h.hand ? `${h.hand.player === 0 ? "Blue" : "Red"}'s blueprint ${h.hand.blueprint}, at ${hexKey(h.hex)}` : `the board, at ${hexKey(h.hex)}`;
</script>

<svelte:head><title>Board lab · {SITE_NAME}</title><meta name="robots" content="noindex" /></svelte:head>

<div class="flex h-dvh flex-col bg-page text-ink">
  <header class="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
    <a href="/" class="font-semibold">{SITE_NAME}</a>
    <span class="text-muted">Board lab</span>
    <button type="button" class="ml-auto rounded-md border border-line px-2 py-1 text-sm hover:bg-panel-2"
            onclick={() => { theme = theme === "dark" ? "light" : "dark"; address({ theme }); }}>
      {theme === "dark" ? "Light theme" : "Dark theme"}
    </button>
  </header>

  <div class="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2 text-sm">
    {#each FIXTURES as f, i (f.name)}
      <button type="button" onclick={() => choose(i)} aria-pressed={i === index}
              class={["rounded-md border px-2 py-1", i === index ? "border-accent bg-accent text-on-accent" : "border-line hover:bg-panel-2"]}>
        {f.name}
      </button>
    {/each}
    {#if fixture.candidates}
      <label class="flex items-center gap-1"><input type="checkbox" bind:checked={showCandidates} /> Candidates</label>
    {/if}
  </div>

  <main class="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-3">
    <p class="min-h-5 shrink-0 text-sm text-muted">
      Move {fixture.position.ply} · Blue {fixture.position.scores[0]}, Red {fixture.position.scores[1]}
      {#if chosen}· Line of {chosen}{/if}
      {#if at}· The pointer is on {where(at)}{/if}
    </p>
    <div class="min-h-0 flex-1">
      <Board position={fixture.position} last={fixture.last} candidates={fixture.candidates ?? []} {line}
             highlight={chosen} layers={{ candidates: showCandidates }}
             oncandidate={name => (pointed = name)}
             oncandidateclick={name => { chosen = chosen === name ? null : name; address({ c: chosen }); }}
             onhexat={h => (at = h)} />
    </div>
  </main>
</div>
