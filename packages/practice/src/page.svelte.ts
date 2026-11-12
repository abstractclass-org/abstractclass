// Practice's page (Hedge School's design 24), what both sites' /practice share: what the page shows (the settings
// card or the game), the engine's rules, the bot's start and the game's, a new game from the card, the steps through
// the game's positions and their keys, the bot's thinking time, Abort and Resign with their question, the question when
// a start comes while a game is in progress, the player's notes by position, and the game's events (design 17). Each
// site gives its game, its storage, its networks' names, its engine settings and its analytics (PracticeSite), and the
// page's text, board and score. Make it as the page's component starts: it starts effects.
import { onDestroy, untrack } from "svelte";
import type { Player } from "@abstractclass/analysis/game.ts";
import type { EngineSettings } from "@abstractclass/analysis/settings.ts";
import { EngineWorker, type Manifest } from "@abstractclass/engine/client.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import type { BoardNote } from "@abstractclass/review/notes.ts";
import type { EventParams } from "@abstractclass/site/analytics.svelte.ts";
import type { PracticeBot } from "./bot.ts";
import { startBot } from "./botForms.ts";
import type { PracticeGame } from "./game.svelte.ts";
import { newPractice, practiceFrom, practiceOutcome, type Brought, type KeptPractice, type PracticeChoices,
         type PracticeFrom, type PracticeOutcome } from "./practice.ts";
import { practiceEvents } from "./practiceEvents.ts";

/** A site's practice game, as the page uses it. */
type Game<K extends KeptPractice> = PracticeGame<K, { scores: readonly [number, number] }, { player: Player }, unknown>;

/** What a site gives its Practice page. */
export interface PracticeSite<K extends KeptPractice, G extends Game<K>> {
  game: string; // the game's name in the bot's commands (startBot)
  choices: { load(): PracticeChoices; save(choices: PracticeChoices): void }; // the player's choices (choicesStore)
  kept: { load(): K | null; keep(kept: K | null): void }; // the game in progress (keptStore)
  networkName(id: string): string; // a network's name in the events (practiceEvents)
  engine(): EngineSettings; // the engine settings, for the bot's form
  create(kept: K, rules: EngineWorker, bot: PracticeBot): G;
  track(name: string, params?: EventParams): void;
  trackOnce(key: string, name: string, params?: EventParams): void;
  ended?(game: G, outcome: PracticeOutcome): void; // the site's part of a game's end, after its event
  setAside?(kept: K, rules: EngineWorker): Promise<unknown>; // the game in progress, when a start brought replaces it
  settings?(): void; // the site's part as the page goes back to the settings card
  forward?(move: G["played"][number]): void; // a step forward, through `move`
}

/** Seconds, as the side column gives the bot's time: one decimal under 10. */
export const seconds = (ms: number) => `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;

/** What the status line tells, in one order on both sites: a game that stopped says why first (a game that fails as it
 *  starts has no position yet), then the bot's start, the game's end by Resign or by the rules, and whose move it is.
 *  "playing": the player's move on its way to the bot and the rules. Each site gives the words. */
export type PracticeLine = "failed" | "starting" | "resigned" | "over" | "bot" | "human" | "playing";

export class PracticePage<K extends KeptPractice, G extends Game<K>> {
  // What the page shows: nothing until the script knows whether a game is in progress (the prerendered page cannot
  // know), then the settings card or the game.
  phase = $state<"loading" | "settings" | "game">("loading");
  choices = $state<PracticeChoices>() as PracticeChoices;
  game = $state<G | null>(null);
  starting = $state.raw<K | null>(null); // the game whose bot starts: its players' names, for the skeleton
  failed = $state(""); // the engine could not start
  ready = $state(false); // the rules are loaded: a game can start
  confirming = $state<"abort" | "resign" | null>(null); // Abort or Resign, waiting for its confirmation
  abortedId = $state<string | null>(null); // the last game was aborted, and the site keeps it under this id
  // The next game's start, from the Analysis board's Play: a set-up start (null: the standard start), and a record's
  // moves from it.
  brought = $state.raw<Brought | null>(null);
  replacing = $state(false); // the question before a start brought sets the game in progress aside
  notesAt = $state<Record<number, BoardNote[]>>({}); // the player's notes on the board, by position (design 07)
  // The position on the board: the game's latest (null), or an earlier one, to look back. Moves are made only at the
  // latest, as in a game on Lichess.
  viewAt = $state<number | null>(null);
  last = $derived(this.game ? this.game.positions.length - 1 : 0);
  shown = $derived(this.viewAt === null ? this.last : Math.min(this.viewAt, this.last));
  atLatest = $derived(this.shown === this.last);
  taking = $derived(this.game?.status === "human" && this.atLatest); // the board takes the player's move
  /** What the status line tells (PracticeLine). */
  line = $derived.by((): PracticeLine => {
    const g = this.game;
    if (g?.status === "failed") return "failed";
    if (!g || g.status === "starting" || !g.position) return "starting";
    if (g.status === "over") return g.resigned ? "resigned" : "over";
    return g.status;
  });
  private now = $state(0); // the clock of the bot's thinking time, while it searches (performance.now)
  /** The bot's thinking time on its turn so far, as "2.3 s", while it searches. Else empty. */
  thinking = $derived.by(() => {
    const since = this.game?.thinkingSince;
    return since == null ? "" : seconds(Math.max(0, this.now - since));
  });
  private manifest: Manifest | null = null;
  private rules: EngineWorker | null = null;
  private endSent: G | null = null;
  private site: PracticeSite<K, G>;
  private events: ReturnType<typeof practiceEvents>;

  constructor(site: PracticeSite<K, G>) {
    this.site = site;
    this.events = practiceEvents(site.networkName);
    this.choices = site.choices.load();
    $effect(() => {
      if (this.game?.thinkingSince == null) return;
      this.now = performance.now();
      const tick = setInterval(() => (this.now = performance.now()), 250);
      return () => clearInterval(tick);
    });
    // A game's end, once, by the rules, Resign or Abort, and the engine's error.
    $effect(() => {
      const g = this.game, status = g?.status;
      if (!g || (status !== "over" && status !== "failed")) return;
      untrack(() => {
        if (status === "failed") { site.trackOnce(`${g.kept.started} failed`, "engine_error", { error_kind: "practice" }); return; }
        this.trackEnd(g, practiceOutcome(g.position!.scores as [number, number], g.human, g.resigned));
      });
    });
    onDestroy(() => { this.game?.end(); this.rules?.terminate(); });
  }

  /** The page's start, as it mounts: the game in progress or the settings card, then the engine's rules. `bringing`: a
   *  start came in the address that the rules have not refused yet. The site reads it before (`brought`), or checks it
   *  once the rules are loaded (`check`). The page resumes a kept game only when it found one as it mounted and nothing
   *  is brought: a game that another tab starts while the engine loads does not replace the settings card. A game found
   *  that another tab ends meanwhile gives way to the card, and the question on a start brought does not ask about
   *  it. */
  async mount(bringing: boolean, manifest: () => Promise<Manifest>, check?: (rules: EngineWorker) => Promise<void>) {
    const found = this.site.kept.load();
    if (found?.moves.length && this.brought) this.replacing = true; // the player chooses: the game in progress, or the start
    this.phase = found && !bringing ? "game" : "settings";
    try {
      this.manifest = await manifest();
      const w = new EngineWorker();
      await w.init(this.manifest);
      this.rules = w;
      await check?.(w);
      this.ready = true;
      if (!found || this.game) return;
      const kept = this.site.kept.load(); // the game found, unless another tab ended it
      // The player chooses between the game in progress and the start brought. A start brought that the rules refused
      // leaves the game in progress, which goes on.
      if (this.brought) this.replacing = !!(found.moves.length && kept?.moves.length);
      else if (kept) await this.play(kept, "resumed");
      else this.phase = "settings";
    } catch (e) {
      this.failed = errorText(e);
    }
  }

  /** Starts the bot for a game, and the game: a new one, one from a start brought, or one kept from an earlier visit
   *  (`from`, for design 17's `practice_start`). */
  async play(kept: K, from: PracticeFrom) {
    if (!this.manifest || !this.rules) return;
    this.phase = "game";
    this.starting = kept;
    this.abortedId = null;
    this.viewAt = null;
    this.notesAt = {};
    let bot: PracticeBot | null = null;
    try {
      bot = await startBot(this.site.game, this.manifest, kept.bot.network, this.site.engine(), kept.seed);
      const g = (this.game = this.site.create(kept, this.rules, bot));
      await g.start();
      if (g.status !== "failed") this.site.track("practice_start", { ...this.params(g), practice_from: from });
      if (g.status !== "failed" && kept.komi) this.used("practice komi"); // design 17's feature: a game with a komi
    } catch (e) {
      bot?.terminate();
      this.failed = errorText(e);
      this.site.track("engine_error", { error_kind: "practice" });
    }
  }

  /** A new game with the settings chosen and the side picked, from the standard start or the start brought. */
  newGame(side: "blue" | "red" | "random") {
    this.choices.side = side;
    const chosen = $state.snapshot(this.choices);
    this.site.choices.save(chosen);
    const kept = newPractice(chosen, this.brought) as K, from = practiceFrom(this.brought);
    this.brought = null;
    this.site.kept.keep(kept);
    void this.play(kept, from);
  }

  /** Back to the settings card, for the next game. */
  toSettings() {
    this.game?.end();
    this.game = null;
    this.confirming = null;
    this.site.settings?.();
    this.phase = "settings";
  }

  /** Abort or Resign, once the player confirms it. */
  async confirm() {
    const g = this.game, what = this.confirming;
    this.confirming = null;
    if (!g || !what) return;
    if (what === "resign") return g.resign();
    this.trackEnd(g, "aborted");
    const id = await g.abort();
    this.toSettings();
    this.abortedId = id;
  }

  /** The answer to the question on a start brought: play from it (the game in progress is set aside), or go on with
   *  the game in progress. It answers once the rules are loaded. */
  async answer(fromBrought: boolean) {
    this.replacing = false;
    const kept = this.site.kept.load();
    if (fromBrought) {
      if (kept && this.rules) await this.site.setAside?.(kept, this.rules);
      this.site.kept.keep(null);
    } else if (kept) { // a game that another tab ended leaves the start brought
      this.brought = null;
      await this.play(kept, "resumed");
    }
  }

  /** A takeback, from the latest position: the board shows it after. */
  takeback() {
    this.used("practice takeback");
    this.viewAt = null;
    void this.game?.takeback();
  }

  /** A step to the position `to`, kept from the start to the latest. */
  step(to: number) {
    const g = this.game;
    if (!g || this.last < 0) return;
    const k = Math.max(0, Math.min(this.last, to));
    if (k === this.shown) return;
    const into = k > this.shown ? g.played[k - 1] : null; // the move stepped through, forward
    if (k < this.shown) this.used("practice look back");
    this.viewAt = k === this.last ? null : k;
    if (into) this.site.forward?.(into);
  }

  /** The page's keys, as the review's: the arrows, Home and End, and j and k, step through the positions. Escape
   *  closes the question, and what the page has open (`open`), with `close`. */
  keydown(ev: KeyboardEvent, open = false, close = () => {}) {
    if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey || !this.game) return;
    const target = ev.target instanceof Element ? ev.target : null;
    if (target?.closest('input, textarea, [role="dialog"], [role="radiogroup"], [role="menu"]')) return;
    if (ev.key === "Escape" && (this.confirming || open)) { this.confirming = null; close(); }
    else if (ev.key === "ArrowLeft" || ev.key === "k") this.step(this.shown - 1);
    else if (ev.key === "ArrowRight" || ev.key === "j") this.step(this.shown + 1);
    else if (ev.key === "ArrowUp" || ev.key === "Home") this.step(0);
    else if (ev.key === "ArrowDown" || ev.key === "End") this.step(this.last);
    else return;
    ev.preventDefault();
  }

  /** The player's notes on the shown position, as the board gives them: a note drawn is a feature used. */
  note(notes: BoardNote[]) {
    if (notes.length > (this.notesAt[this.shown]?.length ?? 0)) this.used("note drawn");
    this.notesAt[this.shown] = notes;
  }

  /** A feature's first use in a game (design 17). */
  used(name: string) {
    if (this.game) this.site.trackOnce(`${this.game.kept.started} ${name}`, "feature", { feature_name: name });
  }

  /** A game's settings, with each event about it: counts and settings, never a move or the player's name. */
  private params(g: G) { return this.events.practiceParams(g.kept, g.mode, navigator.hardwareConcurrency); }

  /** A game's end, once: its event, then the site's part. */
  private trackEnd(g: G, outcome: PracticeOutcome) {
    if (this.endSent === g) return;
    this.endSent = g;
    const params = this.events.practiceEndParams(g.kept, g.mode, navigator.hardwareConcurrency, outcome, g.played.length);
    this.site.track("practice_end", params);
    this.site.ended?.(g, outcome);
  }
}
