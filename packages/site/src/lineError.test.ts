// Checks the error that carries the site's own line (lineError.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LineError, lineOf } from "./lineError.ts";

test("a LineError's line shows as it is, and any other error gives the page's own line", () => {
  const line = "The browser did not open partner.example. Let this site open pop-ups. Then try again.";
  assert.equal(lineOf(new LineError(line), "The site did not complete the export. Try again."), line);
  assert.equal(new LineError(line).message, line);
  assert.equal(lineOf(new Error("Document is not focused."), "The site did not complete the export. Try again."),
               "The site did not complete the export. Try again.");
  assert.equal(lineOf("a string", "The page's line."), "The page's line.");
});
