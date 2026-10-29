<script lang="ts">
  // Practice (docs/design/33-drawing-board.md, "Practice against Stamp Duty"): a game against Stamp Duty's practice bot
  // in the player's browser, with no server and no clock, as Hedge School's Practice (its design 24). Before the game,
  // the settings card (@abstractclass/practice): the bot's network, visits and variety, the player's name, then a side,
  // which starts the game. During the game, the practice's frame with a board that fills the room: the players' row
  // with the points' bar above the board, the hands in a panel over the board (under it on a phone), and a side column
  // with the bot's line, the move list, and the step bar with the status line. One game in progress, kept in this
  // browser and resumed. The engine and its bot run on the CPU only: the rules in the engine's worker, the bot in its
  // own, with one search thread.
  import { onDestroy, onMount } from "svelte";
  import Icon from "@abstractclass/site/Icon.svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { intoView } from "@abstractclass/site/pageScroll.ts";
  import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";
  import PlayerCard from "@abstractclass/review/PlayerCard.svelte";
  import PlayerRow from "@abstractclass/review/PlayerRow.svelte";
  import PlayerCardSkeleton, { BONE } from "@abstractclass/review/PlayerCardSkeleton.svelte";
  import ShareBar from "@abstractclass/review/ShareBar.svelte";
  import { MOVE_HERE, MOVE_LIST, TURN_NUMBER, keepInView, moveButton } from "@abstractclass/review/moveList.ts";
  import PracticeCard from "@abstractclass/practice/PracticeCard.svelte";
  import PracticeFrame from "@abstractclass/practice/PracticeFrame.svelte";
  import { PracticeBot } from "@abstractclass/practice/bot.ts";
  import { VARIETY_HELP } from "@abstractclass/practice/practice.ts";
  import { EngineWorker, loadManifest, megabytes, type Manifest } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import Board from "#lib/board/Board.svelte";
  import { BlueprintInput } from "#lib/board/blueprintInput.svelte.ts";
  import { firstStatus, inputStatus } from "#lib/board/input.ts";
  import { FIRST_PLACE, FIRST_SIZE, type PanelPlace } from "#lib/board/panel.ts";
  import { PLAYER_NAMES, type Player } from "#lib/board/position.ts";
  import type { Size } from "#lib/board/view.ts";
  import { moveName } from "#lib/game/notation.ts";
  import { PracticeGame } from "#lib/practice/game.svelte.ts";
  import { BOT_VISITS, NETWORKS, PANEL_KEY, botName, keep, loadChoices, loadKept, saveChoices,
           type KeptPractice } from "#lib/practice/stampduty.ts";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";

  const MISSING = "The engine is not on this site. You cannot play a practice game.";
  const DANGER = "hover:not-disabled:text-blunder hover:not-disabled:border-blunder"; // Abort and Resign, as Lichess's

  // What the page shows: nothing until the script knows whether a game is in progress (the prerendered page cannot
  // know), then the settings card or the game.
  let phase = $state<"loading" | "settings" | "game">("loading");
  let choices = $state(loadChoices());
  let manifest: Manifest | null = null;
  let rules: EngineWorker | null = null;
  let game = $state<PracticeGame | null>(null);
  let starting = $state.raw<KeptPractice | null>(null); // the game whose bot starts: its players' names, for the skeleton
  let failed = $state(""); // the engine could not start
  let ready = $state(false); // the rules are loaded: a game can start
  let confirming = $state<"abort" | "resign" | null>(null); // Abort or Resign, waiting for its confirmation

  onMount(() => {
    phase = loadKept() ? "game" : "settings";
    void (async () => {
      try {
        manifest = await loadManifest().catch(() => null);
        if (!manifest?.artifacts.some(a => a.kind === "practice-module")) throw new Error(MISSING);
        const w = new EngineWorker();
        await w.init(manifest);
        rules = w;
        ready = true;
        const resume = loadKept();
        if (phase === "game" && !game && resume) await play(resume);
      } catch (e) {
        failed = errorText(e);
      }
    })();
  });
  onDestroy(() => { game?.end(); rules?.terminate(); });

  /** Starts the bot for a game, and the game: a new one, or one kept from an earlier visit. */
  async function play(kept: KeptPractice) {
    if (!manifest || !rules) return;
    phase = "game";
    starting = kept;
    viewAt = null;
    const bot = new PracticeBot("blueprints", "single", new Worker(new URL("../../lib/practice/botWorker.ts", import.meta.url), { type: "module" }));
    try {
      await bot.start(manifest, kept.bot.network, kept.seed);
      const g = (game = new PracticeGame(kept, rules, bot));
      await g.start();
    } catch (e) {
      bot.terminate();
      failed = errorText(e);
    }
  }

  /** A new game with the settings chosen and the side picked. */
  function newGame(side: "blue" | "red" | "random") {
    choices.side = side;
    saveChoices($state.snapshot(choices));
    const human: Player = side === "blue" ? 0 : side === "red" ? 1 : Math.random() < 0.5 ? 0 : 1;
    const kept: KeptPractice = {
      version: 1, bot: { ...choices.bot }, human, name: choices.name.trim(), seed: Math.floor(Math.random() * 2 ** 31),
      moves: [], builds: [], started: new Date().toISOString(),
    };
    keep(kept);
    void play(kept);
  }

  /** Back to the settings card, for the next game. */
  function toSettings() {
    game?.end();
    game = null;
    confirming = null;
    phase = "settings";
  }

  function confirmAction() {
    const g = game, what = confirming;
    confirming = null;
    if (!g || !what) return;
    if (what === "resign") return g.resign();
    g.abort();
    toSettings();
  }

  // The position on the board: the game's latest (null), or an earlier one, to look back. Moves are made only at the
  // latest, as in a game on Lichess.
  let viewAt = $state<number | null>(null);
  const last = $derived(game ? game.positions.length - 1 : 0);
  const shown = $derived(viewAt === null ? last : Math.min(viewAt, last));
  const atLatest = $derived(shown === last);
  function step(to: number) {
    if (!game || last < 0) return;
    const k = Math.max(0, Math.min(last, to));
    if (k !== shown) viewAt = k === last ? null : k;
  }
  function onkeydown(ev: KeyboardEvent) {
    if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey || !game) return;
    const target = ev.target instanceof Element ? ev.target : null;
    if (target?.closest('input, textarea, [role="dialog"], [role="radiogroup"], [role="menu"]')) return;
    if (ev.key === "Escape" && (confirming || input.pending)) { confirming = null; input.reset(); }
    else if (ev.key === "ArrowLeft" || ev.key === "k") step(shown - 1);
    else if (ev.key === "ArrowRight" || ev.key === "j") step(shown + 1);
    else if (ev.key === "ArrowUp" || ev.key === "Home") step(0);
    else if (ev.key === "ArrowDown" || ev.key === "End") step(last);
    else return;
    ev.preventDefault();
  }

  // The player's own moves (BlueprintInput), on the latest position, on the player's turn. The input keeps the rules
  // of the player's last turn through the bot's turn, so that the board's view stays as it is.
  const input = new BlueprintInput(move => void game?.play(moveName(move)));
  $effect(() => {
    const r = game?.rules ?? null;
    input.reset();
    input.rules = r;
  });
  const taking = $derived(game?.status === "human" && atLatest);

  // The hands: in a panel over the board on a computer, under the board in one column (below 800 pixels, as the
  // frame's one column). The panel's place and size are the player's: kept in this browser.
  let innerWidth = $state(0);
  const hands = $derived(innerWidth > 0 && innerWidth < 800 ? "under" : "panel");
  const keptPanel = readLocalJson<{ place?: PanelPlace; size?: Size }>(PANEL_KEY);
  const finite = (...n: unknown[]) => n.every(v => typeof v === "number" && Number.isFinite(v));
  const panel = $state({
    place: keptPanel?.place && finite(keptPanel.place.fx, keptPanel.place.fy) ? keptPanel.place : FIRST_PLACE,
    size: keptPanel?.size && finite(keptPanel.size.width, keptPanel.size.height) ? keptPanel.size : FIRST_SIZE,
  });
  $effect(() => writeLocal(PANEL_KEY, JSON.stringify($state.snapshot(panel))));

  // The seconds the bot has thought, while it searches.
  let now = $state(0);
  $effect(() => {
    if (game?.thinkingSince == null) return;
    now = performance.now();
    const tick = setInterval(() => (now = performance.now()), 250);
    return () => clearInterval(tick);
  });
  const seconds = (ms: number) => `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;

  const nameOf = (k: KeptPractice, p: Player) => (p === k.human ? k.name || "You" : ENGINE_NAME);
  // The status line, in the step bar, two lines high: whose move it is, and on the player's turn what the board takes
  // next. Strict Simplified Technical English (CLAUDE.md, "Writing the site's text").
  const statusText = $derived.by(() => {
    const g = game, p = g?.position;
    if (!g || g.status === "starting" || !p) return `${ENGINE_NAME} starts…`;
    if (g.status === "failed") return `The game stopped: ${g.error}`;
    if (g.status === "over") {
      if (g.resigned) return `You resigned. ${ENGINE_NAME} wins.`;
      const d = p.scores[0] - p.scores[1];
      return d === 0 ? "The game is over: a draw." : `The game is over: ${PLAYER_NAMES[d > 0 ? 0 : 1]} wins by ${Math.abs(d)}.`;
    }
    if (!atLatest) return `You look at move ${shown}. To go back to the game, go to the last move.`;
    if (g.status === "bot") return `${ENGINE_NAME} thinks… ${g.thinkingSince === null ? "" : seconds(Math.max(0, now - g.thinkingSince))}`;
    if (g.status !== "human") return "";
    const n = g.movesLeft;
    return inputStatus(input, g.human) ?? `Your turn: ${n} ${n === 1 ? "move" : "moves"}. ${firstStatus(input, g.human)}`;
  });

  // The move list: one move a line, as Blueprints' moves are long, each turn's number at its first move, and each move a
  // step to its position.
  const turns = $derived.by(() => {
    const out: { player: Player; moves: { text: string; at: number }[] }[] = [];
    (game?.played ?? []).forEach((m, i) => {
      const t = out.at(-1), move = { text: m.text, at: i + 1 };
      if (t && t.player === m.player) t.moves.push(move);
      else out.push({ player: m.player, moves: [move] });
    });
    return out;
  });
  let moveList = $state<HTMLElement | null>(null);
  $effect(() => { void shown; void turns; keepInView(moveList); });
</script>

<svelte:window {onkeydown} bind:innerWidth />

<PageMeta title="Practice · {SITE_NAME}"
          description="Practise Blueprints against {ENGINE_NAME} in your browser: choose its visits and variety, then play." />

{#if failed}
  <main class="max-w-160 mx-auto my-6 px-4"><p class="text-blunder" role="alert">{failed}</p></main>
{:else if phase === "settings"}
  <PracticeCard bind:choices networks={NETWORKS.map(n => [n.id, `${n.name} (${megabytes(n.bytes)} MB)`])}
                networkHelp="The network that {ENGINE_NAME} plays with." varietyHelp={VARIETY_HELP} visits={BOT_VISITS}
                {ready} onside={newGame}>
    {#snippet intro()}A game against {ENGINE_NAME}, the engine, in your browser, with no clock: it searches each move to
      the visits you set. This browser keeps the game until it ends.{/snippet}
  </PracticeCard>
{:else if phase === "game"}
  {@render gameView()}
{:else}
  <main class="min-h-[60vh]" aria-busy="true"></main>
{/if}

<!-- The game, in the practice's frame (@abstractclass/practice) with the board that fills the room. In one column, the
     board's box is the window's height less the header, the row and the step bar, and at least a square field with
     its hands under it. The custom properties are in the style attribute, apart from the classes: a CSS build of calc()
     with min() inside max() stops Vite. -->
{#snippet gameView()}
  {@const g = game}
  {@const pos = g?.positions[shown]}
  {@const into = g && shown > 0 ? g.played[shown - 1] : null}
  <div style="--w: calc(100cqw - 2rem); --least: calc(var(--w) + 2 * min(104px, var(--w) / 3) + 12px);
              --avail: calc(100dvh - var(--site-header) - var(--strip) - var(--step-dock, 0px) - 1.5rem)">
    <PracticeFrame form="fill" fillHeight="max(var(--avail), var(--least))"
                   onstep={to => step(to === "first" ? 0 : to === "back" ? shown - 1 : to === "forward" ? shown + 1 : last)}
                   atStart={!g || shown === 0} atEnd={!g || atLatest}>
      {#snippet strip()}
        {#if g && pos}
          <PlayerRow gauge={false} label="Players and scores">
            {#snippet blue()}{@render card(g, 0)}{/snippet}
            {#snippet red()}{@render card(g, 1)}{/snippet}
            {#snippet bar()}{@render pointsBar(pos.scores)}{/snippet}
          </PlayerRow>
        {:else}
          <!-- The skeleton (the review's, PlayerCardSkeleton) while the bot starts: the row's height is the cards'. -->
          {@const k = g?.kept ?? starting}
          <PlayerRow gauge={false} label="Players and scores">
            {#snippet blue()}<PlayerCardSkeleton player={0} name={k ? nameOf(k, 0) : undefined} />{/snippet}
            {#snippet red()}<PlayerCardSkeleton player={1} name={k ? nameOf(k, 1) : undefined} />{/snippet}
            {#snippet bar()}<div class="h-[1.15rem] {BONE}"></div>{/snippet}
          </PlayerRow>
        {/if}
      {/snippet}
      {#snippet board()}
        {#if g && pos}
          <Board position={pos} last={into?.move ?? null} layers={{ candidates: false }} {input} inputOn={taking} {hands}
                 bind:place={panel.place} bind:size={panel.size} />
        {:else}
          <div class="size-full rounded bg-board"></div>
        {/if}
      {/snippet}
      {#snippet side()}
        <h1 class="text-lg font-bold">Practice</h1>
        {#if g}<p class="text-xs text-muted">{botName(g.kept.bot)}, on one thread.</p>{:else}<div class="h-3 mt-1 w-3/4 {BONE}"></div>{/if}
        <p class="min-h-[1.25rem] mt-1 mb-1.5 text-xs text-muted">
          {#if g?.lastTurnMs != null && g.status !== "over"}{ENGINE_NAME}'s last turn took {seconds(g.lastTurnMs)}.{/if}
        </p>
        <!-- The review's move list's look (moveList.ts), one move a line: each move a step to its position. A click on a
             move does not focus it, as in the review. -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div bind:this={moveList} class={[MOVE_LIST, "min-h-24 max-[800px]:max-h-64"]}
             onmousedown={e => { if ((e.target as Element).closest("button")) e.preventDefault(); }}>
          {#if !g || g.status === "starting"}
            {#each Array(starting?.moves.length ? 12 : 0) as _, k (k)}<div class="h-4 mb-2.5 {BONE}" style:width="{k % 3 === 2 ? 55 : 85}%"></div>{/each}
          {/if}
          {#each turns as t, k (k)}
            {#each t.moves as m, i (m.at)}
              <div class="grid grid-cols-[2.2rem_minmax(0,1fr)] items-baseline gap-x-1">
                <span class={TURN_NUMBER}>{i === 0 ? `${k + 1}.` : ""}</span>
                <button type="button" class={[moveButton(t.player, shown === m.at ? MOVE_HERE : undefined), "justify-self-start"]} tabindex="-1"
                        aria-current={shown === m.at ? "step" : undefined} onclick={() => step(m.at)}>{m.text}</button>
              </div>
            {/each}
          {/each}
        </div>
        {#if g?.status === "over"}
          <div class="flex flex-wrap gap-2 mt-3">
            <button type="button" class="btn-primary px-3 py-1 rounded text-sm" onclick={toSettings}>New game</button>
          </div>
        {/if}
        {#if confirming && g}
          <div class="mt-3 p-2 rounded border border-line bg-panel-2 text-sm" role="alertdialog" aria-label={confirming === "resign" ? "Resign" : "Abort"}
               {@attach intoView}>
            <p class="mb-2">{confirming === "resign" ? `Resign? ${ENGINE_NAME} wins.` : "Abort the game? You cannot continue it after this."}</p>
            <div class="flex gap-2">
              <button type="button" class="btn-danger text-sm" onclick={confirmAction}>{confirming === "resign" ? "Resign" : "Abort"}</button>
              <button type="button" class="text-sm" onclick={() => (confirming = null)}>Keep playing</button>
            </div>
          </div>
        {/if}
      {/snippet}
      <!-- The status line, over the steps: two lines high at least. In one column it is two lines high, so that a text
           that changes does not move the board: the bar is fixed under the board, and the board's box counts its
           height. The input's texts fit two lines of a phone (input.ts). -->
      {#snippet above()}
        <p class={["min-h-10 max-[800px]:h-10 max-[800px]:overflow-hidden mb-1.5 text-sm", g?.status === "failed" && "text-blunder"]}
           role="status" aria-live="polite"
           data-testid="practice-status">{statusText}</p>
      {/snippet}
      <!-- The game's actions, right of the steps: off while the bot starts, so that the bar keeps its layout. -->
      {#snippet tools()}
        {#if g?.status !== "over"}
          <button class="btn-icon" aria-label="Take back" title="Takeback" disabled={!g?.canTakeBack} onclick={() => { viewAt = null; void g?.takeback(); }}><Icon name="takeback" /></button>
          <button class={["btn-icon", DANGER]} aria-label="Abort" title="Abort" disabled={!g || g.status === "starting"}
                  onclick={() => (confirming = "abort")}><Icon name="abort" /></button>
          <button class={["btn-icon", DANGER]} aria-label="Resign" title="Resign"
                  disabled={!g || g.status === "starting" || g.status === "failed"} onclick={() => (confirming = "resign")}><Icon name="resign" /></button>
        {/if}
      {/snippet}
    </PracticeFrame>
  </div>
{/snippet}

<!-- A player's card in the row above the board (the review's). The bot's settings are in the side column's first line. -->
{#snippet card(g: PracticeGame, p: Player)}
  {@const pos = g.positions[shown]}
  <PlayerCard player={p} name={nameOf(g.kept, p)} points={pos.scores[p]}
              toMove={g.status !== "over" && shown === g.positions.length - 1 && g.mover === p} />
{/snippet}

<!-- The points' bar (the review's win bar, ShareBar): each player's share of the points so far, from their own side. -->
{#snippet pointsBar(scores: readonly [number, number])}
  {@const total = scores[0] + scores[1]}
  <ShareBar upright={false} share={total > 0 ? scores[0] / total : NaN} sub={null}
            title={`Points: Blue ${scores[0]}, Red ${scores[1]}`} />
{/snippet}
