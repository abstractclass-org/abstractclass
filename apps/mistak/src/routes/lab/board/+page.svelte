<script lang="ts">
  // The board's lab (design 34): Tak's board on fixed positions (lib/board/fixtures.ts), so that the board can be
  // checked and looked at before the engine. The page runs no engine. The address can choose the position and the
  // turned board, and a choice on the page goes into the address: ?p=2&turned=1.
  import { onMount } from "svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import Board from "#lib/board/Board.svelte";
  import { FIXTURES, GAME_DATA } from "#lib/board/fixtures.ts";
  import { PLAYER_NAMES, positionOf } from "#lib/board/position.ts";
  import { stackLine } from "#lib/board/squares.ts";
  import { SITE_NAME } from "#lib/site.ts";

  let index = $state(0);
  let turned = $state(false);
  let pointed = $state<number | null>(null);
  const fixture = $derived(FIXTURES[index]);
  const position = $derived(positionOf(fixture.tps));
  const line = $derived(pointed === null ? "" : stackLine(position.size, pointed, position.squares[pointed] ?? []));

  onMount(() => {
    const q = new URLSearchParams(location.search), p = Number(q.get("p"));
    if (Number.isInteger(p) && p >= 0 && p < FIXTURES.length) index = p;
    turned = q.get("turned") === "1";
  });
  function address() {
    const url = new URL(location.href);
    for (const [k, v] of [["p", index ? String(index) : ""], ["turned", turned ? "1" : ""]]) {
      if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
    }
    history.replaceState(history.state, "", url);
  }
</script>

<PageMeta title="Board lab · {SITE_NAME}" noindex />

<!-- The board is as wide as the page, and at most as high as the page area leaves under the rows above it. -->
<main class="mx-auto flex flex-col gap-2 px-4 pt-2 pb-4" style:max-width="max(20rem, 100dvh - var(--site-header) - 10rem)">
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
    <label class="flex min-w-0 items-center gap-2">Position
      <select class="min-w-0 rounded-md border border-line bg-panel px-2 py-1" bind:value={index} onchange={address}>
        {#each FIXTURES as f, i (f.name)}<option value={i}>{f.name}</option>{/each}
      </select>
    </label>
    <label class="flex items-center gap-1"><input type="checkbox" bind:checked={turned} onchange={address} /> Turn the board</label>
  </div>
  <p class="text-sm text-muted">{fixture.source}</p>
  <p class="text-sm">
    Ply {position.ply} · {PLAYER_NAMES[position.mover]} to move · Flats on top: White {position.flats[0]}, Black {position.flats[1]}
  </p>
  <Board {position} {turned} onpoint={square => (pointed = square)} />
  <!-- The whole stack of the square pointed at. Two lines of room are kept, so that nothing moves. A screen reader has
       the square's own words. -->
  <p class="min-h-10 text-sm leading-5" aria-hidden="true" data-stack-line>{line}</p>
  <p class="font-mono text-xs break-all text-muted">{fixture.tps}</p>
  <p class="text-xs break-words text-muted">The bot's games: engines {GAME_DATA.commit}, {GAME_DATA.command}</p>
</main>
