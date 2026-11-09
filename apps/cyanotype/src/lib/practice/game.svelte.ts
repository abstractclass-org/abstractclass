// A practice game (docs/design/33-cyanotype.md, "Practice against Stamp Duty"): the player against Stamp Duty's
// practice bot, as Hedge School's Practice plays one (its src/lib/practice/game.svelte.ts). The positions, what each
// move did and the player's legal moves come from the engine's rules worker (describe, describe_game): the board draws
// what the engine says, and the site has no rules. Each move goes to the bot too, so that the two play the same game,
// and each of the bot's moves must be in the rules' legal moves. The game's moves and settings are kept in this
// browser after each move (stampduty.ts, keep), so that a reload, or a new build, continues it from its moves.
// A game that ends is no longer kept: the site has no Your games yet.
// A game can start from a position (Hedge School's design 24, item 4), as the Analysis board's "Play the bot from
// here" brings it. A game's position goes to the bot as its moves from the standard start (`blueprints-set-game`), as
// the search of a position with no history is not its game's (the engine repository's games/blueprints/README.md,
// "A set-up start's view"). A board editor's set-up start goes to the bot as its own position
// (`blueprints-set-position`), and its moves after it as `play`. The moves brought are the game's start: a takeback
// stops at them.
import type { EngineWorker } from "@abstractclass/engine/client.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import { positionQuery } from "@abstractclass/engine/protocol.ts";
import type { PracticeBot } from "@abstractclass/practice/bot.ts";
import type { BotMode } from "@abstractclass/practice/botMessages.ts";
import { gtpColor, takebackCount } from "@abstractclass/practice/practice.ts";
import { withKomi } from "@abstractclass/analysis/game.ts";
import { boardMove, playerOf, sitePosition, stepOf, type DescribeReply, type GamePosition } from "../board/described.ts";
import type { InputRules } from "../board/input.ts";
import type { BoardMove, Player, SitePosition } from "../board/position.ts";
import { moveText } from "../game/notation.ts";
import { enginePosition } from "../game/position.ts";
import { rulesBy, startProblem } from "../review/recordCheck.ts";
import { ENGINE_NAME } from "../site.ts";
import { botCommands, endResult, keep, type KeptPractice } from "./stampduty.ts";

/** Whose move it is, or the game's state when nobody moves. "playing": the player's move, or a takeback, on its way to
 *  the bot and the rules. */
export type PracticeStatus = "starting" | "human" | "playing" | "bot" | "over" | "failed";

/** A move played: its player, its text with its capture mark, and what the board draws of it. */
export interface PlayedMove { player: Player; text: string; move: BoardMove }

/** A move with what it did, from describe_game's positions before and after it. */
function playedOf(name: string, before: GamePosition, after: GamePosition): PlayedMove {
  const step = stepOf(name, before, after);
  return { player: step.player, text: moveText(name, Object.keys(step.captured).length ? { points: step.points } : null),
           move: boardMove(step, before.blueprints, "after") };
}

export class PracticeGame {
  positions = $state.raw<SitePosition[]>([]); // each position from the start
  played = $state.raw<PlayedMove[]>([]); // each move
  status = $state<PracticeStatus>("starting");
  error = $state("");
  // The player's legal moves, on the latest position where the player moved last: they stay through the bot's turn,
  // so that the board's view, which fits their anchor hexes, does not change at each turn.
  rules = $state.raw<InputRules | null>(null);
  resigned = $state(false); // the player resigned: the bot won
  result = $state<string | null>(null); // the rules' result once the game is over: `b+N`, `r+N` or `0`
  thinkingSince = $state<number | null>(null); // when the bot's turn began (performance.now), while it searches
  lastTurnMs = $state<number | null>(null); // how long the bot's last turn took
  readonly kept: KeptPractice;
  private described = $state.raw<GamePosition[]>([]); // the engine's positions, each with what the move to it did
  private closed = false; // the bot is ended: no move is kept after it
  // The set-up start in the engine's one-line form, or null: the standard start. start() sets it once the check has
  // read the start, so that a start that the engine cannot read stops the game, not the page.
  private setUp: string | null = null;

  constructor(kept: KeptPractice, private rulesWorker: EngineWorker, private bot: PracticeBot) {
    this.kept = { ...kept, moves: [...kept.moves], builds: [...kept.builds] };
  }

  get position(): SitePosition | undefined { return this.positions.at(-1); }
  get human(): Player { return this.kept.human; }
  /** Where the bot runs (@abstractclass/practice/botForms.ts). */
  get mode(): BotMode { return this.bot.mode; }
  /** The player to move on the latest position. */
  get mover(): Player | null { const p = this.described.at(-1); return p ? playerOf(p.mover) : null; }
  /** The moves left in the mover's turn, this one included. */
  get movesLeft(): number { return this.described.at(-1)?.movesLeft ?? 0; }

  /** A position from the rules, its scores with the game's komi as a starting score (Hedge School's design 24). */
  private positionOf(fields: Parameters<typeof sitePosition>[0]): SitePosition {
    return withKomi(sitePosition(fields), this.kept.komi ?? 0);
  }

  /** Gives the bot the game's settings and its komi, sets its game to the game's start and the moves kept (a start
   *  brought, a game from an earlier visit), notes a new build, and takes the turn up. A set-up start that no game
   *  reaches stops the game first, in the words of the card's notice (startProblem): the page checks a start brought,
   *  but not a game kept in this browser. The bot refuses such a start too, with the position check's first reason. */
  async start() {
    try {
      const unreached = this.kept.start ? await startProblem(rulesBy(this.rulesWorker), this.kept.start, "its start") : null;
      if (unreached) throw new Error(unreached);
      this.setUp = this.kept.start ? enginePosition(this.kept.start) : null;
      const info = JSON.parse(await this.bot.command("blueprints-bot-info")) as { build: string };
      if (this.kept.builds.at(-1) !== info.build) this.kept.builds.push(info.build); // a new build continues the game
      for (const line of botCommands(this.kept.bot, this.kept.komi)) await this.bot.command(line);
      const described = (await this.rulesWorker.describeGame<GamePosition>(positionQuery(this.setUp, this.kept.moves))).reply.positions;
      if (this.setUp) {
        await this.bot.command(`blueprints-set-position ${this.setUp}`);
        for (let i = 0; i < this.kept.moves.length; i++)
          await this.bot.command(`play ${gtpColor(playerOf(described[i].mover))} ${this.kept.moves[i]}`);
      } else if (this.kept.moves.length) await this.bot.command(`blueprints-set-game ${this.kept.moves.join(" ")}`);
      this.described = described;
      this.positions = described.map(f => this.positionOf(f));
      this.played = this.kept.moves.map((m, i) => playedOf(m, described[i], described[i + 1]));
      keep(this.kept);
      await this.next();
    } catch (e) {
      this.fail(e);
    }
  }

  /** The player's move, on the player's turn. */
  async play(name: string) {
    if (this.status !== "human") return;
    this.status = "playing"; // nothing else moves until the bot has the move
    try {
      await this.bot.command(`play ${gtpColor(this.human)} ${name}`);
      await this.add(name);
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

  /** Takes back the player's last turn, and the bot's turn after it (Hedge School's design 24), on the player's turn. */
  async takeback() {
    if (!this.canTakeBack) return;
    const n = this.takebacks;
    this.status = "playing"; // nothing else moves until the bot has undone the moves
    try {
      for (let k = 0; k < n; k++) await this.bot.command("undo");
      this.kept.moves.splice(-n);
      this.kept.takebacks = (this.kept.takebacks ?? 0) + 1;
      this.described = this.described.slice(0, -n);
      this.positions = this.positions.slice(0, -n);
      this.played = this.played.slice(0, -n);
      keep(this.kept);
      await this.next();
    } catch (e) {
      this.fail(e);
    }
  }

  /** Whether a takeback has something to undo now. */
  get canTakeBack(): boolean {
    return this.status === "human" && this.takebacks > 0;
  }

  /** The player resigns, at any time: the bot wins. A search in progress ends with the bot's worker. */
  resign() {
    if (this.status !== "human" && this.status !== "playing" && this.status !== "bot") return;
    this.resigned = true;
    this.finish();
  }

  /** The game ends without a result, at any time: it is no longer kept. */
  abort() {
    this.end();
    keep(null);
  }

  /** Ends the bot's worker. */
  end() {
    this.closed = true;
    this.bot.terminate();
  }

  /** The game is over: no longer the game in progress (the next visit starts a new one). */
  private finish() {
    this.status = "over";
    this.rules = null;
    this.thinkingSince = null;
    this.end();
    keep(null);
  }

  /** A move played, by either side: its position from the rules, kept with the game. */
  private async add(name: string) {
    if (this.closed) throw new Error("the game has ended");
    const from = this.kept.moves.length;
    this.kept.moves.push(name);
    keep(this.kept);
    const [before, after] = (await this.rulesWorker.describeGame<GamePosition>(positionQuery(this.setUp, this.kept.moves), from)).reply.positions;
    this.described = [...this.described, after];
    this.played = [...this.played, playedOf(name, before, after)];
    this.positions = [...this.positions, this.positionOf(after)];
  }

  /** The player's legal moves on the latest position. */
  private async describe(): Promise<DescribeReply> {
    return (await this.rulesWorker.describe<DescribeReply>(positionQuery(this.setUp, this.kept.moves))).reply;
  }

  /** Takes the turn up: the bot plays its turn, timed, each move checked against the rules' legal moves, then the game
   *  ends or the player gets the legal moves of their move. */
  private async next() {
    if (this.mover !== null && this.mover !== this.human && !this.described.at(-1)?.outcome) {
      this.status = "bot";
      const since = (this.thinkingSince = performance.now());
      for (let p = this.described.at(-1)!; !p.outcome && playerOf(p.mover) !== this.human; p = this.described.at(-1)!) {
        const [legal, move] = await Promise.all([this.describe().then(d => d.legal), this.bot.command(`genmove ${gtpColor(playerOf(p.mover))}`)]);
        if (!legal.includes(move)) throw new Error(`${ENGINE_NAME} played ${move}, which is not a legal move here`);
        await this.add(move);
      }
      this.lastTurnMs = performance.now() - since;
      this.thinkingSince = null;
      // The bot's turns and their time, for the average that the game's end counts (Hedge School's design 17)
      this.kept.botTurns = (this.kept.botTurns ?? 0) + 1;
      this.kept.botMs = (this.kept.botMs ?? 0) + this.lastTurnMs;
      keep(this.kept);
    }
    const end = this.described.at(-1);
    if (end?.outcome) {
      this.result = endResult(end, this.kept.komi ?? 0);
      return this.finish();
    }
    const reply = await this.describe();
    this.rules = { position: this.positionOf(reply), mover: playerOf(reply.mover), legal: reply.legal };
    this.status = "human";
  }

  /** The game stops on an error. Not once it has ended: then the bot's worker ended on purpose, and its search with it. */
  private fail(e: unknown) {
    if (this.closed) return;
    this.status = "failed";
    this.thinkingSince = null;
    this.error = errorText(e);
  }
}
