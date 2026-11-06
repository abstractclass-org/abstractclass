// Cyanotype's review with the engine (its design 33) on its preview (CYANOTYPE_BASE_URL): the review's test game up to
// the end of turn LIVE_TURNS (cyanotype-review.ts), in the browser on the CPU, at Lite, from the release's files. The
// other tests of the review load the stored review, so this is the one test that reviews with the engine. It has a
// file of its own: cyanotype-review.spec.ts runs its tests in turn, and skips the rest after a failure. Without the
// engine's files the test skips, with a message, and fails in CI. Run: npm run test:layout --
// tests/cyanotype-live-review.spec.ts, with CYANOTYPE_BASE_URL.
import { expect, test } from "@playwright/test";
import { LIVE_TURNS, LIVE_WAIT, engineWork, keptResults, noReview, reviewFirstTurns, storedResults }
  from "./cyanotype-review.ts";

test.use({ viewport: { width: 1376, height: 952 } });

test("the engine reviews the game's first turns in the browser, as it made the stored review", async ({ page }) => {
  // The review searches each position before a move of turns 1 to LIVE_TURNS at the stored review's depths, so the
  // browser's store keeps the stored review's results for them. The engine's search gives the same result for the same
  // position, visits and engine: in three runs, each result was the stored one, byte for byte. The test's browser
  // context is new, so the store starts empty.
  test.setTimeout(LIVE_WAIT + 2 * 60_000);
  const skipped = await noReview(page);
  test.skip(!!skipped, skipped);
  const failed: string[] = [];
  page.on("pageerror", e => failed.push(String(e)));
  const t0 = Date.now();
  await reviewFirstTurns(page);
  console.log(`the live review of turns 1 to ${LIVE_TURNS}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  expect((await engineWork(page))?.searches, "the searches that the page asked of the engine").toBeGreaterThan(0);
  const kept = await keptResults(page, true), stored = storedResults(LIVE_TURNS);
  expect(kept.map(([key]) => key), "the keys of the results in the store").toEqual(stored.map(([key]) => key));
  expect(kept, "the results in the store, against the stored review's").toEqual(stored);
  expect(failed, "page errors").toEqual([]);
});
