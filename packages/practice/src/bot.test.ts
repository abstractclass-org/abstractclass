// Checks why a command of the practice bot failed (bot.ts, botFault), and why a game stopped (game.svelte.ts, stop),
// on a fake bot's worker: the bot refuses a command, its worker throws as it runs one, or its worker fails as a whole.
// An error of anything else, such as the rules engine, has no fault of the bot: the game stops on the page's fault.
// The error stays the code's, for the error report. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { Player } from "@abstractclass/analysis/game.ts";
import { PracticeBot, botFault, refusal } from "./bot.ts";
import type { BotRequest } from "./botMessages.ts";
import type { KeptPractice } from "./practice.ts";

const { PracticeGame } = await import("./game.svelte.ts");

/** A bot's worker that answers each command with `answer(line)`: a GTP answer, an error reply ({ error }), or the
 *  worker's failure as a whole ({ crash }). */
function fakeWorker(answer: (line: string) => string | { error: string } | { crash: string }) {
  const worker = {
    onmessage: null as ((e: MessageEvent) => void) | null,
    onerror: null as ((e: ErrorEvent) => void) | null,
    postMessage(m: BotRequest & { id: number }) {
      if (m.type !== "command") return;
      const a = answer(m.line);
      queueMicrotask(() => {
        if (typeof a === "string") worker.onmessage!({ data: { type: "reply", id: m.id, reply: a, ms: 0, memory: 0 } } as MessageEvent);
        else if ("error" in a) worker.onmessage!({ data: { type: "error", id: m.id, message: a.error } } as MessageEvent);
        else worker.onerror!({ message: a.crash, preventDefault() {} } as ErrorEvent);
      });
    },
    terminate() {},
  };
  return worker as unknown as Worker;
}

const botOf = (answer: Parameters<typeof fakeWorker>[0]) => new PracticeBot("words", "single", fakeWorker(answer));

/** The rejection of a promise. */
const rejection = (p: Promise<unknown>) => p.then(() => assert.fail("it resolved"), (e: unknown) => e);

test("each command that fails has its fault, and its error keeps the code's message", async () => {
  const cases = [
    { answer: "? illegal move", fault: "refused", message: "illegal move" },
    { answer: "north", fault: "refused", message: "not a GTP response: north" },
    { answer: { error: "RuntimeError: unreachable" }, fault: "threw", message: "RuntimeError: unreachable" },
    { answer: { crash: "out of memory" }, fault: "crashed", message: "the engine worker failed: out of memory" },
  ] as const;
  for (const { answer, fault, message } of cases) {
    const e = await rejection(botOf(() => answer).command("genmove b"));
    assert.equal((e as Error).message, message);
    assert.equal(botFault(e), fault, message);
  }
  assert.equal(await botOf(() => "= north").command("genmove b"), "north");
});

test("an error that no command of the bot threw has no fault: a worker ended on purpose, or another error", async () => {
  const bot = botOf(() => "= north");
  bot.terminate();
  assert.equal(botFault(await rejection(bot.command("genmove b"))), null);
  assert.equal(botFault(new Error("the rules failed")), null);
  assert.equal(botFault("a string"), null);
});

test("a site's own check stands for the bot's refusal, with its own message", () => {
  const e = refusal("no game can reach its start.");
  assert.deepEqual([e.message, botFault(e)], ["no game can reach its start.", "refused"]);
});

/** A game of one move a turn, Blue first, whose bot is `bot` and whose rules of the player's move throw with
 *  `rulesError` when it is set. */
class OneGame extends PracticeGame<KeptPractice, { player: Player }, { player: Player }, string> {
  rulesError: Error | null = null;
  get mover(): Player | null { return this.position?.player ?? null; }
  protected get over() { return false; }
  protected keep() {}
  protected async prepare() { await this.fromRules(); }
  protected async fromRules() { this.positions = [{ player: 0 }]; }
  protected async add() {
    this.positions = [...this.positions, { player: (1 - this.position!.player) as Player }];
  }
  protected async humanRules() {
    if (this.rulesError) throw this.rulesError;
    return "rules";
  }
}

const kept = (human: Player): KeptPractice => ({
  version: 1, bot: { network: "test", visits: 1, variety: "low" }, human, name: "", seed: 1, moves: [], builds: [],
  started: "2026-11-17T00:00:00.000Z",
});

test("a game stops with why: the bot's fault, the page's fault, or a bot that did not start", async () => {
  const cases = [
    { answer: "? illegal move", stop: "refused" },
    { answer: { error: "RuntimeError: unreachable" }, stop: "threw" },
    { answer: { crash: "" }, stop: "crashed" },
  ] as const;
  for (const { answer, stop } of cases) {
    const game = new OneGame(kept(1), null!, botOf(() => answer)), reported: unknown[] = [];
    game.onFail = e => reported.push(e);
    await game.start();
    assert.deepEqual([game.status, game.stop], ["failed", stop]);
    assert.equal(reported.length, 1);
    assert.equal(game.error, (reported[0] as Error).message); // the code's message, for the report
  }
  // The rules of the player's move throw: the page's fault, after a bot's move that worked.
  const game = new OneGame(kept(1), null!, botOf(() => "= D4"));
  game.rulesError = new Error("the rules engine failed");
  await game.start();
  assert.deepEqual([game.status, game.stop, game.error], ["failed", "page", "the rules engine failed"]);
  // A bot that started in no form: its start's error, whatever it was.
  const unstarted = new OneGame(kept(1), null!, PracticeBot.failed("words", new Error("the engine worker failed: x")));
  await unstarted.start();
  assert.deepEqual([unstarted.status, unstarted.stop], ["failed", "unstarted"]);
});
