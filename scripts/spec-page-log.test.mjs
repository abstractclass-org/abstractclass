import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { check, importsPlaywrightTest } from "./spec-page-log.mjs";

const script = join(import.meta.dirname, "spec-page-log.mjs");
const TAKEN = 'import { expect, test, type Page } from "./page-log.ts";\n';

/** A folder of tests with these files, removed after the test. */
function tests(t, files) {
  const dir = mkdtempSync(join(tmpdir(), "spec-page-log-"));
  t.after(() => rmSync(dir, { recursive: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

test("a spec that takes test from the page log passes, with expect and types from Playwright", t => {
  const dir = tests(t, {
    "a.spec.ts": TAKEN,
    "b.spec.ts": 'import { test, expect } from "./page-log.ts";\nimport { expect as e } from "@playwright/test";\n' +
                 'import type { Locator } from "@playwright/test";\nimport { type Page } from "@playwright/test";\n',
  });
  const result = check([dir]);
  assert.equal(result.ok, true);
  assert.match(result.lines[0], /^2 specs/);
});

test("a spec that imports test from @playwright/test is refused with its file name", t => {
  const dir = tests(t, {
    "good.spec.ts": TAKEN,
    "bad.spec.ts": 'import { expect, test, type Page } from "@playwright/test";\n',
    "sub/also-bad.spec.ts": 'import {\n  expect,\n  test as base,\n} from \'@playwright/test\';\n',
  });
  const result = check([dir]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.lines.map(l => l.match(/([^/]+\.spec\.ts) imports/)[1]).sort(),
                   ["also-bad.spec.ts", "bad.spec.ts"]);
});

test("page-log.ts itself and a helper module that is not a spec are not read", t => {
  const dir = tests(t, {
    "a.spec.ts": TAKEN,
    "page-log.ts": 'import { test as base } from "@playwright/test";\nexport const test = base.extend({});\n',
    "posthog.ts": 'import { test, type Page } from "@playwright/test";\n',
  });
  const result = check([dir]);
  assert.equal(result.ok, true);
  assert.match(result.lines[0], /^1 spec,/);
});

test("the forms that take test itself are found, and the ones that do not are not", () => {
  for (const line of [
    'import { test } from "@playwright/test";',
    'import {test as t, expect} from "@playwright/test"',
    'import { expect, test } from "@playwright/test";',
    'import * as pw from "@playwright/test";',
    'import pw from "@playwright/test";',
    'export { test } from "@playwright/test";',
  ]) assert.equal(importsPlaywrightTest(line), true, line);
  for (const line of [
    'import { expect } from "@playwright/test";',
    'import { expect, type Page } from "@playwright/test";',
    'import type { test } from "@playwright/test";',
    'import { type test } from "@playwright/test";',
    'import { testInfo, expect } from "@playwright/test";',
    'import { test } from "./page-log.ts";',
    '// import { test } from "@playwright/test";',
    '/* import { test } from "@playwright/test"; */',
    'export { expect } from "@playwright/test";',
  ]) assert.equal(importsPlaywrightTest(line), false, line);
});

test("a folder with no spec files fails: nothing read is not a pass", t => {
  const dir = tests(t, { "page-log.ts": "export {};" });
  assert.equal(check([dir]).ok, false);
  assert.equal(check([join(dir, "missing")]).ok, false);
});

test("the command fails on a spec with Playwright's test, and passes without it", t => {
  const dir = tests(t, { "a.spec.ts": TAKEN, "b.spec.ts": 'import { test } from "@playwright/test";\n' });
  const found = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
  assert.equal(found.status, 1);
  assert.match(found.stderr, /b\.spec\.ts imports test from @playwright\/test/);
  writeFileSync(join(dir, "b.spec.ts"), TAKEN);
  const none = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
  assert.equal(none.status, 0);
  assert.match(none.stdout, /2 specs/);
});

test("the sites' own specs all take the page log", () => {
  const result = check([join(import.meta.dirname, "../apps/hedgeschool/tests")]);
  assert.equal(result.ok, true, result.lines.join("\n"));
});
