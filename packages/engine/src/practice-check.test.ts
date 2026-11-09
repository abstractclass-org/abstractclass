// Checks how the engine step reads a practice module's kata-get-params (practice-check.ts): minPlayoutsPerThread 8
// passes, and another value, a reply without it or a refusal stops the step. A module's komi cap must be the site's
// MAX_RECORD_KOMI. The threaded bot on the CPU evaluator must play the one-thread bot's moves. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBotsAgree, checkKomiCap, checkMinPlayoutsPerThread, checkPracticeModules, checkThreadedBot, noEvaluator,
  THREADS, type BotPair, type Described } from "./practice-check.ts";

// Replies of kata-get-params as the practice modules give them (release engine-d6786eba: `= {"...":...}`).
const reply = (minPlayoutsPerThread: unknown) =>
  `= ${JSON.stringify({ maxVisits: 256, minPlayoutsPerThread, numSearchThreads: 1 })}`;

test("a practice module with minPlayoutsPerThread 8 passes", () => {
  assert.doesNotThrow(() => checkMinPlayoutsPerThread(reply(8)));
});

test("another minPlayoutsPerThread stops the check, with design 24, item 14 and the value", () => {
  assert.throws(() => checkMinPlayoutsPerThread(reply(4)),
    (e: Error) => /minPlayoutsPerThread 4\b/.test(e.message) && /design 24, item 14/.test(e.message));
});

test("a reply without the setting, or a refusal, stops the check", () => {
  assert.throws(() => checkMinPlayoutsPerThread(`= ${JSON.stringify({ maxVisits: 256 })}`),
    /minPlayoutsPerThread undefined/);
  assert.throws(() => checkMinPlayoutsPerThread("? no session: send enclosure-start SEED first"),
    /kata-get-params gave \? no session/);
});

test("the check's evaluator gives the manifest's sizes, and refuses any other use", () => {
  const sizes = { board: 67, policyChannels: 6 };
  assert.deepEqual((noEvaluator(sizes) as { sizes?: unknown }).sizes, sizes);
  assert.equal((noEvaluator() as { sizes?: unknown }).sizes, undefined); // Enclosure's: the library's default
  assert.throws(() => (noEvaluator(sizes) as { evaluate?: unknown }).evaluate, /evaluates no position.*evaluate/);
});

// GTP's komi as KataGo's gtp.cpp answers it: `=` within the cap, `? unacceptable komi` past it.
const gtpKomi = (cap: number) => async (value: number) => (Math.abs(value) <= cap ? "= " : "? unacceptable komi");

test("a module whose komi cap is the site's MAX_RECORD_KOMI passes", async () => {
  await assert.doesNotReject(checkKomiCap(5052, gtpKomi(5052)));
  await assert.doesNotReject(checkKomiCap(90_980, gtpKomi(90_980)));
});

test("a module whose komi cap moved stops the check, with the komi and what to change", async () => {
  // A smaller cap: the module refuses the site's limit
  await assert.rejects(checkKomiCap(5052, gtpKomi(5000)),
    (e: Error) => /refuses komi 5052\b.*MAX_RECORD_KOMI 5052 .*unacceptable komi/.test(e.message) &&
      /Rules::MAX_USER_KOMI/.test(e.message));
  // A larger cap: the module takes half a point past it
  await assert.rejects(checkKomiCap(5052, gtpKomi(6000)), /takes komi 5052\.5, past the site's MAX_RECORD_KOMI 5052/);
  // A module that takes any komi, as GTP's standard says: the check cannot pass
  await assert.rejects(checkKomiCap(5052, async () => "="), /takes komi 5052\.5/);
  // Another refusal past the limit says nothing about the cap
  const unknown = async (value: number) => (Math.abs(value) <= 5052 ? "= " : "? unknown command");
  await assert.rejects(checkKomiCap(5052, unknown), /gives \? unknown command for komi 5052\.5, not KataGo's refusal/);
});

test("the check asks each komi in turn: the limit either way, then half a point past it", async () => {
  const asked: number[] = [];
  await checkKomiCap(5052, async v => { asked.push(v); return gtpKomi(5052)(v); });
  assert.deepEqual(asked, [5052, -5052, 5052.5, -5052.5]);
});

// The check of Practice's CPU form (checkBotsAgree), with fake bots and fake rules: a game of moves `m0`, `m1`, ...,
// in which the legal moves of a position are its next two, and the game ends after `end` moves.
const fakeRules = (end = 20) => (start: string | null, moves: string[]): Described => {
  const played = (start ? Number(start.slice(1)) : 0) + moves.length;
  return { mover: played % 2 ? "w" : "b", legal: [`m${played}`, `m${played + 1}`], outcome: played >= end ? {} : null,
           position: `@${played}` };
};
/** Two fake bots that log their commands (`lines`): each plays `m<played>`, the threaded one `wrong` at its move
 *  `at` from the start of the `pair`-th pair (counted from 0). */
function fakePairs({ pair = -1, at = -1, wrong = "m999" } = {}) {
  const lines: string[][] = [];
  let made = 0;
  const makePair = async (): Promise<BotPair> => {
    const k = made++, log: string[] = [];
    lines.push(log);
    const bot = (name: string) => {
      let played = 0, genmoves = 0;
      return async (line: string) => {
        log.push(`${name}: ${line}`);
        if (line.includes("set-position")) played = Number(line.split(" ")[1].slice(1));
        if (!line.startsWith("genmove")) return "= ";
        const move = name === "threaded" && k === pair && genmoves === at ? wrong : `m${played}`;
        played += 1;
        genmoves += 1;
        return `= ${move}`;
      };
    };
    return { one: bot("one"), threaded: bot("threaded"), release: () => log.push("release") };
  };
  return { lines, makePair };
}

test("bots that play the same legal moves pass, from the standard start, then from the position after them",
     async () => {
  const { lines, makePair } = fakePairs();
  await checkBotsAgree("blueprints", makePair, fakeRules());
  assert.equal(lines.length, 2); // a new pair for each start: a session keeps its seed
  assert.deepEqual(lines[0].slice(0, 4), ["one: blueprints-start 1", `threaded: blueprints-start 1 ${THREADS}`,
                                         "one: kata-set-param maxVisits 1", "threaded: kata-set-param maxVisits 1"]);
  assert.deepEqual(lines[0].filter(l => l.startsWith("one: genmove")).length, 6);
  assert.deepEqual(lines[0].slice(4, 6), ["one: genmove b", "threaded: genmove b"]);
  for (const bot of ["one", "threaded"]) assert.ok(lines[1].includes(`${bot}: blueprints-set-position @6`));
  assert.ok(lines.every(log => log.at(-1) === "release"));
});

test("a threaded bot that plays another move stops the check, with the start, the move and both moves", async () => {
  await assert.rejects(checkBotsAgree("enclosure", fakePairs({ pair: 0, at: 2 }).makePair, fakeRules()),
    (e: Error) => /at move 3 from the standard start/.test(e.message)
                  && /threaded bot on the CPU evaluator played m999, and the one-thread bot m2/.test(e.message)
                  && /from one release, with that release's sizes/.test(e.message));
  const { lines, makePair } = fakePairs({ pair: 1, at: 0 });
  await assert.rejects(checkBotsAgree("enclosure", makePair, fakeRules()), /at move 1 from the set-up start @6/);
  assert.equal(lines[1].at(-1), "release"); // the evaluator's workers stop after a failure too
});

test("an illegal move, a refusal or a refused position stops the check", async () => {
  const noLegalMove = (s: string | null, m: string[]) => ({ ...fakeRules()(s, m), legal: [] });
  await assert.rejects(checkBotsAgree("enclosure", fakePairs().makePair, noLegalMove),
    /one-thread bot played m0, which the rules do not allow, at move 1 from the standard start/);
  const refusing = async (): Promise<BotPair> => ({ one: async () => "= ", threaded: async () => "? unacceptable",
                                                    release: () => {} });
  await assert.rejects(checkBotsAgree("enclosure", refusing, fakeRules()), /enclosure-start gave \? unacceptable/);
  await assert.rejects(checkBotsAgree("enclosure", fakePairs().makePair, () => ({ error: "no such move" })),
    /the rules refuse the position after 0 moves: no such move/);
});

test("a game that ends before the check's moves stops there, and its end is the set-up start", async () => {
  const { lines, makePair } = fakePairs();
  await checkBotsAgree("enclosure", makePair, fakeRules(3));
  assert.equal(lines[0].filter(l => l.startsWith("one: genmove")).length, 3);
  assert.ok(lines[1].includes("one: enclosure-set-position @3"));
  assert.equal(lines[1].filter(l => l.startsWith("one: genmove")).length, 0);
});

test("a site without a threaded bot logs that the step checked no CPU form", async t => {
  const log = t.mock.method(console, "log", () => {});
  await checkThreadedBot("no-such-folder", { artifacts: [] }, () => ({}));
  assert.match(String(log.mock.calls[0].arguments[0]), /no threaded practice bot.*no CPU form/);
});

test("a site with no practice modules logs that the step checked no komi cap", async t => {
  const log = t.mock.method(console, "log", () => {});
  const manifest = { artifacts: [{ id: "module", kind: "module" as const, interface: null, url: "/engine/m/m.wasm",
                                   sha256: "aa", bytes: 1, download: 1, released: true }] };
  // No practice module: the check reads no file, so the folder does not need to exist.
  await checkPracticeModules("no-such-folder", manifest, 5052);
  assert.equal(log.mock.callCount(), 1);
  assert.match(String(log.mock.calls[0].arguments[0]), /no practice modules.*no komi cap.*minPlayoutsPerThread/);
});
