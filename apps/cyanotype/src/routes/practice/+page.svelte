<script lang="ts">
  // Practice (docs/design/33-cyanotype.md, "Practice against Stamp Duty"): a game against Stamp Duty's practice bot
  // in the player's browser, with no server and no clock, as Hedge School's Practice (its design 24). Before the game,
  // the settings card (@abstractclass/practice): the bot's network, visits and variety, the player's name, then a side,
  // which starts the game. During the game, the practice's frame with a board that fills the room: the players' row
  // with the points' bar above the board, the hands in a panel over the board (under it on a phone), and a side column
  // with the bot's line, the move list, and the step bar with the status line. The player's notes on the board, by
  // position, for the visit, as on Hedge School's Practice (design 33, "The player's notes"). One game in progress,
  // kept in this browser and resumed. The rules run in the engine's worker, and the bot in its own, in the first of its
  // forms that this browser runs, as on Hedge School's Practice: on the GPU or on the CPU workers through the threaded
  // bot, else on one thread (@abstractclass/practice/botForms.ts), with the engine settings' GPU and workers. The page
  // counts a game's start and end, the engine's errors and the features used, as Hedge School's does (its design 17).
  // Its way in from a position, which the Analysis board's "Play the bot from here" gives (Hedge School's design 24,
  // item 4): `#position=`, a set-up start, and `#record=`, the moves from the start. They leave the address at once,
  // then the analytics start. The engine's rules check them as the Analysis board checks a record or a start (recordCheck.ts): a start that no
  // game reaches, or a move that the rules refuse, starts no game, and the page says why. The page's flow is the
  // practice's (@abstractclass/practice/page.svelte.ts).
  import { onMount } from "svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import PlayerCard from "@abstractclass/review/PlayerCard.svelte";
  import PlayerRow from "@abstractclass/review/PlayerRow.svelte";
  import { BONE } from "@abstractclass/review/PlayerCardSkeleton.svelte";
  import ShareBar from "@abstractclass/review/ShareBar.svelte";
  import { MOVE_HERE, TURN_NUMBER, moveButton } from "@abstractclass/review/moveList.ts";
  import ConfirmEnd from "@abstractclass/practice/ConfirmEnd.svelte";
  import PracticeActions from "@abstractclass/practice/PracticeActions.svelte";
  import PracticeCard from "@abstractclass/practice/PracticeCard.svelte";
  import PracticeFrame from "@abstractclass/practice/PracticeFrame.svelte";
  import PracticeMoves from "@abstractclass/practice/PracticeMoves.svelte";
  import PlayersSkeleton from "@abstractclass/practice/PlayersSkeleton.svelte";
  import ReplaceGame from "@abstractclass/practice/ReplaceGame.svelte";
  import { BOT_WHERE } from "@abstractclass/practice/botForms.ts";
  import { PracticePage, seconds } from "@abstractclass/practice/page.svelte.ts";
  import { loadManifest, megabytes } from "@abstractclass/engine/client.ts";
  import { errorSentence } from "@abstractclass/engine/errors.ts";
  import Board from "#lib/board/Board.svelte";
  import { BlueprintInput } from "#lib/board/blueprintInput.svelte.ts";
  import { firstStatus, inputStatus } from "#lib/board/input.ts";
  import { handsPlace, keptPanel, ONE_COLUMN_HEIGHT } from "#lib/board/keptPanel.svelte.ts";
  import { STARS, starsOf, type Player } from "#lib/board/position.ts";
  import { moveName } from "#lib/game/notation.ts";
  import { readPasted } from "#lib/game/paste.ts";
  import { setUpStart, startTurn } from "#lib/game/position.ts";
  import { recordProblem, rulesBy, startProblem } from "#lib/review/recordCheck.ts";
  import { fmtMargin } from "#lib/review/blueprints.ts";
  import { resultOfScores, resultText } from "@abstractclass/review/game.ts";
  import { loadEngine } from "#lib/analysis/engineSettings.ts";
  import { PracticeGame } from "#lib/practice/game.svelte.ts";
  import { NETWORKS, botName, keptGame, networkName, offersNetwork, practiceChoices, type KeptPractice }
    from "#lib/practice/stampduty.ts";
  import { broughtLine, komiLine } from "@abstractclass/practice/practice.ts";
  import { startAnalytics, track, trackOnce } from "#lib/analytics.svelte.ts";
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";

  const MISSING = "The engine is not on this site. You cannot play a practice game.";

  let dropped = $state(false); // the kept game's network is not in this build: the game cannot go on
  let notice = $state(""); // a start brought that cannot be played

  // The page's flow, with Cyanotype's game.
  const page = new PracticePage<KeptPractice, PracticeGame>({
    game: "blueprints", choices: practiceChoices, kept: keptGame, networkName, engine: loadEngine,
    create: (kept, rules, bot) => new PracticeGame(kept, rules, bot),
    track, trackOnce,
    settings: () => (notice = ""),
  });
  const game = $derived(page.game);
  const shown = $derived(page.shown);

  /** The start after the `#`, read: a record's moves from its start (its `Position` tag, or `position` beside it), or
   *  a set-up start alone. It leaves the address, then the analytics start: the layout does not start them while the
   *  address holds a start (holdsGame). Null for none, as for a `position` alone that is the standard start (Hedge
   *  School's Practice brings nothing for it either), and a notice for a record that cannot be read. */
  function readBrought() {
    const hash = new URLSearchParams(location.hash.slice(1)), text = hash.get("record"), position = hash.get("position");
    history.replaceState(null, "", location.pathname); // the start is kept below, not in the address
    startAnalytics();
    if (text === null && !setUpStart(position)) return null;
    try {
      const record = text === null ? null : readPasted(text, position).record;
      return { record, start: setUpStart(record ? record.tags.Position : position) ?? null };
    } catch (e) {
      notice = `Practice cannot start from this record: ${errorSentence(e)}`;
      return null;
    }
  }

  onMount(() => {
    // A game kept with a network that the site no longer ships cannot go on: its bot has no network to start with.
    // The site ships only its lock's networks (design 33), so a new build can drop the game's network.
    const kept = keptGame.load();
    if (kept && !offersNetwork(kept.bot.network)) { keptGame.keep(null); dropped = true; }
    const bringing = readBrought();
    void page.mount(!!bringing, async () => {
      const manifest = await loadManifest().catch(() => null);
      if (!manifest?.artifacts.some(a => a.kind === "practice-module")) throw new Error(MISSING);
      return manifest;
    }, async w => {
      // The start brought, checked by the rules: a record's start and moves, or a start alone.
      if (!bringing) return;
      const r = rulesBy(w), problem = bringing.record ? await recordProblem(r, bringing.record)
        : bringing.start ? await startProblem(r, bringing.start) : null;
      if (problem) notice = `Practice cannot start from this ${bringing.record ? "record" : "position"}: ${errorSentence(problem)}`;
      else page.brought = { start: bringing.start, moves: bringing.record?.moves ?? [] };
    });
  });

  /** A new game with the settings chosen and the side picked, from the standard start or the start brought. */
  function newGame(side: "blue" | "red" | "random") {
    dropped = false;
    notice = "";
    page.newGame(side);
  }

  // The player's own moves (BlueprintInput), on the latest position, on the player's turn. The input keeps the rules
  // of the player's last turn through the bot's turn, so that the board's view stays as it is.
  const input = new BlueprintInput(move => void game?.play(moveName(move)));
  $effect(() => {
    const r = game?.rules ?? null;
    input.reset();
    input.rules = r;
  });

  // The hands: in a panel over the board on a computer, under the board in one column (below 800 pixels, as the
  // frame's one column). The panel's place and size are the player's: kept in this browser.
  const hands = handsPlace();
  const panel = keptPanel();

  const nameOf = (k: KeptPractice, p: Player) => (p === k.human ? k.name || "You" : ENGINE_NAME);
  // The status line, in the step bar, two lines high: whose move it is, and on the player's turn what the board takes
  // next, in the order that both sites share (page.line). Strict Simplified Technical English (CLAUDE.md, "Writing the
  // site's text").
  const statusText = $derived.by(() => {
    const g = game, p = g?.position, line = page.line;
    if (line === "failed") return `The game stopped: ${g!.error}`;
    if (line === "starting" || !g || !p) return `${ENGINE_NAME} starts…`;
    if (line === "resigned") return `You resigned. ${ENGINE_NAME} wins.`;
    // The review's words and its rule for a draw (@abstractclass/review/game.ts)
    if (line === "over") return `The game is over. ${resultText(resultOfScores(p.scores), fmtMargin)}.`;
    if (!page.atLatest) return `You look at move ${shown}. To go back to the game, go to the last move.`;
    if (line === "bot") return `${ENGINE_NAME} thinks… ${page.thinking}`;
    if (line !== "human") return "";
    const n = g.movesLeft;
    return inputStatus(input, g.human) ?? `Your turn: ${n} ${n === 1 ? "move" : "moves"}. ${firstStatus(input, g.human)}`;
  });

  // The move list: one move a line, as Blueprints' moves are long, each turn's number at its first move. Its numbers
  // start at the start's own turn.
  const firstTurn = $derived(startTurn(game?.kept.start));
  /** A turn's number, at its first move: "6.", or "6..." for a set-up start at a turn's second move, whose first move
   *  was played before the start. */
  const turnLabel = (k: number) => `${firstTurn.turn + k}${k === 0 && !firstTurn.first ? "..." : "."}`;
</script>

<svelte:window onkeydown={ev => page.keydown(ev, !!input.pending, () => input.reset())} />

<PageMeta title="Practice · {SITE_NAME}"
          description="Practise Blueprints against {ENGINE_NAME} in your browser: choose its visits, variety and komi, then play." />

{#if page.failed}
  <main class="max-w-160 mx-auto my-6 px-4"><p class="text-blunder" role="alert">{page.failed}</p></main>
{:else if page.phase === "settings"}
  <PracticeCard bind:choices={page.choices} networks={NETWORKS.map(n => [n.id, `${n.name} (${megabytes(n.bytes)} MB)`])}
                networkHelp="The network that {ENGINE_NAME} plays with."
                nameHelp={'The name above the board. Without a name, the page shows "You".'}
                bot={ENGINE_NAME} ready={page.ready} onside={newGame}>
    {#snippet intro()}A game against {ENGINE_NAME}, the engine, in your browser, with no clock: it searches each move to
      the visits you set. This browser keeps the game until it ends.{/snippet}
    {#snippet notes()}
      {#if notice}<p class="mb-1 text-sm text-blunder" role="alert">{notice}</p>{/if}
      {#if page.brought}<p class="mb-1 text-sm">{broughtLine(page.brought, ["move", "moves"])}</p>{/if}
      {#if dropped}<p class="mb-1 text-sm" role="status">This site does not have the network of your last game. You cannot
        continue that game.</p>{/if}
    {/snippet}
  </PracticeCard>
{:else if page.phase === "game"}
  {@render gameView()}
{:else}
  <main class="min-h-[60vh]" aria-busy="true"></main>
{/if}

<!-- The game, in the practice's frame (@abstractclass/practice) with the board that fills the room. In one column, the
     board's box has the height that keptPanel.svelte.ts gives, which the frame sets on its own element, where --strip
     is. -->
{#snippet gameView()}
  {@const g = game}
  {@const pos = g?.positions[shown]}
  {@const into = g && shown > 0 ? g.played[shown - 1] : null}
  <PracticeFrame form="fill" fillHeight={ONE_COLUMN_HEIGHT} {shown} last={page.last} onstep={to => page.step(to)}>
    {#snippet strip()}
      {#if g && pos}
        <PlayerRow gauge={false} label="Players and scores">
          {#snippet blue()}{@render card(g, 0)}{/snippet}
          {#snippet red()}{@render card(g, 1)}{/snippet}
          {#snippet bar()}{@render pointsBar(pos.scores)}{/snippet}
        </PlayerRow>
      {:else}
        {@const k = g?.kept ?? page.starting}
        <PlayersSkeleton gauge={false} names={k ? [nameOf(k, 0), nameOf(k, 1)] : undefined} second={STARS.word} />
      {/if}
    {/snippet}
    {#snippet board()}
      {#if g && pos}
        <Board position={pos} last={into?.move ?? null} layers={{ candidates: false }} {input} inputOn={page.taking} hands={hands.current}
               bind:place={panel.place} bind:size={panel.size} notes={page.notesAt[shown] ?? []} onnotes={n => page.note(n)} />
      {:else}
        <div class="size-full rounded bg-board"></div>
      {/if}
    {/snippet}
    {#snippet side()}
      <h1 class="text-lg font-bold">Practice</h1>
      <!-- A start brought that the rules refused, while the game in progress goes on. -->
      {#if notice}<p class="mt-1 text-xs text-blunder" role="alert">{notice}</p>{/if}
      {#if g}<p class="text-xs text-muted">{botName(g.kept.bot)}, {BOT_WHERE[g.mode]}.{g.kept.komi ? ` ${komiLine(g.kept, ENGINE_NAME)}` : ""}</p>{:else}<div class="h-3 mt-1 w-3/4 {BONE}"></div>{/if}
      <p class="min-h-[1.25rem] mt-1 mb-1.5 text-xs text-muted">
        {#if g?.lastTurnMs != null && g.status !== "over"}{ENGINE_NAME}'s last turn took {seconds(g.lastTurnMs)}.{/if}
      </p>
      <!-- The review's move list's look (moveList.ts), one move a line: each move a step to its position. -->
      <PracticeMoves {page} text={m => m.text}>
        {#snippet row(t, k)}
          {#each t.moves as m, i (m.at)}
            <div class="grid grid-cols-[2.2rem_minmax(0,1fr)] items-baseline gap-x-1">
              <span class={TURN_NUMBER}>{i === 0 ? turnLabel(k) : ""}</span>
              <button type="button" class={[moveButton(t.player, shown === m.at ? MOVE_HERE : undefined), "justify-self-start"]} tabindex="-1"
                      aria-current={shown === m.at ? "step" : undefined} onclick={() => page.step(m.at)}>{m.text}</button>
            </div>
          {/each}
        {/snippet}
      </PracticeMoves>
      {#if g?.status === "over"}
        <div class="flex flex-wrap gap-2 mt-3">
          <button type="button" class="btn-primary px-3 py-1 rounded text-sm" onclick={() => page.toSettings()}>New game</button>
        </div>
      {/if}
      {#if page.confirming && g}
        <ConfirmEnd what={page.confirming} words={{ resign: `Resign? ${ENGINE_NAME} wins.`, abort: "Abort the game? You cannot continue it after this." }}
                    onconfirm={() => page.confirm()} onkeep={() => (page.confirming = null)} />
      {/if}
    {/snippet}
    <!-- The status line, over the steps: two lines high at least. In one column it is two lines high, so that a text
         that changes does not move the board: the bar is fixed under the board, and the board's box counts its
         height. The input's texts fit two lines of a phone (input.ts). -->
    {#snippet above()}
      <p class={["min-h-10 one-column-layout:h-10 one-column-layout:overflow-hidden mb-1.5 text-sm", page.line === "failed" && "text-blunder"]}
         role="status" aria-live="polite"
         data-testid="practice-status">{statusText}</p>
    {/snippet}
    <!-- The game's actions, right of the steps: off while the bot starts, so that the bar keeps its layout. -->
    {#snippet tools()}
      <PracticeActions game={g} ontakeback={() => page.takeback()} onask={what => (page.confirming = what)} />
    {/snippet}
  </PracticeFrame>
{/snippet}

<!-- A player's card in the row above the board (the review's): the points and the stars on the board. The bot's
     settings are in the side column's first line. -->
{#snippet card(g: PracticeGame, p: Player)}
  {@const pos = g.positions[shown]}
  <PlayerCard player={p} name={nameOf(g.kept, p)} points={pos.scores[p]} second={{ value: starsOf(pos.cells)[p], ...STARS }}
              toMove={g.status !== "over" && shown === g.positions.length - 1 && g.mover === p} />
{/snippet}

<!-- The points' bar (the review's win bar, ShareBar): each player's share of the points so far, from their own side. -->
{#snippet pointsBar(scores: readonly [number, number])}
  {@const total = scores[0] + scores[1]}
  <ShareBar upright={false} share={total > 0 ? scores[0] / total : NaN} sub={null}
            title={`Points: Blue ${scores[0]}, Red ${scores[1]}`} />
{/snippet}

<!-- A start brought while a game is in progress: the player chooses, once the rules have checked the start. -->
<ReplaceGame open={page.replacing} ready={page.ready} title="Play from this position?" play="Play from the position"
             description="Your game in progress stops. You cannot continue it. This browser keeps one game in progress."
             onanswer={fromBrought => page.answer(fromBrought)} />
