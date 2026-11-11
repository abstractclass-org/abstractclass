// Checks a practice game's flow (game.svelte.ts, PracticeGame) on a test game unlike Enclosure (design 29, item 6): its
// moves are words, each player plays one a turn, Blue first, and the game ends after six moves. The bot is a fake that
// answers `genmove` with the test's words. Each site's Practice checks its own game in the browser. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { Player } from "@abstractclass/analysis/game.ts";
import type { PracticeBot } from "./bot.ts";
import type { KeptPractice } from "./practice.ts";

const { PracticeGame } = await import("./game.svelte.ts");

const LENGTH = 6; // the moves of a whole game
interface WordPosition { player: Player; over: boolean; scores: [number, number] }
interface WordMove { player: Player; word: string }

/** The position after `n` moves: each move is a point for its player. */
const positionAt = (n: number): WordPosition =>
  ({ player: (n % 2) as Player, over: n >= LENGTH, scores: [Math.ceil(n / 2), Math.floor(n / 2)] });

/** The test game: its positions from the move count, and each move's player by its place. */
class WordGame extends PracticeGame<KeptPractice, WordPosition, WordMove, string> {
  kepts: (KeptPractice | null)[] = []; // each keep, as the site's storage would hold it
  ended = 0; // the calls of `ended`, the site's part of a game's end
  setAside = "set-aside-id"; // what `aborted` answers
  get mover(): Player | null { return this.position?.player ?? null; }
  protected get over(): boolean { return !!this.position?.over; }
  protected keep(k: KeptPractice | null) { this.kepts.push(k && structuredClone(k)); }
  protected async prepare() {
    this.positions = Array.from({ length: this.kept.moves.length + 1 }, (_, n) => positionAt(n));
    this.played = this.kept.moves.map((word, n) => ({ player: positionAt(n).player, word }));
  }
  protected async add(word: string) {
    const n = this.kept.moves.push(word);
    this.played = [...this.played, { player: positionAt(n - 1).player, word }];
    this.positions = [...this.positions, positionAt(n)];
  }
  protected undid() {}
  protected async humanRules() { return `${this.kept.moves.length} moves`; }
  protected async finished() { this.ended++; }
  protected async aborted() { return this.setAside; }
}

/** A bot that answers `genmove` with `words`, in order, and each other command with nothing. With `hold`, a `genmove`
 *  waits until the test calls `release`. With `late`, a `genmove` answers after the bot's worker has ended too: its
 *  reply was on its way. */
function fakeBot(words: string[], hold = false, late = false) {
  const lines: string[] = [];
  let release = () => {}, terminated = false;
  const bot = {
    mode: "single", lines, release: () => release(),
    get terminated() { return terminated; },
    async command(line: string) {
      lines.push(line);
      if (!line.startsWith("genmove")) return "";
      if (hold) await new Promise<void>(r => (release = r));
      if (terminated && !late) throw new Error("the bot's worker has ended");
      const word = words.shift();
      if (!word) throw new Error("the bot has no move");
      return word;
    },
    terminate() { terminated = true; },
  };
  return bot;
}

const kept = (human: Player, more: Partial<KeptPractice> = {}): KeptPractice => ({
  version: 1, bot: { network: "test", visits: 1, variety: "low" }, human, name: "", seed: 1, moves: [], builds: [],
  started: "2026-11-11T00:00:00.000Z", ...more,
});
const gameOf = (k: KeptPractice, bot: ReturnType<typeof fakeBot>) => new WordGame(k, null!, bot as unknown as PracticeBot);

test("a whole game: the bot plays its turns, the player plays theirs, and the rules end the game", async () => {
  const bot = fakeBot(["b1", "b2", "b3"]), game = gameOf(kept(1), bot);
  await game.start();
  assert.equal(game.status, "human");
  assert.equal(game.rules, "1 moves"); // the player's rules, after the bot's first move
  for (const word of ["r1", "r2", "r3"]) await game.play(word);
  assert.equal(game.status, "over");
  assert.deepEqual(game.played.map(m => m.word), ["b1", "r1", "b2", "r2", "b3", "r3"]);
  assert.deepEqual(bot.lines.filter(l => l.startsWith("play")), ["play w r1", "play w r2", "play w r3"]);
  assert.equal(game.kept.botTurns, 3);
  assert.equal(game.rules, null);
  assert.equal(game.thinkingSince, null);
  assert.equal(typeof game.lastTurnMs, "number");
  assert.equal(game.ended, 1);
  assert.equal(game.kepts.at(-1), null); // no longer the game in progress
  assert.equal(bot.terminated, true);
});

test("a takeback undoes the player's last turn and the bot's turn after it, and stops at the moves brought", async () => {
  const bot = fakeBot(["b2", "b3"]), game = gameOf(kept(1, { moves: ["b1", "r1"], brought: 2 }), bot);
  await game.start();
  assert.equal(game.canTakeBack, false); // the moves brought are the game's start
  await game.play("r2");
  assert.deepEqual(game.played.map(m => m.word), ["b1", "r1", "b2", "r2", "b3"]);
  assert.equal(game.canTakeBack, true);
  await game.takeback();
  assert.deepEqual(bot.lines.filter(l => l === "undo"), ["undo", "undo"]);
  assert.deepEqual(game.kept.moves, ["b1", "r1", "b2"]);
  assert.deepEqual(game.played.map(m => m.word), ["b1", "r1", "b2"]);
  assert.equal(game.positions.length, 4);
  assert.equal(game.kept.takebacks, 1);
  assert.equal(game.status, "human");
  assert.deepEqual(game.kepts.at(-1)?.moves, ["b1", "r1", "b2"]);
  assert.equal(game.canTakeBack, false);
});

test("Resign while the bot searches: the bot wins, its worker ends, and its search does not stop the game", async () => {
  const bot = fakeBot(["b1"], true), game = gameOf(kept(1), bot);
  const starting = game.start();
  await new Promise(r => setTimeout(r));
  assert.equal(game.status, "bot");
  assert.notEqual(game.thinkingSince, null);
  await game.resign();
  bot.release();
  await starting;
  assert.equal(game.status, "over");
  assert.equal(game.resigned, true);
  assert.equal(game.error, "");
  assert.equal(game.ended, 1);
  assert.equal(game.kepts.at(-1), null);
});

test("a move that the bot gives after Resign is not kept: the game has ended", async () => {
  const bot = fakeBot(["b1"], true, true), game = gameOf(kept(1), bot);
  const starting = game.start();
  await new Promise(r => setTimeout(r));
  await game.resign();
  bot.release();
  await starting;
  assert.deepEqual([game.status, game.error], ["over", ""]);
  assert.deepEqual(game.kept.moves, []);
  assert.deepEqual(game.played, []);
  assert.equal(game.kepts.at(-1), null);
});

test("the rules of the player's move stay through the bot's turn, until the player's next turn", async () => {
  const bot = fakeBot(["r1"], true), game = gameOf(kept(0), bot);
  await game.start();
  assert.deepEqual([game.status, game.rules], ["human", "0 moves"]);
  const playing = game.play("b1");
  await new Promise(r => setTimeout(r));
  assert.deepEqual([game.status, game.rules], ["bot", "0 moves"]); // a site's page gives its input no rules now
  bot.release();
  await playing;
  assert.deepEqual([game.status, game.rules], ["human", "2 moves"]);
});

test("Abort ends the game at any time, and answers the site's id of the game", async () => {
  const bot = fakeBot(["b1"]), game = gameOf(kept(1), bot);
  await game.start();
  assert.equal(await game.abort(), "set-aside-id");
  assert.equal(bot.terminated, true);
  assert.equal(game.ended, 0); // an aborted game has no end
  assert.equal(game.kepts.at(-1), null);
});

test("a bot that refuses stops the game with its message", async () => {
  const game = gameOf(kept(1), fakeBot([]));
  await game.start();
  assert.equal(game.status, "failed");
  assert.equal(game.error, "the bot has no move");
  assert.equal(game.thinkingSince, null);
  await game.play("r1"); // nothing moves after it
  assert.deepEqual(game.played, []);
});
