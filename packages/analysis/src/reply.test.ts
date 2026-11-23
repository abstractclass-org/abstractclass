// Checks the engine's reply as the review reads it (reply.ts): the draw chance of a game with draws. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AnalysisReply } from "@abstractclass/engine/protocol.ts";
import { toAnalysis } from "./reply.ts";
import { words } from "./testing/game.ts";

/** A reply of two candidates, with a draw chance for the root and for each candidate where `draws`. */
const replyOf = (draws: boolean) => ({
  rootInfo: { visits: 10, winrate: 0.6, scoreLead: 1, scoreSelfplay: 1, scoreStdev: 2, ...(draws ? { drawChance: 0.25 } : {}) },
  moveInfos: [0.6, 0.5].map((winrate, order) => ({
    move: "ab"[order], order, visits: 5, edgeVisits: 5, winrate, scoreLead: 1, scoreSelfplay: 1, prior: 0.5, pv: ["ab"[order]],
    ...(draws ? { drawChance: [0.2, 0][order] } : {}),
  })),
}) as unknown as AnalysisReply;

test("a reply with a draw chance keeps it for the position and each candidate, 0 too", () => {
  const a = toAnalysis(words, replyOf(true));
  assert.equal(a.draw, 0.25);
  assert.deepEqual(a.candidates.map(c => c.draw), [0.2, 0]);
});

test("a draw chance changes no win chance: the reply's already counts a draw as half", () => {
  const strip = ({ draw: _, ...v }: { draw?: number }) => v;
  const a = toAnalysis(words, replyOf(true)), plain = toAnalysis(words, replyOf(false));
  assert.deepEqual({ ...strip(a), candidates: a.candidates.map(strip) }, plain);
});

test("a reply with no draw field has no draw chance, not even undefined: a stored result reads and writes as before", () => {
  const a = toAnalysis(words, replyOf(false));
  assert.ok(!("draw" in a) && a.candidates.every(c => !("draw" in c)));
});
