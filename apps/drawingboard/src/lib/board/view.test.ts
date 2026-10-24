import { test } from "node:test";
import assert from "node:assert/strict";
import { FIT_MAX, fit, pan, pinch, SCALE_MAX, SCALE_MIN, toArea, toPlane, viewBox, zoomAt } from "./view.ts";

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
