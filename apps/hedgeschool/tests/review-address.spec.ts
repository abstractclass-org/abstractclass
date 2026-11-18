// An address pasted in the address bar over the open review page (src/routes/review/+page.svelte, `otherGame`): a
// change of the part after the `#` alone, which loads no page. The page opens it as on a fresh load (design 22):
// - a shared review (`#packed=`) and an older tool's game (`#tool=…&record=`): the arrival step, then the review;
// - a kept game (`#game=`): its review;
// - a record (`#record=`): the Review tab, which the import page and the paste take a record from.
// The game is the layout test's (tests/fixtures/hedgefund-review.json), with the engine's search off.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";
import { fileInput } from "./review-file.ts";
import { keepBefore } from "./keep-before.ts";
import { encodeShare } from "../src/lib/game/share.ts";
import { parseRecord, playerNames } from "../src/lib/game/record.ts";
import { CONSENT_KEY, ENGINE_KEY } from "../src/lib/keys.ts";

const { record: text }: { record: string } = JSON.parse(readFileSync("tests/fixtures/hedgefund-review.json", "utf8"));
const record = parseRecord(text);
const names = playerNames(record.tags);
// The link holds no engine results. A network and an engine that the site lacks: the review uses the browser's.
const packed = encodeShare({ module: "00000000", model: "00000000", visits: 512, tags: record.tags, moves: record.moves,
                             branches: [] });

test.beforeEach(async ({ page }) => {
  // The visitor has answered the consent notice, which covers the page's foot until they choose.
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  await keepBefore(page, ENGINE_KEY, { on: false });
});

/** The Review tab, once the page has chosen it (ReviewHome.svelte, `data-ready`): its code listens to the address. */
async function reviewTab(page: Page) {
  await page.goto("/review");
  await expect(fileInput(page).and(page.locator("[data-ready]"))).toBeAttached();
}

/** Puts `hash` after the address's `#`, as a link pasted in the address bar over the page does: no page loads. */
const paste = (page: Page, hash: string) => page.evaluate(h => { location.hash = h; }, hash);

/** The review of the game kept from the fixture: its id. */
async function reviewOpens(page: Page): Promise<string> {
  await expect(page).toHaveURL(url => url.pathname === "/review" && /^#game=\w+$/.test(url.hash), { timeout: 60_000 });
  await expect(page).toHaveTitle("Game review · Hedge School");
  await expect(page.getByText(names.blue).first()).toBeVisible({ timeout: 60_000 });
  return new URL(page.url()).hash.slice("#game=".length);
}

test("a shared review, a kept game and an older tool's game pasted over the Review tab open as on a fresh load", async ({ page }) => {
  await reviewTab(page);
  await paste(page, `packed=${packed}`);
  await expect(page.getByRole("heading", { name: "A shared review" })).toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(url => url.pathname === "/review" && !url.hash); // the game left the address
  await page.getByRole("button", { name: "Review it" }).click();
  const id = await reviewOpens(page);

  await reviewTab(page);
  await paste(page, `game=${id}`);
  expect(await reviewOpens(page)).toBe(id);

  await reviewTab(page);
  await paste(page, new URLSearchParams({ tool: "userscript", v: "old", site: "meaf.us", record: text }).toString());
  await expect(page.getByRole("heading", { name: "A game from meaf.us" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Review the game" }).click();
  await reviewOpens(page);
});

test("a record pasted over the Review tab or over a review gets the Review tab, as on a fresh load", async ({ page }) => {
  const hash = new URLSearchParams({ record: text }).toString();
  const reviewTabShows = async () => {
    await expect(page.getByRole("heading", { name: "Review your Enclosure game" })).toBeVisible({ timeout: 60_000 });
    await expect(page).toHaveTitle("Review a game · Hedge School");
  };
  await page.goto(`/review#${hash}`); // a fresh load
  await reviewTabShows();

  await reviewTab(page);
  await paste(page, hash);
  await reviewTabShows();

  await reviewTab(page);
  await paste(page, `packed=${packed}`);
  await page.getByRole("button", { name: "Review it" }).click({ timeout: 60_000 });
  await reviewOpens(page);
  await paste(page, hash);
  await reviewTabShows();
});
