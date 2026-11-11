import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { check, importsPlaywrightTest, refusal } from "./spec-page-log.mjs";

const script = join(import.meta.dirname, "spec-page-log.mjs");
/** A spec that takes its test from the page log. */
const FROM_PAGE_LOG = 'import { expect, test, type Page } from "./page-log.ts";\n';

/** A folder of test files with these files, removed after the test. */
function testFolder(t, files) {
  const dir = mkdtempSync(join(tmpdir(), "spec-page-log-"));
  t.after(() => rmSync(dir, { recursive: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

test("a test file that imports test from Playwright, or not from the page log, is refused with its name", t => {
  const dir = testFolder(t, {
    "good.spec.ts": FROM_PAGE_LOG,
    "bad.spec.ts": 'import { expect, test, type Page } from "@playwright/test";\n',
    "sub/also-bad.spec.ts": 'import {\n  expect,\n  test as base,\n} from \'@playwright/test\';\n',
    "named.test.ts": 'import { test } from "playwright/test";\n',
    "helper.spec.ts": 'import { test } from "./helper.ts";\n',
  });
  const result = check([dir]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.lines.map(l => l.match(/([^/]+\.(?:spec|test)\.ts) ([^.]+)\./).slice(1)).sort(), [
    ["also-bad.spec.ts", "imports test from @playwright/test"],
    ["bad.spec.ts", "imports test from @playwright/test"],
    ["helper.spec.ts", "does not import test from the page log"],
    ["named.test.ts", "imports test from playwright/test"],
  ]);
});

test("page-log.ts itself and a helper module that is not a test file are not read", t => {
  const dir = testFolder(t, {
    "a.spec.ts": FROM_PAGE_LOG,
    "page-log.ts": 'import { test as base } from "@playwright/test";\nexport const test = base.extend({});\n',
    "posthog.ts": 'import { test, type Page } from "@playwright/test";\n',
  });
  const result = check([dir]);
  assert.equal(result.ok, true);
  assert.match(result.lines[0], /^Test files read: 1\./);
});

test("the forms that take test itself from Playwright are found, and the ones that do not are not", () => {
  for (const text of [
    'import { test } from "@playwright/test";',
    'import {test as t, expect} from "@playwright/test"',
    'import { expect, test } from "@playwright/test";',
    'import{test}from"@playwright/test";',
    'import { default as t } from "@playwright/test";',
    'import * as pw from "@playwright/test";',
    'import pw from "@playwright/test";',
    'import pw, { expect } from "@playwright/test";',
    'export { test } from "@playwright/test";',
    'export * from "@playwright/test";',
    'import { test } from "playwright/test";',
    'import {\n  expect, // the page\'s checks\n  test,\n} from "@playwright/test";',
    // A comment that holds "/*" (a header's run line) before a doc comment does not hide the import
    '// Run: npx playwright test tests/*.spec.ts\nimport { test } from "@playwright/test";\n/** A helper. */\n',
  ]) assert.equal(importsPlaywrightTest(text), true, text);
  for (const text of [
    'import { expect } from "@playwright/test";',
    'import { expect as e } from "@playwright/test";',
    'import { expect, type Page } from "@playwright/test";',
    'import type { Locator } from "@playwright/test";',
    'import type { test } from "@playwright/test";',
    'import { type test } from "@playwright/test";',
    'import { testInfo, expect } from "@playwright/test";',
    'import { test } from "./page-log.ts";',
    '// import { test } from "@playwright/test";',
    '/* import { test } from "@playwright/test"; */',
    'import { expect } from "@playwright/test"; // not import { test } from "@playwright/test"',
    'export { expect } from "@playwright/test";',
    'const url = "http://127.0.0.1:4173/"; // import { test } from "@playwright/test"',
  ]) assert.equal(importsPlaywrightTest(text), false, text);
});

test("a test file passes only when it takes test from the page log", () => {
  assert.equal(refusal(FROM_PAGE_LOG), null);
  assert.equal(refusal('import { test as base, expect } from "../page-log.ts";'), null);
  assert.equal(refusal('import { expect } from "./page-log.ts";'), "does not import test from the page log");
  assert.equal(refusal('import type { test } from "./page-log.ts";'), "does not import test from the page log");
  assert.equal(refusal(FROM_PAGE_LOG + 'import { test as pw } from "@playwright/test";'),
               "imports test from @playwright/test");
});

test("a folder with no test files fails: nothing read is not a pass", t => {
  const dir = testFolder(t, { "page-log.ts": "export {};" });
  assert.equal(check([dir]).ok, false);
  assert.equal(check([join(dir, "missing")]).ok, false);
});

test("the command fails on a spec with Playwright's test, and passes without it", t => {
  const dir = testFolder(t, { "a.spec.ts": FROM_PAGE_LOG, "b.spec.ts": 'import { test } from "@playwright/test";\n' });
  const found = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
  assert.equal(found.status, 1);
  assert.match(found.stderr, /b\.spec\.ts imports test from @playwright\/test/);
  writeFileSync(join(dir, "b.spec.ts"), FROM_PAGE_LOG);
  const none = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
  assert.equal(none.status, 0);
  assert.match(none.stdout, /Test files read: 2\./);
});

test("the sites' own test files all take the page log, from any folder", () => {
  const result = check([join(import.meta.dirname, "../apps/hedgeschool/tests")]);
  assert.equal(result.ok, true, result.lines.join("\n"));
  const fromApp = spawnSync(process.execPath, [script], { cwd: join(import.meta.dirname, "../apps/hedgeschool"),
                                                          encoding: "utf8" });
  assert.equal(fromApp.status, 0, fromApp.stderr);
});
