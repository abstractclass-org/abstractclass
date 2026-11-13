// A practice game (docs/design/24-practice.md): the player against the practice bot. The positions and the player's legal
// edges come from the analysis module's rules worker, as on the Analysis board: the board draws what the site's rules
// say. Each move goes to the bot too, so that the two play the same game. The game's moves and settings are kept in
// this browser after each move (hedgefund.ts, keptGame), so that a reload, or a new build, continues it from its moves.
// The turns, the takeback, Resign and Abort are the practice's (@abstractclass/practice/game.svelte.ts).
import { boardPosition, rulesOf, type DescribeReply, type GamePosition } from "#lib/engine/position.ts";
import type { EngineWorker } from "@abstractclass/engine/client.ts";
import { parseEdge } from "#lib/engine/notation.ts";
import { positionQuery } from "@abstractclass/engine/protocol.ts";
import type { EdgeRules } from "#lib/board/edgeInput.svelte.ts";
import { parseRecord } from "#lib/game/record.ts";
import { saveGame } from "#lib/game/store.ts";
import type { Move, Player, Position } from "#lib/review/enclosure.ts";
import { withKomi } from "@abstractclass/analysis/game.ts";
import { botCommands, gtpColor, keptGame, practiceRecord, resignResult, scoreResult, type KeptPractice, type PracticeOutcome } from "./hedgefund.ts";
import { sendPractice, storedGame, type StoredPractice } from "./send.ts";
import { browserNumber } from "#lib/analytics.svelte.ts";
import { PracticeGame as BaseGame } from "@abstractclass/practice/game.svelte.ts";

const moveOf = (before: Position, name: string, after: GamePosition): Move =>
  ({ player: before.player as Player, edge: name === "pass" ? null : parseEdge(name), cut: after.cuts === null ? null : parseEdge(after.cuts) });

/** A game of Enclosure against HedgeFund: the practice's flow (@abstractclass/practice/game.svelte.ts) with
 *  Enclosure's positions and edges, each move's time and each takeback kept for the stored game, and the game's end in
 *  Your games. */
export class PracticeGame extends BaseGame<KeptPractice, Position, Move, EdgeRules> {
  savedId = $state<string | null>(null); // the game's id in Your games (game/store.ts), once it is there

  get mover(): Player | null { return (this.position?.player as Player | undefined) ?? null; }
  protected get over(): boolean { return !this.position || !!this.position.over; }
  protected keep(k: KeptPractice | null) { keptGame.keep(k); }

  /** A position from the rules, its scores with the game's komi as a starting score (design 24). */
  private positionOf(fields: GamePosition): Position {
    return withKomi(boardPosition(fields), this.kept.komi ?? 0);
  }

  /** Gives the bot the game's settings, its komi and its start (a set-up start, interface 0.1.1), plays the game's
   *  moves into it (a game kept from an earlier visit, or a record brought), and notes a new build. */
  protected async prepare() {
    await this.setUpBot(botCommands(this.kept.bot, this.kept.komi));
    if (this.kept.start) await this.bot.command(`enclosure-set-position ${this.kept.start}`);
    const described = (await this.rulesWorker.describeGame<GamePosition>(positionQuery(this.kept.start ?? null, this.kept.moves))).reply.positions;
    const positions = described.map(f => this.positionOf(f));
    for (let i = 0; i < this.kept.moves.length; i++) await this.bot.command(`play ${gtpColor(positions[i].player as Player)} ${this.kept.moves[i]}`);
    this.positions = positions;
    this.played = this.kept.moves.map((m, i) => moveOf(positions[i], m, described[i + 1]));
  }

  /** The game's result: the bot's win when the player resigned, the scores' once the rules have ended it, else `*`. */
  result(): string {
    return this.resigned ? resignResult(this.human) : this.position?.over ? scoreResult(this.position.scores) : "*";
  }

  /** The game's record, with the result. `kept` gives the settings and the name: the stored game's has no name. */
  record(kept: KeptPractice = this.kept): string {
    const movers = this.played.map(m => m.player), cuts = this.played.map(m => !!m.cut);
    return practiceRecord(kept, movers, cuts, this.result(), this.resigned ? "resignation" : this.position?.over ? "normal" : undefined);
  }

  /** The game as the site stores it (design 25), with the player's outcome and the browser's number (null without the
   *  visitor's consent). Null for a game with no move played against the bot. */
  stored(outcome: PracticeOutcome, browser: string | null): StoredPractice | null {
    return storedGame(this.kept, this.record({ ...this.kept, name: "" }), this.result(), outcome, browser);
  }

  /** Keeps the game in Your games: at its end, or unfinished when the player aborts it. Answers its id. */
  private async save(): Promise<string> {
    const text = this.record();
    return (this.savedId = (await saveGame(text, parseRecord(text))).id);
  }

  /** The game is over: it goes into Your games. */
  protected async finished() { await this.save(); }

  /** An aborted game goes into Your games as unfinished (`*`) when it has moves, so that it can still be reviewed. */
  protected async aborted() { return this.played.length ? this.save() : null; }

  /** A move played, by either side: its position from the rules, kept with the game. */
  protected async add(name: string) {
    const from = this.kept.moves.length;
    this.kept.moves.push(name);
    keptGame.keep(this.kept);
    const [, after] = (await this.rulesWorker.describeGame<GamePosition>(positionQuery(this.kept.start ?? null, this.kept.moves), from)).reply.positions;
    this.played = [...this.played, moveOf(this.positions[from], name, after)];
    this.positions = [...this.positions, this.positionOf(after)];
  }

  protected async humanRules(): Promise<EdgeRules> {
    const { reply } = await this.rulesWorker.describe<DescribeReply>(positionQuery(this.kept.start ?? null, this.kept.moves));
    return rulesOf(reply);
  }
}

/** Keeps a game in Your games from its moves alone, unfinished: a record brought to the page replaces it before its bot
 *  has started. Nothing for a game with no moves. The game set aside goes to the site as set aside (design 25). */
export async function saveUnfinished(kept: KeptPractice, rulesWorker: EngineWorker): Promise<string | null> {
  if (!kept.moves.length) return null;
  const described = (await rulesWorker.describeGame<GamePosition>(positionQuery(kept.start ?? null, kept.moves))).reply.positions;
  const movers: Player[] = kept.moves.map((_, i) => (described[i].mover === "b" ? 0 : 1)), cuts = described.slice(1).map(p => p.cuts !== null);
  const text = practiceRecord(kept, movers, cuts, "*");
  sendPractice(storedGame(kept, practiceRecord({ ...kept, name: "" }, movers, cuts, "*"), "*", "set_aside", browserNumber()));
  return (await saveGame(text, parseRecord(text))).id;
}
