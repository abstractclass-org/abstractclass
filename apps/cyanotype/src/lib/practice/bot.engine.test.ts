import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import type { PracticeLibrary } from "@abstractclass/engine/library.ts";

// The practice bot at 1 and 2 visits on a position of more views, where the bot before the engine's fix (abscls-csmy,
// build engine-217be61f) answered "genmove returned null location or illegal move": its passes of one visit found no
// candidate. Since protocol 0.7.1 (engine-70dfdc0f) the search gives its first pass's policy move, so the page offers 1
// to 8,192 visits. The bot runs on the CPU in Node, as the page runs it, from the site's static/engine: CI has no
// engine files, so this is skipped there.
//
// The position: a game against the bot (engine-70dfdc0f, 32 visits), in which Blue placed each move the legal
// placement farthest to the left, until Blue's legal placements needed two views. Blue moves next.
const SPREAD = ("1@-13,-1 1:0,0>2:-2,1 2@1,-3 1@-16,-1 1@-19,-1 1:0,1>2:2,-1 2@-1,-4 1@-22,-1 1@-25,-1 2@-5,-4 2@-7,0 " +
  "1@-28,-1 1@-31,-1 2@-3,0 2@-8,-5 1@-34,-1 1@-37,-1 2@-12,-5 2@-12,2 1@-40,-1 1@-43,-1 2@-15,1 2@-19,2 1@-46,-1 " +
  "1@-49,-1 1@-13,-2 2@-23,2 1@-52,-1 1@-55,-1 2@-27,2 2@-30,1 1@-58,-1 1@-61,-1 1:-2,2>2:0,2 2@-35,2 1@-64,-1").split(" ");

const app = join(import.meta.dirname, "..", "..", "..");
const manifest = hasEngine(app) ? JSON.parse(readFileSync(join(app, "static", "engine", "manifest.json"), "utf8")) : null;
const file = (kind: string) => manifest?.artifacts.find((a: { kind: string }) => a.kind === kind) as { url: string } | undefined;

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
