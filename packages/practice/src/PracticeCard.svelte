<script lang="ts">
  // The settings card before a practice game (Hedge School's design 24), as Lichess's "Play with the computer": the bot's
  // settings (the network, the visits for each move, the variety), the player's name, then the side, which starts the
  // game. The site gives its text above the settings, its notes, its networks and the variety's help. The choices are
  // the page's: the card changes them in place.
  import type { Snippet } from "svelte";
  import SettingChoice from "@abstractclass/site/SettingChoice.svelte";
  import Swatch from "@abstractclass/site/Swatch.svelte";
  import { MAX_VISITS, VARIETY_NAME, VISITS, type PracticeChoices, type Variety, type VisitRange } from "./practice.ts";

  interface Props {
    choices: PracticeChoices;
    networks: [string, string][]; // each network the site offers: its id, and its name for the list
    networkHelp: string;
    varietyHelp: Record<Variety, string>;
    visits?: VisitRange; // the visits that the site's bot takes (Hedge School's: from 1)
    ready: boolean; // the rules are loaded: a game can start
    intro: Snippet; // what the game is, under the heading
    notes?: Snippet; // the site's notices: a record brought, a game aborted
    onside: (side: PracticeChoices["side"]) => void; // a side chosen: the game starts
  }
  let { choices = $bindable(), networks, networkHelp, varietyHelp, visits = VISITS, ready, intro, notes, onside }: Props = $props();

  // The visits box's text while the player types in it (null: it shows the setting). The visits change when the box is
  // left or Enter is pressed, as in the engine settings. A number that the bot does not take stays in the box with the
  // range, and no game starts until it changes.
  let visitsTyped = $state<string | null>(null);
  const visitsWrong = $derived(visitsTyped !== null && !visits.taken(Number(visitsTyped)));
</script>

<main class="flex justify-center my-6 px-4">
  <section class="w-full max-w-[34rem] grid gap-1 bg-panel border border-line rounded-lg px-5 pt-5 pb-6">
    <h1 class="text-2xl font-bold">Practice against bot</h1>
    <p class="mb-2 text-sm text-muted">{@render intro()}</p>
    {@render notes?.()}
    <SettingChoice label="Network" help={networkHelp} options={networks}
                   get={() => choices.bot.network} set={v => (choices.bot.network = v)} />
    <!-- The visits: a slider over the site's least and the doublings above it, and a box that takes any whole number in
         their range (design 24). The slider shows the stop at or below a typed number. -->
    <div class="py-1.5">
      <div class="flex items-center justify-between gap-3">
        <label for="visits" class="text-sm font-medium">Visits for each move</label>
        <input id="visits" type="number" min={visits.least} max={MAX_VISITS} step="1" value={visitsTyped ?? choices.bot.visits}
               aria-invalid={visitsWrong} aria-describedby={visitsWrong ? "visits-message" : undefined}
               class="w-[4.5rem] text-right tabular-nums"
               oninput={e => (visitsTyped = e.currentTarget.value)}
               onchange={e => {
                 const v = e.currentTarget.valueAsNumber;
                 if (visits.taken(v)) { choices.bot.visits = v; visitsTyped = null; }
               }} />
      </div>
      {#if visitsWrong}
        <p id="visits-message" class="text-xs text-blunder" role="alert">Type a whole number from {visits.least} to {MAX_VISITS.toLocaleString("en")}.</p>
      {/if}
      <p class="text-xs text-muted">More visits play stronger, and take longer. We have not yet measured how strong
        each setting plays.</p>
      <input type="range" min="0" max={visits.stops.length - 1} step="1" value={visits.stop(choices.bot.visits)}
             aria-label="Visits for each move" aria-valuetext="{choices.bot.visits.toLocaleString("en")} visits"
             class="w-full mt-1 accent-(--accent)"
             oninput={e => { visitsTyped = null; choices.bot.visits = visits.stops[e.currentTarget.valueAsNumber]; }} />
      <div class="flex justify-between text-xs text-muted tabular-nums"><span>{visits.least}</span><span>{MAX_VISITS.toLocaleString("en")}</span></div>
    </div>
    <SettingChoice label="Variety" help={varietyHelp[choices.bot.variety]}
                   options={Object.entries(VARIETY_NAME)} get={() => choices.bot.variety} set={v => (choices.bot.variety = v as Variety)} />
    <div class="py-1.5">
      <label for="name" class="text-sm font-medium">Your name</label>
      <p class="mb-1 text-xs text-muted">For the game's record. Without one, the record says "You".</p>
      <input id="name" class="w-full max-w-72 px-2 py-1" maxlength="40" placeholder="You" autocomplete="off" bind:value={choices.name} />
    </div>
    <!-- The side starts the game, as on Lichess: Random in the middle, larger. -->
    <div class="mt-3 pt-4 border-t border-line">
      <p class="mb-3 text-sm font-medium text-center">{ready ? "Choose your side to start" : "Loading the rules…"}</p>
      <div class="flex justify-center items-end gap-4">
        {#each [["blue", 0, "Blue"], ["random", "either", "Random"], ["red", 1, "Red"]] as const as [side, dot, label] (side)}
          <button type="button" disabled={!ready || visitsWrong} onclick={() => onside(side)}
                  class={["grid justify-items-center gap-1.5 rounded-lg", side === "random" ? "px-5 py-4" : "px-4 py-3",
                          choices.side === side && "border-accent"]}
                  aria-label="Play as {label}">
            <span class={side === "random" ? "text-[2.75rem] leading-none" : "text-[2rem] leading-none"}><Swatch player={dot} /></span>
            <span class="text-sm">{label}</span>
          </button>
        {/each}
      </div>
    </div>
  </section>
</main>
