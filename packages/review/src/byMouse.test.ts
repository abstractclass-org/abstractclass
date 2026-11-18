import { test } from "node:test";
import assert from "node:assert/strict";
import { byMouse } from "./byMouse.ts";

const event = (pointerType: string) => ({ pointerType }) as PointerEvent;

test("a mouse's event runs the handler, with the event", () => {
  const seen: PointerEvent[] = [];
  const ev = event("mouse");
  byMouse((e: PointerEvent) => seen.push(e))(ev);
  assert.deepEqual(seen, [ev]);
});

test("a touch's and a pen's events run nothing", () => {
  let runs = 0;
  const handler = byMouse(() => runs++);
  for (const type of ["touch", "pen", ""]) handler(event(type));
  assert.equal(runs, 0);
});
