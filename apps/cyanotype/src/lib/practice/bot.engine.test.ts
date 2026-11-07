import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { sizesOption, type PracticeLibrary } from "@abstractclass/engine/library.ts";

// The practice bot at 1 and 2 visits on a position of more views, where the bot before the engine's fix (abscls-csmy,
// build engine-217be61f) answered "genmove returned null location or illegal move": its passes of one visit found no
// candidate. Since protocol 0.7.1 (engine-70dfdc0f) the search gives its first pass's policy move, so the page offers 1
// to 8,192 visits. The bot runs on the CPU in Node, as the page runs it, from the site's static/engine: without its
// files, this is skipped. The threaded bot (abscls-8tl1.29) runs on its CPU evaluator, with the network's sizes of the
// manifest, as the site's worker sets it up (packages/practice/src/botFormsWorker.ts). Below 16 visits it searches with
// one thread, so from the same seed it plays the one-thread bot's moves (design 33, "Practice against Stamp Duty"). With
// Enclosure's sizes, the library's default, its evaluations are wrong, and it plays other moves or traps. It needs
// JSPI, which Node has with no flag from Node 25: without it, its test is skipped.
//
// The position: a game against the bot (engine-70dfdc0f, 32 visits), in which Blue placed each move the legal
// placement farthest to the left, until Blue's legal placements needed two views. Blue moves next.
const SPREAD = ("1@-13,-1 1:0,0>2:-2,1 2@1,-3 1@-16,-1 1@-19,-1 1:0,1>2:2,-1 2@-1,-4 1@-22,-1 1@-25,-1 2@-5,-4 2@-7,0 " +
  "1@-28,-1 1@-31,-1 2@-3,0 2@-8,-5 1@-34,-1 1@-37,-1 2@-12,-5 2@-12,2 1@-40,-1 1@-43,-1 2@-15,1 2@-19,2 1@-46,-1 " +
  "1@-49,-1 1@-13,-2 2@-23,2 1@-52,-1 1@-55,-1 2@-27,2 2@-30,1 1@-58,-1 1@-61,-1 1:-2,2>2:0,2 2@-35,2 1@-64,-1").split(" ");

const app = join(import.meta.dirname, "..", "..", "..");
const manifest = hasEngine(app) ? JSON.parse(readFileSync(join(app, "static", "engine", "manifest.json"), "utf8")) : null;
const file = (kind: string, name = "") =>
  manifest?.artifacts.find((a: { kind: string; url: string }) => a.kind === kind && (!name || a.url.endsWith(`/${name}`))) as
    { url: string } | undefined;
const staticFile = (kind: string, name?: string) => join(app, "static", file(kind, name)!.url);
const jspi = typeof (WebAssembly as unknown as { Suspending?: unknown }).Suspending === "function";

test("the bot gives a legal move at 1 and 2 visits on a position of more views",
     { skip: file("practice-module") ? false : "no practice bot in static/engine (npm run engine)" }, async () => {
  const { call } = await nodeEngine(app);
  const position = call({ id: "d", action: "describe", moves: SPREAD });
  assert.equal(position.mover, "b");
  assert.ok(position.views.length >= 2, `a cover of ${position.views.length} views`);
  const library = await import(pathToFileURL(join(app, "static", file("practice-library")!.url)).href) as PracticeLibrary;
  const bot = await library.createPracticeBot(await WebAssembly.compile(readFileSync(join(app, "static", file("practice-module")!.url))));
  bot.setModel(readFileSync(join(app, "static", file("model")!.url)));
  const command = (line: string) => {
    const reply = bot.command(line) as string;
    assert.match(reply, /^=/, `${line}: ${reply}`);
    return reply.slice(1).trim();
  };
  command("blueprints-start 1");
  command(`blueprints-set-game ${SPREAD.join(" ")}`);
  for (const visits of [1, 2]) {
    command(`kata-set-param maxVisits ${visits}`);
    const move = command("genmove b");
    assert.ok(position.legal.includes(move), `${visits} visits: ${move} is not a legal move`);
    command("undo");
  }
});

test("the threaded bot on its CPU evaluator, with the manifest's sizes, plays the one-thread bot's moves below 16 visits",
     { skip: !file("practice-threaded-module") ? "no threaded bot in static/engine (npm run engine)"
       : !jspi ? "no JSPI in this Node (Node 25 and later)" : false }, async () => {
  const { call } = await nodeEngine(app);
  const position = call({ id: "d", action: "describe", moves: SPREAD });
  const library = await import(pathToFileURL(staticFile("practice-library")).href) as PracticeLibrary;
  const pool = await import(pathToFileURL(staticFile("cpu-evaluator-library", "cpu_evaluator.mjs")).href);
  const model = readFileSync(staticFile("model"));
  assert.deepEqual(manifest.sizes, { board: 67, policyChannels: 6 });
  // The one-thread bot's moves at 1, 4 and 8 visits, each taken back, from the seed 1
  const one = await library.createPracticeBot(await WebAssembly.compile(readFileSync(staticFile("practice-module"))));
  one.setModel(model);
  const oneCommand = (line: string) => {
    const reply = one.command(line) as string;
    assert.match(reply, /^=/, `${line}: ${reply}`);
    return reply.slice(1).trim();
  };
  oneCommand("blueprints-start 1");
  oneCommand(`blueprints-set-game ${SPREAD.join(" ")}`);
  const BELOW = [1, 4, 8];
  const expected = BELOW.map(visits => {
    oneCommand(`kata-set-param maxVisits ${visits}`);
    const move = oneCommand("genmove b");
    oneCommand("undo");
    return move;
  });
  const evaluator = await pool.createCpuEvaluator(await WebAssembly.compile(readFileSync(staticFile("practice-evaluator"))), model, {
    workers: 1, maxRows: 2, makeWorker: () => new Worker(pathToFileURL(staticFile("cpu-evaluator-library", "cpu_eval_worker.mjs"))),
    ...sizesOption(manifest),
  });
  try {
    const bot = await library.createBatchedPracticeBot(await WebAssembly.compile(readFileSync(staticFile("practice-threaded-module"))),
                                                      evaluator, { maxBatch: 2 });
    await bot.setModel(model);
    const command = async (line: string) => {
      const reply = await bot.command(line);
      assert.match(reply, /^=/, `${line}: ${reply}`);
      return reply.slice(1).trim();
    };
    await command("blueprints-start 1 2");
    await command(`blueprints-set-game ${SPREAD.join(" ")}`);
    for (const visits of [...BELOW, 16]) {
      await command(`kata-set-param maxVisits ${visits}`);
      const move = await command("genmove b");
      assert.ok(position.legal.includes(move), `${visits} visits: ${move} is not a legal move`);
      if (visits < 16) assert.equal(move, expected[BELOW.indexOf(visits)], `${visits} visits: the one-thread bot's move`);
      await command("undo");
    }
  } finally {
    evaluator.release();
  }
});
