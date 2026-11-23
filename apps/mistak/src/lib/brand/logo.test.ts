// Checks Mistak's logo (design 34, "The site's frame"): its drawings, the favicon's file and the partners' copy for
// their buttons, which must stay the simple drawing (scripts/brand.mjs writes both), and the link preview picture's
// drawing. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shapeMarkup, svgDocument } from "@abstractclass/site/brand.ts";
import { card } from "./card.ts";
import { BUTTON_HEAD_SVG, FAVICON_SVG, LARGE_FROM, LOGO_LARGE, LOGO_SMALL, logoAt, PINE, TOUCH_ICON } from "./logo.ts";

test("the favicon's file draws the logo's simple drawing", () => {
  assert.equal(readFileSync("src/lib/assets/favicon.svg", "utf8"), FAVICON_SVG);
  assert.match(FAVICON_SVG, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100"/);
});

test("the partners' copy for their buttons draws the logo's simple drawing", () => {
  assert.equal(readFileSync("static/brand/mistak.svg", "utf8"), BUTTON_HEAD_SVG);
  assert.ok(BUTTON_HEAD_SVG.includes(shapeMarkup(LOGO_SMALL, "\n  ")));
  assert.match(BUTTON_HEAD_SVG, /mistak\.abstractclass\.org\/developers#buttons/);
});

test("the simple drawing serves below 48 pixels, the full one from there", () => {
  assert.equal(logoAt(LARGE_FROM - 1), LOGO_SMALL);
  assert.equal(logoAt(LARGE_FROM), LOGO_LARGE);
});

test("each drawing starts with the pine tile and has no broken number", () => {
  for (const shapes of [LOGO_SMALL, LOGO_LARGE, TOUCH_ICON]) {
    assert.equal(shapes[0][0], "rect");
    assert.equal(shapes[0][1].fill, PINE);
    assert.doesNotMatch(svgDocument(shapes), /NaN|undefined/);
  }
});

test("each stone stays inside the tile, and no two stones touch", () => {
  for (const shapes of [LOGO_SMALL, LOGO_LARGE]) {
    const stones = shapes.slice(1).map(([, a]) => [Number(a.x), Number(a.y), Number(a.width), Number(a.height)]);
    for (const [x, y, w, h] of stones) assert.ok(x >= 0 && y >= 0 && x + w <= 100 && y + h <= 100, `${x},${y}`);
    const byHeight = [...stones].sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < byHeight.length; i++) assert.ok(byHeight[i - 1][1] + byHeight[i - 1][3] < byHeight[i][1]);
  }
});

test("the iOS icon fills its square: its tile is the whole view, with square corners", () => {
  assert.deepEqual(TOUCH_ICON[0], ["rect", { width: 100, height: 100, fill: PINE }]);
});

test("the link preview picture is Open Graph's size and names the site, its game and its address", () => {
  const doc = card();
  assert.match(doc, /viewBox="0 0 1200 630"/);
  for (const words of ["Mistak", "Learn Tak", "mistak.abstractclass.org"]) assert.ok(doc.includes(words));
  assert.doesNotMatch(doc, /NaN|undefined/);
});
