// Checks Cyanotype's logo (design 33, "The logo"): its drawings, the favicon's file, which must stay the simple drawing
// (scripts/brand.mjs writes it), and the link preview picture's drawing. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TOUCHING } from "#lib/board/hex.ts";
import { card, CELLS } from "./card.ts";
import { FAVICON_SVG, LARGE_FROM, LOGO_LARGE, LOGO_SMALL, logoAt, svgDocument, TOUCH_ICON } from "./logo.ts";

test("the favicon's file draws the logo's simple drawing", () => {
  assert.equal(readFileSync("src/lib/assets/favicon.svg", "utf8"), FAVICON_SVG);
  assert.match(FAVICON_SVG, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100"/);
});

test("the simple drawing serves below 48 pixels, the full one from there", () => {
  assert.equal(logoAt(LARGE_FROM - 1), LOGO_SMALL);
  assert.equal(logoAt(LARGE_FROM), LOGO_LARGE);
});

test("each drawing starts with the blue tile and has no broken number", () => {
  for (const shapes of [LOGO_SMALL, LOGO_LARGE, TOUCH_ICON]) {
    assert.equal(shapes[0][0], "rect");
    assert.equal(shapes[0][1].fill, "#163f6f");
    assert.doesNotMatch(svgDocument(shapes), /NaN|undefined/);
  }
});

test("the iOS icon fills its square: its tile is the whole view, with square corners", () => {
  assert.deepEqual(TOUCH_ICON[0], ["rect", { width: 100, height: 100, fill: "#163f6f" }]);
});

test("the link preview picture is Open Graph's size and names the site, its game and its address", () => {
  const doc = card();
  assert.match(doc, /viewBox="0 0 1200 630"/);
  for (const words of ["Cyanotype", "Learn Blueprints", "cyanotype.abstractclass.org"]) assert.ok(doc.includes(words));
  assert.doesNotMatch(doc, /NaN|undefined/);
});

test("the link preview picture's board could come from a game: no cell touches the opponent's, but for walls", () => {
  const at = new Map(CELLS.map(([[q, r], player, kind]) => [`${q},${r}`, { player, kind }]));
  for (const [[q, r], player, kind] of CELLS) for (const [dq, dr] of TOUCHING) {
    const other = at.get(`${q + dq},${r + dr}`);
    if (other && other.player !== player)
      assert.ok(kind === "wall" || other.kind === "wall", `${q},${r} touches the opponent's ${q + dq},${r + dr}`);
  }
});
