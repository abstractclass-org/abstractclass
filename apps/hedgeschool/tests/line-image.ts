// The checks of the image of a line (design 07, item 17) that both sites' specs share: Hedge School's
// (line-image-theme.spec.ts) and Cyanotype's (cyanotype-line-image.spec.ts). In the light theme, then in the dark theme
// on the same page, the move menu's "Copy static", "Save static" and "Save animated" each give an image whose caption's
// background is the theme's panel colour and whose board is the theme's board colour. The copied and the saved image
// have the same pixels. Where the browser refuses the copy, the note's "Save image" saves the copy's image, also after
// a change of theme. A change of theme while the site makes the animated image starts it again: each of its frames has
// the new theme. With LINE_IMAGE_DIR set, each image is also saved there, for a look.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "./page-log.ts";

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
 *  the bottom left corner, the board's at `boardAt` (fractions of the width, from the top left corner; by default 4
 *  pixels from it), and a digest of all its pixels. With LINE_IMAGE_DIR set, the first frame as a PNG too. */
const decode = (page: Page, file: Buffer, type: string, boardAt?: [number, number]) => page.evaluate(async ({ base64, type, look, boardAt }) => {
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
    const [bx, by] = boardAt ? boardAt.map(f => Math.round(f * w)) : [4, 4];
    frames.push({ panel: at(2, h - 3), board: at(bx, by),
                  digest: [...digest].map(b => b.toString(16).padStart(2, "0")).join("") });
    if (look && i === 0)
      first = [...new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer())];
  }
  decoder.close();
  return { frames, first };
}, { base64: file.toString("base64"), type, look: !!LOOK_DIR, boardAt });

/** Chooses `item` in the move menu's Generate image submenu, of the move `move`. */
async function generate(page: Page, move: number, item: string) {
  await page.locator(".mv").nth(move).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Generate image" }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

/** The file that a download gives, when `act` starts it. With `name`, its name is checked too. */
async function downloaded(page: Page, act: Promise<unknown>, name?: string): Promise<Buffer> {
  const [file] = await Promise.all([page.waitForEvent("download"), act]);
  if (name) expect.soft(file.suggestedFilename(), "the saved file's name").toBe(name);
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

/** Changes the page to the theme `other` when the site draws the next image's first board
 *  (@abstractclass/review/boardImage.ts, the board's `decode`), as if the player chose that theme while the site made
 *  the image. */
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

/** What a site's images need besides: where the board's colour shows (decode's `boardAt`), and the saved files' names
 *  (`name`: the static image's; the animated image's has -animated.gif in place of .png). */
export interface ImageChecks { boardAt?: [number, number]; name?: string }

/** In each theme in turn, on the open page: the images of the move `move` (a line of one move or more). */
export async function expectThemedImages(page: Page, place: string, move: number, { boardAt, name }: ImageChecks = {}) {
  for (const [theme, other] of [["light", "dark"], ["dark", "light"]] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const want = await tokens(page);
    const copy = await copied(page, move), save = await downloaded(page, generate(page, move, "Save static"), name);
    const refused = await savedAfterRefusedCopy(page, move, other);
    await setTheme(page, theme);
    await changeThemeAtFirstBoard(page, other);
    const gif = await downloaded(page, generate(page, move, "Save animated"), name?.replace(/\.png$/, "-animated.gif"));
    await expect(page.locator("html"), `${place}, ${theme}: the change of theme`).toHaveAttribute("data-theme", other);
    const changed = await tokens(page);
    await setTheme(page, theme);
    saveForLook(`${place}-${theme}-copied.png`, copy);
    saveForLook(`${place}-${theme}-saved.png`, save);
    saveForLook(`${place}-${theme}-after-refused-copy.png`, refused);
    saveForLook(`${place}-${theme}-to-${other}-animated.gif`, gif);
    const images = { copied: await decode(page, copy, "image/png", boardAt), saved: await decode(page, save, "image/png", boardAt),
                     "after a refused copy": await decode(page, refused, "image/png", boardAt) };
    // Soft checks: a fault fails each check that it breaks, not only the first one.
    for (const [name, image] of Object.entries(images)) {
      const { panel, board, digest } = image.frames[0], at = `${place}, ${theme}: the ${name} image`;
      expect.soft(panel, `${at}, its caption`).toBe(want.panel);
      expect.soft(board, `${at}, its board`).toBe(want.board);
      expect.soft(digest, `${at}, its pixels`).toBe(images.saved.frames[0].digest);
    }
    const animated = await decode(page, gif, "image/gif", boardAt), at = `${place}, ${theme} then ${other}: the animated image`;
    saveForLook(`${place}-${theme}-to-${other}-animated-frame1.png`, animated.first);
    expect(animated.frames.length, `${at}'s frames`).toBeGreaterThan(2);
    const looks = new Set(animated.frames.map(({ panel, board }) => `${panel} ${board}`));
    expect.soft([...looks], `${at}, one theme in all frames`).toHaveLength(1);
    expect.soft(animated.frames[0].panel, `${at}, its caption in the new theme`).toBe(changed.panel);
    expect.soft(animated.frames[0].board, `${at}, its board in the new theme`).toBe(changed.board);
  }
}
