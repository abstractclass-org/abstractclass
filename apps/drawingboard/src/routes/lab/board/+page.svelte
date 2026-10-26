<script lang="ts">
  // The board's lab (design 33): Blueprints' board on the positions of a few games (lib/board/fixtures.ts), so that the
  // board can be checked and looked at before the review and the Analysis board take it. The page runs no engine:
  // Stamp Duty's early build gave each position and every legal move ahead of time (scripts/board-fixtures.mjs). The
  // candidates and their lines are hand-made marks on legal moves. A move made shows its string in the status line, and
  // the input starts again: the lab does not play it. Escape cancels a move begun. The address can choose the position
  // and a candidate: ?p=1&c=2@3,-9. A choice on the page goes into the address, so that it can be shared. The site's
  // header, with its theme menu, is above the page.
  import { onMount } from "svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import Board, { type BoardHex } from "#lib/board/Board.svelte";
  import { BlueprintInput } from "#lib/board/blueprintInput.svelte.ts";
  import { FIXTURE_DATA, FIXTURES } from "#lib/board/fixtures.ts";
  import { hexKey } from "#lib/board/hex.ts";
  import { inputStatus } from "#lib/board/input.ts";
  import { PLAYER_NAMES } from "#lib/board/position.ts";
  import { moveName } from "#lib/game/notation.ts";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";

  let index = $state(0);
  let showCandidates = $state(true);
  let takeMoves = $state(true);
  let pinned = $state<string | null>(null); // the candidate clicked: its line stays drawn
  let pointed = $state<string | null>(null); // the candidate under the pointer
  let at = $state<BoardHex | null>(null);
  let made = $state<string | null>(null); // the last move made, by its string
  const fixture = $derived(FIXTURES[index]);
  const shown = $derived(pointed ?? pinned);
  const line = $derived(shown && showCandidates ? fixture.lines?.[shown] ?? null : null);

  const input = new BlueprintInput(move => { made = moveName(move); });
  // Each position gives the input its rules, as the view does after the engine's describe.
  $effect.pre(() => {
    const f = fixture;
    input.reset();
    made = null;
    input.rules = { position: f.position, mover: f.mover, legal: f.legal };
  });
  const status = $derived(inputStatus(input, fixture.mover));

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
  function onkeydown(ev: KeyboardEvent) {
    if (ev.key === "Escape" && (input.pending || input.refused)) { input.reset(); ev.preventDefault(); }
  }
</script>

<svelte:window {onkeydown} />

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
    <label class="flex items-center gap-1"><input type="checkbox" bind:checked={takeMoves} /> Your moves</label>
  </div>
  <!-- The rows above the board change only with the position: a row that grew while the player points or clicks would
       move the board, and its hands, under the pointer. -->
  <p class="shrink-0 text-sm text-muted">
    Move {fixture.position.ply} · {PLAYER_NAMES[fixture.mover]} to move · Blue {fixture.position.scores[0]}, Red {fixture.position.scores[1]}
    · {fixture.legal.length} legal moves ({ENGINE_NAME}, {FIXTURE_DATA.engine.tag})
  </p>
  <!-- Two lines high, also for one line of text: a status that wraps would move the board between a touch's two taps. -->
  <p class="min-h-10 shrink-0 text-sm" data-testid="input-status">
    {#if takeMoves && status}{status}{:else if made}The move made: <span class="font-mono">{made}</span>{/if}
  </p>
  <div class="min-h-0 flex-1">
    <Board position={fixture.position} last={fixture.last} candidates={fixture.candidates ?? []} {line}
           pointed={pinned} layers={{ candidates: showCandidates }} {input} inputOn={takeMoves && !line}
           oncandidate={name => (pointed = name)}
           oncandidateclick={name => { pinned = pinned === name ? null : name; address({ c: pinned }); }}
           onhexat={h => (at = h)} />
  </div>
  <!-- One line under the board, cut short when it is too long. -->
  <p class="h-5 shrink-0 truncate text-sm text-muted">
    {#if pinned}Line of {pinned}{/if}{#if pinned && at} · {/if}{#if at}The pointer is on {where(at)}{/if}
  </p>
</main>
