// The analysis table's Move header (the shared view, packages/review/src/ReviewView.svelte), for the browser tests of
// both sites. While a move in the table is smaller than its full size or cut, the header is a button that opens the
// Move column: each move at its full size, in a column as wide as the widest, and the table wider than its box, which
// then scrolls sideways. A second click closes it. It stays open from position to position.
import { expect, type Locator, type Page } from "@playwright/test";

/** The table's box in view: the box of the table whose header has "Visits". */
export const tableBox = (page: Page) => page.locator('div:has(> table:has(th:text-is("Visits")))').filter({ visible: true }).first();

/** The table's names (each one's size, as a share of its cell's font size, and whether it is cut), the Move header's
 *  button, and whether the box scrolls sideways. */
export const readTable = (box: Locator) => box.evaluate(b => {
  const names = [...b.querySelectorAll<HTMLElement>("[data-name]")].map(s => {
    const range = document.createRange();
    range.selectNodeContents(s);
    return { size: parseFloat(getComputedStyle(s).fontSize) / parseFloat(getComputedStyle(s.parentElement!).fontSize),
             cut: range.getBoundingClientRect().width > s.clientWidth + 0.5 };
  });
  const button = b.querySelector("[data-move-head] button");
  return { names, short: names.some(n => n.size < 0.999 || n.cut), button: !!button, sideways: b.scrollWidth > b.clientWidth + 1 };
});

/** The position after move `k`: the start, then `k` steps by the keys, which the page takes while no control has the
 *  focus. */
export async function toMove(page: Page, k: number) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await page.keyboard.press("Home");
  for (let i = 0; i < k; i++) await page.keyboard.press("ArrowRight");
}

/** A click on the table's second row pins its line (the row's mark at its left), and a second click unpins it. */
async function pinRow(box: Locator) {
  const row = box.locator("tbody tr").nth(1), cell = row.locator("td").nth(1);
  await cell.click();
  await expect(row).toHaveClass(/inset_3px/);
  await cell.click();
  await expect(row).not.toHaveClass(/inset_3px/);
}

/** The Move header (its word: "Move", or Hedge School's "Edge") at the position on screen, where a move of the table is
 *  smaller than its full size or cut: the button and its mark, a row's pin, the open column, the next position (the
 *  keys → then ←, which the page takes while no control has the focus), and the close. */
export async function checkMoveHeader(page: Page, word: string) {
  const box = tableBox(page), head = box.locator("[data-move-head] button");
  let t = await readTable(box);
  expect(t.short, "a move of the table is smaller than its full size or cut").toBe(true);
  expect(t.button, "the header shows that it can open").toBe(true);
  await expect(head).toHaveAttribute("aria-expanded", "false");
  await expect(head).toHaveText(`${word}›`);
  expect(t.sideways).toBe(false);
  await pinRow(box);

  await head.click();
  await expect(head).toHaveAttribute("aria-expanded", "true");
  await expect.poll(async () => !(await readTable(box)).short, { message: "every move at its full size" }).toBe(true);
  expect((await readTable(box)).sideways, "the box scrolls sideways").toBe(true);
  await pinRow(box);

  await page.keyboard.press("ArrowRight");
  await expect(head).toHaveAttribute("aria-expanded", "true");
  await expect.poll(async () => !(await readTable(box)).short, { message: "open on the next position" }).toBe(true);
  await page.keyboard.press("ArrowLeft");

  await head.click();
  await expect(head).toHaveAttribute("aria-expanded", "false");
  t = await readTable(box);
  expect(t.sideways).toBe(false);
  expect(t.button).toBe(t.short);
}
