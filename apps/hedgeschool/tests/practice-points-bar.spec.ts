// Practice's points bar and its display settings (design 24, item 12), on both sites: Hedge School's, and Cyanotype's
// (its design 33) when CYANOTYPE_BASE_URL gives its preview. The display settings hold the switch "Points bar" and,
// while it is on, the choice "Direction" (Horizontal or Vertical). Hedge School has "Area" too, and Cyanotype does not:
// Blueprints has no area. The choices stay after a reload, kept under each site's key with the same values. Horizontal
// puts the bar in the players' row. Vertical puts it left of the board, as high as the board's box, and the row then
// starts at the box's left edge, with no bar in it, at a computer's width and in one column. Off takes the bar away.
// A kept area (Hedge School's value) shows the area's lane beside the upright bar on Hedge School. Cyanotype keeps the
// area off, and its bar's room has no lane.
// Each case opens a game in progress, the player to move, so that the bot does not search. Run:
// npm run test:layout -- tests/practice-points-bar.spec.ts, with CYANOTYPE_BASE_URL for Cyanotype's cases.
import { expect, test, type Page } from "./page-log.ts";
import { readFileSync } from "node:fs";
import { declineGames } from "./cyanotype-consent.ts";
import { keepBefore } from "./keep-before.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

interface Site {
  name: string;
  key: string; // where the site keeps the settings
  area: boolean; // the site offers the area's lane
  open: (page: Page) => Promise<void>; // Practice, in a game in progress, the player to move
  ready: (page: Page) => Promise<void>; // waits for the game's position, after a load
}

const SITES: Site[] = [
  {
    name: "Hedge School", key: "hedge-school:practice-display:2", area: true,
    // The review's test game's first 20 edges (tests/fixtures/hedgefund-review.json), as the layout test's
    open: async page => {
      const record = JSON.parse(readFileSync("tests/fixtures/hedgefund-review.json", "utf8")).record as string;
      const moves = record.replace(/\[[^\]]*\]/g, "").split(/\s+/).filter(t => /^[A-T]\d+-[A-T]\d+$/.test(t)).slice(0, 20);
      await keepBefore(page, "hedge-school:consent:2", { games: "denied" });
      await keepBefore(page, "hedge-school:practice-game:1", {
        version: 1, bot: { network: "b10c128-s66625408-d13350730", visits: 64, variety: "low" }, human: 0, name: "",
        seed: 1, moves, builds: [], started: new Date().toISOString(),
      });
      await page.goto("/practice");
    },
    ready: page => expect(page.locator(".mv").first()).toBeVisible({ timeout: 120_000 }),
  },
  {
    name: "Cyanotype", key: "cyanotype:practice-display:1", area: false,
    // The board's test position "A middle game" (apps/cyanotype/src/lib/board/fixtures.json), Red to move
    open: async page => {
      test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
      const at = (path: string) => new URL(path, CYANOTYPE).href;
      const manifest = await page.request.get(at("/engine/manifest.json")).then(r => r.json()).catch(() => null);
      test.skip(!manifest?.artifacts?.some((a: { kind: string }) => a.kind === "practice-module"),
                "Cyanotype's preview has no practice bot: run `npm run engine` in apps/cyanotype before its build");
      const fixtures = JSON.parse(readFileSync("../cyanotype/src/lib/board/fixtures.json", "utf8")).fixtures as
        { name: string; moves: string[] }[];
      await declineGames(page.context());
      await keepBefore(page, "cyanotype:practice-game:1", {
        version: 1, bot: { network: manifest.artifacts.find((a: { kind: string }) => a.kind === "model").id, visits: 32, variety: "low" },
        human: 1, name: "", seed: 1, moves: fixtures.find(f => f.name === "A middle game")!.moves, builds: [],
        started: new Date().toISOString(),
      });
      await page.goto(at("/practice"));
    },
    ready: page => expect(page.getByTestId("practice-status")).toHaveText(/^Your turn/, { timeout: 120_000 }),
  },
];

/** The points bar, in either direction: a bar in the row has its text as a tooltip, and the upright bar as its name. */
const POINTS = '[title^="Points:"], [role="img"][aria-label^="Points:"]';
const ROW = '[aria-label="Players and scores"]';

/** The display settings, open. */
async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Display settings" }).click();
  return page.getByRole("region", { name: "Display settings" });
}

/** The settings that the site keeps. */
const kept = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? "null"), key);

/** Where the upright bar breaks its rules: left of the board's box and as high, the players' row from the box's left
 *  edge, and no bar in the row. */
const uprightProblems = (page: Page) => page.evaluate(({ points, row }) => {
  const out: string[] = [], gauge = document.querySelector('[role="img"][aria-label^="Points:"]');
  const box = gauge?.parentElement?.nextElementSibling, strip = document.querySelector(row);
  if (!gauge || !box || !strip) return ["no upright bar beside the board's box"];
  const g = gauge.getBoundingClientRect(), b = box.getBoundingClientRect(), s = strip.getBoundingClientRect();
  if (g.right > b.left + 0.5) out.push(`the bar's right edge (${g.right}) passes the box's left edge (${b.left})`);
  if (Math.abs(g.top - b.top) > 1 || Math.abs(g.bottom - b.bottom) > 1)
    out.push(`the bar runs from ${g.top} to ${g.bottom}, and the box from ${b.top} to ${b.bottom}`);
  if (Math.abs(s.left - b.left) > 1) out.push(`the players' row starts at ${s.left}, and the box at ${b.left}`);
  if (strip.querySelector(points)) out.push("the players' row has a bar too");
  return out;
}, { points: POINTS, row: ROW });

for (const site of SITES) {
  test.describe(`${site.name}'s Practice`, () => {
    test("the points bar's settings: Points bar, Direction and the area where the game has one", async ({ page }) => {
      await site.open(page);
      await site.ready(page);
      await expect(page.locator(ROW).locator(POINTS)).toBeVisible(); // at first, in the row
      const settings = await openSettings(page);
      await expect(settings.getByRole("heading", { name: "Score" })).toBeVisible();
      await expect(settings.getByRole("switch", { name: "Points bar" })).toBeChecked();
      await expect(settings.getByRole("switch", { name: "Area" })).toHaveCount(site.area ? 1 : 0);
      const direction = settings.getByRole("radiogroup", { name: "Direction" });
      await expect(direction.getByRole("radio")).toHaveText(["Horizontal", "Vertical"]);
      await expect(direction.getByRole("radio", { name: "Horizontal" })).toBeChecked();
    });

    test("Vertical puts the bar left of the board, and the choice stays after a reload", async ({ page }) => {
      await site.open(page);
      await site.ready(page);
      const settings = await openSettings(page);
      await settings.getByRole("radiogroup", { name: "Direction" }).getByRole("radio", { name: "Vertical" }).click();
      await expect.poll(() => kept(page, site.key)).toEqual({ bar: true, area: false, form: "gauge" });
      await settings.getByRole("button", { name: "Done" }).click();
      expect(await uprightProblems(page)).toEqual([]);
      await page.reload();
      await site.ready(page);
      expect(await uprightProblems(page)).toEqual([]);
      await page.setViewportSize({ width: 390, height: 844 }); // one column
      await expect.poll(() => uprightProblems(page)).toEqual([]);
    });

    test("Points bar off takes the bar and the Direction away, and stays off after a reload", async ({ page }) => {
      await site.open(page);
      await site.ready(page);
      const settings = await openSettings(page);
      await settings.getByRole("switch", { name: "Points bar" }).click();
      await expect(settings.getByRole("radiogroup", { name: "Direction" })).toHaveCount(0);
      await expect(settings.getByRole("switch", { name: "Area" })).toHaveCount(0);
      await expect.poll(() => kept(page, site.key)).toEqual({ bar: false, area: false, form: "bar" });
      await expect(page.locator(POINTS)).toHaveCount(0);
      await page.reload();
      await site.ready(page);
      await expect(page.locator(ROW)).toBeVisible();
      await expect(page.locator(POINTS)).toHaveCount(0);
    });

    test("a kept area shows its lane only where the game has one, in the room left of the board", async ({ page }) => {
      await keepBefore(page, site.key, { bar: true, area: true, form: "gauge" });
      await site.open(page);
      await site.ready(page);
      await expect.poll(() => kept(page, site.key)).toEqual({ bar: true, area: site.area, form: "gauge" });
      expect(await uprightProblems(page)).toEqual([]);
      // The room: the bar (1rem) and its gap to the board (0.375rem), and the lane (0.375rem) with its gap (0.125rem)
      expect(await page.evaluate(() => {
        const gauge = document.querySelector('[role="img"][aria-label^="Points:"]')!;
        const box = gauge.parentElement!.nextElementSibling!;
        return { lane: gauge.parentElement!.children.length > 1,
                 room: Math.round(box.getBoundingClientRect().left - gauge.getBoundingClientRect().left) };
      })).toEqual({ lane: site.area, room: site.area ? 30 : 22 });
      await expect(page.locator('[role="img"][aria-label^="Points:"]'))
        .toHaveAttribute("aria-label", site.area ? /\. Area: Blue \d+, Red \d+$/ : /^Points: Blue \d+, Red \d+$/);
    });
  });
}
