<script lang="ts">
  // Practice (docs/design/24-practice.md): a game against HedgeFund, the engine's practice bot, in the player's browser,
  // with no server and no clock. Before the game, a card as Lichess's "Play with the computer": the bot's settings (the
  // network, the visits for each move, the variety), the player's name, then a side, which starts the game. During
  // the game, the review's layout and parts (design 06): the players' row above the board with the points' bar, the
  // board as large as the window lets it be, with the player's notes, and a side column with the review's move list,
  // the steps through the game's positions, Take back, Abort and Resign. One game in progress, kept in this browser and
  // resumed. A game that ends goes into Your games. Its way in, which the Analysis board's Play gives (design 22):
  // `#position=`, a set-up start, and `#record=`, the moves from the start. They leave the address at once, then the
  // analytics start.
  import { onDestroy, onMount, untrack } from "svelte";
  import { Dialog } from "bits-ui";
  import Board from "#lib/board/Board.svelte";
  import { EdgeInput } from "#lib/board/edgeInput.svelte.ts";
  import type { BoardNote } from "#lib/board/notes.ts";
  import Icon from "@abstractclass/site/Icon.svelte";
  import ShareBar, { ownShare } from "@abstractclass/review/ShareBar.svelte";
  import SettingChoice from "@abstractclass/site/SettingChoice.svelte";
  import SettingToggle from "@abstractclass/site/SettingToggle.svelte";
  import SoundSettings from "#lib/ui/SoundSettings.svelte";
  import { SETTINGS_HEAD } from "@abstractclass/site/settings.ts";
  import PlayerCard from "@abstractclass/review/PlayerCard.svelte";
  import PlayerRow from "@abstractclass/review/PlayerRow.svelte";
  import PlayerCardSkeleton, { BONE } from "@abstractclass/review/PlayerCardSkeleton.svelte";
  import PracticeCard from "@abstractclass/practice/PracticeCard.svelte";
  import PracticeFrame from "@abstractclass/practice/PracticeFrame.svelte";
  import { intoView } from "@abstractclass/site/pageScroll.ts";
  import { MOVE_HERE, MOVE_LIST, TURN_NUMBER, keepInView, moveButton, turnRow } from "@abstractclass/review/moveList.ts";
  import { EngineWorker, loadManifest, type Manifest } from "@abstractclass/engine/client.ts";
  import { edgeName, setUpStart } from "#lib/engine/notation.ts";
  import { NETWORKS, loadEngine, networkMB, networkName } from "#lib/analysis/engineSettings.ts";
  import { parseRecord, withStart } from "#lib/game/record.ts";
  import { variantProblem } from "#lib/game/import.ts";
  import { AREA, LAYERS, MOVE_TEXT, PLAYER_NAME, moveNotation, type Player } from "#lib/review/enclosure.ts";
  import { loadDisplay, saveDisplay } from "#lib/review/display.ts";
  import { playMove, preload } from "#lib/sound.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";
  import { browserNumber, startAnalytics, track, trackOnce } from "#lib/analytics.svelte.ts";
  import { sendPractice } from "#lib/practice/send.ts";
  import { startBot } from "#lib/practice/botForms.ts";
  import type { BotMode } from "@abstractclass/practice/botMessages.ts";
  import { PracticeGame, saveUnfinished } from "#lib/practice/game.svelte.ts";
  import { botName, keep, loadChoices, loadKept, practiceEndParams, practiceOutcome, practiceParams, practiceTurn, saveChoices,
           type KeptPractice, type PracticeOutcome } from "#lib/practice/hedgefund.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";

  const WHERE: Record<BotMode, string> = { gpu: "on the GPU", cpu: "on the CPU workers", single: "on one thread" };
  const DANGER = "hover:not-disabled:text-blunder hover:not-disabled:border-blunder"; // Abort and Resign, as Lichess's

  // Practice's own display settings (design 24): the points' bar between the players or beside the board, with each
  // player's area against their points in a second lane.
  interface ScoreDisplay { bar: boolean; area: boolean; form: "bar" | "gauge" }
  const SCORE_KEY = "hedge-school:practice-display:2";
  const keptScore = readLocalJson<Partial<ScoreDisplay>>(SCORE_KEY);
  const score = $state<ScoreDisplay>({
    bar: keptScore?.bar ?? true,
    area: keptScore?.area ?? false,
    form: keptScore?.form === "gauge" ? "gauge" : "bar",
  });
  let shownScore = $state.snapshot(score);
  $effect(() => {
    const now = $state.snapshot(score), was = shownScore;
    writeLocal(SCORE_KEY, JSON.stringify(now));
    for (const [k, name] of [["bar", "practice bar"], ["area", "practice area"], ["form", "practice direction"]] as const)
      if (now[k] !== was[k]) used(name);
    shownScore = now;
  });

  // What the page shows: nothing until the script knows whether a game is in progress (the prerendered page cannot
  // know), then the settings card or the game.
  let phase = $state<"loading" | "settings" | "game">("loading");
  let choices = $state(loadChoices());
  let manifest: Manifest | null = null;
  let rules: EngineWorker | null = null;
  let game = $state<PracticeGame | null>(null);
  let starting = $state.raw<KeptPractice | null>(null); // the game whose bot starts: its players' names, for the skeleton
  let failed = $state(""); // the engine could not start
  let notice = $state(""); // a record brought that cannot be played
  let aborted = $state(false); // the last game was aborted, and is in Your games
  // The next game's start, from the Analysis board's Play: a set-up start (null: the standard start), and a record's
  // moves from it.
  let brought = $state.raw<{ start: string | null; moves: string[] } | null>(null);
  const broughtText = $derived.by(() => {
    if (!brought) return "";
    const n = brought.moves.length, edges = `${n} ${n === 1 ? "edge" : "edges"}`;
    return brought.start ? `The game starts from the Analysis board's set-up position${n ? `, after the record's ${edges}` : ""}.`
      : `The game starts after the record's ${edges}.`;
  });
  let ready = $state(false); // the rules are loaded: a game can start
  let replacing = $state(false); // the dialog that asks before a record brought sets the game in progress aside
  let confirming = $state<"abort" | "resign" | null>(null); // Abort or Resign, waiting for its confirmation
  let settingsOpen = $state(false); // the display settings, in the moves' place
  let notesAt = $state<Record<number, BoardNote[]>>({}); // the player's notes on the board, by position (design 07)

  onMount(() => {
    const hash = new URLSearchParams(location.hash.slice(1)), record = hash.get("record"), position = setUpStart(hash.get("position")) ?? null;
    history.replaceState(null, "", location.pathname); // the start is kept below, not in the address
    startAnalytics();
    if (record !== null || position !== null) {
      try {
        // A record's own Position tag, or the start given beside it (withStart), with its turns numbered from there.
        const r = record ? parseRecord(withStart(record, position)) : null, problem = r && variantProblem(r, true);
        if (problem) throw new Error(problem);
        brought = { start: setUpStart(r?.tags.Position) ?? position, moves: r?.moves ?? [] };
      } catch (e) {
        notice = `Practice cannot start from this record: ${errorText(e)}`;
      }
    }
    const kept = loadKept();
    if (kept?.moves.length && brought) replacing = true; // the player chooses: the game in progress, or the record
    phase = kept && !brought ? "game" : "settings";
    void (async () => {
      try {
        manifest = await loadManifest();
        if (!manifest) throw new Error("no engine on this site: run `npm run engine` first");
        const w = new EngineWorker();
        await w.init(manifest);
        rules = w;
        ready = true;
        const resume = loadKept();
        if (phase === "game" && !game && resume) await play(resume, "resumed");
      } catch (e) {
        failed = errorText(e);
      }
    })();
  });
  onDestroy(() => { game?.end(); rules?.terminate(); });

  /** Starts the bot for a game, and the game: a new one, one from the Analysis board's Play (a record brought), or one
   *  kept from an earlier visit (`from`, for design 17's `practice_start`). */
  async function play(kept: KeptPractice, from: "new" | "analysis_board" | "set_up_start" | "resumed") {
    if (!manifest || !rules) return;
    phase = "game";
    starting = kept;
    notice = "";
    aborted = false;
    viewAt = null;
    notesAt = {};
    try {
      const bot = await startBot(manifest, kept.bot.network, loadEngine(), kept.seed);
      const g = (game = new PracticeGame(kept, rules, bot));
      await g.start();
      if (g.status !== "failed") track("practice_start", { ...gameParams(g), practice_from: from });
    } catch (e) {
      failed = errorText(e);
      track("engine_error", { error_kind: "practice" });
    }
  }

  /** A new game with the settings chosen and the side picked, from the standard start or the record brought. */
  function newGame(side: "blue" | "red" | "random") {
    choices.side = side;
    saveChoices($state.snapshot(choices));
    const human: Player = side === "blue" ? 0 : side === "red" ? 1 : Math.random() < 0.5 ? 0 : 1;
    const kept: KeptPractice = {
      version: 1, bot: { ...choices.bot }, human, name: choices.name.trim(), seed: Math.floor(Math.random() * 2 ** 31),
      moves: brought ? [...brought.moves] : [], builds: [], started: new Date().toISOString(),
      ...(brought?.start ? { start: brought.start } : {}), ...(brought?.moves.length ? { brought: brought.moves.length } : {}),
    };
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
    settingsOpen = false;
    phase = "settings";
  }

  async function confirmAction() {
    const g = game, what = confirming;
    confirming = null;
    if (!g || !what) return;
    if (what === "resign") return g.resign();
    trackEnd(g, "aborted");
    const id = await g.abort();
    toSettings();
    aborted = !!id;
  }

  /** A takeback, from the latest position: the board shows it after. */
  function takeback() {
    used("practice takeback");
    viewAt = null;
    void game?.takeback();
  }

  /** The dialog's answer: play from the record (the game in progress goes into Your games, unfinished), or go on with
   *  the game in progress. It answers once the rules are loaded. */
  async function answerReplace(fromRecord: boolean) {
    replacing = false;
    const kept = loadKept();
    if (fromRecord) {
      if (kept && rules) await saveUnfinished(kept, rules);
      keep(null);
      return;
    }
    brought = null;
    if (kept) await play(kept, "resumed");
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
    if (k === shown) return;
    const into = k > shown ? game.played[k - 1] : null; // the edge stepped through, forward
    if (k < shown) used("practice look back");
    viewAt = k === last ? null : k;
    if (into && display.sound) void playMove(display.volume, display.moveSound, !!into.cut);
  }
  function onkeydown(ev: KeyboardEvent) {
    if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey || !game) return;
    const target = ev.target instanceof Element ? ev.target : null;
    if (target?.closest('input, textarea, [role="dialog"], [role="radiogroup"], [role="menu"]')) return;
    if (ev.key === "Escape" && (confirming || settingsOpen || input.pending)) { confirming = null; settingsOpen = false; input.reset(); }
    else if (ev.key === "ArrowLeft" || ev.key === "k") step(shown - 1);
    else if (ev.key === "ArrowRight" || ev.key === "j") step(shown + 1);
    else if (ev.key === "ArrowUp" || ev.key === "Home") step(0);
    else if (ev.key === "ArrowDown" || ev.key === "End") step(last);
    else return;
    ev.preventDefault();
  }

  // The player's edges: two clicks, on the rules of the position (EdgeInput), at the latest position only.
  const input = new EdgeInput(edge => void game?.play(edgeName(edge)));
  $effect(() => {
    const r = game?.status === "human" && atLatest ? game.rules : null;
    input.reset();
    input.rules = r;
  });
  // The display settings that Practice shares with the review (design 08): the board's layers and the move sounds.
  const display = $state(loadDisplay());
  let shownDisplay = $state.snapshot(display);
  $effect(() => {
    const now = $state.snapshot(display), was = shownDisplay;
    saveDisplay(now);
    for (const k of Object.keys(now) as (keyof typeof now)[]) if (JSON.stringify(now[k]) !== JSON.stringify(was[k])) used(`display ${k}`);
    shownDisplay = now;
  });
  $effect(() => { if (display.sound) preload(display.moveSound); });
  // A new move's sound, for both sides' edges, while the board shows the latest position: not for the moves that a
  // game's start replays.
  let heard = 0;
  $effect(() => {
    const played = game?.played ?? [];
    if (played.length > heard && game?.status !== "starting" && viewAt === null && display.sound)
      void playMove(display.volume, display.moveSound, !!played.at(-1)?.cut);
    heard = played.length;
  });
  // The seconds the bot has thought, while it searches.
  let now = $state(0);
  $effect(() => {
    if (game?.thinkingSince == null) return;
    now = performance.now();
    const tick = setInterval(() => (now = performance.now()), 250);
    return () => clearInterval(tick);
  });
  const seconds = (ms: number) => `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;

  const nameOf = (k: KeptPractice, p: Player) => (p === k.human ? k.name || "You" : networkName(k.bot.network));
  const botLine = (g: PracticeGame) => `${botName(g.kept.bot)}, ${WHERE[g.mode]}.`;
  const statusText = $derived.by(() => {
    const g = game, p = g?.position;
    if (!g || g.status === "starting" || !p) return "Starting HedgeFund…";
    if (g.status === "failed") return `The game stopped: ${g.error}`;
    if (g.status === "over") {
      if (g.resigned) return "You resigned: HedgeFund wins.";
      const d = p.scores[0] - p.scores[1];
      return Math.abs(d) < 0.05 ? "Game over: a draw." : `Game over: ${PLAYER_NAME[d > 0 ? 0 : 1]} wins by ${Math.abs(d).toFixed(1)}.`;
    }
    if (g.status === "bot") return `HedgeFund is thinking… ${g.thinkingSince === null ? "" : seconds(Math.max(0, now - g.thinkingSince))}`;
    return `Your turn: ${p.movesLeft} ${p.movesLeft === 1 ? "edge" : "edges"} to play.`;
  });
  // What Google Analytics receives (design 17): counts and settings, never a move or the player's name. A game's
  // settings, with each event about it. Its end, once, by the rules, Resign or Abort. A feature's first use in a game.
  const gameParams = (g: PracticeGame) => practiceParams(g.kept, g.mode, navigator.hardwareConcurrency);
  let endSent: PracticeGame | null = null;
  // A game's end, once: its event (design 17), and the game itself to the site (design 25).
  function trackEnd(g: PracticeGame, outcome: PracticeOutcome) {
    if (endSent === g) return;
    endSent = g;
    track("practice_end", practiceEndParams(g.kept, g.mode, navigator.hardwareConcurrency, outcome, g.played.length));
    sendPractice(g.stored(outcome, browserNumber()));
  }
  $effect(() => {
    const g = game, status = g?.status;
    if (!g || (status !== "over" && status !== "failed")) return;
    untrack(() => {
      if (status === "failed") { trackOnce(`${g.kept.started} failed`, "engine_error", { error_kind: "practice" }); return; }
      trackEnd(g, practiceOutcome(g.position!.scores, g.human, g.resigned));
    });
  });
  function used(name: string) {
    if (game) trackOnce(`${game.kept.started} ${name}`, "feature", { feature_name: name });
  }

  // The move list: each turn's number and its edges, as the review lists them, each edge with its position's index. Its
  // numbers start at the start's own turn.
  const firstTurn = $derived(practiceTurn(game?.kept ?? {}));
  const turns = $derived.by(() => {
    const out: { player: Player; moves: { text: string; at: number }[] }[] = [];
    (game?.played ?? []).forEach((m, i) => {
      const t = out.at(-1), move = { text: moveNotation(m), at: i + 1 };
      if (t && t.player === m.player) t.moves.push(move);
      else out.push({ player: m.player, moves: [move] });
    });
    return out;
  });
  const gaugeW = $derived(!score.bar || score.form !== "gauge" ? "0px" : score.area ? "1.875rem" : "1.375rem");
  let moveList = $state<HTMLElement | null>(null);
  $effect(() => { void shown; void turns; keepInView(moveList); });
</script>

<svelte:window {onkeydown} />

<PageMeta title="Practice · Hedge School"
          description="Practise Enclosure against the engine's bot in your browser: choose its network, visits and variety, then review the game." />

{#if failed}
  <main class="max-w-160 mx-auto my-6 px-4"><p class="text-blunder" role="alert">{failed}</p></main>
{:else if phase === "settings"}
  {@render settingsCard()}
{:else if phase === "game"}
  {@render gameView()}
{:else}
  <main class="min-h-[60vh]" aria-busy="true"></main>
{/if}

<!-- The settings card (Lichess's "Play with the computer", @abstractclass/practice): the bot, the player's name, then the
     side, which starts the game. -->
{#snippet settingsCard()}
  <PracticeCard bind:choices networks={NETWORKS.map(n => [n.id, `${networkName(n.id)} (${networkMB(n.id)} MB)`])}
                networkHelp="The larger network plays stronger, and takes longer." {ready} onside={newGame}>
    {#snippet intro()}A game against the engine, in your browser, with no clock: the bot searches each move to the visits
      you set. The game then goes into <a href="/review">Your games</a>, for its review.{/snippet}
    {#snippet notes()}
      {#if notice}<p class="mb-1 text-sm text-blunder" role="alert">{notice}</p>{/if}
      {#if aborted}<p class="mb-1 text-sm" role="status">The game you aborted is in <a href="/review">Your games</a>, unfinished.</p>{/if}
      {#if brought}<p class="mb-1 text-sm">{broughtText}</p>{/if}
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
  {@const gauge = score.form === "gauge" && score.bar}
  <PracticeFrame form="square" {gauge} gaugeWidth={gaugeW} {shown} {last} onstep={step}>
    {#snippet strip()}
        {#if g && pos}
          <PlayerRow {gauge} label="Players and scores">
            {#snippet blue()}{@render card(g, 0)}{/snippet}
            {#snippet red()}{@render card(g, 1)}{/snippet}
            {#snippet bar()}{@render pointsBar(pos.scores, pos.areas ?? [0, 0], false)}{/snippet}
          </PlayerRow>
        {:else}
          <!-- The skeleton (the review's, PlayerCardSkeleton) while the bot starts: the row's height is the cards'. -->
          {@const k = g?.kept ?? starting}
          <PlayerRow {gauge} label="Players and scores">
            {#snippet blue()}<PlayerCardSkeleton player={0} name={k ? nameOf(k, 0) : undefined} second={AREA.word} />{/snippet}
            {#snippet red()}<PlayerCardSkeleton player={1} name={k ? nameOf(k, 1) : undefined} second={AREA.word} />{/snippet}
            {#snippet bar()}{#if score.bar}<div class="h-[1.15rem] {BONE}"></div>{:else}<div></div>{/if}{/snippet}
          </PlayerRow>
        {/if}
    {/snippet}
    {#snippet beside()}
        {#if gauge && pos}{@render pointsBar(pos.scores, pos.areas ?? [0, 0], true)}
        {:else if gauge}<div class="flex-none self-stretch w-[calc(var(--gauge-w)-0.375rem)] mr-1.5 {BONE}"></div>{/if}
    {/snippet}
    {#snippet board()}
          {#if !(g && pos)}<div class="board-points"></div>{/if} <!-- the empty board, until the game's position -->
          {#if g && pos}
            <Board position={pos} cut={into?.cut ?? null}
                   layers={{ candidates: false, marks: false, regions: display.layers.regions, protected: display.layers.protected }}
                   pending={input.pending} ends={input.ends} active={input.active} onpoint={input.rules ? input.click : undefined} onlyActive
                   notes={notesAt[shown] ?? []} onnotes={n => { if (n.length > (notesAt[shown]?.length ?? 0)) used("note drawn"); notesAt[shown] = n; }} />
          {/if}
    {/snippet}
    {#snippet side()}
      {#if settingsOpen}
        {@render displaySettings()}
      {:else}
        <h1 class="text-lg font-bold">Practice</h1>
        {#if g}<p class="text-xs text-muted">{botLine(g)}</p>{:else}<div class="h-3 mt-1 w-3/4 {BONE}"></div>{/if}
        <p class={["mt-2 text-sm font-medium", g?.status === "failed" && "text-blunder"]} role="status" aria-live="polite">{statusText}</p>
        <p class="min-h-[1.25rem] mb-1.5 text-xs text-muted">
          {#if g && !atLatest && g.status !== "over"}Looking back at {shown ? `edge ${shown}` : "the start"}: End returns to the game.
          {:else if g?.lastTurnMs != null && g.status !== "over"}HedgeFund's last turn took {seconds(g.lastTurnMs)}.{/if}
        </p>
        <!-- The review's move list (moveList.ts): one row a turn, each edge a step to its position. A click on a move does
             not focus it, as in the review. -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div bind:this={moveList} class={[MOVE_LIST, "min-h-24 max-[800px]:max-h-64"]}
             onmousedown={e => { if ((e.target as Element).closest("button")) e.preventDefault(); }}>
          {#if !g || g.status === "starting"}
            {#each Array(starting?.moves.length ? 12 : 0) as _, k (k)}<div class="h-4 mb-2.5 {BONE}" style:width="{k % 3 === 2 ? 55 : 85}%"></div>{/each}
          {/if}
          {#each turns as t, k (k)}
            <div class={turnRow()}>
              <span class={TURN_NUMBER}>{firstTurn.turn + k}.</span>
              <!-- A set-up start at a turn's second edge: its first edge was played before the start. -->
              {#if k === 0 && !firstTurn.first}<span class="px-[0.2rem] text-muted">…</span>{/if}
              {#each t.moves as m (m.at)}
                <button type="button" class={moveButton(t.player, shown === m.at ? MOVE_HERE : undefined)} tabindex="-1"
                        aria-current={shown === m.at ? "step" : undefined} onclick={() => step(m.at)}><span class={MOVE_TEXT}>{m.text}</span></button>
              {/each}
            </div>
          {/each}
        </div>
        {#if g?.status === "over"}
          <div class="flex flex-wrap gap-2 mt-3">
            <!-- The Review tab reviews games from the standard start: a set-up start's game opens on the Analysis board. -->
            {#if g.savedId && g.kept.start}<a class="btn-primary px-3 py-1 rounded text-sm no-underline"
                href="/analysis#{new URLSearchParams({ record: g.record(), via: 'practice' })}" data-sveltekit-reload>Analyze the game</a>
            {:else if g.savedId}<a class="btn-primary px-3 py-1 rounded text-sm no-underline" href="/review#game={g.savedId}" data-sveltekit-reload>Review the game</a>{/if}
            <button type="button" class="text-sm" onclick={toSettings}>New game</button>
          </div>
        {/if}
        {#if confirming && g}
          <div class="mt-3 p-2 rounded border border-line bg-panel-2 text-sm" role="alertdialog" aria-label={confirming === "resign" ? "Resign" : "Abort"}
               {@attach intoView}>
            <p class="mb-2">{confirming === "resign" ? "Resign? HedgeFund wins, and the game goes into Your games."
                                                     : "Abort the game? It goes into Your games, unfinished."}</p>
            <div class="flex gap-2">
              <button type="button" class="btn-danger text-sm" onclick={confirmAction}>{confirming === "resign" ? "Resign" : "Abort"}</button>
              <button type="button" class="text-sm" onclick={() => (confirming = null)}>Keep playing</button>
            </div>
          </div>
        {/if}
      {/if}
    {/snippet}
    <!-- The game's actions and the display settings' button, right of the steps in the frame's step bar. -->
    {#snippet tools()}
          <!-- The actions show, off, while the bot starts, so that the bar keeps its layout. -->
          {#if g?.status !== "over"}
            <button class="btn-icon" aria-label="Take back" title="Takeback" disabled={!g?.canTakeBack || settingsOpen} onclick={takeback}><Icon name="takeback" /></button>
            <button class={["btn-icon", DANGER]} aria-label="Abort" title="Abort" disabled={!g || g.status === "starting" || settingsOpen}
                    onclick={() => (confirming = "abort")}><Icon name="abort" /></button>
            <button class={["btn-icon", DANGER]} aria-label="Resign" title="Resign"
                    disabled={!g || g.status === "starting" || g.status === "failed" || settingsOpen} onclick={() => (confirming = "resign")}><Icon name="resign" /></button>
          {/if}
          <button class="btn-icon aria-expanded:border-accent aria-expanded:text-accent" aria-label="Display settings" title="Display settings"
                  aria-expanded={settingsOpen} onclick={() => (settingsOpen = !settingsOpen)}><Icon name="menu" /></button>
    {/snippet}
  </PracticeFrame>
{/snippet}

<!-- A player's card in the row above the board (the review's). The bot's settings are in the side column's first line. -->
{#snippet card(g: PracticeGame, p: Player)}
  {@const pos = g.positions[shown]}
  <PlayerCard player={p} name={nameOf(g.kept, p)} points={pos.scores[p]}
              second={pos.areas ? { value: pos.areas[p], ...AREA } : null} toMove={!pos.over && g.status !== "over" && pos.player === p} />
{/snippet}

<!-- The points' bar (the review's win bar and gauge, ShareBar): each player's share of the points so far, from their own
     side. With the area, a second lane: each player's area against their own points, under their part of the bar. -->
{#snippet pointsBar(scores: [number, number], areas: [number, number], upright: boolean)}
  {@const total = scores[0] + scores[1]}
  {#if score.bar}
    <ShareBar {upright} share={total > 0 ? scores[0] / total : NaN}
              sub={score.area ? [ownShare(areas[0], scores[0]), ownShare(areas[1], scores[1])] : null}
              title={`Points: Blue ${Math.round(scores[0])}, Red ${Math.round(scores[1])}` +
                     (score.area ? `. Area: Blue ${Math.round(areas[0])}, Red ${Math.round(areas[1])}` : "")} />
  {:else}
    <div></div>
  {/if}
{/snippet}

{#snippet displaySettings()}
  <div role="region" aria-label="Display settings" class="flex flex-col flex-1 min-h-0" {@attach intoView}>
    <div class="flex items-center justify-between mb-1">
      <h2 class="font-semibold">Display settings</h2>
      <button class="px-2 py-0.5 text-sm" onclick={() => (settingsOpen = false)}>Done</button>
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto pr-1">
      <h3 class={SETTINGS_HEAD}>Score</h3>
      <SettingToggle label="Points bar" help="Each player's share of the points so far."
                     get={() => score.bar} set={v => (score.bar = v)} />
      {#if score.bar}
        <SettingToggle label="Area" help="A second lane: each player's area against their own points, under their part of the bar."
                       get={() => score.area} set={v => (score.area = v)} />
        <SettingChoice label="Direction" help="Above the board, or beside it."
                       options={[["bar", "Horizontal"], ["gauge", "Vertical"]]} get={() => score.form}
                       set={v => (score.form = v as ScoreDisplay["form"])} />
      {/if}
      <h3 class={SETTINGS_HEAD}>Board</h3>
      {#each LAYERS as l (l.key)}
        <SettingToggle label={l.label} help={l.help} get={() => display.layers[l.key]} set={v => (display.layers[l.key] = v)} />
      {/each}
      <SoundSettings sound={display.sound} moveSound={display.moveSound} volume={display.volume} set={v => Object.assign(display, v)} />
    </div>
  </div>
{/snippet}

<!-- A record brought while a game is in progress: the player chooses, once the rules are loaded. -->
<Dialog.Root open={replacing} onOpenChange={open => { if (!open && replacing && ready) void answerReplace(false); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="dialog-box w-[min(94vw,28rem)]">
      <Dialog.Title class="mb-2 font-semibold">Play from this record?</Dialog.Title>
      <Dialog.Description class="text-sm">
        Your game in progress goes into Your games, unfinished, so you can still review it. This browser keeps one game in
        progress.
      </Dialog.Description>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="px-4 py-1 text-sm" disabled={!ready} onclick={() => answerReplace(false)}>Go on with mine</button>
        <button type="button" class="btn-primary px-4 py-1 text-sm" disabled={!ready} onclick={() => answerReplace(true)}>Play from the record</button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
