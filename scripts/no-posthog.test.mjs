import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { check } from "./no-posthog.mjs";

const script = join(import.meta.dirname, "no-posthog.mjs");

/** A build in a folder of its own with these files, removed after the test. */
function build(t, files) {
  const dir = mkdtempSync(join(tmpdir(), "no-posthog-"));
  t.after(() => rmSync(dir, { recursive: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

test("a build whose scripts hold none of PostHog's code passes, and a page that names PostHog does not count", t => {
  const dir = build(t, {
    "privacy.html": '<a href="https://posthog.com/privacy">PostHog</a> at https://us.i.posthog.com',
    "_app/immutable/chunks/a.js": 'export const site = "PostHog";',
    "_app/immutable/entry/b.mjs": "export {};",
  });
  const result = check(dir);
  assert.equal(result.ok, true);
  assert.match(result.lines[0], /: 2 scripts, none with PostHog's code\./);
});

test("each script with PostHog's address or its client's extensions is named", t => {
  const result = check(build(t, {
    "_app/immutable/chunks/posthog.js": 'const host = "https://us.i.posthog.com";',
    "_app/immutable/chunks/ext.js": "window.__PosthogExtensions__ = {};",
    "_app/immutable/chunks/other.js": "export {};",
  }));
  assert.equal(result.ok, false);
  assert.deepEqual(result.lines.map(l => l.match(/: (\S+) holds/)[1]).sort(),
                   ["_app/immutable/chunks/ext.js", "_app/immutable/chunks/posthog.js"]);
});

test("a build with no scripts, or none at all, fails: no build is not a pass", t => {
  const dir = build(t, { "index.html": "<p></p>" });
  assert.equal(check(dir).ok, false);
  assert.equal(check(join(dir, "build")).ok, false);
});

test("the command fails on PostHog's code, and passes without it", t => {
  const dir = build(t, { "_app/a.js": "export {};", "_app/b.js": 'fetch("https://us.i.posthog.com/e/")' });
  const found = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
  assert.equal(found.status, 1);
  assert.match(found.stderr, /_app\/b\.js holds PostHog's code/);
  rmSync(join(dir, "_app/b.js"));
  const none = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
  assert.equal(none.status, 0);
  assert.match(none.stdout, /: 1 script, none/);
});
