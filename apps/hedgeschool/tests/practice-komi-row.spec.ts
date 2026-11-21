// The komi slider's row of labels on Practice's settings card (packages/practice/src/PracticeCard.svelte): the 0 stands
// under the slider's middle, where the thumb stands at komi 0, whatever the bot's name and the card's width. The bot's
// side label ("HedgeFund 0.2 Lite ahead") is wider than the player's, and a row that spaces its three labels by their
// widths puts the 0 between the two labels, away from the middle. The test measures the 0's centre against the
// slider's, at a desktop width and at a phone width, on Hedge School and on Cyanotype (the card is shared). It also
// checks that the side labels do not overlap the 0 and do not leave the slider's width. Run:
// npm run test:layout -- tests/practice-komi-row.spec.ts --project=chromium, with BASE_URL and CYANOTYPE_BASE_URL.
import { expect, test, type Page } from "./page-log.ts";
import { declineGames } from "./cyanotype-consent.ts";
import { CONSENT_KEY, ENGINE_KEY } from "../src/lib/keys.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
const SIZES = [{ name: "desktop", width: 1376, height: 952 }, { name: "phone", width: 390, height: 844 }] as const;

const SITES = [
  { site: "Hedge School", url: (path: string) => path },
  { site: "Cyanotype", url: (path: string) => new URL(path, CYANOTYPE).href },
] as const;

/** The box of the element that `testId` names, in the page's pixels. */
async function boxOf(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`${testId} has no box`);
  return box;
}

for (const { site, url } of SITES) {
  for (const { name, width, height } of SIZES) {
    test(`${site}: the komi row's 0 stands under the slider's middle, at ${name} width (${width} px)`, async ({ page, context }) => {
      test.skip(site === "Cyanotype" && !CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
      if (site === "Cyanotype") await declineGames(context);
      else {
        await context.addInitScript(([consent, engine]) => {
          localStorage.setItem(consent, JSON.stringify({ games: "denied" }));
          localStorage.setItem(engine, JSON.stringify({ on: false, gpu: "off" }));
        }, [CONSENT_KEY, ENGINE_KEY] as const);
      }
      await page.setViewportSize({ width, height });
      await page.goto(url("/practice"));
      const slider = page.getByRole("slider", { name: "Komi" });
      await slider.scrollIntoViewIfNeeded({ timeout: 60_000 });
      await expect(page.getByTestId("komi-zero")).toBeVisible();
      const track = await slider.boundingBox();
      if (!track) throw new Error("the komi slider has no box");
      const zero = await boxOf(page, "komi-zero");
      // The 0's centre is within 1 px of the slider's centre
      expect(Math.abs(zero.x + zero.width / 2 - (track.x + track.width / 2))).toBeLessThanOrEqual(1);
      // The side labels keep to the slider's width, and neither touches the 0
      const bot = await boxOf(page, "komi-label-bot"), you = await boxOf(page, "komi-label-you");
      expect(bot.x).toBeGreaterThanOrEqual(track.x - 1);
      expect(you.x + you.width).toBeLessThanOrEqual(track.x + track.width + 1);
      expect(bot.x + bot.width).toBeLessThanOrEqual(zero.x);
      expect(you.x).toBeGreaterThanOrEqual(zero.x + zero.width);
    });
  }
}
