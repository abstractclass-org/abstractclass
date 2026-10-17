// A practice game (docs/design/24-practice.md): the player against the practice bot. The positions and the player's legal
// edges come from the analysis module's rules worker, as on the Analysis board: the board draws what the site's rules
// say. Each move goes to the bot too, so that the two play the same game. The game's moves and settings are kept in
// this browser after each move (practice.ts, keep), so that a reload, or a new build, continues it from its moves.
import { boardPosition } from "#lib/engine/position.ts";
import type { EngineWorker } from "#lib/engine/client.ts";
import { parseEdge, parsePoint } from "#lib/engine/notation.ts";
import { positionQuery, type GamePosition } from "#lib/engine/protocol.ts";
import type { EdgeRules } from "#lib/board/edgeInput.svelte.ts";
import { errorText } from "#lib/errors.ts";
import { parseRecord } from "#lib/game/record.ts";
import { saveGame } from "#lib/game/store.ts";
import type { Move, Player, Position } from "#lib/review/model.ts";
import { botCommands, gtpColor, keep, practiceRecord, resignResult, scoreResult, takebackCount, type KeptPractice, type PracticeOutcome } from "./practice.ts";
import { sendPractice, storedGame, type StoredPractice } from "./send.ts";
import { browserNumber } from "#lib/analytics.svelte.ts";
import type { PracticeBot } from "./bot.ts";
import type { BotMode } from "./botMessages.ts";

/** Whose move it is, or the game's state when nobody moves. "playing": the player's edge, on its way to the bot and
 *  the rules. */
export type PracticeStatus = "starting" | "human" | "playing" | "bot" | "over" | "failed";

const moveOf = (before: Position, name: string, after: GamePosition): Move =>
  ({ player: before.player as Player, edge: name === "pass" ? null : parseEdge(name), cut: after.cuts === null ? null : parseEdge(after.cuts) });

export class PracticeGame {
  positions = $state.raw<Position[]>([]); // each position from the start
  played = $state.raw<Move[]>([]); // each move: its player, its edge, and the edge it cut
  status = $state<PracticeStatus>("starting");
  error = $state("");
  rules = $state.raw<EdgeRules | null>(null); // the player's legal edges and nodes, on the player's turn
  resigned = $state(false); // the player resigned: the bot won
  savedId = $state<string | null>(null); // the game's id in Your games (game/store.ts), once it is there
  thinkingSince = $state<number | null>(null); // when the bot's turn began (performance.now), while it searches
  lastTurnMs = $state<number | null>(null); // how long the bot's last turn took
  readonly kept: KeptPractice;
  private closed = false; // the bot is ended: no move is kept after it
  private humanSince: number | null = null; // when the player's move began (performance.now), on the player's turn

  constructor(kept: KeptPractice, private rulesWorker: EngineWorker, private bot: PracticeBot) {
    this.kept = { ...kept, moves: [...kept.moves], builds: [...kept.builds] };
  }

  get position(): Position | undefined { return this.positions.at(-1); }
  get human(): Player { return this.kept.human; }
  get mode(): BotMode { return this.bot.mode; }

  /** Gives the bot the game's settings and its start (a set-up start, interface 0.1.1), plays the game's moves into it
   *  (a game kept from an earlier visit, or a record brought), notes a new build, and takes the turn up. */
  async start() {
    try {
      const info = JSON.parse(await this.bot.command("enclosure-bot-info")) as { build: string };
      if (this.kept.builds.at(-1) !== info.build) this.kept.builds.push(info.build); // a new build continues the game
      // A game kept before the stored game's fields, or resumed: its own id, where the bot runs now, and a time for each
      // move (unknown for the moves before this visit's).
      this.kept.id ??= crypto.randomUUID();
      this.kept.form = this.mode;
      this.kept.ms = Array.from(this.kept.moves, (_, i) => this.kept.ms?.[i] ?? null);
      for (const line of botCommands(this.kept.bot)) await this.bot.command(line);
      if (this.kept.start) await this.bot.command(`enclosure-set-position ${this.kept.start}`);
      const described = (await this.rulesWorker.describeGame(positionQuery(this.kept.start ?? null, this.kept.moves))).reply.positions;
      const positions = described.map(boardPosition);
      for (let i = 0; i < this.kept.moves.length; i++) await this.bot.command(`play ${gtpColor(positions[i].player as Player)} ${this.kept.moves[i]}`);
      this.positions = positions;
      this.played = this.kept.moves.map((m, i) => moveOf(positions[i], m, described[i + 1]));
      keep(this.kept);
      await this.next();
    } catch (e) {
      this.fail(e);
    }
  }

  /** The player's edge, on the player's turn. */
  async play(name: string) {
    if (this.status !== "human") return;
    this.status = "playing"; // nothing else moves until the bot has the edge
    const ms = this.humanSince === null ? null : Math.round(performance.now() - this.humanSince);
    try {
      await this.bot.command(`play ${gtpColor(this.human)} ${name}`);
      await this.add(name, ms);
      await this.next();
    } catch (e) {
      this.fail(e);
    }
  }

  /** The players of the moves played against the bot: after the edges that came with a record, which are the game's
   *  start, so that a takeback stops there. */
  private get movers(): Player[] { return this.played.slice(this.kept.brought ?? 0).map(m => m.player); }

  /** Takes back the player's last turn, and the bot's turn after it (design 24), on the player's turn. */
  async takeback() {
    if (!this.canTakeBack) return;
    const n = takebackCount(this.movers, this.human);
    this.status = "playing"; // nothing else moves until the bot has undone the edges
    try {
      for (let k = 0; k < n; k++) await this.bot.command("undo");
      const undone = this.kept.moves.splice(-n);
      this.kept.ms?.splice(-n);
      this.kept.takebacks = (this.kept.takebacks ?? 0) + 1;
      this.kept.undone = [...(this.kept.undone ?? []), { at: this.kept.moves.length + n, undone: undone.reverse() }];
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
    return this.status === "human" && takebackCount(this.movers, this.human) > 0;
  }

  /** The player resigns (design 24), at any time: the bot wins, and the game goes into Your games. A search in progress
   *  ends with the bot's worker. */
  async resign() {
    if (this.status !== "human" && this.status !== "playing" && this.status !== "bot") return;
    this.resigned = true;
    await this.finish();
  }

  /** The game ends without a result, at any time (design 24): it goes into Your games as unfinished (`*`) when it has
   *  moves, so that it can still be reviewed. Answers its id. */
  async abort(): Promise<string | null> {
    this.end();
    const id = this.played.length ? await this.save() : null;
    keep(null);
    return id;
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

  /** Ends the bot's worker. */
  end() {
    this.closed = true;
    this.bot.terminate();
  }

  /** Keeps the game in Your games: at its end, or unfinished when the player aborts it. Answers its id. */
  private async save(): Promise<string> {
    const text = this.record();
    return (this.savedId = (await saveGame(text, parseRecord(text))).id);
  }

  /** The game is over: kept in Your games, and no longer the game in progress (the next visit starts a new one). */
  private async finish() {
    this.status = "over";
    this.rules = null;
    this.thinkingSince = null;
    this.end();
    await this.save();
    keep(null);
  }

  /** A move played, by either side, with its time: its position from the rules, kept with the game. */
  private async add(name: string, ms: number | null) {
    if (this.closed) throw new Error("the game has ended");
    const from = this.kept.moves.length;
    this.kept.moves.push(name);
    (this.kept.ms ??= []).push(ms);
    keep(this.kept);
    const [, after] = (await this.rulesWorker.describeGame(positionQuery(this.kept.start ?? null, this.kept.moves), from)).reply.positions;
    this.played = [...this.played, moveOf(this.positions[from], name, after)];
    this.positions = [...this.positions, boardPosition(after)];
  }

  /** Takes the turn up: the bot plays its turn, timed, then the game ends or the player gets the rules of their move. */
  private async next() {
    const first = this.position;
    if (first && !first.over && first.player !== this.human) {
      this.status = "bot";
      this.rules = null;
      const since = (this.thinkingSince = performance.now());
      for (let p = this.position; p && !p.over && p.player !== this.human; p = this.position) {
        const t0 = performance.now(), move = await this.bot.command(`genmove ${gtpColor(p.player as Player)}`);
        await this.add(move, Math.round(performance.now() - t0));
      }
      this.lastTurnMs = performance.now() - since;
      this.thinkingSince = null;
      this.kept.botTurns = (this.kept.botTurns ?? 0) + 1;
      this.kept.botMs = (this.kept.botMs ?? 0) + this.lastTurnMs;
      keep(this.kept);
    }
    if (!this.position || this.position.over) return this.finish();
    const { reply } = await this.rulesWorker.describe(positionQuery(this.kept.start ?? null, this.kept.moves));
    this.rules = { legal: reply.legal.filter(m => m.includes("-")).map(parseEdge), nodes: reply.nodes[reply.mover].map(parsePoint) };
    this.status = "human";
    this.humanSince = performance.now();
  }

  /** The game stops on an error. Not once it has ended: then the bot's worker ended on purpose, and its search with it. */
  private fail(e: unknown) {
    if (this.closed) return;
    this.status = "failed";
    this.thinkingSince = null;
    this.error = errorText(e);
  }
}

/** Keeps a game in Your games from its moves alone, unfinished: a record brought to the page replaces it before its bot
 *  has started. Nothing for a game with no moves. The game set aside goes to the site as set aside (design 25). */
export async function saveUnfinished(kept: KeptPractice, rulesWorker: EngineWorker): Promise<string | null> {
  if (!kept.moves.length) return null;
  const described = (await rulesWorker.describeGame(positionQuery(kept.start ?? null, kept.moves))).reply.positions;
  const movers: Player[] = kept.moves.map((_, i) => (described[i].mover === "b" ? 0 : 1)), cuts = described.slice(1).map(p => p.cuts !== null);
  const text = practiceRecord(kept, movers, cuts, "*");
  sendPractice(storedGame(kept, practiceRecord({ ...kept, name: "" }, movers, cuts, "*"), "*", "set_aside", browserNumber()));
  return (await saveGame(text, parseRecord(text))).id;
}
