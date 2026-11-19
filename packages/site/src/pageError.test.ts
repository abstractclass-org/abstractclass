// Checks which line the error page shows for each error, and what goes to the error report (pageError.ts). The browser
// tests check the page itself on both sites (apps/hedgeschool/tests/error-page.spec.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NOT_FOUND_LINE, NOT_LOADED_LINE, STOPPED_LINE, errorLine, notLoaded, pageErrors } from "./pageError.ts";
import { LOAD_NOTICE } from "./loadNotice.ts";

const address = "https://hedgeschool.org/_app/immutable/nodes/5.abc.js";

test("a module that did not load is known by each browser's words", () => {
  assert.ok(notLoaded(new TypeError(`Failed to fetch dynamically imported module: ${address}`))); // Chrome
  assert.ok(notLoaded(new TypeError(`error loading dynamically imported module: ${address}`))); // Firefox
  assert.ok(notLoaded(new TypeError("Importing a module script failed."))); // Safari
  assert.ok(notLoaded(new Error(`Unable to preload CSS for ${address}`))); // Vite
  assert.ok(!notLoaded(new TypeError("Cannot read properties of undefined (reading 'x')")));
  assert.ok(!notLoaded("Failed to fetch dynamically imported module"));
});

test("the page shows the load notice's words for a module that did not load, and its own line for the others", () => {
  assert.equal(errorLine(500, { status: 500, message: "Internal Error", notLoaded: true }), NOT_LOADED_LINE);
  assert.equal(NOT_LOADED_LINE.text, LOAD_NOTICE.text);
  assert.equal(NOT_LOADED_LINE.action, "reload");
  assert.equal(errorLine(404, { status: 404, message: "Not Found" }), NOT_FOUND_LINE);
  assert.equal(errorLine(500, { status: 500, message: "Internal Error", notLoaded: false }), STOPPED_LINE);
  assert.equal(errorLine(500, null), STOPPED_LINE);
});

test("each error that the code threw goes to the report, and the page learns its kind", () => {
  const reported: unknown[] = [];
  const handle = pageErrors(error => reported.push(error));
  const failed = new TypeError(`Failed to fetch dynamically imported module: ${address}`);
  const event = {} as Parameters<typeof handle>[0]["event"];
  assert.deepEqual(handle({ kind: "unknown", error: failed, event }), { notLoaded: true });
  const thrown = new Error("the load function failed");
  assert.deepEqual(handle({ kind: "unknown", error: thrown, event }), { notLoaded: false });
  // An address that the site does not have: SvelteKit's own error.
  assert.equal(handle({ kind: "framework", error: { status: 404, message: "Not Found" }, event }), undefined);
  assert.deepEqual(reported, [failed, thrown]);
});
