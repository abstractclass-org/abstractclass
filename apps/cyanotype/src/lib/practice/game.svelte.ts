// A practice game (docs/design/33-cyanotype.md, "Practice against Stamp Duty"): the player against Stamp Duty's
// practice bot, as Hedge School's Practice plays one (its src/lib/practice/game.svelte.ts). The positions, what each
// move did and the player's legal moves come from the engine's rules worker (describe, describe_game): the board draws
// what the engine says, and the site has no rules. Each move goes to the bot too, so that the two play the same game,
// and each of the bot's moves must be in the rules' legal moves. The game's moves and settings are kept in this
// browser after each move (stampduty.ts, keptGame), so that a reload, or a new build, continues it from its moves.
// A game that ends goes into the player's games (game/store.ts), and to the site, as Hedge School's (its design 25):
// each move's time and each takeback are kept for the stored game (send.ts).
// A game can start from a position (Hedge School's design 24, item 4), as the Analysis board's "Play the bot from
// here" brings it. A game's position goes to the bot as its moves from the standard start (`blueprints-set-game`), as
// the search of a position with no history is not its game's (the engine repository's games/blueprints/README.md,
// "A set-up start's view"). A board editor's set-up start goes to the bot as its own position
// (`blueprints-set-position`), and its moves after it as `play`. The moves brought are the game's start: a takeback
// stops at them. The turns, the takeback, Resign and Abort are the practice's (@abstractclass/practice/game.svelte.ts).
import { positionQuery } from "@abstractclass/engine/protocol.ts";
import { PracticeGame as BaseGame } from "@abstractclass/practice/game.svelte.ts";
import { gtpColor, resignResult } from "@abstractclass/practice/practice.ts";
import type { EngineWorker } from "@abstractclass/engine/client.ts";
import { withKomi } from "@abstractclass/analysis/game.ts";
import { boardMove, playerOf, sitePosition, stepOf, type DescribeReply, type GamePosition } from "../board/described.ts";
import type { InputRules } from "../board/input.ts";
import type { BoardMove, Player, SitePosition } from "../board/position.ts";
import { moveText } from "../game/notation.ts";
import { enginePosition } from "../game/position.ts";
import { parseRecord } from "../game/record.ts";
import { saveGame } from "../game/store.ts";
import { rulesBy, startProblem } from "../review/recordCheck.ts";
import { ENGINE_NAME } from "../site.ts";
import { botCommands, endResult, keptGame, practiceRecord, type KeptPractice } from "./stampduty.ts";
import { sendPractice, storedGame, type StoredPractice } from "./send.ts";
import { browserNumber } from "../analytics.svelte.ts";
import type { PracticeOutcome } from "@abstractclass/practice/practice.ts";

/** A move played: its player, its text with its capture mark, and what the board draws of it. */
export interface PlayedMove { player: Player; text: string; move: BoardMove }

/** A move with what it did, from describe_game's positions before and after it. */
function playedOf(name: string, before: GamePosition, after: GamePosition): PlayedMove {
  const step = stepOf(name, before, after);
  return { player: step.player, text: moveText(name, Object.keys(step.captured).length ? { points: step.points } : null),
           move: boardMove(step, before.blueprints, "after") };
}

/** A game of Blueprints against Stamp Duty: the practice's flow (@abstractclass/practice/game.svelte.ts) with the
 *  engine's positions and moves, each of the bot's moves checked against the rules' legal moves. The player's legal
 *  moves (`rules`) are on the latest position where the player moved last: they stay through the bot's turn, so that
 *  the board's view, which fits their anchor hexes, does not change at each turn. */
export class PracticeGame extends BaseGame<KeptPractice, SitePosition, PlayedMove, InputRules> {
  // The game's result once the rules have ended it: `b+N`, `r+N` or `0`, from the scores with the komi by the one rule
  // for a draw (stampduty.ts, endResult). Not the rules' own result, which leaves the komi out.
  result = $state<string | null>(null);
  savedId = $state<string | null>(null); // the game's id in the player's games (game/store.ts), once it is there
  private described = $state.raw<GamePosition[]>([]); // the engine's positions, each with what the move to it did
  // The set-up start in the engine's one-line form, or null: the standard start. prepare() sets it once the check has
  // read the start, so that a start that the engine cannot read stops the game, not the page.
  private setUp: string | null = null;

  /** The player to move on the latest position. */
  get mover(): Player | null { const p = this.described.at(-1); return p ? playerOf(p.mover) : null; }
  /** The moves left in the mover's turn, this one included. */
  get movesLeft(): number { return this.described.at(-1)?.movesLeft ?? 0; }
  protected get over(): boolean { return !!this.described.at(-1)?.outcome; }
  protected keep(k: KeptPractice | null) { keptGame.keep(k); }

  /** A position from the rules, its scores with the game's komi as a starting score (Hedge School's design 24). */
  private positionOf(fields: Parameters<typeof sitePosition>[0]): SitePosition {
    return withKomi(sitePosition(fields), this.kept.komi ?? 0);
  }

  /** Gives the bot the game's settings and its komi, sets its game to the game's start and the moves kept (a start
   *  brought, a game from an earlier visit), and notes a new build. A set-up start that no game reaches stops the game
   *  first, in the words of the card's notice (startProblem): the page checks a start brought, but not a game kept in
   *  this browser. The bot refuses such a start too, with the position check's first reason. */
  protected async prepare() {
    const unreached = this.kept.start ? await startProblem(rulesBy(this.rulesWorker), this.kept.start, "its start") : null;
    if (unreached) throw new Error(unreached);
    this.setUp = this.kept.start ? enginePosition(this.kept.start) : null;
    this.noteStored();
    await this.setUpBot(botCommands(this.kept.bot, this.kept.komi));
    const described = (await this.rulesWorker.describeGame<GamePosition>(positionQuery(this.setUp, this.kept.moves))).reply.positions;
    if (this.setUp) {
      await this.bot.command(`blueprints-set-position ${this.setUp}`);
      for (let i = 0; i < this.kept.moves.length; i++)
        await this.bot.command(`play ${gtpColor(playerOf(described[i].mover))} ${this.kept.moves[i]}`);
    } else if (this.kept.moves.length) await this.bot.command(`blueprints-set-game ${this.kept.moves.join(" ")}`);
    this.described = described;
    this.positions = described.map(f => this.positionOf(f));
    this.played = this.kept.moves.map((m, i) => playedOf(m, described[i], described[i + 1]));
  }

  /** A takeback: the engine's positions, and for the stored game its record and the times of the moves taken back. */
  protected undid(undone: string[]) {
    this.described = this.described.slice(0, -undone.length);
    this.noteTakeback(undone);
  }

  /** The record's result: the bot's win when the player resigned, the scores' once the rules have ended the game,
   *  else `*`. */
  private recordResult(): string {
    const end = this.described.at(-1);
    return this.resigned ? resignResult(this.human) : end?.outcome ? endResult(end, this.kept.komi ?? 0) : "*";
  }

  /** The game's record, with the result. `kept` gives the settings and the name: the stored game's has no name. */
  record(kept: KeptPractice = this.kept): string {
    return practiceRecord(kept, this.played.map(m => m.text), this.played.map(m => m.player), this.recordResult(),
                          this.resigned ? "resignation" : this.described.at(-1)?.outcome ? "normal" : undefined);
  }

  /** The game as the site stores it (Hedge School's design 25), with the player's outcome and the browser's number
   *  (null without the visitor's consent). Null for a game with no move played against the bot. */
  stored(outcome: PracticeOutcome, browser: string | null): StoredPractice | null {
    return storedGame(this.kept, this.record({ ...this.kept, name: "" }), this.recordResult(), outcome, browser);
  }

  /** Keeps the game in the player's games: at its end, or unfinished when the player aborts it. Answers its id. */
  private async save(): Promise<string> {
    const text = this.record();
    return (this.savedId = (await saveGame(text, parseRecord(text))).id);
  }

  /** The game is over: by the rules, with its result by the scores, or by Resign, with none. It goes into the
   *  player's games. */
  protected async finished() {
    const end = this.described.at(-1);
    if (end?.outcome) this.result = endResult(end, this.kept.komi ?? 0);
    await this.save();
  }

  /** An aborted game goes into the player's games as unfinished (`*`) when it has moves, so that it can still be
   *  reviewed. */
  protected async aborted() { return this.played.length ? this.save() : null; }

  /** A move played, by either side, with its time: its position from the rules, kept with the game. */
  protected async add(name: string, ms: number | null) {
    const from = this.kept.moves.length;
    this.kept.moves.push(name);
    this.noteTime(ms);
    keptGame.keep(this.kept);
    const [before, after] = (await this.rulesWorker.describeGame<GamePosition>(positionQuery(this.setUp, this.kept.moves), from)).reply.positions;
    this.described = [...this.described, after];
    this.played = [...this.played, playedOf(name, before, after)];
    this.positions = [...this.positions, this.positionOf(after)];
  }

  /** The player's legal moves on the latest position. */
  private async describe(): Promise<DescribeReply> {
    return (await this.rulesWorker.describe<DescribeReply>(positionQuery(this.setUp, this.kept.moves))).reply;
  }

  /** The bot's move, which must be one of the rules' legal moves. */
  protected async botMove(player: Player): Promise<string> {
    const [legal, move] = await Promise.all([this.describe().then(d => d.legal), super.botMove(player)]);
    if (!legal.includes(move)) throw new Error(`${ENGINE_NAME} played ${move}, which is not a legal move here`);
    return move;
  }

  protected async humanRules(): Promise<InputRules> {
    const reply = await this.describe();
    return { position: this.positionOf(reply), mover: playerOf(reply.mover), legal: reply.legal };
  }
}

/** Keeps a game in the player's games from its moves alone, unfinished: a start brought to the page replaces it before
 *  its bot has started (Hedge School's saveUnfinished). Nothing for a game with no moves. The game set aside goes to
 *  the site as set aside (Hedge School's design 25). A kept start that the engine cannot read keeps nothing: the game
 *  is dropped, as it was before the player's games. */
export async function saveUnfinished(kept: KeptPractice, rulesWorker: EngineWorker): Promise<string | null> {
  if (!kept.moves.length) return null;
  let played: PlayedMove[];
  try {
    const setUp = kept.start ? enginePosition(kept.start) : null;
    const described = (await rulesWorker.describeGame<GamePosition>(positionQuery(setUp, kept.moves))).reply.positions;
    played = kept.moves.map((m, i) => playedOf(m, described[i], described[i + 1]));
  } catch {
    return null;
  }
  const texts = played.map(m => m.text), movers = played.map(m => m.player);
  sendPractice(storedGame(kept, practiceRecord({ ...kept, name: "" }, texts, movers, "*"), "*", "set_aside", browserNumber()));
  const text = practiceRecord(kept, texts, movers, "*");
  return (await saveGame(text, parseRecord(text))).id;
}
