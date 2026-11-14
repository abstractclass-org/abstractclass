// The image of a line's frame (boardImage.ts): where the caption goes under the board, and the copy to the clipboard,
// with the browser's clipboard and ClipboardItem stood in for. The board's drawing and the GIF's frames need a browser:
// the browser tests check them (tests/line-image-theme.spec.ts, tests/cyanotype-line-image.spec.ts), and gif.test.ts
// checks the GIF. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { captionLayout, copyPng } from "./boardImage.ts";

test("the caption takes 2.2% of the width under the board, and the image's height holds its lines and the site's name", () => {
  const { pad, size, small, lead, height } = captionLayout(1200, 1200, 3, 30);
  assert.equal(pad, 36);
  assert.equal(size, 26.4);
  assert.equal(small, 0.75 * 26.4);
  assert.equal(lead, 1.45 * 26.4);
  assert.equal(height, Math.ceil(1200 + 36 + 3 * lead + 1.4 * small + 36));
});

test("a caption line too wide for 2.2% of the width takes a smaller size, which fits it between the paddings", () => {
  const { pad, size } = captionLayout(1200, 1200, 2, 60); // 60 sizes wide: 26.4 would need 1,584 pixels
  assert.equal(size, (1200 - 2 * pad) / 60);
});

test("the board's own height: a board that is not square puts the caption under its foot", () => {
  const square = captionLayout(1200, 1200, 2, 30), wide = captionLayout(1200, 900, 2, 30);
  assert.equal(square.height - wide.height, 300);
  assert.equal(wide.size, square.size);
});

/** Runs `run` with a clipboard whose write does `write`, or with none (`write` null), then puts the globals back. */
async function withClipboard<T>(write: ((items: unknown[]) => Promise<void>) | null, run: () => Promise<T>): Promise<T> {
  const g = globalThis as Record<string, unknown>;
  const had = { ClipboardItem: g.ClipboardItem, navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator") };
  g.ClipboardItem = class { items: Record<string, unknown>; constructor(items: Record<string, unknown>) { this.items = items; } };
  Object.defineProperty(globalThis, "navigator", { value: { clipboard: write ? { write } : undefined }, configurable: true });
  try {
    return await run();
  } finally {
    g.ClipboardItem = had.ClipboardItem;
    if (had.navigator) Object.defineProperty(globalThis, "navigator", had.navigator);
  }
}

const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });

test("copyPng writes the PNG's promise as one ClipboardItem, and says that it copied", async () => {
  const written: unknown[][] = [];
  const copied = await withClipboard(async items => void written.push(items), () => copyPng(Promise.resolve(png)));
  assert.equal(copied, true);
  assert.equal(written.length, 1);
  const [item] = written[0] as { items: Record<string, Promise<Blob>> }[];
  assert.equal(await item.items["image/png"], png);
});

test("copyPng says false where the browser refuses the image, or has no clipboard, once the image is made", async () => {
  const refuse = async () => { throw new DOMException("refused", "NotAllowedError"); };
  assert.equal(await withClipboard(refuse, () => copyPng(Promise.resolve(png))), false);
  assert.equal(await withClipboard(null, () => copyPng(Promise.resolve(png))), false);
});

test("an image that fails throws its own error, not the clipboard's", async () => {
  const refuse = async () => { throw new DOMException("refused", "NotAllowedError"); };
  const fails = () => Promise.reject(new Error("the browser made no image"));
  await assert.rejects(withClipboard(refuse, () => copyPng(fails())), /the browser made no image/);
  await assert.rejects(withClipboard(async () => {}, () => copyPng(fails())), /the browser made no image/);
});
