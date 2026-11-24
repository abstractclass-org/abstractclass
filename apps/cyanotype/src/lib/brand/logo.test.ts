// Checks Cyanotype's logo (design 33, "The logo"): its drawing, the favicon's file and the partners' copy for their
// buttons, which must stay the logo (scripts/brand.mjs writes both), and the link preview picture's drawing.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TOUCHING } from "#lib/board/hex.ts";
import { card, CELLS } from "./card.ts";
import { BUTTON_HEAD_SVG, FAVICON_SVG, FILE_VIEW, LOGO, LOGO_CELLS, PRUSSIAN_BLUE, scaled, shapeMarkup, svgDocument,
         TOUCH_ICON } from "./logo.ts";

test("the favicon's file draws the logo", () => {
  assert.equal(readFileSync("src/lib/assets/favicon.svg", "utf8"), FAVICON_SVG);
  assert.match(FAVICON_SVG, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100"/);
  assert.ok(FAVICON_SVG.includes(shapeMarkup(LOGO, "\n  ")));
});

test("the partners' copy for their buttons draws the logo", () => {
  assert.equal(readFileSync("static/brand/cyanotype.svg", "utf8"), BUTTON_HEAD_SVG);
  assert.ok(BUTTON_HEAD_SVG.includes(shapeMarkup(LOGO, "\n  ")));
  assert.match(BUTTON_HEAD_SVG, /cyanotype\.abstractclass\.org\/developers#buttons/);
});

test("each drawing starts with the blue tile and has no broken number", () => {
  for (const shapes of [LOGO, TOUCH_ICON]) {
    assert.equal(shapes[0][0], "rect");
    assert.equal(shapes[0][1].fill, PRUSSIAN_BLUE);
    assert.doesNotMatch(svgDocument(shapes), /NaN|undefined/);
  }
});

test("the logo draws its file's cells, scaled from the file's view of 156 to the view of 100", () => {
  const paths = LOGO.slice(1);
  assert.equal(paths.length, LOGO_CELLS.length);
  paths.forEach(([tag, attrs], i) => {
    assert.equal(tag, "path");
    const drawn = String(attrs.d).slice(1, -1).split("L").map(p => p.split(",").map(Number));
    const file = LOGO_CELLS[i].split(" ").map(p => p.split(",").map(Number));
    assert.equal(drawn.length, 6);
    drawn.forEach(([x, y], k) => {
      assert.ok(Math.abs(x - file[k][0] * 100 / FILE_VIEW) <= 0.0005 && Math.abs(y - file[k][1] * 100 / FILE_VIEW)
                <= 0.0005, `cell ${i}, corner ${k}`);
    });
  });
  assert.equal(LOGO[0][1].rx, scaled(4.2));
});

test("the logo's cells are hexagons with a point at the top, in the tile, with gaps between them", () => {
  const cells = LOGO_CELLS.map(points => points.split(" ").map(p => p.split(",").map(Number)));
  const centres = cells.map(c => [c[0][0], (c[0][1] + c[3][1]) / 2]);
  cells.forEach((corners, i) => {
    assert.equal(corners.length, 6);
    assert.ok(Math.abs(corners[0][0] - corners[3][0]) < 0.01, `cell ${i}: a point at the top, one at the bottom`);
    for (const [x, y] of corners) {
      assert.ok(Math.abs(Math.hypot(x - centres[i][0], y - centres[i][1]) - 27.3) < 0.01, `cell ${i}: regular`);
      assert.ok(x > 0 && x < FILE_VIEW && y > 0 && y < FILE_VIEW, `cell ${i}: in the tile`);
    }
  });
  // Two hexagons of this size touch at 27.3 × √3 between their centres, so a gap needs more.
  for (let i = 0; i < centres.length; i++) for (let j = i + 1; j < centres.length; j++)
    assert.ok(Math.hypot(centres[i][0] - centres[j][0], centres[i][1] - centres[j][1]) > 27.3 * Math.sqrt(3) + 1,
              `cells ${i} and ${j} keep a gap`);
});

test("the iOS icon fills its square: its tile is the whole view, with square corners", () => {
  assert.deepEqual(TOUCH_ICON[0], ["rect", { width: 100, height: 100, fill: PRUSSIAN_BLUE }]);
});

test("the link preview picture is Open Graph's size and names the site, its game and its address", () => {
  const doc = card();
  assert.match(doc, /viewBox="0 0 1200 630"/);
  for (const words of ["Cyanotype", "Learn Blueprints", "cyanotype.abstractclass.org"]) assert.ok(doc.includes(words));
  assert.ok(doc.includes(shapeMarkup(LOGO)), "the logo");
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
