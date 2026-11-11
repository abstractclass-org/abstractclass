// Checks the Export menu's shared deliveries (exports.ts): the note after a review's link, and what the review's and
// the Analysis board's exports copy and save. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveObjectURL } from "node:buffer";
import { boardRecordNote, copyReviewLink, deliverBoardExport, deliverFileOrRecord, shareNote, type BoardExport }
  from "./exports.ts";

/** The clipboard, as the browser gives it: the texts written to it. */
const copied: string[] = [];
Object.defineProperty(globalThis.navigator, "clipboard", {
  value: { writeText: async (text: string) => { copied.push(text); } }, configurable: true,
});

/** The page, as far as a download uses it (download.ts): the files given to save, each with its name and its text. */
let saved: Promise<[string, string]>[] = [];
Object.defineProperty(globalThis, "document", {
  value: {
    createElement: () => ({
      click(this: { href: string; download: string }) {
        saved.push(resolveObjectURL(this.href)!.text().then(text => [this.download, text]));
      },
      remove() {},
    }),
    body: { append() {} },
  },
  configurable: true,
});
/** The files saved since the last call, each as its name and its text. */
const files = async () => { const all = await Promise.all(saved); saved = []; return all; };

const BOARD: BoardExport = {
  link: () => "https://example.org/analysis#packed=AAAA",
  file: async () => ({ format: "test" }),
  fileName: "test-analysis.json",
  annotated: () => "1. a b *",
};

test("the note after a link is copied warns past a Discord message's limit", () => {
  assert.match(shareNote(653), /^Link copied \(653 characters\)/);
  assert.match(shareNote(2400), /2,400 characters.*Delete some variations, or send the review file\.$/);
});

test("a review's link is copied, with its length and its note", async () => {
  copied.length = 0;
  const link = `https://example.org/review#packed=${"A".repeat(2100)}`;
  assert.deepEqual(await copyReviewLink(link), { linkLength: link.length, note: shareNote(link.length) });
  assert.deepEqual(copied, [link]);
});

test("a review's file is saved by its name, and its annotated record by that name with .txt", async () => {
  await deliverFileOrRecord("review_file", "game.json", async () => ({ format: "test" }), () => "1. a b *");
  await deliverFileOrRecord("record_file", "game.json", async () => ({ format: "test" }), () => "1. a b *");
  assert.deepEqual(await files(), [["game.json", '{"format":"test"}'], ["game.txt", "1. a b *"]]);
});

test("the Analysis board's link is copied with its length alone, its file saved, and its record copied or saved", async () => {
  copied.length = 0;
  assert.deepEqual(await deliverBoardExport("share_link", BOARD), { linkLength: BOARD.link().length });
  assert.equal(await deliverBoardExport("record_copy", BOARD), undefined);
  assert.deepEqual(copied, [BOARD.link(), "1. a b *"]);
  await deliverBoardExport("analysis_file", BOARD);
  await deliverBoardExport("record_file", BOARD);
  assert.deepEqual(await files(), [["test-analysis.json", '{"format":"test"}'], ["analysis.txt", "1. a b *"]]);
});

test("the Analysis board's record names the site and the network", () => {
  assert.equal(boardRecordNote("Test", "Lite", "b10c128"), "Test's Analysis board, with Lite (the network b10c128).");
});
