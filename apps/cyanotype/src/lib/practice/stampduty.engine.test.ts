import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { withKomi } from "@abstractclass/analysis/game.ts";
import { resultOfRecord, resultOfScores, resultText } from "@abstractclass/review/game.ts";
import { sitePosition, type GamePosition } from "../board/described.ts";
import { parseRecord } from "../game/record.ts";
import { fmtMargin } from "../review/blueprints.ts";
import { endResult } from "./stampduty.ts";

// A practice game's result at its end, at a komi (Hedge School's design 24): on the review's test game
// (../review/fixtures/stamp-duty.txt, Stamp Duty against itself, `r+730`), whose end the engine's rules give. The komi
// is Red's starting score, added to Red's final margin. The engine runs on the CPU in Node from the site's
// static/engine: without its files, this is skipped.
const app = join(import.meta.dirname, "..", "..", "..");
const record = parseRecord(readFileSync(join(import.meta.dirname, "..", "review", "fixtures", "stamp-duty.txt"), "utf8"));

test("a game's result at its end counts the komi", {
  skip: hasEngine(app) ? false : "no engine in static/engine (npm run engine)",
}, async () => {
  const { call } = await nodeEngine(app);
  const reply = call({ id: "g", action: "describe_game", moves: record.moves });
  if (reply.error) throw new Error(reply.error);
  const end = (reply.positions as GamePosition[]).at(-1)!;
  assert.equal(end.outcome?.result, "r+730");
  assert.equal(endResult(end, 0), "r+730"); // from the scores: the rules' own result too
  assert.equal(endResult(end, 300), "r+1030"); // Red starts 300 points ahead
  assert.equal(endResult(end, -300), "r+430"); // Blue starts 300 points ahead
  assert.equal(endResult(end, -730), "0"); // a draw
  assert.equal(endResult(end, -1000), "b+270");
  // The Practice page's line at the end (routes/practice/+page.svelte) reads the position's scores with the komi
  // (game.svelte.ts, positionOf), and the game keeps endResult's result: the two say the same at each komi.
  const komis = [[0, "Red won by 730"], [300, "Red won by 1,030"], [-300, "Red won by 430"], [-730, "A draw"],
                 [-1000, "Blue won by 270"]] as const;
  for (const [komi, words] of komis) {
    const line = resultText(resultOfScores(withKomi(sitePosition(end), komi).scores), fmtMargin);
    const kept = resultText(resultOfRecord(endResult(end, komi))!, fmtMargin);
    assert.deepEqual([line, kept], [words, words], `komi ${komi}`);
  }
});
