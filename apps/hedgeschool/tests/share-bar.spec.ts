// The share bar (packages/review/src/ShareBar.svelte) at a share of exactly 0 or 1 is all one color: the side with no
// share has a part 0 px wide, not the 6 px of its padding. Between 0 and 1 the loser keeps its padding. The review's
// win chance and Practice's points are the same component. The cases:
// - The end of the layout test's game, which Red wins by the rules: a share of 0.
// - The same game at its 11th position, with Blue's win chance in each stored result set to `share`. The engine is off,
//   so the page shows the stored results. No fixture has a game that Blue wins, so this case covers a share of 1.
// - The gauge, which has no padding on its parts.
// - Practice before the first move of a game with a komi: one player has all the points (a share of 0 or 1).
// A part changes width or height over 200 ms, so each check waits until the bar is at rest. Nothing here measures text
// room, so the font does not matter.
// Run: npm run test:layout -- tests/share-bar.spec.ts --project=chromium, with BASE_URL.
import { expect, test, type Page } from "./page-log.ts";
import { keepBefore } from "./keep-before.ts";
import { FIXTURE, openAtShare, openReview } from "./win-review.ts";
import { CONSENT_KEY, PRACTICE_GAME_KEY } from "../src/lib/keys.ts";

// The review's load can take a few minutes on a busy machine, but never the config's 10 minutes: a wait that long is a
// page that did not load, and the page log says why.
test.describe.configure({ timeout: 240_000 });

const WIN = "Win chance from the engine's search", POINTS = "Points:"; // the start of each bar's tooltip

/** The flat bar with the tooltip that starts with `title`, and its parts: widths in px. */
const partWidths = (page: Page, title: string) => page.locator(`[title^="${title}"] > div`).first().evaluate(bar => {
  const [blue, red] = [...bar.children].map(part => part.getBoundingClientRect().width);
  return { bar: bar.getBoundingClientRect().width, blue, red };
});

/** The bar at a share of 0 or 1 is all one color: the side with no share has a part 0 px wide, at rest, and the other
 *  part is the whole bar. */
async function expectOneColor(page: Page, title: string, share: 0 | 1) {
  const loser = share ? "red" : "blue";
  await expect.poll(async () => (await partWidths(page, title))[loser],
                    { message: `${loser}'s part at a share of ${share}` }).toBe(0);
  const { bar, blue, red } = await partWidths(page, title);
  expect(blue + red, "the parts fill the bar").toBeCloseTo(bar, 1);
}

for (const width of [1376, 390]) {
  test.describe(`at ${width} px`, () => {
    test("at the end of a game that Red wins, the bar is all Red", async ({ page }) => {
      await openReview(page, FIXTURE, width);
      await page.keyboard.press("End");
      await expect(page.getByText(/^Game over/).first()).toBeVisible();
      await expectOneColor(page, WIN, 0);
    });

    for (const share of [0, 1] as const) {
      test(`at a share of ${share}, the bar is all ${share ? "Blue" : "Red"}`, async ({ page }) => {
        await openAtShare(page, share, width);
        await expectOneColor(page, WIN, share);
      });
    }
  });
}

test("the gauge at a share of 0 and of 1 is all one color", async ({ page }) => {
  for (const share of [0, 1] as const) {
    await openAtShare(page, share, 1376, "gauge");
    // Blue's part's height as a share of the gauge's, at rest
    await expect.poll(() => page.locator('[role="img"][aria-label^="Blue\'s win chance"]').evaluate(gauge =>
      gauge.firstElementChild!.getBoundingClientRect().height / gauge.getBoundingClientRect().height),
      { message: `Blue's part of the gauge at a share of ${share}` }).toBeCloseTo(share, 2);
  }
});

test("at a share of 0.01 and of 0.99, the loser keeps 6 px, its padding", async ({ page }) => {
  // 1% of the bar at 1376 px is narrower than the padding
  for (const [share, loser] of [[0.01, "blue"], [0.99, "red"]] as const) {
    await openAtShare(page, share, 1376);
    await expect.poll(async () => (await partWidths(page, WIN))[loser],
                      { message: `${loser}'s part at a share of ${share}` }).toBeCloseTo(6, 1);
  }
});

test("Practice's points bar with all the points on one side is all one color", async ({ page }) => {
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  for (const share of [0, 1] as const) {
    // A kept game before its first move, the player Blue: Red's komi, or Blue's head start, is all the points
    await keepBefore(page, PRACTICE_GAME_KEY, {
      version: 1, bot: { network: "b10c128-s89066368-d17827487", visits: 1, variety: "low" }, human: 0, name: "",
      seed: 1, komi: share ? -300 : 300, moves: [], builds: [], started: new Date().toISOString(),
    });
    await page.goto("/practice");
    const points = `${POINTS} Blue ${share ? 300 : 0}, Red ${share ? 0 : 300}`;
    await expect(page.locator(`[title^="${points}"]`)).toBeVisible({ timeout: 120_000 });
    await expectOneColor(page, POINTS, share);
  }
});
