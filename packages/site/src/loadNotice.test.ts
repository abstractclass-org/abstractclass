// Checks how the build puts the notice's script in a page (loadNotice.ts, withLoadNotice). The browser tests check
// the notice itself on both sites (apps/hedgeschool/tests/load-notice.spec.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LOAD_NOTICE, LOAD_NOTICE_MARK, LOAD_NOTICE_SCRIPT, withLoadNotice } from "./loadNotice.ts";

test("the script takes the place of the mark in the page's head", () => {
  const html = withLoadNotice({ html: `<html><head>${LOAD_NOTICE_MARK}<title>t</title></head><body></body></html>` });
  assert.equal(html, `<html><head>${LOAD_NOTICE_SCRIPT}<title>t</title></head><body></body></html>`);
  assert.ok(LOAD_NOTICE_SCRIPT.includes(JSON.stringify(LOAD_NOTICE.text)));
  assert.ok(LOAD_NOTICE_SCRIPT.includes(JSON.stringify(LOAD_NOTICE.action)));
});

test("a head without the mark stops the build, and a later part of a page passes", () => {
  assert.throws(() => withLoadNotice({ html: "<html><head></head><body></body></html>" }), /load-notice/);
  assert.equal(withLoadNotice({ html: "<p>later</p></body></html>" }), "<p>later</p></body></html>");
});

test("the script is one script element that the head can hold", () => {
  assert.equal(LOAD_NOTICE_SCRIPT.match(/<\/script>/g)?.length, 1);
  assert.ok(!LOAD_NOTICE_SCRIPT.includes("<!--"));
  // It parses as JavaScript.
  new Function(LOAD_NOTICE_SCRIPT.replace(/^<script>|<\/script>$/g, ""));
});
