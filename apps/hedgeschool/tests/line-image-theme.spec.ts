// The image of a line (design 07, item 17) has the look of the theme that the page shows when the player asks for it.
// In a review of tests/fixtures/hedgefund-review.json and on the Analysis board, the move menu's "Copy static", "Save
// static" and "Save animated" each give an image whose caption's background is the theme's panel colour and whose
// board is the theme's board colour, in the light theme, then in the dark theme on the same page (the theme "System",
// which follows the system's). The copied and the saved image have the same pixels. The engine is off. With
// LINE_IMAGE_DIR set, the spec also saves each image there, for a look. Run:
// npx playwright test tests/line-image-theme.spec.ts --project=chromium.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "./page-log.ts";
import { loadReviewFile } from "./review-file.ts";

const LOOK = process.env.LINE_IMAGE_DIR;
type Theme = "light" | "dark";

/** The page's panel and board colours now, as a canvas draws them ("rgb(r, g, b)"). */
const tokens = (page: Page) => page.evaluate(() => {
  const css = getComputedStyle(document.documentElement);
  const ctx = new OffscreenCanvas(1, 1).getContext("2d")!;
  const rgb = (name: string) => {
    ctx.fillStyle = css.getPropertyValue(name).trim();
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  };
  return { panel: rgb("--panel"), board: rgb("--board-bg") };
});

/** An image file decoded in the page, its first frame: the caption's background at the bottom left corner, the
 *  board's at the top left corner, a digest of all its pixels, and the frame as a PNG (base64). */
const decode = (page: Page, base64: string, type: string) => page.evaluate(async ({ base64, type }) => {
  const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type }));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const at = (x: number, y: number) => `rgb(${[...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)].join(", ")})`;
  const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
  const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].map(b => b.toString(16)).join("");
  const png = new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
  let frame = "";
  for (const b of png) frame += String.fromCharCode(b);
  return { panel: at(2, bitmap.height - 3), board: at(4, 4), digest, frame: btoa(frame) };
}, { base64, type });

/** Chooses `item` in the move menu's Generate image submenu, of the move `move`. */
async function generate(page: Page, move: number, item: string) {
  await page.locator(".mv").nth(move).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Generate image" }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

/** The file that `item` saves. */
async function saved(page: Page, move: number, item: string): Promise<Buffer> {
  const [file] = await Promise.all([page.waitForEvent("download"), generate(page, move, item)]);
  return readFileSync((await file.path())!);
}

/** The PNG that "Copy static" puts on the clipboard, as base64. */
async function copied(page: Page, move: number): Promise<string> {
  await generate(page, move, "Copy static");
  await expect(page.getByText("Image copied", { exact: true })).toBeVisible();
  return page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const bytes = new Uint8Array(await (await item.getType("image/png")).arrayBuffer());
    let text = "";
    for (const b of bytes) text += String.fromCharCode(b);
    return btoa(text);
  });
}

function keep(name: string, base64: string) {
  if (!LOOK) return;
  mkdirSync(LOOK, { recursive: true });
  writeFileSync(join(LOOK, name), Buffer.from(base64, "base64"));
}

/** In each theme in turn, on the open page: the three images of the move `move` (a line of one edge or more). */
async function expectThemedImages(page: Page, place: string, move: number) {
  for (const theme of ["light", "dark"] as Theme[]) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const want = await tokens(page);
    const copy = await copied(page, move), save = (await saved(page, move, "Save static")).toString("base64");
    const gif = (await saved(page, move, "Save animated")).toString("base64");
    keep(`${place}-${theme}-copied.png`, copy);
    keep(`${place}-${theme}-saved.png`, save);
    keep(`${place}-${theme}-animated.gif`, gif);
    const images = { copied: await decode(page, copy, "image/png"), saved: await decode(page, save, "image/png"),
                     animated: await decode(page, gif, "image/gif") };
    keep(`${place}-${theme}-animated-frame1.png`, images.animated.frame);
    for (const [name, image] of Object.entries(images))
      expect({ panel: image.panel, board: image.board }, `${place}, ${theme}: the ${name} image`).toEqual(want);
    expect(images.copied.digest, `${place}, ${theme}: the copied and the saved image`).toBe(images.saved.digest);
  }
}

test.beforeEach(async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ games: "denied" }));
    localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false, gpu: "off" }));
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1376, height: 952 });
});

test("a review's images follow the theme that the page shows", async ({ page }) => {
  await page.goto("/review");
  await loadReviewFile(page, "tests/fixtures/hedgefund-review.json");
  await page.waitForURL(/#game=/);
  await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
  await page.keyboard.press("Home");
  await expectThemedImages(page, "review", 9); // the line of the game's first 10 edges
});

test("the Analysis board's images follow the theme that the page shows", async ({ page }) => {
  await page.goto(`/analysis#${new URLSearchParams({ record: "1. D10-G10 2. N11-Q10 L10-N11 *" })}`);
  await expect(page.getByRole("button", { name: "Export" }).first()).toBeEnabled({ timeout: 120_000 });
  await page.keyboard.press("Home");
  await expectThemedImages(page, "analysis", 2); // the line of the record's 3 edges
});
