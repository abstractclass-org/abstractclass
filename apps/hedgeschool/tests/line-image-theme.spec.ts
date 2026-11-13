// The image of a line (design 07, item 17) has the look of the theme that the page shows when the player asks for it.
// In a review of tests/fixtures/hedgefund-review.json and on the Analysis board, the move menu's "Copy static", "Save
// static" and "Save animated" each give an image whose caption's background is the theme's panel colour and whose
// board is the theme's board colour, in the light theme, then in the dark theme on the same page (the theme "System",
// which follows the system's). The copied and the saved image have the same pixels. Where the browser refuses the
// copy, the note's "Save image" saves the copy's image, also after a change of theme. A change of theme while the site
// makes the animated image starts it again: each of its frames has the new theme. The engine is off. With
// LINE_IMAGE_DIR set, the spec also saves each image there, for a look. Run:
// npx playwright test tests/line-image-theme.spec.ts --project=chromium.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { keepBefore } from "./keep-before.ts";
import { expect, test, type Page } from "./page-log.ts";
import { loadReviewFile } from "./review-file.ts";

const LOOK_DIR = process.env.LINE_IMAGE_DIR;
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

/** Each frame of an image file, decoded in the page as a viewer shows it (a PNG has one): the caption's background at
 *  the bottom left corner, the board's at the top left corner, and a digest of all its pixels. With LINE_IMAGE_DIR set,
 *  the first frame as a PNG too. */
const decode = (page: Page, file: Buffer, type: string) => page.evaluate(async ({ base64, type, look }) => {
  const decoder = new ImageDecoder({ data: Uint8Array.from(atob(base64), c => c.charCodeAt(0)), type });
  await decoder.tracks.ready;
  await decoder.completed;
  const frames: { panel: string; board: string; digest: string }[] = [];
  let first: number[] = [];
  for (let i = 0; i < decoder.tracks.selectedTrack!.frameCount; i++) {
    const { image } = await decoder.decode({ frameIndex: i });
    const { displayWidth: w, displayHeight: h } = image, canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    image.close();
    const at = (x: number, y: number) => `rgb(${[...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)].join(", ")})`;
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", ctx.getImageData(0, 0, w, h).data));
    frames.push({ panel: at(2, h - 3), board: at(4, 4),
                  digest: [...digest].map(b => b.toString(16).padStart(2, "0")).join("") });
    if (look && i === 0)
      first = [...new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer())];
  }
  decoder.close();
  return { frames, first };
}, { base64: file.toString("base64"), type, look: !!LOOK_DIR });

/** Chooses `item` in the move menu's Generate image submenu, of the move `move`. */
async function generate(page: Page, move: number, item: string) {
  await page.locator(".mv").nth(move).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Generate image" }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

/** The file that a download gives, when `act` starts it. */
async function downloaded(page: Page, act: Promise<unknown>): Promise<Buffer> {
  const [file] = await Promise.all([page.waitForEvent("download"), act]);
  return readFileSync((await file.path())!);
}

/** The PNG that "Copy static" puts on the clipboard. */
async function copied(page: Page, move: number): Promise<Buffer> {
  await generate(page, move, "Copy static");
  await expect(page.getByText("Image copied", { exact: true })).toBeVisible();
  return Buffer.from(await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return [...new Uint8Array(await (await item.getType("image/png")).arrayBuffer())];
  }));
}

/** Changes the page to the theme `theme`, as the theme menu does (theme.svelte.ts sets the root's data-theme). */
const setTheme = (page: Page, theme: Theme) =>
  page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);

/** The PNG that the note's "Save image" saves, where the browser refuses "Copy static": the clipboard refuses the next
 *  write, and the page changes to the theme `other` before the player chooses "Save image". */
async function savedAfterRefusedCopy(page: Page, move: number, other: Theme): Promise<Buffer> {
  await page.evaluate(() => {
    const write = navigator.clipboard.write;
    navigator.clipboard.write = function () {
      navigator.clipboard.write = write;
      return Promise.reject(new DOMException("The test refuses the image.", "NotAllowedError"));
    };
  });
  await generate(page, move, "Copy static");
  await expect(page.getByText("This browser cannot copy an image. Save the image as a file.")).toBeVisible();
  await setTheme(page, other);
  return downloaded(page, page.getByRole("button", { name: "Save image" }).click());
}

/** Changes the page to the theme `other` when the site draws the next image's first board (boardImage.ts, the board's
 *  `decode`), as if the player chose that theme while the site made the image. */
const changeThemeAtFirstBoard = (page: Page, other: Theme) => page.evaluate(other => {
  const original = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function () {
    HTMLImageElement.prototype.decode = original;
    document.documentElement.dataset.theme = other;
    return original.call(this);
  };
}, other);

function saveForLook(name: string, data: Buffer | number[]) {
  if (!LOOK_DIR) return;
  mkdirSync(LOOK_DIR, { recursive: true });
  writeFileSync(join(LOOK_DIR, name), Buffer.from(data));
}

/** In each theme in turn, on the open page: the images of the move `move` (a line of one edge or more). */
async function expectThemedImages(page: Page, place: string, move: number) {
  for (const [theme, other] of [["light", "dark"], ["dark", "light"]] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const want = await tokens(page);
    const copy = await copied(page, move), save = await downloaded(page, generate(page, move, "Save static"));
    const refused = await savedAfterRefusedCopy(page, move, other);
    await setTheme(page, theme);
    await changeThemeAtFirstBoard(page, other);
    const gif = await downloaded(page, generate(page, move, "Save animated"));
    await expect(page.locator("html"), `${place}, ${theme}: the change of theme`).toHaveAttribute("data-theme", other);
    const changed = await tokens(page);
    await setTheme(page, theme);
    saveForLook(`${place}-${theme}-copied.png`, copy);
    saveForLook(`${place}-${theme}-saved.png`, save);
    saveForLook(`${place}-${theme}-after-refused-copy.png`, refused);
    saveForLook(`${place}-${theme}-to-${other}-animated.gif`, gif);
    const images = { copied: await decode(page, copy, "image/png"), saved: await decode(page, save, "image/png"),
                     "after a refused copy": await decode(page, refused, "image/png") };
    // Soft checks: a fault fails each check that it breaks, not only the first one.
    for (const [name, image] of Object.entries(images)) {
      const { panel, board, digest } = image.frames[0], at = `${place}, ${theme}: the ${name} image`;
      expect.soft(panel, `${at}, its caption`).toBe(want.panel);
      expect.soft(board, `${at}, its board`).toBe(want.board);
      expect.soft(digest, `${at}, its pixels`).toBe(images.saved.frames[0].digest);
    }
    const animated = await decode(page, gif, "image/gif"), at = `${place}, ${theme} then ${other}: the animated image`;
    saveForLook(`${place}-${theme}-to-${other}-animated-frame1.png`, animated.first);
    expect(animated.frames.length, `${at}'s frames`).toBeGreaterThan(2);
    const looks = new Set(animated.frames.map(({ panel, board }) => `${panel} ${board}`));
    expect.soft([...looks], `${at}, one theme in all frames`).toHaveLength(1);
    expect.soft(animated.frames[0].panel, `${at}, its caption in the new theme`).toBe(changed.panel);
    expect.soft(animated.frames[0].board, `${at}, its board in the new theme`).toBe(changed.board);
  }
}

test.beforeEach(async ({ page, context }) => {
  await keepBefore(page, "hedge-school:consent:2", { games: "denied" });
  await keepBefore(page, "learn-enclosure:engine:2", { on: false, gpu: "off" });
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
