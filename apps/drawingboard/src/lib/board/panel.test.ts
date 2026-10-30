import { test } from "node:test";
import assert from "node:assert/strict";
import { boxOf, center, type Hex } from "./hex.ts";
import {
  CORNERS, FIRST_PLACE, FIRST_SIZE, fitWithPanel, handleSide, handsOf, INSET, MIN_SIZE, panelOf, panelRect, panelSizeIn,
  placeAt, resized,
} from "./panel.ts";
import { fit, toArea, type Rect } from "./view.ts";

// The hands' panel (panel.ts, design 33): its place in the board's area, its size, and the fit's choice of corner.
const area = { width: 959, height: 819 };
const zoom: Rect = { x: area.width - 6 - 98, y: area.height - 6 - 30, width: 98, height: 30 }; // the zoom's buttons
const meets = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const inside = (r: Rect) => r.x >= INSET - 1e-9 && r.y >= INSET - 1e-9 && r.x + r.width <= area.width - INSET + 1e-9
  && r.y + r.height <= area.height - INSET + 1e-9;

test("the panel's size holds two hands, each a row of three blueprints, and the smallest hand is 216 × 72 pixels", () => {
  assert.deepEqual(handsOf(FIRST_SIZE), { width: 312, height: 100 });
  assert.deepEqual(handsOf(panelOf({ width: 250, height: 80 })), { width: 250, height: 80 });
  assert.deepEqual(handsOf(MIN_SIZE), { width: 216, height: 72 });
});

test("the four corners are inside the area, and the bottom-right corner is above the zoom's buttons", () => {
  for (const c of CORNERS) {
    const r = panelRect(c, area, FIRST_SIZE, zoom);
    assert.ok(inside(r), JSON.stringify(r));
    assert.ok(!meets(r, zoom), JSON.stringify(r));
  }
  assert.deepEqual(panelRect(FIRST_PLACE, area, FIRST_SIZE, zoom), { x: area.width - INSET - FIRST_SIZE.width, y: INSET, ...FIRST_SIZE });
  const br = panelRect({ fx: 1, fy: 1 }, area, FIRST_SIZE, zoom);
  assert.equal(br.y + br.height, zoom.y - INSET);
});

test("a place from a drag's end gives back the panel's rectangle, and a drag past the edges stays inside", () => {
  const r = panelRect(placeAt(300, 200, area, FIRST_SIZE), area, FIRST_SIZE, zoom);
  assert.ok(Math.abs(r.x - 300) < 1e-9 && Math.abs(r.y - 200) < 1e-9, JSON.stringify(r));
  for (const [x, y] of [[-500, -500], [5000, 5000], [5000, -500], [-500, 5000]]) {
    const p = panelRect(placeAt(x, y, area, FIRST_SIZE), area, FIRST_SIZE, zoom);
    assert.ok(inside(p) && !meets(p, zoom), JSON.stringify(p));
  }
});

test("the panel's size stays between the smallest and what the area holds above the zoom's buttons", () => {
  assert.deepEqual(panelSizeIn({ width: 10, height: 10 }, area, zoom), MIN_SIZE);
  assert.deepEqual(panelSizeIn({ width: 5000, height: 5000 }, area, zoom),
                   { width: area.width - 2 * INSET, height: area.height - 3 * INSET - zoom.height });
  assert.deepEqual(panelSizeIn({ width: 400, height: 300 }, area, zoom), { width: 400, height: 300 });
});

test("the resize handle is on the side towards the area's middle, and the opposite corner stays", () => {
  const right = panelRect(FIRST_PLACE, area, FIRST_SIZE, zoom), left = panelRect({ fx: 0, fy: 0 }, area, FIRST_SIZE, zoom);
  assert.equal(handleSide(right, area), "left");
  assert.equal(handleSide(left, area), "right");
  // The panel in the top-right corner grows to the left and down: its right and top edges stay.
  const grown = resized(right, "left", -100, 50, area, zoom);
  assert.deepEqual(grown, { x: right.x - 100, y: right.y, width: right.width + 100, height: right.height + 50 });
  // The one in the top-left corner grows to the right.
  assert.deepEqual(resized(left, "right", 100, 0, area, zoom), { ...left, width: left.width + 100 });
  // Not below the smallest size, and not past the area's edge.
  const small = resized(right, "left", 1000, -1000, area, zoom);
  assert.deepEqual([small.width, small.height, small.x + small.width, small.y], [MIN_SIZE.width, MIN_SIZE.height, right.x + right.width, right.y]);
  const large = resized(right, "left", -5000, 5000, area, zoom);
  assert.ok(inside(large), JSON.stringify(large));
});

test("a resize stops at the zoom's buttons, so the panel does not move when the player lets go", () => {
  // In the lower-left corner, the panel grows to the right up to the buttons' room.
  const low = panelRect({ fx: 0, fy: 1 }, area, FIRST_SIZE, zoom), wide = resized(low, "right", 5000, 0, area, zoom);
  assert.equal(wide.x + wide.width, zoom.x - INSET);
  // On the right, over the buttons' columns, the panel grows down to the buttons' room.
  const mid = panelRect({ fx: 1, fy: 0.5 }, area, FIRST_SIZE, zoom), tall = resized(mid, "left", 0, 5000, area, zoom);
  assert.equal(tall.y + tall.height, zoom.y - INSET);
  for (const r of [wide, tall]) {
    assert.ok(inside(r) && !meets(r, zoom), JSON.stringify(r));
    const dropped = panelRect(placeAt(r.x, r.y, area, r), area, r, zoom);
    assert.ok(Math.abs(dropped.x - r.x) < 1e-9 && Math.abs(dropped.y - r.y) < 1e-9, JSON.stringify(dropped));
  }
});

/** The hexes whose shapes lie under the panel in the view that the fit gives. */
function under(hexes: Hex[], fitted: ReturnType<typeof fitWithPanel>) {
  const r = panelRect(fitted.place, area, FIRST_SIZE, zoom), v = fitted.view;
  return hexes.filter(h => {
    const [x, y] = toArea(v, area, ...center(h)), hw = v.scale * Math.sqrt(3) / 2;
    return x + hw > r.x && x - hw < r.x + r.width && y + v.scale > r.y && y - v.scale < r.y + r.height;
  }).length;
}
/** The hexes above a line across the screen from the lower left to the upper right: the lower-left corner is free. */
function upperRight(): Hex[] {
  const out: Hex[] = [];
  for (let r = -15; r <= 15; r++) for (let c = -60; c <= 60; c++)
    if ((c - r) % 2 === 0 && c * Math.sqrt(3) / 2 > 2 * 1.5 * r) out.push([(c - r) / 2, r]);
  return out;
}

test("the fit moves the panel to a corner that gives a larger board, and keeps every hex out from under it", () => {
  const hexes = upperRight(), plain = fit(boxOf(hexes)!, area, 1.2);
  const fitted = fitWithPanel(hexes, area, FIRST_SIZE, FIRST_PLACE, zoom, 1.2);
  assert.deepEqual(fitted.place, { fx: 0, fy: 1 }); // the lower-left corner, which the cells leave free
  assert.equal(fitted.view.scale, plain.scale);
  assert.equal(under(hexes, fitted), 0);
});

test("the panel stays where it is when its place gives the board's full size", () => {
  const hexes = upperRight(), place = { fx: 0, fy: 1 };
  assert.equal(fitWithPanel(hexes, area, FIRST_SIZE, place, zoom, 1.2).place, place);
  // A place in the middle, over the cells, moves to the corner.
  assert.deepEqual(fitWithPanel(hexes, area, FIRST_SIZE, { fx: 0.5, fy: 0.5 }, zoom, 1.2).place, { fx: 0, fy: 1 });
});
