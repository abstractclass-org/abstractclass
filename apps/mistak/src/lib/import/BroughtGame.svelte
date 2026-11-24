<script lang="ts">
  // A game that the import took, until the review exists (docs/design/34-tak-site.md, "Before the network"): its tags and
  // its moves as the record gives them, the links back (item 10), and one line that the review comes with the engine. It
  // draws no position: the rules that make one from the moves are the engine's.
  import { tagValue } from "@abstractclass/record/record.ts";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";
  import { startOf, turnsOf } from "#lib/game/record.ts";
  import { playtakPage, ptnNinjaLink, type Brought } from "./ways.ts";
  let { brought }: { brought: Brought } = $props();

  const game = $derived(brought.game);
  const tag = (name: string) => tagValue(game.tags[name]);
  const player = (n: 1 | 2) => {
    const rating = tag(`Rating${n}`);
    return (tag(`Player${n}`) ?? (n === 1 ? "White" : "Black")) + (rating ? ` (${rating})` : "");
  };
  const size = $derived(startOf(game.tags).split("/").length);
  const facts = $derived([
    ["Board", `${size} × ${size}`],
    ["Komi", game.komi === 0 ? "None" : `${game.komi} ${Math.abs(game.komi) === 1 ? "flat" : "flats"}`],
    ["Date", tag("Date")],
    ["Event", tag("Event")],
    ["Start", tag("TPS")],
    ["Result", game.result === null || game.result === "*" ? "No result" : game.result],
    ["Length", `${game.moves.length} ${game.moves.length === 1 ? "move" : "moves"}`],
  ].filter((fact): fact is [string, string] => fact[1] !== null));
  const turns = $derived(turnsOf(game));
  const page = $derived(playtakPage(game.tags));
  const link = "text-sm";
</script>

<h1 class="text-2xl font-bold [overflow-wrap:anywhere]">{player(1)} against {player(2)}</h1>
<p>The review comes with {ENGINE_NAME}, the engine. Until then, {SITE_NAME} shows the record and keeps nothing.</p>
<p class="flex flex-wrap gap-x-5 gap-y-1">
  {#if page}<a class={link} href={page} target="_blank" rel="noopener noreferrer">View this game on playtak</a>{/if}
  <a class={link} href={ptnNinjaLink(brought.text)} target="_blank" rel="noopener noreferrer">Open in PTN Ninja</a>
</p>
<dl class="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1">
  {#each facts as [name, text] (name)}
    <dt class="text-muted">{name}</dt><dd class="[overflow-wrap:anywhere]">{text}</dd>
  {/each}
</dl>
<section class="grid gap-2" aria-labelledby="moves">
  <h2 id="moves" class="text-lg font-semibold">Moves</h2>
  <table class="w-full max-w-md text-left font-mono text-sm tabular-nums">
    <thead class="font-sans text-muted"><tr><th class="w-12 font-normal">No.</th><th class="font-normal">White</th><th class="font-normal">Black</th></tr></thead>
    <tbody>
      {#each turns as turn (turn.number)}
        <tr><td class="text-muted">{turn.number}</td><td>{turn.white ?? "…"}</td><td>{turn.black ?? ""}</td></tr>
      {/each}
    </tbody>
  </table>
</section>
<details>
  <summary class="cursor-pointer">The record</summary>
  <!-- `anywhere`: a long word breaks, so that the record fits a phone's width. -->
  <pre class="mt-2 p-3 bg-panel border border-line rounded font-mono text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{brought.text}</pre>
</details>
