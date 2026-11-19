// Checks the error that carries the site's own line (lineError.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LineError } from "./lineError.ts";

test("a LineError carries its line, and its message is the same line", () => {
  const line = "The browser did not open partner.example. Let this site open pop-ups. Then try again.";
  const e = new LineError(line);
  assert.equal(e.line, line);
  assert.equal(e.message, line);
  assert.equal(e.name, "LineError");
  assert.ok(e instanceof Error);
});
