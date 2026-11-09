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
  // item 4): `#position=`, a set-up start, and `#record=`, the moves from the start. They leave the address at once.
  // The engine's rules check them as the Analysis board checks a record or a start (recordCheck.ts): a start that no
  // game reaches, or a move that the rules refuse, starts no game, and the page says why.
  import { onDestroy, onMount, untrack } from "svelte";
  import Icon from "@abstractclass/site/Icon.svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { intoView } from "@abstractclass/site/pageScroll.ts";
  import PlayerCard from "@abstractclass/review/PlayerCard.svelte";
  import PlayerRow from "@abstractclass/review/PlayerRow.svelte";
  import PlayerCardSkeleton, { BONE } from "@abstractclass/review/PlayerCardSkeleton.svelte";
  import ShareBar from "@abstractclass/review/ShareBar.svelte";
  import { MOVE_HERE, MOVE_LIST, TURN_NUMBER, keepInView, moveButton } from "@abstractclass/review/moveList.ts";
  import PracticeCard from "@abstractclass/practice/PracticeCard.svelte";
  import PracticeFrame from "@abstractclass/practice/PracticeFrame.svelte";
  import ReplaceGame from "@abstractclass/practice/ReplaceGame.svelte";
  import type { PracticeBot } from "@abstractclass/practice/bot.ts";
  import { BOT_WHERE, startBot } from "@abstractclass/practice/botForms.ts";
  import { EngineWorker, loadManifest, megabytes, type Manifest } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import type { BoardNote } from "@abstractclass/review/notes.ts";
  import Board from "#lib/board/Board.svelte";
  import { BlueprintInput } from "#lib/board/blueprintInput.svelte.ts";
  import { firstStatus, inputStatus } from "#lib/board/input.ts";
  import { handsAt, keptPanel, ONE_COLUMN_HEIGHT } from "#lib/board/keptPanel.svelte.ts";
  import { PLAYER_NAMES, STARS, starsOf, type Player } from "#lib/board/position.ts";
  import { moveName } from "#lib/game/notation.ts";
  import { readPasted } from "#lib/game/paste.ts";
  import { setUpStart, startTurn } from "#lib/game/position.ts";
  import type { GameRecord } from "#lib/game/record.ts";
  import { recordProblem, rulesBy, startProblem } from "#lib/review/recordCheck.ts";
  import { loadEngine } from "#lib/analysis/engineSettings.ts";
  import { PracticeGame } from "#lib/practice/game.svelte.ts";
  import { NETWORKS, botName, keep, loadChoices, loadKept, offersNetwork, practiceEndParams, practiceParams, saveChoices,
           type KeptPractice }
    from "#lib/practice/stampduty.ts";
  import { broughtLine, komiLine, newPractice, practiceOutcome, type Brought, type PracticeOutcome }
    from "@abstractclass/practice/practice.ts";
  import { track, trackOnce } from "#lib/analytics.svelte.ts";
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
  let dropped = $state(false); // the kept game's network is not in this build: the game cannot go on
  let notesAt = $state<Record<number, BoardNote[]>>({}); // the player's notes on the board, by position (design 33)
  let notice = $state(""); // a start brought that cannot be played
  // The next game's start, from the Analysis board's Play, once the engine's rules have checked it: a set-up start
  // (null: the standard start), and a record's moves from it.
  let brought = $state.raw<Brought | null>(null);
  let replacing = $state(false); // the question before a start brought sets the game in progress aside
  const sentence = (text: string) => text.replace(/\.?$/, "."); // an error's text, ended by one period

  /** The start after the `#`, read: a record's moves from its start (its `Position` tag, or `position` beside it), or
   *  a set-up start alone. It leaves the address. Null for none, and a notice for a record that cannot be read. */
  function readBrought(): { record: GameRecord | null; start: string | null } | null {
    const hash = new URLSearchParams(location.hash.slice(1)), text = hash.get("record"), position = hash.get("position");
    history.replaceState(null, "", location.pathname); // the start is kept below, not in the address
    if (text === null && position === null) return null;
    try {
      const record = text === null ? null : readPasted(text, position).record;
      return { record, start: setUpStart(record ? record.tags.Position : position) ?? null };
    } catch (e) {
      notice = `Practice cannot start from this record: ${sentence(errorText(e))}`;
      return null;
    }
  }

  onMount(() => {
    // A game kept with a network that the site no longer ships cannot go on: its bot has no network to start with.
    // The site ships only its lock's networks (design 33), so a new build can drop the game's network.
    const kept = loadKept();
    if (kept && !offersNetwork(kept.bot.network)) { keep(null); dropped = true; }
    const bringing = readBrought();
    phase = loadKept() && !bringing ? "game" : "settings";
    void (async () => {
      try {
        manifest = await loadManifest().catch(() => null);
        if (!manifest?.artifacts.some(a => a.kind === "practice-module")) throw new Error(MISSING);
        const w = new EngineWorker();
        await w.init(manifest);
        rules = w;
        // The start brought, checked by the rules: a record's start and moves, or a start alone.
        if (bringing) {
          const r = rulesBy(w), problem = bringing.record ? await recordProblem(r, bringing.record)
            : bringing.start ? await startProblem(r, bringing.start) : null;
          if (problem) notice = `Practice cannot start from this ${bringing.record ? "record" : "position"}: ${sentence(problem)}`;
          else brought = { start: bringing.start, moves: bringing.record?.moves ?? [] };
        }
        ready = true;
        const resume = loadKept();
        // The player chooses between the game in progress and the start brought. A start that the rules refuse leaves
        // the game in progress, which goes on.
        if (brought && resume?.moves.length) replacing = true;
        else if (!brought && resume && !game) await play(resume, "resumed");
      } catch (e) {
        failed = errorText(e);
      }
    })();
  });

  /** The question's answer: play from the start brought (the game in progress ends), or go on with the game in
   *  progress. */
  async function answerReplace(fromBrought: boolean) {
    replacing = false;
    if (fromBrought) { keep(null); return; }
    brought = null;
    const kept = loadKept();
    if (kept) await play(kept, "resumed");
  }
  onDestroy(() => { game?.end(); rules?.terminate(); });

  /** Starts the bot for a game, and the game: a new one, or one kept from an earlier visit (`from`, for
   *  `practice_start`). */
  async function play(kept: KeptPractice, from: "new" | "analysis_board" | "set_up_start" | "resumed") {
    if (!manifest || !rules) return;
    phase = "game";
    starting = kept;
    viewAt = null;
    notesAt = {};
    let bot: PracticeBot | null = null;
    try {
      bot = await startBot("blueprints", manifest, kept.bot.network, loadEngine(), kept.seed);
      const g = (game = new PracticeGame(kept, rules, bot));
      await g.start();
      if (g.status !== "failed") track("practice_start", { ...gameParams(g), practice_from: from });
      if (g.status !== "failed" && kept.komi) used("practice komi"); // a game with a komi
    } catch (e) {
      bot?.terminate();
      failed = errorText(e);
      track("engine_error", { error_kind: "practice" });
    }
  }

  // What Google Analytics receives (Hedge School's design 17): counts and settings, never a move or the player's name.
  // A game's settings, with each event about it. Its end, once, by the rules, Resign or Abort. A feature's first use
  // in a game.
  const gameParams = (g: PracticeGame) => practiceParams(g.kept, g.mode, navigator.hardwareConcurrency);
  let endSent: PracticeGame | null = null;
  function trackEnd(g: PracticeGame, outcome: PracticeOutcome) {
    if (endSent === g) return;
    endSent = g;
    track("practice_end", practiceEndParams(g.kept, g.mode, navigator.hardwareConcurrency, outcome, g.played.length));
  }
  $effect(() => {
    const g = game, status = g?.status;
    if (!g || (status !== "over" && status !== "failed")) return;
    untrack(() => {
      if (status === "failed") { trackOnce(`${g.kept.started} failed`, "engine_error", { error_kind: "practice" }); return; }
      trackEnd(g, practiceOutcome(g.position!.scores as [number, number], g.human, g.resigned));
    });
  });
  function used(name: string) {
    if (game) trackOnce(`${game.kept.started} ${name}`, "feature", { feature_name: name });
  }

  /** A new game with the settings chosen and the side picked, from the standard start or the start brought. */
  function newGame(side: "blue" | "red" | "random") {
    choices.side = side;
    dropped = false;
    notice = "";
    saveChoices($state.snapshot(choices));
    const kept: KeptPractice = newPractice($state.snapshot(choices), brought);
    const from = brought?.start ? "set_up_start" : brought ? "analysis_board" : "new";
    brought = null;
    keep(kept);
    void play(kept, from);
  }

  /** Back to the settings card, for the next game. */
  function toSettings() {
    game?.end();
    game = null;
    confirming = null;
    notice = "";
    phase = "settings";
  }

  function confirmAction() {
    const g = game, what = confirming;
    confirming = null;
    if (!g || !what) return;
    if (what === "resign") return g.resign();
    trackEnd(g, "aborted");
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
    if (k < shown) used("practice look back");
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
  const hands = $derived(handsAt(innerWidth));
  const panel = keptPanel();

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
    // A game that fails as it starts has no position yet: it says why, not that it starts.
    if (g?.status === "failed") return `The game stopped: ${g.error}`;
    if (!g || g.status === "starting" || !p) return `${ENGINE_NAME} starts…`;
    if (g.status === "over") {
      if (g.resigned) return `You resigned. ${ENGINE_NAME} wins.`;
      const won = /^([br])\+(.+)$/.exec(g.result ?? ""); // the rules' result: the winner and the margin
      return won ? `The game is over: ${PLAYER_NAMES[won[1] === "b" ? 0 : 1]} wins by ${won[2]}.` : "The game is over: a draw.";
    }
    if (!atLatest) return `You look at move ${shown}. To go back to the game, go to the last move.`;
    if (g.status === "bot") return `${ENGINE_NAME} thinks… ${g.thinkingSince === null ? "" : seconds(Math.max(0, now - g.thinkingSince))}`;
    if (g.status !== "human") return "";
    const n = g.movesLeft;
    return inputStatus(input, g.human) ?? `Your turn: ${n} ${n === 1 ? "move" : "moves"}. ${firstStatus(input, g.human)}`;
  });

  // The move list: one move a line, as Blueprints' moves are long, each turn's number at its first move, and each move a
  // step to its position. Its numbers start at the start's own turn.
  const firstTurn = $derived(startTurn(game?.kept.start));
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
          description="Practise Blueprints against {ENGINE_NAME} in your browser: choose its visits, variety and komi, then play." />

{#if failed}
  <main class="max-w-160 mx-auto my-6 px-4"><p class="text-blunder" role="alert">{failed}</p></main>
{:else if phase === "settings"}
  <PracticeCard bind:choices networks={NETWORKS.map(n => [n.id, `${n.name} (${megabytes(n.bytes)} MB)`])}
                networkHelp="The network that {ENGINE_NAME} plays with."
                nameHelp={'The name above the board. Without a name, the page shows "You".'}
                bot={ENGINE_NAME} {ready} onside={newGame}>
    {#snippet intro()}A game against {ENGINE_NAME}, the engine, in your browser, with no clock: it searches each move to
      the visits you set. This browser keeps the game until it ends.{/snippet}
    {#snippet notes()}
      {#if notice}<p class="mb-1 text-sm text-blunder" role="alert">{notice}</p>{/if}
      {#if brought}<p class="mb-1 text-sm">{broughtLine(brought, ["move", "moves"])}</p>{/if}
      {#if dropped}<p class="mb-1 text-sm" role="status">This site does not have the network of your last game. You cannot
        continue that game.</p>{/if}
    {/snippet}
  </PracticeCard>
{:else if phase === "game"}
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
  <PracticeFrame form="fill" fillHeight={ONE_COLUMN_HEIGHT} {shown} {last} onstep={step}>
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
          {#snippet blue()}<PlayerCardSkeleton player={0} name={k ? nameOf(k, 0) : undefined} second={STARS.word} />{/snippet}
          {#snippet red()}<PlayerCardSkeleton player={1} name={k ? nameOf(k, 1) : undefined} second={STARS.word} />{/snippet}
          {#snippet bar()}<div class="h-[1.15rem] {BONE}"></div>{/snippet}
        </PlayerRow>
      {/if}
    {/snippet}
    {#snippet board()}
      {#if g && pos}
        <Board position={pos} last={into?.move ?? null} layers={{ candidates: false }} {input} inputOn={taking} {hands}
               bind:place={panel.place} bind:size={panel.size} notes={notesAt[shown] ?? []} onnotes={n => { if (n.length > (notesAt[shown]?.length ?? 0)) used("note drawn"); notesAt[shown] = n; }} />
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
              <!-- A set-up start at a turn's second move: its first move was played before the start ("51..."). -->
              <span class={TURN_NUMBER}>{i === 0 ? `${firstTurn.turn + k}${k === 0 && !firstTurn.first ? "..." : "."}` : ""}</span>
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
        <button class="btn-icon" aria-label="Take back" title="Takeback" disabled={!g?.canTakeBack} onclick={() => { used("practice takeback"); viewAt = null; void g?.takeback(); }}><Icon name="takeback" /></button>
        <button class={["btn-icon", DANGER]} aria-label="Abort" title="Abort" disabled={!g || g.status === "starting"}
                onclick={() => (confirming = "abort")}><Icon name="abort" /></button>
        <button class={["btn-icon", DANGER]} aria-label="Resign" title="Resign"
                disabled={!g || g.status === "starting" || g.status === "failed"} onclick={() => (confirming = "resign")}><Icon name="resign" /></button>
      {/if}
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
<ReplaceGame open={replacing} {ready} title="Play from this position?" play="Play from the position"
             description="Your game in progress stops. You cannot continue it. This browser keeps one game in progress."
             onanswer={b => void answerReplace(b)} />
