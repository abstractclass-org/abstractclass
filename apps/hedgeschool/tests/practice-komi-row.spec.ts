// The komi slider's row of labels on Practice's settings card (packages/practice/src/PracticeCard.svelte), on Hedge
// School and on Cyanotype (the card is shared), at a desktop width and at the narrowest phone width of the layout
// tests. The 0 stands under the slider's middle, where the thumb stands at komi 0. The bot's label is wider than the
// player's, so a row that spaces its three labels by their widths puts the 0 away from the middle. The text of each
// side label keeps to the slider's width and does not touch the 0, also with a bot's name of one long word. Run:
// npm run test:layout -- tests/practice-komi-row.spec.ts --project=chromium, with BASE_URL and CYANOTYPE_BASE_URL.
import { expect, test, type Page } from "./page-log.ts";
import { declineGames } from "./cyanotype-consent.ts";
import { keepBefore } from "./keep-before.ts";
import { CONSENT_KEY, ENGINE_KEY } from "../src/lib/keys.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
const SIZES = [{ name: "desktop", width: 1376, height: 952 }, { name: "phone", width: 360, height: 740 }] as const;

/** Each site's Practice page, and the visitor's choices that the page keeps before it loads: the Decline of the
 *  consent notice, and on Hedge School the engine off. */
const SITES = [
  {
    site: "Hedge School", practice: "/practice",
    keepChoices: async (page: Page) => {
      await keepBefore(page, CONSENT_KEY, { games: "denied" });
      await keepBefore(page, ENGINE_KEY, { on: false, gpu: "off" });
    },
  },
  {
    site: "Cyanotype", practice: CYANOTYPE ? new URL("/practice", CYANOTYPE).href : undefined,
    keepChoices: (page: Page) => declineGames(page.context()),
  },
];

/** The left edge and the width of the text in the element that `testId` names, in the viewport's pixels. Each label
 *  is a grid item, and a grid item's own box fills its column, whatever the width of its text. */
const textOf = (page: Page, testId: string) => page.getByTestId(testId).evaluate(element => {
  const range = document.createRange();
  range.selectNodeContents(element);
  const { x, width } = range.getBoundingClientRect();
  return { x, width };
});

/** Checks the row: the 0's centre is within 1 px of the slider's, and the text of each side label keeps to the slider's
 *  width and does not touch the 0. */
async function checkRow(page: Page) {
  const track = await page.getByRole("slider", { name: "Komi" }).boundingBox();
  if (!track) throw new Error("the komi slider has no box");
  const [zero, bot, you] = await Promise.all(
    ["komi-zero", "komi-label-bot", "komi-label-you"].map(testId => textOf(page, testId)));
  expect(Math.abs(zero.x + zero.width / 2 - (track.x + track.width / 2))).toBeLessThanOrEqual(1);
  expect(bot.x).toBeGreaterThanOrEqual(track.x - 1);
  expect(you.x + you.width).toBeLessThanOrEqual(track.x + track.width + 1);
  expect(bot.x + bot.width).toBeLessThan(zero.x);
  expect(you.x).toBeGreaterThan(zero.x + zero.width);
}

for (const { site, practice, keepChoices } of SITES) {
  for (const { name, width, height } of SIZES) {
    test(`${site}: the komi row's 0 stands under the slider's middle, at ${name} width (${width} px)`,
      async ({ page }) => {
        test.skip(!practice, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
        await keepChoices(page);
        await page.setViewportSize({ width, height });
        await page.goto(practice!);
        await expect(page.getByTestId("komi-zero")).toBeVisible({ timeout: 60_000 });
        await checkRow(page);
        // A bot's name of one word that is too long for its column at the phone width: the word breaks
        await test.step("with a long bot name", async () => {
          await page.getByTestId("komi-label-bot").evaluate(label => {
            label.textContent = "HedgeFundSupercalifragilisticexpialidocious ahead";
          });
          await checkRow(page);
        });
      });
  }
}
