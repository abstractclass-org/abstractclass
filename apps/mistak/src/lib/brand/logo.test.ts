// Checks Mistak's logo (design 34, "The site's frame"): its drawings, the favicon's file and the partners' copy for
// their buttons, which must stay the simple drawing (scripts/brand.mjs writes both), and the link preview picture's
// drawing. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { drawingDocument, drawingMarkup } from "@abstractclass/site/brandGradient.ts";
import { card } from "./card.ts";
import { BUTTON_HEAD_SVG, FAVICON_SVG, LARGE_FROM, LOGO_LARGE, LOGO_SMALL, logoAt, PINE, TOUCH_ICON } from "./logo.ts";

const CREAM = "#efe8d8";
const ids = (svg: string) => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const references = (svg: string) => [...svg.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]);
/** A drawing's shapes after its tile: each one's place, size and corners. */
const places = (drawing: typeof LOGO_LARGE) =>
  drawing.slice(1).map(([, a]) => [a.x, a.y, a.width, a.height, a.rx]);

test("the favicon's file draws the logo's simple drawing", () => {
  assert.equal(readFileSync("src/lib/assets/favicon.svg", "utf8"), FAVICON_SVG);
  assert.match(FAVICON_SVG, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100"/);
});

test("the partners' copy for their buttons draws the logo's simple drawing", () => {
  assert.equal(readFileSync("static/brand/mistak.svg", "utf8"), BUTTON_HEAD_SVG);
  assert.ok(BUTTON_HEAD_SVG.includes(drawingMarkup(LOGO_SMALL, "head", "\n  ")));
  assert.match(BUTTON_HEAD_SVG, /mistak\.abstractclass\.org\/developers#buttons/);
});

test("the simple drawing serves below the size where the full one starts", () => {
  assert.equal(logoAt(LARGE_FROM - 1), LOGO_SMALL);
  assert.equal(logoAt(LARGE_FROM), LOGO_LARGE);
});

test("each drawing starts with the pine tile and has no broken number", () => {
  for (const drawing of [LOGO_SMALL, LOGO_LARGE, TOUCH_ICON]) {
    assert.equal(drawing[0][0], "rect");
    assert.equal(drawing[0][1].fill, PINE);
    assert.doesNotMatch(drawingDocument(drawing, 100, "logo"), /NaN|undefined/);
  }
});

test("each stone stays inside the tile, and no two stones touch", () => {
  for (const drawing of [LOGO_SMALL, LOGO_LARGE]) {
    const stones = places(drawing).map(p => p.map(Number));
    for (const [x, y, w, h] of stones) assert.ok(x >= 0 && y >= 0 && x + w <= 100 && y + h <= 100, `${x},${y}`);
    const byHeight = [...stones].sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < byHeight.length; i++) assert.ok(byHeight[i - 1][1] + byHeight[i - 1][3] < byHeight[i][1]);
  }
});

test("the full drawing: the capstone, then three flat stones of one size, each moved sideways", () => {
  assert.deepEqual(LOGO_LARGE[0][1], { width: 100, height: 100, rx: 18, fill: PINE });
  assert.deepEqual(places(LOGO_LARGE),
    [[49, 12, 20, 28, 9], [12, 43, 62, 12, 6], [26, 59, 62, 12, 6], [13, 75, 62, 12, 6]]);
});

test("the simple drawing: the capstone, then two flat stones of one size", () => {
  assert.deepEqual(LOGO_SMALL[0][1], { width: 100, height: 100, rx: 18, fill: PINE });
  assert.deepEqual(places(LOGO_SMALL), [[49, 13, 22, 30, 8], [12, 48, 64, 15, 6], [24, 68, 64, 15, 6]]);
});

test("the stones are cream, and the full drawing's lowest one fades to nothing at its right", () => {
  for (const drawing of [LOGO_SMALL, LOGO_LARGE.slice(0, -1)])
    for (const [, attrs, gradient] of drawing.slice(1)) {
      assert.equal(attrs.fill, CREAM);
      assert.equal(gradient, undefined);
    }
  const [, attrs, gradient] = LOGO_LARGE[LOGO_LARGE.length - 1];
  assert.equal(attrs.fill, undefined);
  assert.deepEqual(gradient?.stops, [[0, CREAM], [0.18, CREAM], [1, CREAM, 0]]);
});

test("two logos in one page have gradients with two ids, and each stone refers to its own", () => {
  const [header, about] = [drawingMarkup(LOGO_LARGE, "s1"), drawingMarkup(LOGO_LARGE, "s2")];
  assert.equal(ids(header).length, 1);
  assert.notDeepEqual(ids(header), ids(about));
  for (const svg of [header, about]) assert.deepEqual(references(svg), ids(svg));
});

test("the exported SVG files hold no id, so none can collide where one is embedded beside another", () => {
  for (const svg of [FAVICON_SVG, BUTTON_HEAD_SVG]) assert.deepEqual([...ids(svg), ...references(svg)], []);
});

test("the iOS icon fills its square with the pine: no corner is cut, and the fading stone lies on it", () => {
  assert.deepEqual(TOUCH_ICON[0], ["rect", { width: 100, height: 100, fill: PINE }]);
  assert.deepEqual(TOUCH_ICON.slice(1), LOGO_LARGE.slice(1));
});

test("the link preview picture is Open Graph's size and names the site, its game and its address", () => {
  const doc = card();
  assert.match(doc, /viewBox="0 0 1200 630"/);
  for (const words of ["Mistak", "Learn Tak", "mistak.abstractclass.org"]) assert.ok(doc.includes(words));
  assert.doesNotMatch(doc, /NaN|undefined/);
  assert.deepEqual(references(doc), ids(doc));
  assert.equal(ids(doc).length, 1);
});
