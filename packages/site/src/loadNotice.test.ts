// Checks how the build puts the notice's scripts in a page (loadNotice.ts, withLoadNotice). The browser tests check
// the notice itself on both sites (apps/hedgeschool/tests/load-notice.spec.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LOAD_LINKS_MARK, LOAD_LINKS_SCRIPT, LOAD_NOTICE, LOAD_NOTICE_MARK, LOAD_NOTICE_SCRIPT, withLoadNotice }
  from "./loadNotice.ts";

test("each script takes the place of its mark in the page's head", () => {
  const html = withLoadNotice({
    html: `<html><head>${LOAD_LINKS_MARK}<link rel="modulepreload">${LOAD_NOTICE_MARK}</head><body></body></html>`,
  });
  assert.equal(html,
    `<html><head>${LOAD_LINKS_SCRIPT}<link rel="modulepreload">${LOAD_NOTICE_SCRIPT}</head><body></body></html>`);
  assert.ok(LOAD_NOTICE_SCRIPT.includes(JSON.stringify(LOAD_NOTICE.text)));
  assert.ok(LOAD_NOTICE_SCRIPT.includes(JSON.stringify(LOAD_NOTICE.action)));
});

test("a head without each mark stops the build, and a later part of a page passes", () => {
  assert.throws(() => withLoadNotice({ html: "<html><head></head><body></body></html>" }), /load-notice/);
  assert.throws(() => withLoadNotice({ html: `<html><head>${LOAD_NOTICE_MARK}</head></html>` }), /load-notice-links/);
  assert.throws(() => withLoadNotice({ html: `<html><head>${LOAD_LINKS_MARK}</head></html>` }), /load-notice -->/);
  assert.equal(withLoadNotice({ html: "<p>later</p></body></html>" }), "<p>later</p></body></html>");
});

test("each script is one script element that the head can hold", () => {
  for (const script of [LOAD_NOTICE_SCRIPT, LOAD_LINKS_SCRIPT]) {
    assert.equal(script.match(/<\/script>/g)?.length, 1);
    assert.ok(!script.includes("<!--"));
    // It parses as JavaScript.
    new Function(script.replace(/^<script>|<\/script>$/g, ""));
  }
});
