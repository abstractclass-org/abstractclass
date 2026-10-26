import { test } from "node:test";
import assert from "node:assert/strict";
import { blueprintsEngine, describeGames, engineFolder } from "../../../scripts/board-fixtures.mjs";
import { FIXTURE_DATA as stored } from "./fixtures.ts";

// The data file (fixtures.json) against the engine itself: Stamp Duty's early build plays each game again. CI has no
// engine files, so this is skipped there. A difference means that the build or the games changed: run
// `npm run fixtures` and look at the change.
const folder = engineFolder();

test("the lab's positions and legal moves are what the engine gives now", { skip: folder ? false : "no engine folder" }, async () => {
  const { engine, call } = await blueprintsEngine(folder!);
  assert.deepEqual(engine, stored.engine);
  const now = describeGames(call);
  assert.deepEqual(now.map(f => f.name), stored.fixtures.map(f => f.name));
  for (const [i, f] of now.entries())
    for (const [key, value] of Object.entries(f))
      assert.deepEqual(value, stored.fixtures[i][key as keyof typeof stored.fixtures[number]], `${f.name}: ${key}`);
});
