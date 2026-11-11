// A practice game's flow (Hedge School's design 24): the player against the practice bot, which each site's game
// extends (Hedge School's src/lib/practice/game.svelte.ts, Cyanotype's). The flow is the same in each game: the bot
// plays its turn, timed, then the player gets the rules of their move, until the rules end the game. The player can
// take back their last turn, resign or abort. Each site gives its game's own parts: what the game keeps, its start,
// the rules of a position, how it reads a move, and what its end does (Hedge School keeps the game in Your games).
import type { Player } from "@abstractclass/analysis/game.ts";
import type { EngineWorker } from "@abstractclass/engine/client.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import type { PracticeBot } from "./bot.ts";
import type { BotMode } from "./botMessages.ts";
import { gtpColor, takebackCount, type KeptPractice } from "./practice.ts";

/** Whose move it is, or the game's state when nobody moves. "playing": the player's move, or a takeback, on its way to
 *  the bot and the rules. */
export type PracticeStatus = "starting" | "human" | "playing" | "bot" | "over" | "failed";

/** A practice game. `K` is the game that the site keeps, `P` a position, `M` a move played and `R` the rules of the
 *  player's move. */
export abstract class PracticeGame<K extends KeptPractice, P, M extends { player: Player }, R> {
  positions = $state.raw<P[]>([]); // each position from the start
  played = $state.raw<M[]>([]); // each move
  status = $state<PracticeStatus>("starting");
  error = $state("");
  rules = $state.raw<R | null>(null); // the rules of the player's move, from the player's turn
  resigned = $state(false); // the player resigned: the bot won
  thinkingSince = $state<number | null>(null); // when the bot's turn began (performance.now), while it searches
  lastTurnMs = $state<number | null>(null); // how long the bot's last turn took
  readonly kept: K;
  private closed = false; // the bot is ended: no move is kept after it
  private humanSince: number | null = null; // when the player's move began (performance.now), on the player's turn

  constructor(kept: K, protected rulesWorker: EngineWorker, protected bot: PracticeBot) {
    this.kept = { ...kept, moves: [...kept.moves], builds: [...kept.builds] };
  }

  get position(): P | undefined { return this.positions.at(-1); }
  get human(): Player { return this.kept.human; }
  /** Where the bot runs (botForms.ts). */
  get mode(): BotMode { return this.bot.mode; }

  /** The player to move on the latest position. Null before the game's first position. */
  abstract get mover(): Player | null;
  /** Whether the rules have ended the game on the latest position. */
  protected abstract get over(): boolean;
  /** Keeps the game in this browser, as the game in progress. Null: no game in progress. */
  protected abstract keep(kept: K | null): void;
  /** Gives the bot the game's settings and start (setUpBot), plays the moves kept into it, and sets the positions and
   *  the moves played. */
  protected abstract prepare(): Promise<void>;
  /** A move played, by either side, with its time in milliseconds (null: not known): its position from the rules, kept
   *  with the game. Never once the game has ended. */
  protected abstract add(move: string, ms: number | null): Promise<void>;
  /** The site's part of a takeback: the moves taken back, last first, are already out of the kept game. */
  protected abstract undid(undone: string[]): void;
  /** The rules of the player's move on the latest position. */
  protected abstract humanRules(): Promise<R>;
  /** The site's part of the game's end, by the rules or by Resign. */
  protected async finished(): Promise<void> {}
  /** The site's part of Abort: answers the id of the game that the site keeps, or null. */
  protected async aborted(): Promise<string | null> { return null; }
  /** The bot's move for `player`. */
  protected botMove(player: Player): Promise<string> { return this.bot.command(`genmove ${gtpColor(player)}`); }

  /** For prepare(): notes the bot's build in the kept game (a new build continues the game), then gives the bot the
   *  game's settings (`commands`). */
  protected async setUpBot(commands: Iterable<string>) {
    const info = JSON.parse(await this.bot.command(`${this.bot.game}-bot-info`)) as { build: string };
    if (this.kept.builds.at(-1) !== info.build) this.kept.builds.push(info.build);
    for (const line of commands) await this.bot.command(line);
  }

  /** Starts the game: its start and the moves kept (a game from an earlier visit, or a start brought), then the turn. */
  async start() {
    try {
      await this.prepare();
      this.keep(this.kept);
      await this.next();
    } catch (e) {
      this.fail(e);
    }
  }

  /** The player's move, on the player's turn. */
  async play(move: string) {
    if (this.status !== "human") return;
    this.status = "playing"; // nothing else moves until the bot has the move
    const ms = this.humanSince === null ? null : Math.round(performance.now() - this.humanSince);
    try {
      await this.bot.command(`play ${gtpColor(this.human)} ${move}`);
      await this.addMove(move, ms);
      await this.next();
    } catch (e) {
      this.fail(e);
    }
  }

  /** The moves that a takeback undoes now: never the moves brought, the game's start, so the bot gets no `undo` past
   *  it. */
  private get takebacks(): number {
    return takebackCount(this.played.map(m => m.player), this.human, this.kept.brought);
  }

  /** Whether a takeback has something to undo now. */
  get canTakeBack(): boolean {
    return this.status === "human" && this.takebacks > 0;
  }

  /** Takes back the player's last turn, and the bot's turn after it (design 24), on the player's turn. */
  async takeback() {
    if (!this.canTakeBack) return;
    const n = this.takebacks;
    this.status = "playing"; // nothing else moves until the bot has undone the moves
    try {
      for (let k = 0; k < n; k++) await this.bot.command("undo");
      this.undid(this.kept.moves.splice(-n).reverse());
      this.kept.takebacks = (this.kept.takebacks ?? 0) + 1;
      this.positions = this.positions.slice(0, -n);
      this.played = this.played.slice(0, -n);
      this.keep(this.kept);
      await this.next();
    } catch (e) {
      this.fail(e);
    }
  }

  /** The player resigns, at any time: the bot wins. A search in progress ends with the bot's worker. */
  async resign() {
    if (this.status !== "human" && this.status !== "playing" && this.status !== "bot") return;
    this.resigned = true;
    await this.finish();
  }

  /** The game ends without a result, at any time: it is no longer the game in progress. Answers the id of the game that
   *  the site keeps, or null. */
  async abort(): Promise<string | null> {
    this.end();
    const id = await this.aborted();
    this.keep(null);
    return id;
  }

  /** Ends the bot's worker. */
  end() {
    this.closed = true;
    this.bot.terminate();
  }

  /** The game is over: no longer the game in progress (the next visit starts a new one). */
  private async finish() {
    this.status = "over";
    this.rules = null;
    this.thinkingSince = null;
    this.end();
    await this.finished();
    this.keep(null);
  }

  /** Takes the turn up: the bot plays its turn, timed, then the game ends or the player gets the rules of their move. */
  private async next() {
    if (this.mover !== null && this.mover !== this.human && !this.over) {
      this.status = "bot";
      const since = (this.thinkingSince = performance.now());
      for (let p = this.mover; !this.over && p !== null && p !== this.human; p = this.mover) {
        const t0 = performance.now(), move = await this.botMove(p);
        await this.addMove(move, Math.round(performance.now() - t0));
      }
      this.lastTurnMs = performance.now() - since;
      this.thinkingSince = null;
      // The bot's turns and their time, for the average that the game's end counts (design 17)
      this.kept.botTurns = (this.kept.botTurns ?? 0) + 1;
      this.kept.botMs = (this.kept.botMs ?? 0) + this.lastTurnMs;
      this.keep(this.kept);
    }
    if (this.over) return this.finish();
    this.rules = await this.humanRules();
    this.status = "human";
    this.humanSince = performance.now();
  }

  /** A move played, kept by the site's game (add): never once the game has ended, as the bot's worker has. */
  private async addMove(move: string, ms: number | null) {
    if (this.closed) throw new Error("the game has ended");
    await this.add(move, ms);
  }

  /** The game stops on an error. Not once it has ended: then the bot's worker ended on purpose, and its search with it. */
  protected fail(e: unknown) {
    if (this.closed) return;
    this.status = "failed";
    this.thinkingSince = null;
    this.error = errorText(e);
  }
}
