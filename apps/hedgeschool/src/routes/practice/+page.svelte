<script lang="ts">
  // Practice (docs/design/24-practice.md): a game against HedgeFund, the engine's practice bot, in the player's
  // browser, with no server and no clock. Before the game, a card as Lichess's "Play with the computer": the bot's
  // settings (the network, the visits for each move, the variety, the komi), the player's name, then a side, which
  // starts the game. During the game, the review's layout and parts (design 06): the players' row above the board with
  // the points' bar, the board as large as the window lets it be, with the player's notes, and a side column with the
  // review's move list, the steps through the game's positions, Take back, Abort and Resign. One game in progress, kept
  // in this browser and resumed. A game that ends goes into Your games. Its way in, which the Analysis board's Play
  // gives (design 22): `#position=`, a set-up start, and `#record=`, the moves from the start. They leave the address
  // at once, then the analytics start. The page's flow is the practice's (@abstractclass/practice/page.svelte.ts).
  import { onMount } from "svelte";
  import Board from "#lib/board/Board.svelte";
  import { EdgeInput } from "#lib/board/edgeInput.svelte.ts";
  import Icon from "@abstractclass/site/Icon.svelte";
  import SettingToggle from "@abstractclass/site/SettingToggle.svelte";
  import SoundSettings from "@abstractclass/site/SoundSettings.svelte";
  import { SETTINGS_HEAD } from "@abstractclass/site/settings.ts";
  import PlayerCard from "@abstractclass/review/PlayerCard.svelte";
  import PlayerRow from "@abstractclass/review/PlayerRow.svelte";
  import { BONE } from "@abstractclass/review/PlayerCardSkeleton.svelte";
  import ConfirmEnd from "@abstractclass/practice/ConfirmEnd.svelte";
  import PracticeActions from "@abstractclass/practice/PracticeActions.svelte";
  import PracticeCard from "@abstractclass/practice/PracticeCard.svelte";
  import PracticeFrame from "@abstractclass/practice/PracticeFrame.svelte";
  import PracticeMoves from "@abstractclass/practice/PracticeMoves.svelte";
  import PlayersSkeleton from "@abstractclass/practice/PlayersSkeleton.svelte";
  import PointsBar from "@abstractclass/practice/PointsBar.svelte";
  import ScoreSettings from "@abstractclass/practice/ScoreSettings.svelte";
  import { keptScore } from "@abstractclass/practice/scoreDisplay.svelte.ts";
  import ReplaceGame from "@abstractclass/practice/ReplaceGame.svelte";
  import { PracticePage, seconds } from "@abstractclass/practice/page.svelte.ts";
  import { broughtLine, gaugeWidth, upright } from "@abstractclass/practice/practice.ts";
  import { intoView } from "@abstractclass/site/pageScroll.ts";
  import { MOVE_HERE, TURN_NUMBER, moveButton, turnRow } from "@abstractclass/review/moveList.ts";
  import { loadManifest } from "@abstractclass/engine/client.ts";
  import { edgeName, setUpStart } from "#lib/engine/notation.ts";
  import { NETWORKS, loadEngine, networkMB, networkName } from "#lib/analysis/engineSettings.ts";
  import { parseRecord, withStart } from "#lib/game/record.ts";
  import { variantProblem } from "#lib/game/import.ts";
  import { AREA, fmtMargin, LAYERS, MOVE_TEXT, moveNotation, type Player } from "#lib/review/enclosure.ts";
  import { resultOfScores, resultText } from "@abstractclass/review/game.ts";
  import { loadDisplay, saveDisplay } from "#lib/review/display.ts";
  import { playMove, preload } from "@abstractclass/site/sound.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { browserNumber, startAnalytics, track, trackOnce } from "#lib/analytics.svelte.ts";
  import { sendPractice } from "#lib/practice/send.ts";
  import { BOT_WHERE } from "@abstractclass/practice/botForms.ts";
  import { PracticeGame, saveUnfinished } from "#lib/practice/game.svelte.ts";
  import { BOT_NAME, botName, keptGame, komiLine, practiceChoices, practiceTurn, type KeptPractice }
    from "#lib/practice/hedgefund.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { PRACTICE_DISPLAY_KEY } from "#lib/keys.ts";

  // Practice's own display settings (design 24, @abstractclass/practice): the points' bar between the players or
  // beside the board, with each player's area against their points in a second lane.
  const score = keptScore(PRACTICE_DISPLAY_KEY, true, name => page.used(name));

  let notice = $state(""); // a record brought that cannot be played
  let settingsOpen = $state(false); // the display settings, in the moves' place

  // The page's flow, with Hedge School's game. A game's end goes to the site too (design 25), and a game set aside by a
  // record brought goes into Your games, unfinished.
  const page = new PracticePage<KeptPractice, PracticeGame>({
    game: "enclosure", choices: practiceChoices, kept: keptGame, networkName, engine: loadEngine,
    create: (kept, rules, bot) => new PracticeGame(kept, rules, bot),
    track, trackOnce,
    ended: (g, outcome) => sendPractice(g.stored(outcome, browserNumber())),
    setAside: saveUnfinished,
    settings: () => { settingsOpen = false; notice = ""; },
    forward: into => { if (display.sound) void playMove(display.volume, display.moveSound, !!into.cut); },
  });
  const game = $derived(page.game);
  const shown = $derived(page.shown);

  onMount(() => {
    const hash = new URLSearchParams(location.hash.slice(1)), record = hash.get("record"), position = setUpStart(hash.get("position")) ?? null;
    history.replaceState(null, "", location.pathname); // the start is kept below, not in the address
    startAnalytics();
    if (record !== null || position !== null) {
      try {
        // A record's own Position tag, or the start given beside it (withStart), with its turns numbered from there.
        const r = record ? parseRecord(withStart(record, position)) : null, problem = r && variantProblem(r, "practice");
        if (problem) throw new Error(problem);
        page.brought = { start: setUpStart(r?.tags.Position) ?? position, moves: r?.moves ?? [] };
      } catch (e) {
        notice = `Practice cannot start from this record: ${errorText(e)}`;
      }
    }
    void page.mount(page.brought !== null, async () => {
      const manifest = await loadManifest();
      if (!manifest) throw new Error("no engine on this site: run `npm run engine` first");
      return manifest;
    });
  });

  // The player's edges: two clicks, on the rules of the position (EdgeInput), at the latest position only.
  const input = new EdgeInput(edge => void game?.play(edgeName(edge)));
  $effect(() => {
    const r = page.taking ? (game?.rules ?? null) : null;
    input.reset();
    input.rules = r;
  });
  // The display settings that Practice shares with the review (design 08): the board's layers and the move sounds.
  const display = $state(loadDisplay());
  let shownDisplay = $state.snapshot(display);
  $effect(() => {
    const now = $state.snapshot(display), was = shownDisplay;
    saveDisplay(now);
    for (const k of Object.keys(now) as (keyof typeof now)[]) if (JSON.stringify(now[k]) !== JSON.stringify(was[k])) page.used(`display ${k}`);
    shownDisplay = now;
  });
  $effect(() => { if (display.sound) preload(display.moveSound); });
  // A new move's sound, for both sides' edges, while the board shows the latest position: not for the moves that a
  // game's start replays.
  let heard = 0;
  $effect(() => {
    const played = game?.played ?? [];
    if (played.length > heard && game?.status !== "starting" && page.viewAt === null && display.sound)
      void playMove(display.volume, display.moveSound, !!played.at(-1)?.cut);
    heard = played.length;
  });

  const nameOf = (k: KeptPractice, p: Player) => (p === k.human ? k.name || "You" : networkName(k.bot.network));
  // The bot's settings and where it runs, then the komi from the player's side (design 24)
  const botLine = (g: PracticeGame) => `${botName(g.kept.bot)}, ${BOT_WHERE[g.mode]}.${g.kept.komi ? ` ${komiLine(g.kept, BOT_NAME)}` : ""}`;
  // The status line, in the order that both sites share (page.line): a game that stopped says why first.
  const statusText = $derived.by(() => {
    const g = game, p = g?.position, line = page.line;
    if (line === "failed") return `The game stopped: ${g!.error}`;
    if (line === "starting" || !p) return "Starting HedgeFund…";
    if (line === "resigned") return "You resigned: HedgeFund wins.";
    if (line === "over") return `Game over. ${resultText(resultOfScores(p.scores), fmtMargin)}.`; // the review's words and rule (game.ts)
    if (line === "bot") return `HedgeFund is thinking… ${page.thinking}`;
    return `Your turn: ${p.movesLeft} ${p.movesLeft === 1 ? "edge" : "edges"} to play.`;
  });

  // The move list's turn numbers start at the start's own turn.
  const firstTurn = $derived(practiceTurn(game?.kept ?? {}));
</script>

<svelte:window onkeydown={ev => page.keydown(ev, settingsOpen || !!input.pending, () => { settingsOpen = false; input.reset(); })} />

<PageMeta title="Practice · Hedge School"
          description="Practise Enclosure against the engine's bot in your browser: choose its network, visits, variety and komi, then review the game." />

{#if page.failed}
  <main class="max-w-160 mx-auto my-6 px-4"><p class="text-blunder" role="alert">{page.failed}</p></main>
{:else if page.phase === "settings"}
  {@render settingsCard()}
{:else if page.phase === "game"}
  {@render gameView()}
{:else}
  <main class="min-h-[60vh]" aria-busy="true"></main>
{/if}

<!-- The settings card (Lichess's "Play with the computer", @abstractclass/practice): the bot, the player's name, then the
     side, which starts the game. -->
{#snippet settingsCard()}
  <PracticeCard bind:choices={page.choices} networks={NETWORKS.map(n => [n.id, `${networkName(n.id)} (${networkMB(n.id)} MB)`])}
                networkHelp="The larger network plays stronger, and takes longer." bot={BOT_NAME} ready={page.ready} onside={side => page.newGame(side)}>
    {#snippet intro()}A game against the engine, in your browser, with no clock: the bot searches each move to the visits
      you set. The game then goes into <a href="/review">Your games</a>, for its review.{/snippet}
    {#snippet notes()}
      {#if notice}<p class="mb-1 text-sm text-blunder" role="alert">{notice}</p>{/if}
      {#if page.abortedId}<p class="mb-1 text-sm" role="status">The game you aborted is in <a href="/review">Your games</a>, unfinished.</p>{/if}
      {#if page.brought}<p class="mb-1 text-sm">{broughtLine(page.brought, ["edge", "edges"])}</p>{/if}
    {/snippet}
  </PracticeCard>
{/snippet}

<!-- The game: the review's layout (design 06), in the practice's frame (@abstractclass/practice): the board square, the
     window's height less the row above it, or the width that the side column leaves, as on Lichess's game page. With
     the gauge, the board's column is the gauge's width wider, and the row starts at the board's edge. -->
{#snippet gameView()}
  {@const g = game}
  {@const pos = g?.positions[shown]}
  {@const into = g && shown > 0 ? g.played[shown - 1] : null}
  {@const gauge = upright(score)}
  <PracticeFrame form="square" {gauge} gaugeWidth={gaugeWidth(score)} {shown} last={page.last} onstep={to => page.step(to)}>
    {#snippet strip()}
        {#if g && pos}
          <PlayerRow {gauge} label="Players and scores">
            {#snippet blue()}{@render card(g, 0)}{/snippet}
            {#snippet red()}{@render card(g, 1)}{/snippet}
            {#snippet bar()}<PointsBar {score} scores={pos.scores} areas={pos.areas ?? [0, 0]} upright={false} />{/snippet}
          </PlayerRow>
        {:else}
          {@const k = g?.kept ?? page.starting}
          <PlayersSkeleton {gauge} names={k ? [nameOf(k, 0), nameOf(k, 1)] : undefined} second={AREA.word} bar={score.bar} />
        {/if}
    {/snippet}
    {#snippet beside()}
        {#if gauge}<PointsBar {score} scores={pos?.scores ?? null} areas={pos?.areas ?? [0, 0]} upright />{/if}
    {/snippet}
    {#snippet board()}
          {#if !(g && pos)}<div class="board-points"></div>{/if} <!-- the empty board, until the game's position -->
          {#if g && pos}
            <Board position={pos} cut={into?.cut ?? null}
                   layers={{ candidates: false, marks: false, regions: display.layers.regions, protected: display.layers.protected }}
                   pending={input.pending} ends={input.ends} active={input.active} onpoint={input.rules ? input.click : undefined} onlyActive
                   notes={page.notesAt[shown] ?? []} onnotes={n => page.note(n)} />
          {/if}
    {/snippet}
    {#snippet side()}
      {#if settingsOpen}
        {@render displaySettings()}
      {:else}
        <h1 class="text-lg font-bold">Practice</h1>
        {#if g}<p class="text-xs text-muted">{botLine(g)}</p>{:else}<div class="h-3 mt-1 w-3/4 {BONE}"></div>{/if}
        <p class={["mt-2 text-sm font-medium", page.line === "failed" && "text-blunder"]} role="status" aria-live="polite">{statusText}</p>
        <p class="min-h-[1.25rem] mb-1.5 text-xs text-muted">
          {#if g && !page.atLatest && g.status !== "over"}Looking back at {shown ? `edge ${shown}` : "the start"}: End returns to the game.
          {:else if g?.lastTurnMs != null && g.status !== "over"}HedgeFund's last turn took {seconds(g.lastTurnMs)}.{/if}
        </p>
        <!-- The review's move list (moveList.ts): one row a turn, each edge a step to its position. -->
        <PracticeMoves {page} text={moveNotation}>
          {#snippet row(t, k)}
            <div class={turnRow()}>
              <span class={TURN_NUMBER}>{firstTurn.turn + k}.</span>
              <!-- A set-up start at a turn's second edge: its first edge was played before the start. -->
              {#if k === 0 && !firstTurn.first}<span class="px-[0.2rem] text-muted">…</span>{/if}
              {#each t.moves as m (m.at)}
                <button type="button" class={moveButton(t.player, shown === m.at ? MOVE_HERE : undefined)} tabindex="-1"
                        aria-current={shown === m.at ? "step" : undefined} onclick={() => page.step(m.at)}><span class={MOVE_TEXT}>{m.text}</span></button>
              {/each}
            </div>
          {/snippet}
        </PracticeMoves>
        {#if g?.status === "over"}
          <div class="flex flex-wrap gap-2 mt-3">
            <!-- The Review tab reviews games from the standard start: a set-up start's game opens on the Analysis board. -->
            {#if g.savedId && g.kept.start}<a class="btn-primary px-3 py-1 rounded text-sm no-underline"
                href="/analysis#{new URLSearchParams({ record: g.record(), via: 'practice' })}" data-sveltekit-reload>Analyze the game</a>
            {:else if g.savedId}<a class="btn-primary px-3 py-1 rounded text-sm no-underline" href="/review#game={g.savedId}" data-sveltekit-reload>Review the game</a>{/if}
            <button type="button" class="text-sm" onclick={() => page.toSettings()}>New game</button>
          </div>
        {/if}
        {#if page.confirming && g}
          <ConfirmEnd what={page.confirming} words={{ resign: "Resign? HedgeFund wins, and the game goes into Your games.",
                                                       abort: "Abort the game? It goes into Your games, unfinished." }}
                      onconfirm={() => page.confirm()} onkeep={() => (page.confirming = null)} />
        {/if}
      {/if}
    {/snippet}
    <!-- The game's actions and the display settings' button, right of the steps in the frame's step bar. -->
    {#snippet tools()}
          <PracticeActions game={g} off={settingsOpen} ontakeback={() => page.takeback()} onask={what => (page.confirming = what)}>
            <button class="btn-icon aria-expanded:border-accent aria-expanded:text-accent" aria-label="Display settings" title="Display settings"
                    aria-expanded={settingsOpen} onclick={() => (settingsOpen = !settingsOpen)}><Icon name="menu" /></button>
          </PracticeActions>
    {/snippet}
  </PracticeFrame>
{/snippet}

<!-- A player's card in the row above the board (the review's). The bot's settings are in the side column's first line. -->
{#snippet card(g: PracticeGame, p: Player)}
  {@const pos = g.positions[shown]}
  <PlayerCard player={p} name={nameOf(g.kept, p)} points={pos.scores[p]}
              second={pos.areas ? { value: pos.areas[p], ...AREA } : null} toMove={!pos.over && g.status !== "over" && pos.player === p} />
{/snippet}

{#snippet displaySettings()}
  <div role="region" aria-label="Display settings" class="flex flex-col flex-1 min-h-0" {@attach intoView}>
    <div class="flex items-center justify-between mb-1">
      <h2 class="font-semibold">Display settings</h2>
      <button class="px-2 py-0.5 text-sm" onclick={() => (settingsOpen = false)}>Done</button>
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto pr-1">
      <ScoreSettings {score} area set={v => Object.assign(score, v)} />
      <h3 class={SETTINGS_HEAD}>Board</h3>
      {#each LAYERS as l (l.key)}
        <SettingToggle label={l.label} help={l.help} get={() => display.layers[l.key]} set={v => (display.layers[l.key] = v)} />
      {/each}
      <SoundSettings sound={display.sound} moveSound={display.moveSound} volume={display.volume} move="edge"
                     set={v => Object.assign(display, v)} />
    </div>
  </div>
{/snippet}

<!-- A record brought while a game is in progress: the player chooses, once the rules are loaded. -->
<ReplaceGame open={page.replacing} ready={page.ready} title="Play from this record?" play="Play from the record"
             description="Your game in progress goes into Your games, unfinished, so you can still review it. This browser keeps one game in progress."
             onanswer={fromRecord => page.answer(fromRecord)} />
