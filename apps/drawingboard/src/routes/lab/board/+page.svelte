<script lang="ts">
  // The board's lab (design 33): Blueprints' board on hand-made positions (lib/board/fixtures.ts), so that the board
  // can be checked and looked at before the review and the Analysis board take it. It has no engine: the candidates
  // and their lines are hand-made. The address can choose the position and a candidate: ?p=1&c=3@3,1. A choice on the
  // page goes into the address, so that it can be shared. The site's header, with its theme menu, is above the page.
  import { onMount } from "svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import Board, { type BoardHex } from "#lib/board/Board.svelte";
  import { FIXTURES } from "#lib/board/fixtures.ts";
  import { hexKey } from "#lib/board/hex.ts";
  import { PLAYER_NAMES } from "#lib/board/position.ts";
  import { SITE_NAME } from "#lib/site.ts";

  let index = $state(0);
  let showCandidates = $state(true);
  let pinned = $state<string | null>(null); // the candidate clicked: its line stays drawn
  let pointed = $state<string | null>(null); // the candidate under the pointer
  let at = $state<BoardHex | null>(null);
  const fixture = $derived(FIXTURES[index]);
  const shown = $derived(pointed ?? pinned);
  const line = $derived(shown && showCandidates ? fixture.lines?.[shown] ?? null : null);

  onMount(() => {
    const q = new URLSearchParams(location.search);
    const p = Number(q.get("p"));
    if (Number.isInteger(p) && p >= 0 && p < FIXTURES.length) index = p;
    pinned = q.get("c");
  });
  function choose(i: number) { index = i; pinned = null; address({ p: i ? String(i) : null, c: null }); }
  /** The address with these parameters set, or removed (null). */
  function address(set: Record<string, string | null>) {
    const url = new URL(location.href);
    for (const [k, v] of Object.entries(set)) if (v === null) url.searchParams.delete(k); else url.searchParams.set(k, v);
    history.replaceState(history.state, "", url);
  }
  const where = (h: BoardHex | null) =>
    !h ? "" : h.hand ? `${PLAYER_NAMES[h.hand.player]}'s blueprint ${h.hand.blueprint}, at ${hexKey(h.hex)}` : `the board, at ${hexKey(h.hex)}`;
</script>

<PageMeta title="Board lab · {SITE_NAME}" noindex />

<!-- The page area under the site's header, as Hedge School's pages size their boards (--site-header): the board takes
     what the rows above it leave. -->
<main class="flex h-[calc(100dvh-var(--site-header))] flex-col gap-2 px-4 pt-2 pb-3">
  <div class="flex shrink-0 flex-wrap items-center gap-2 text-sm">
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
  <p class="min-h-5 shrink-0 text-sm text-muted">
    Move {fixture.position.ply} · Blue {fixture.position.scores[0]}, Red {fixture.position.scores[1]}
    {#if pinned}· Line of {pinned}{/if}
    {#if at}· The pointer is on {where(at)}{/if}
  </p>
  <div class="min-h-0 flex-1">
    <Board position={fixture.position} last={fixture.last} candidates={fixture.candidates ?? []} {line}
           pointed={pinned} layers={{ candidates: showCandidates }}
           oncandidate={name => (pointed = name)}
           oncandidateclick={name => { pinned = pinned === name ? null : name; address({ c: pinned }); }}
           onhexat={h => (at = h)} />
  </div>
</main>
