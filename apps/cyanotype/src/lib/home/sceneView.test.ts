import { test } from "node:test";
import assert from "node:assert/strict";
import type { BoardMove } from "../board/position.ts";
import { momentBox, sceneBox, sceneViews, type SceneFrame } from "./sceneView.ts";

const place = (at: [number, number], captured: [number, number][] = []): BoardMove => ({
  type: "place", player: 0, blueprint: 1, at, footprint: [{ hex: at, kind: "plain" }],
  captured: captured.map(hex => ({ hex, owner: 1, kind: "plain" })),
});
const edit: BoardMove = { type: "edit", player: 1, kind: "plain", from: { blueprint: 1, hex: [0, 0] }, to: { blueprint: 2, hex: [9, 9] } };
const frame = (f: Partial<SceneFrame>): SceneFrame => ({ l: null, e: [], c: [], m: [], ...f });

test("a scene's view holds the hexes of its moves played, its candidates and its labelled moves", () => {
  // Hex (q, r) has its centre at (√3 (q + r/2), 1.5 r), and its shape reaches √3/2 across and 1 up and down.
  const box = sceneBox([
    frame({ l: place([0, 0]), c: [{ move: place([4, 0]) }] }),
    frame({ l: place([0, 2], [[-2, 2]]), e: [place([1, 0])], m: [{ move: place([0, -2]) }] }),
  ]);
  const h = Math.sqrt(3) / 2;
  assert.deepEqual(box, { x0: -Math.sqrt(3) - h, y0: -4, x1: 4 * Math.sqrt(3) + h, y1: 4 });
});

test("an edit and a pass touch no hex of the board", () => {
  const box = sceneBox([frame({ l: edit, c: [{ move: { type: "pass", player: 0 } }] }),
                        frame({ l: place([0, 0]) })]);
  assert.deepEqual(box, { x0: -Math.sqrt(3) / 2, y0: -1, x1: Math.sqrt(3) / 2, y1: 1 });
});

test("a scene that touches no hex has no view of its own", () => {
  assert.equal(sceneBox([frame({ l: edit })]), null);
});

test("the labelled move's view holds the turn's moves and labels, 2.5 hexes round them, and no candidate", () => {
  const w = Math.sqrt(3); // a hex's width
  const box = momentBox(frame({ l: place([0, 0], [[-5, 0]]), e: [place([2, 0])], m: [{ move: place([0, 0]) }],
                                c: [{ move: place([20, 0]) }] }));
  assert.deepEqual(box, { x0: -w / 2 - 2.5 * w, y0: -1 - 2.5 * w, x1: 2 * w + w / 2 + 2.5 * w, y1: 1 + 2.5 * w });
});

test("each frame keeps the scene's view, and the labelled move's moment takes its own when it draws on a hex", () => {
  const frames = [frame({ l: place([0, 0]), c: [{ move: place([20, 0]) }] }),
                  frame({ hold: "before", l: place([1, 0]), c: [{ move: place([2, 0]) }] }),
                  frame({ hold: "moment", l: place([2, 0]), m: [{ move: place([2, 0]) }] })];
  const wide = sceneBox(frames);
  assert.deepEqual(sceneViews(frames), [wide, wide, momentBox(frames[2])]);
  const edits = [frame({ l: place([0, 0]) }), frame({ hold: "moment", l: edit, m: [{ move: edit }] })];
  assert.deepEqual(sceneViews(edits), [sceneBox(edits), sceneBox(edits)]);
  assert.deepEqual(sceneViews([frame({ hold: "moment", l: edit, m: [{ move: edit }] })]), [null]);
});

test("a labelled edit, alone in its turn, has no closer view: its label is in its hand", () => {
  assert.equal(momentBox(frame({ l: edit, m: [{ move: edit }], c: [{ move: place([3, 0]) }] })), null);
});
