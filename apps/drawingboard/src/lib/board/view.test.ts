import { test } from "node:test";
import assert from "node:assert/strict";
import { boxOf, center, type Hex } from "./hex.ts";
import { FIT_MAX, fit, fitAround, pan, pinch, SCALE_MAX, SCALE_MIN, toArea, toPlane, viewBox, zoomAt, type Rect, type Size,
         type View } from "./view.ts";

/** The hexes whose shapes' boxes, in the area's pixels, overlap the rectangle, and the hexes not wholly in the area. */
function underAndOut(hexes: readonly Hex[], v: View, area: Size, cover: Rect) {
  const boxes = hexes.map(h => {
    const [x, y] = toArea(v, area, ...center(h)), hw = v.scale * Math.sqrt(3) / 2, hh = v.scale;
    return { x0: x - hw, x1: x + hw, y0: y - hh, y1: y + hh };
  });
  const e = 1e-6;
  return {
    under: boxes.filter(b => b.x1 > cover.x + e && b.x0 < cover.x + cover.width - e && b.y1 > cover.y + e && b.y0 < cover.y + cover.height - e).length,
    out: boxes.filter(b => b.x0 < -e || b.y0 < -e || b.x1 > area.width + e || b.y1 > area.height + e).length,
  };
}
/** A rectangle of hexes on the screen: the rows r0 to r1, each with the hexes whose columns (2q + r, half a hex's width
 *  apart) are from c0 to c1. */
function block(c0: number, c1: number, r0: number, r1: number): Hex[] {
  const out: Hex[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if ((c - r) % 2 === 0) out.push([(c - r) / 2, r]);
  return out;
}

const size = { width: 400, height: 300 };
const near = (a: readonly number[], b: readonly number[]) =>
  assert.ok(a.every((v, i) => Math.abs(v - b[i]) < 1e-9), `${a} is not ${b}`);

test("a fit shows the box whole and centred, by its tighter side", () => {
  const v = fit({ x0: -10, y0: -2, x1: 10, y1: 2 }, size, 0);
  assert.deepEqual(v, { cx: 0, cy: 0, scale: 20 }); // 400 px for 20 units across; the height has room
  near(viewBox(v, size), [-10, -7.5, 20, 15]);
  assert.equal(fit({ x0: 0, y0: 0, x1: 1, y1: 1 }, size, 0).scale, FIT_MAX); // a zoom goes further, to SCALE_MAX
  assert.equal(fit({ x0: 0, y0: 0, x1: 1000, y1: 1 }, size, 0).scale, SCALE_MIN);
});

test("the plane and the area map to each other", () => {
  const v = { cx: 3, cy: -2, scale: 10 };
  near(toPlane(v, size, 200, 150), [3, -2]);
  near(toArea(v, size, ...toPlane(v, size, 17, 250)), [17, 250]);
});

test("a drag moves the plane with the pointer", () => {
  const v = { cx: 0, cy: 0, scale: 10 };
  const before = toPlane(v, size, 100, 100);
  near(toPlane(pan(v, 30, -20), size, 130, 80), before);
});

test("a zoom keeps the point under the pointer, within the limits", () => {
  const v = { cx: 1, cy: 1, scale: 10 };
  const z = zoomAt(v, size, 2, 50, 260);
  assert.equal(z.scale, 20);
  near(toPlane(z, size, 50, 260), toPlane(v, size, 50, 260));
  assert.equal(zoomAt(v, size, 100, 0, 0).scale, SCALE_MAX);
  assert.equal(zoomAt(v, size, 0.001, 0, 0).scale, SCALE_MIN);
});

test("a pinch zooms by the fingers' distance, and the plane follows their midpoint", () => {
  const v = { cx: 0, cy: 0, scale: 10 };
  const p = pinch(v, size, { x: 100, y: 100, d: 50 }, { x: 140, y: 90, d: 100 });
  assert.equal(p.scale, 20);
  near(toPlane(p, size, 140, 90), toPlane(v, size, 100, 100));
  assert.deepEqual(pinch(v, size, { x: 0, y: 0, d: 0 }, { x: 0, y: 0, d: 40 }).scale, 10); // no distance at the start
});

test("a fit round a cover is the plain fit when no hex lies under the cover", () => {
  const area = { width: 800, height: 600 }, hexes = block(-6, 6, -2, 2);
  const cover = { x: 790, y: 0, width: 10, height: 10 }; // the corner, which the cells leave free
  assert.deepEqual(fitAround(hexes, area, cover, 1.2), fit(boxOf(hexes)!, area, 1.2));
});

test("a fit round a cover keeps every hex out from under it and in the area, at a smaller scale when it must", () => {
  const area = { width: 959, height: 819 }, hexes = block(-60, 60, -15, 15); // a board full of hexes
  const cover = { x: 627, y: 6, width: 326, height: 230 }; // the hands' panel in the top-right corner
  const plain = fit(boxOf(hexes)!, area, 1.2), v = fitAround(hexes, area, cover, 1.2);
  assert.ok(underAndOut(hexes, plain, area, cover).under > 0);
  assert.deepEqual(underAndOut(hexes, v, area, { x: cover.x - 4, y: cover.y - 4, width: cover.width + 8, height: cover.height + 8 }),
                   { under: 0, out: 0 }); // with the 4 pixels kept round the cover
  assert.ok(v.scale < plain.scale && v.scale > plain.scale / 2, `${v.scale} against ${plain.scale}`);
});

test("a fit round a cover can show the cover in a gap of the hexes", () => {
  // Two blocks with a gap between them as wide as the cover: the cover fits in it, and the fit keeps most of its scale.
  const area = { width: 1000, height: 400 }, hexes = [...block(-80, -24, -4, 4), ...block(24, 80, -4, 4)];
  const plain = fit(boxOf(hexes)!, area, 1.2), cover = { x: 460, y: 100, width: 80, height: 200 };
  const v = fitAround(hexes, area, cover, 1.2);
  assert.equal(underAndOut(hexes, v, area, cover).under, 0);
  assert.ok(v.scale > 0.9 * plain.scale, `${v.scale} against ${plain.scale}`);
});
