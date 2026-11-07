import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { toAnalysis } from "@abstractclass/analysis/reply.ts";
import { blueprints, moveBefore } from "./blueprints.ts";
import { indexOfHex, placeOf } from "./blueprintsMap.ts";

// Request 24 (docs/requests/24-root-views-browser.md), checked here with Cyanotype's review. On a position of more
// views, the engine searches every view of the cover, so a candidate can lie outside the rule's view (the view of the
// ownership, which the reply names), and the site reads every candidate placement as a placement, in the view or not,
// as the review reads a reply (toAnalysis with Blueprints' game): none is dropped, and each keeps its anchor. An edit
// moves a cell within the hand, so it lies in no view. The position is the practice bot's test position (practice/bot.engine.test.ts):
// Blue's placements spread to the left until its legal placements needed two views. The engine runs on the CPU in Node
// from the site's static/engine: without its files, this is skipped.
const SPREAD = ("1@-13,-1 1:0,0>2:-2,1 2@1,-3 1@-16,-1 1@-19,-1 1:0,1>2:2,-1 2@-1,-4 1@-22,-1 1@-25,-1 2@-5,-4 2@-7,0 " +
  "1@-28,-1 1@-31,-1 2@-3,0 2@-8,-5 1@-34,-1 1@-37,-1 2@-12,-5 2@-12,2 1@-40,-1 1@-43,-1 2@-15,1 2@-19,2 1@-46,-1 " +
  "1@-49,-1 1@-13,-2 2@-23,2 1@-52,-1 1@-55,-1 2@-27,2 2@-30,1 1@-58,-1 1@-61,-1 1:-2,2>2:0,2 2@-35,2 1@-64,-1").split(" ");

const app = join(import.meta.dirname, "..", "..", "..");
// The network that the site ships first (its manifest), which the review searches with
const network = hasEngine(app)
  ? (JSON.parse(readFileSync(join(app, "static", "engine", "manifest.json"), "utf8")).artifacts as { kind: string; id: string }[]).find(a => a.kind === "model")?.id
  : undefined;

test("on a position of more views, a candidate lies outside the rule's view, and each placement reads as one", {
  skip: network ? false : "no engine in static/engine (npm run engine)",
}, async () => {
  const { call } = await nodeEngine(app, { network });
  const position = call({ id: "d", action: "describe", moves: SPREAD });
  assert.ok(position.views.length >= 2, `a cover of ${position.views.length} views`);
  // The review's search, as the engine's worker runs it: in slices, until it ends
  let reply = call({ id: "q", moves: SPREAD, maxVisits: 64, includeOwnership: true, includePVVisits: true });
  for (let n = 0; reply.isDuringSearch && n < 400; n++) reply = call({ id: "q", action: "continue" });
  assert.ok(!reply.isDuringSearch, "the search ends");
  assert.ok(reply.rootInfo.views.length >= 2, `the search took ${reply.rootInfo.views?.length} views`);
  const analysis = toAnalysis(blueprints, reply);
  const names = [...reply.moveInfos].sort((a, b) => a.order - b.order).map(c => c.move);
  assert.deepEqual(analysis.candidates.map(c => blueprints.moveName(c.edge)), names, "every candidate, as the engine names it");
  for (const c of analysis.candidates)
    assert.equal(c.edge.kind, /@/.test(blueprints.moveName(c.edge)) ? "place" : "edit");
  // Each placement's cells, from Blue's hand: a candidate placement lies outside the rule's view. With Stamp Duty 0.1
  // (engine-3ac5c2fc) it was the best move. With Stamp Duty 0.2 (engine-91ab0b7d) the first two candidates are edits,
  // which lie in no view, and the third is a placement outside the rule's view (2@-3,2).
  const view = placeOf(analysis.ownership!);
  assert.ok(view, "the ownership names its view");
  const hands = blueprints.position(position).blueprints;
  const outside = (name: string) => {
    const drawn = moveBefore(blueprints.parseMove(name), 0, hands); // as the board draws a candidate
    return drawn.type === "place" && drawn.footprint.some(cell => indexOfHex(view, cell.hex) < 0);
  };
  assert.ok(names.some(outside), `no candidate placement lies outside the rule's view: ${names.join(" ")}`);
});
