// Checks the Export menu's shared deliveries (exports.ts): the note after a review's link, and what the review's link
// and the Analysis board's exports copy. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyReviewLink, deliverBoardExport, shareNote, type BoardExport } from "./exports.ts";

/** The clipboard, as the browser gives it: the texts written to it. */
const copied: string[] = [];
Object.defineProperty(globalThis.navigator, "clipboard", {
  value: { writeText: async (text: string) => { copied.push(text); } }, configurable: true,
});

const BOARD: BoardExport = {
  link: () => "https://example.org/analysis#packed=AAAA",
  file: async () => ({ format: "test" }),
  fileName: () => "analysis.json",
  annotated: () => "1. a b *",
};

test("the note after a link is copied warns past a Discord message's limit", () => {
  assert.match(shareNote(653), /^Link copied \(653 characters\)/);
  assert.match(shareNote(2400), /2,400 characters.*or send the review file\.$/);
  assert.match(shareNote(2400, false), /Delete some variations\.$/);
});

test("a review's link is copied, with its length and its note", async () => {
  copied.length = 0;
  const link = `https://example.org/review#packed=${"A".repeat(2100)}`;
  assert.deepEqual(await copyReviewLink(link), { linkLength: link.length, note: shareNote(link.length) });
  assert.deepEqual(copied, [link]);
});

test("the Analysis board's link is copied with its length alone, and its record as the annotated text", async () => {
  copied.length = 0;
  assert.deepEqual(await deliverBoardExport("share_link", BOARD), { linkLength: BOARD.link().length });
  assert.equal(await deliverBoardExport("record_copy", BOARD), undefined);
  assert.deepEqual(copied, [BOARD.link(), "1. a b *"]);
});
