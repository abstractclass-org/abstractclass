// Cyanotype's review (its design 33) for the browser tests, on its preview (CYANOTYPE_BASE_URL): the review's test game
// (apps/cyanotype/src/lib/review/fixtures/stamp-duty.txt, Stamp Duty against itself) up to the end of turn TURNS,
// reviewed in the browser from the engine's real replies on the CPU, at Lite (512 visits a move), the stored review's
// depth: with the release engine-3ac5c2fc, its first note is a Mistake at turn 15. The review takes about ten minutes. The Tests workflow builds Cyanotype with the engine's files (design 33, "The engine's
// files"). A test skips, with a message, when the preview has none.
import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BOOKMARK_VERSION } from "../../../packages/import/src/bookmarklet.ts";

export const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
const TURNS = 20;
export const MOVES = 1 + 2 * (TURNS - 1); // the first turn has one move, each other turn two
export const DISPLAY = "cyanotype:review-display:1";
const ENGINE = "cyanotype:engine:1";

/** The test game's record up to the end of turn TURNS: its tags, but not its result, and its moves. */
export function testRecord(): string {
  const text = readFileSync("../cyanotype/src/lib/review/fixtures/stamp-duty.txt", "utf8");
  const [tags, moves] = text.split(/\r?\n\r?\n/);
  const words = moves.trim().split(/\s+/);
  return `${tags.split(/\r?\n/).filter(t => !/^\[(Result|Scores) /.test(t)).join("\n")}\n\n${words.slice(0, words.indexOf(`${TURNS + 1}.`)).join(" ")}\n`;
}

/** A record that the engine refuses: the test game's first three turns, with an x on 2@1,-5, which captures nothing. */
export const REFUSED = '[Blue "Ann"]\n[Red "Bo"]\n\n1. 1:-1,1>2:0,-1 2. 1:-1,1>2:-2,1 1:0,2>2:0,3 3. 1:0,2>2:2,2 2@1,-5x *\n';

/** The import page's address that a tool opens on strategyjam.org, with the test game unless `record` gives another:
 *  `at` is the position that the game's page showed, when it says. */
export function toolLink(more: { tool?: string; v?: string; at?: number; record?: string } = {}): string {
  const { tool = "bookmarklet", v = String(BOOKMARK_VERSION), at, record = testRecord() } = more;
  return new URL("/import#" + new URLSearchParams({ tool, v, site: "strategyjam.org", ...(at === undefined ? {} : { at: String(at) }), record }),
                 CYANOTYPE).href;
}

/** The Analysis board on a position of more views: the practice bot's test position
 *  (apps/cyanotype/src/lib/practice/bot.engine.test.ts), Blue to move, whose legal placements need two views of the
 *  engine. */
export const SPREAD_BOARD = "/analysis#record=" + encodeURIComponent("1. 1@-13,-1 2. 1:0,0>2:-2,1 2@1,-3 3. 1@-16,-1 1@-19,-1 " +
  "4. 1:0,1>2:2,-1 2@-1,-4 5. 1@-22,-1 1@-25,-1 6. 2@-5,-4 2@-7,0 7. 1@-28,-1 1@-31,-1 8. 2@-3,0 2@-8,-5 9. 1@-34,-1 " +
  "1@-37,-1 10. 2@-12,-5 2@-12,2 11. 1@-40,-1 1@-43,-1 12. 2@-15,1 2@-19,2 13. 1@-46,-1 1@-49,-1 14. 1@-13,-2 2@-23,2 " +
  "15. 1@-52,-1 1@-55,-1 16. 2@-27,2 2@-30,1 17. 1@-58,-1 1@-61,-1 18. 1:-2,2>2:0,2 2@-35,2 19. 1@-64,-1 *") + "&at=36";

/** Why the tests cannot run here, or "" when they can: no preview, or a preview with no engine files. */
export async function noReview(page: Page): Promise<string> {
  if (!CYANOTYPE) return "CYANOTYPE_BASE_URL gives no Cyanotype preview";
  const manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json()).catch(() => null);
  return manifest?.artifacts?.some((a: { kind: string }) => a.kind === "model") ? ""
    : "Cyanotype's preview has no engine files: run `npm run engine` in apps/cyanotype before its build";
}

/** Reviews the test game in `page`, with the engine on at Lite and the display settings `display`, and waits for the
 *  review's end. */
export async function reviewTestGame(page: Page, display: object = {}) {
  await page.goto(new URL("/about", CYANOTYPE).href);
  await page.evaluate(([e, d, shown]) => {
    localStorage.setItem(e, JSON.stringify({ on: true, review: "lite", visits: 512 }));
    localStorage.setItem(d, JSON.stringify(shown));
  }, [ENGINE, DISPLAY, display] as const);
  await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord())}`, CYANOTYPE).href);
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 20 * 60_000 });
}
