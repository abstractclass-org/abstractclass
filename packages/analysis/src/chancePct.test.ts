// A chance as text (model.ts, chancePct): "100.0%" and "0.0%" only for an exact 1 and 0, a decided game. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chancePct } from "./model.ts";

test("a chance that one decimal rounds to 0.0 or 100.0 reads <0.1% or >99.9%, unless it is exact", () => {
  const texts: [number, string][] = [
    [0, "0.0%"], [0.0004, "<0.1%"], [0.0005, "0.1%"], [0.5, "50.0%"],
    [0.9994, "99.9%"], [0.9995, ">99.9%"], [0.9999, ">99.9%"], [1, "100.0%"],
  ];
  for (const [chance, text] of texts) assert.equal(chancePct(chance), text, `${chance}`);
});

test("the other player's chance near an end reads by the same rule", () => {
  // As the page writes it: 1 less the stored chance, with its floating-point error
  for (const [blueWin, text] of [[0.9996, "<0.1%"], [0.0004, ">99.9%"], [1, "0.0%"], [0, "100.0%"]] as const)
    assert.equal(chancePct(1 - blueWin), text, `1 - ${blueWin}`);
});
