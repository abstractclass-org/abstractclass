// Checks the Learn page's course (lessons.ts): each step's board as the page reads its line without the engine, and
// each step's task test on the engine's boards, with the engine's CPU module in Node (scripts/node-engine.mjs). The
// engine's tests need its files (`npm run engine`), and are skipped without them. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEdge } from "#lib/engine/notation.ts";
import type { DescribeGameReply, DescribeReply } from "#lib/engine/position.ts";
import { nodeEngine } from "../../../scripts/node-engine.mjs";
import { COURSE, lineBoard, type Played, type Step } from "./lessons.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const skip = existsSync(join(root, "static", "engine", "manifest.json")) ? false : "no engine: run `npm run engine` first";
const engine = skip ? null : await nodeEngine(root);

const STEPS = COURSE.flatMap(s => s.lessons.flatMap(l => l.steps));
const step = (title: string) => STEPS.find(s => s.title === title)!;
const describe = (s: Step): DescribeReply => engine!.call({ id: "d", action: "describe", position: s.position, moves: [] });
/** The engine plays `move` on the step's board: the boards before and after it. */
function play(s: Step, move: string): Played {
  const reply: DescribeGameReply & { error?: string } =
    engine!.call({ id: "g", action: "describe_game", position: s.position, moves: [move] });
  if (reply.error) throw new Error(`${s.title}, ${move}: ${reply.error}`);
  const [before, after] = reply.positions;
  return { before, after };
}
const legal = (s: Step) => describe(s).legal.filter(m => m.includes("-")); // not "pass"

test("each step's line gives the mover and the edges left that its edge count gives", () => {
  // Without the engine, the page draws the line as the editor reads it: the edge count fixes the mover.
  for (const s of STEPS) {
    const b = lineBoard(s.position);
    assert.equal(`${"br"[b.player]}${b.movesLeft}`, s.position.split(" ")[2], s.title);
  }
});

test("a step's line keeps its marks: a protected edge of the player not to move", () => {
  const b = lineBoard(step("Protected edges").position);
  assert.deepEqual(b.edges, [[parseEdge("A7-C7")], [parseEdge("A9-D9"), parseEdge("F5-F8")]]);
  assert.deepEqual(b.protected, [parseEdge("F5-F8")]);
  assert.deepEqual(b.placed, []);
});

test("the engine reads each step's line as it is written, with Blue to move", { skip }, () => {
  for (const s of STEPS) {
    const d = describe(s);
    assert.equal(d.position, s.position, s.title); // the notation's one spelling
    assert.equal(d.mover, "b", s.title);
    assert.ok(d.nodes.b.length, s.title);
  }
});

// For each step with a task: legal edges that do it, and legal edges that do not.
const CASES: Record<string, { does: string[]; fails: string[] }> = {
  "Draw an edge": { does: ["A10-A13", "D10-G10", "D10-G13"], fails: [] },
  "Close a region": { does: ["C7-C10"], fails: ["C10-F7", "C9-C10", "C7-D8"] },
  "Cut an enemy edge": { does: ["C7-E8", "C7-E6"], fails: ["A7-A8", "C7-D7"] },
  "Protected edges": { does: ["C7-C9", "A7-A9"], fails: ["C7-D6", "C7-E5"] },
};

test("each step's task takes the edges that do it, and gives its hint for the others", { skip }, () => {
  const tasks = STEPS.filter(s => s.task);
  assert.deepEqual(tasks.map(s => s.title).sort(), Object.keys(CASES).sort());
  for (const s of tasks) {
    const { does, fails } = CASES[s.title], ok = legal(s);
    for (const m of [...does, ...fails]) assert.ok(ok.includes(m), `${s.title}: ${m} is legal`);
    for (const m of does) assert.equal(s.task!(play(s, m)), null, `${s.title}: ${m}`);
    for (const m of fails) assert.match(s.task!(play(s, m)) ?? "", /\w/, `${s.title}: ${m}`);
  }
});

test("only the edge that joins the square's open ends closes it", { skip }, () => {
  const s = step("Close a region");
  assert.deepEqual(legal(s).filter(m => s.task!(play(s, m)) === null), ["C7-C10"]);
});

test("a legal edge does a cut step's task when it cuts the red edge of the goal, and only then", { skip }, () => {
  // The red edge that each goal names. No legal edge cuts F5-F8, the protected one.
  const named: Record<string, string> = { "Cut an enemy edge": "E6-E9", "Protected edges": "A9-D9" };
  for (const [title, edge] of Object.entries(named)) {
    const s = step(title), played = legal(s).map(m => ({ m, p: play(s, m) }));
    assert.ok(played.some(({ p }) => p.after.cuts === edge), title);
    for (const { m, p } of played) {
      assert.ok(p.after.cuts === null || p.after.cuts === edge, `${title}: ${m} cuts ${p.after.cuts}`);
      assert.equal(s.task!(p) === null, p.after.cuts === edge, `${title}: ${m}`);
      // "Cut the red edge with an edge from C7": Blue's other node, A7, is too far from it.
      if (title === "Cut an enemy edge" && p.after.cuts) assert.ok(m.split("-").includes("C7"), m);
    }
  }
});

test("the boards after the edges show what the steps' texts say", { skip }, () => {
  // "The square encloses 9 points of area. Blue gains 9 points after this turn": the turn is not over.
  const square = play(step("Close a region"), "C7-C10").after;
  assert.equal(square.areas[0], 9);
  assert.deepEqual(square.scores, [0, 0]);
  assert.equal(square.regions.b.length, 1);
  // "The red edge is gone. Red's nodes with no edges left disappear too."
  const cut = play(step("Cut an enemy edge"), "C7-E8").after;
  assert.equal(cut.cuts, "E6-E9");
  assert.deepEqual(cut.edges.r, []);
  // "The protection lasts one turn": Red's protected edge stays protected for the rest of Blue's turn.
  const protectedEdge = play(step("Protected edges"), "C7-C9").after;
  assert.deepEqual(protectedEdge.protected, ["F5-F8"]);
  assert.deepEqual(protectedEdge.edges.r, ["F5-F8"]);
});
