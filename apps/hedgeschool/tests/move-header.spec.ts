// The analysis table's Move header ("Edge") on Hedge School (move-header.ts): the layout test's game
// (tests/fixtures/hedgefund-review.json), with the engine off, so that the table holds the review's stored candidates,
// at the position after move 20, on a phone 360 pixels wide. There M12-O13 is cut and the other names are smaller, and
// the open column is wider than the table's box. At 1,920 pixels the names have room, but M12-O13 is cut in its slot
// (4.1 em of its own size): the header shows its mark there too.
import { expect, test } from "./page-log.ts";
import { checkMoveHeader, readTable, tableBox, toMove } from "./move-header.ts";
import { openReviewFile } from "./review-file.ts";

const FIXTURE = "tests/fixtures/hedgefund-review.json";

test("the Edge header opens the table's Edge column on Hedge School", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openReviewFile(page, FIXTURE, { engine: { on: false }, consent: { games: "denied" } });
  await page.getByRole("tab", { name: "Analysis", exact: true }).click();
  await toMove(page, 20);
  const box = tableBox(page);
  await expect.poll(async () => (await readTable(box)).names.some(n => n.cut), { message: "M12-O13 is cut" }).toBe(true);
  await checkMoveHeader(page, "Edge");

  // At 1,920 pixels, the header shows its mark while a name is cut or smaller, and only then
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(async () => { const t = await readTable(tableBox(page)); return t.button === t.short; }).toBe(true);
});
