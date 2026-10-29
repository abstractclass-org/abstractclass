// A practice game (docs/design/33-drawing-board.md, "Practice against Stamp Duty"): the player against Stamp Duty's
// practice bot, as Hedge School's Practice plays one (its src/lib/practice/game.svelte.ts). The positions, what each
// move did and the player's legal moves come from the engine's rules worker (describe, describe_game): the board draws
// what the engine says, and the site has no rules. Each move goes to the bot too, so that the two play the same game,
// and each of the bot's moves must be in the rules' legal moves. The game's moves and settings are kept in this
// browser after each move (stampduty.ts, keep), so that a reload, or a new build, continues it from its moves
// (`blueprints-set-game`). A game that ends is no longer kept: the site has no Your games yet.
import type { EngineWorker } from "@abstractclass/engine/client.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import { positionQuery } from "@abstractclass/engine/protocol.ts";
import type { PracticeBot } from "@abstractclass/practice/bot.ts";
import { gtpColor, resignResult, takebackCount } from "@abstractclass/practice/practice.ts";
import { boardMove, playerOf, sitePosition, stepOf, type DescribeReply, type GamePosition } from "../board/described.ts";
import type { InputRules } from "../board/input.ts";
import type { BoardMove, Player, SitePosition } from "../board/position.ts";
import { moveText } from "../game/notation.ts";
import { ENGINE_NAME } from "../site.ts";
import { botCommands, keep, type KeptPractice } from "./stampduty.ts";

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
  result = $state<string | null>(null); // the game's result once it is over: `b+N`, `r+N`, `0`, or a resignation's
  thinkingSince = $state<number | null>(null); // when the bot's turn began (performance.now), while it searches
  lastTurnMs = $state<number | null>(null); // how long the bot's last turn took
  readonly kept: KeptPractice;
  private described = $state.raw<GamePosition[]>([]); // the engine's positions, each with what the move to it did
  private closed = false; // the bot is ended: no move is kept after it

  constructor(kept: KeptPractice, private rulesWorker: EngineWorker, private bot: PracticeBot) {
    this.kept = { ...kept, moves: [...kept.moves], builds: [...kept.builds] };
  }

  get position(): SitePosition | undefined { return this.positions.at(-1); }
  get human(): Player { return this.kept.human; }
  /** The player to move on the latest position. */
  get mover(): Player | null { const p = this.described.at(-1); return p ? playerOf(p.mover) : null; }
  /** The moves left in the mover's turn, this one included. */
  get movesLeft(): number { return this.described.at(-1)?.movesLeft ?? 0; }

  /** Gives the bot the game's settings, sets its game to the moves kept (a game from an earlier visit), notes a new
   *  build, and takes the turn up. */
  async start() {
    try {
      const info = JSON.parse(await this.bot.command("blueprints-bot-info")) as { build: string };
      if (this.kept.builds.at(-1) !== info.build) this.kept.builds.push(info.build); // a new build continues the game
      this.kept.form = this.bot.mode as KeptPractice["form"];
      for (const line of botCommands(this.kept.bot)) await this.bot.command(line);
      if (this.kept.moves.length) await this.bot.command(`blueprints-set-game ${this.kept.moves.join(" ")}`);
      const described = (await this.rulesWorker.describeGame<GamePosition>(positionQuery(null, this.kept.moves))).reply.positions;
      this.described = described;
      this.positions = described.map(sitePosition);
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

  /** Takes back the player's last turn, and the bot's turn after it (Hedge School's design 24), on the player's turn. */
  async takeback() {
    if (!this.canTakeBack) return;
    const n = takebackCount(this.played.map(m => m.player), this.human);
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
    return this.status === "human" && takebackCount(this.played.map(m => m.player), this.human) > 0;
  }

  /** The player resigns, at any time: the bot wins. A search in progress ends with the bot's worker. */
  resign() {
    if (this.status !== "human" && this.status !== "playing" && this.status !== "bot") return;
    this.resigned = true;
    this.finish(resignResult(this.human));
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
  private finish(result: string) {
    this.status = "over";
    this.result = result;
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
    const [before, after] = (await this.rulesWorker.describeGame<GamePosition>(positionQuery(null, this.kept.moves), from)).reply.positions;
    this.described = [...this.described, after];
    this.played = [...this.played, playedOf(name, before, after)];
    this.positions = [...this.positions, sitePosition(after)];
  }

  /** The player's legal moves on the latest position. */
  private async describe(): Promise<DescribeReply> {
    return (await this.rulesWorker.describe<DescribeReply>(positionQuery(null, this.kept.moves))).reply;
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
    }
    const outcome = this.described.at(-1)?.outcome;
    if (outcome) return this.finish(outcome.result);
    const reply = await this.describe();
    this.rules = { position: sitePosition(reply), mover: playerOf(reply.mover), legal: reply.legal };
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
