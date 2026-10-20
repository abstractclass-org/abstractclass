// The note under the review's progress while the review has work to run (design 06, item 7): "A review in a hidden tab
// can be slower.", and its title says why. Where the line is cut, the title gives the line in full before the reason.
// At the browser's text size (16 pixels) the line fits its column at every window width (206 of 216 pixels in the
// narrowest), so a larger text size cuts it, as a player's browser setting would. The review is of
// tests/fixtures/hedgefund-review.json's game, from no stored result, in a window 360 pixels wide. Run: npm run
// test:layout (the site running first).
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const record = JSON.parse(readFileSync("tests/fixtures/hedgefund-review.json", "utf8")).record as string;
const LINE = "A review in a hidden tab can be slower.";
const WHY = "When you cannot see this tab, the browser can give the review less processor time.";

for (const [size, cut] of [["16px", false], ["24px", true]] as const) {
  test(`the hidden tab's note at a text size of ${size}: ${cut ? "cut, its title gives it in full" : "whole, its title says why"}`,
       async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    // The browser's text size: the root's font size, which the site leaves to the browser. Each page of the import
    // takes it: the import loads the review in a new document.
    await page.addInitScript(px => {
      document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.fontSize = px; });
    }, size);
    await page.goto(`/import#record=${encodeURIComponent(record)}`);
    const note = page.getByText(LINE);
    await expect(note).toBeVisible({ timeout: 120_000 }); // once the engine's network has loaded
    expect(await note.evaluate(e => e.scrollWidth > e.clientWidth)).toBe(cut);
    await note.hover();
    await expect(note).toHaveAttribute("title", cut ? `${LINE} ${WHY}` : WHY);
  });
}
