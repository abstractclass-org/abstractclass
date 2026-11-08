// The stored reviews of Cyanotype (STORED and OTHER_STORED) and the games' records (testRecord), with no Playwright
// import: the browser tests take them through cyanotype-review.ts, and Cyanotype's label snapshot
// (apps/cyanotype/src/lib/review/labels.snapshot.engine.test.ts) takes them here, under Node's test runner.
import { readFileSync } from "node:fs";

/** The turns of the test game that the review's tests review, and STORED holds. */
export const TURNS = 20;

/** The stored review: a review file of Cyanotype's (apps/cyanotype/src/lib/game/reviewFile.ts) with the results of a
 *  real review of the test game, and the engine that made them in its review. Its results also hold the Analysis
 *  board's SPREAD_BOARD (cyanotype-review.ts), which a page's review file of the game leaves out: the layout test's
 *  Analysis board takes them. scripts/cyanotype-review-fixture.mjs writes it: run it again when Cyanotype's
 *  engine.lock.json takes a new release. */
export const STORED = "tests/fixtures/cyanotype-review.json";
/** The test game's file in apps/cyanotype/src/lib/review/fixtures. */
export const TEST_GAME = "stamp-duty.txt";
/** The other stored reviews: the results of real reviews at the same visits, each with its file, its game (a file in
 *  apps/cyanotype/src/lib/review/fixtures) and the turns that it reviews (Infinity: the whole game). Only Cyanotype's
 *  label snapshot reads them: they reach the kinds of label and the rules that STORED does not reach (the snapshot
 *  test's header names them). So their results hold no ownership, which only the area map reads. They are not review
 *  files: each holds its engine and its results only. scripts/cyanotype-review-fixture.mjs writes them after STORED. */
export const OTHER_STORED = [
  { file: "tests/fixtures/cyanotype-whole-review.json", game: TEST_GAME, turns: Infinity },
  { file: "tests/fixtures/cyanotype-seed12-review.json", game: "stamp-duty-seed12.txt", turns: 23 },
] as const;

/** A stored review's engine (`search`, `network`, the network's SHA-256 `model`), the review's depth (`visits`) and
 *  its results: of STORED unless `file` gives another, from STORED's review mark, or from the top of another's file.
 *  Read by the file's place, so that it reads from any folder. */
export function readStored(file: string = STORED):
  { search: string; network: string; model: string; visits: number; analyses: [string, unknown][] } {
  const json = JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
  const { search, network, model, visits } = (json.review ?? json) as
    { search: string; network: string; model: string; visits: number };
  return { search, network, model, visits, analyses: json.analyses as [string, unknown][] };
}

/** The record of the test game, or of the game `game` (a file in apps/cyanotype/src/lib/review/fixtures), up to the
 *  end of turn `turns`, or to its end when the game has no later turn: its tags, but not its result, and its moves. */
export function testRecord(turns = TURNS, game: string = TEST_GAME): string {
  const text = readFileSync(new URL(`../../cyanotype/src/lib/review/fixtures/${game}`, import.meta.url), "utf8");
  const [tags, moves] = text.split(/\r?\n\r?\n/);
  const words = moves.trim().split(/\s+/), next = words.indexOf(`${turns + 1}.`);
  // Without a later turn (next is -1), the moves end before the record's last word, its result
  const kept = tags.split(/\r?\n/).filter(t => !/^\[(Result|Scores) /.test(t));
  return `${kept.join("\n")}\n\n${words.slice(0, next).join(" ")}\n`;
}
