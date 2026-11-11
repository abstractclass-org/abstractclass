// Each test file of the browser tests takes its `test` from tests/page-log.ts: the page log of a failing case
// (abscls-z0jz) is an auto fixture of that `test`, and a file with Playwright's own `test` keeps no log. `npm run
// check:all` runs this check, so that a new spec takes the page log too.
//
//   node scripts/spec-page-log.mjs [DIR...]
//
// It reads each test file under each DIR (default: apps/hedgeschool/tests, from the repository's root, which holds the
// specs of both sites). A test file is a file that Playwright runs: playwright.config.ts gives no testMatch, so
// Playwright's default applies, `*.spec.*` and `*.test.*`. The check refuses a test file that takes `test` as a value
// from Playwright ("@playwright/test" or "playwright/test"), as `import { test }`, `import { test as t }`,
// `import { default as t }`, `import * as pw`, `import pw` or `export { test } from`. It also refuses a test file that
// does not import `test` from the page log: a helper module could give it Playwright's own. A type import does not
// count, and neither does `expect`, which page-log.ts re-exports as it is. A comment does not count. A file that is not
// a test file (page-log.ts itself, a helper module) is not read.
//
// It prints each file that it refuses, and exits 1 when there is one, or when a DIR holds no test file. Else it prints
// how many test files it read, and exits 0. Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TEST_FILE = /\.(spec|test)\.[cm]?[jt]sx?$/;
const PLAYWRIGHT = new Set(["@playwright/test", "playwright/test"]);
const PAGE_LOG = /(^|\/)page-log(\.ts)?$/;
/** An import or an export from a module: whether it takes types only, what it takes, and the module. */
const FROM = /\b(import|export)\b\s*(type\b)?\s*([^;'"]*?)\s*\bfrom\s*(["'])([^"'\n]+)\4/g;
/** A string, which stays (it can be a module's name), or a comment, which goes: a comment can show an import. */
const STRING_OR_COMMENT = /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

/** The modules from which the source `text` takes `test` itself, as a value. */
export function testModules(text) {
  const code = text.replace(STRING_OR_COMMENT, (_, string) => string ?? "");
  const modules = [];
  for (const [, , typeOnly, clause, , module] of code.matchAll(FROM)) {
    if (typeOnly) continue;
    // A default or a namespace (`import pw`, `import * as pw`) takes test too: Playwright's default export is test.
    // In braces, `type test` and `type test as t` stay whole, and are not `test`.
    const names = clause.startsWith("{")
      ? clause.slice(1, clause.indexOf("}")).split(",").map(item => item.trim().split(/\s+as\s+/)[0])
      : ["default"];
    if (names.includes("test") || names.includes("default")) modules.push(module);
  }
  return modules;
}

/** Whether the source `text` takes `test` itself from Playwright. */
export const importsPlaywrightTest = text => testModules(text).some(module => PLAYWRIGHT.has(module));

/** Why the check refuses the test file whose source is `text`, or null when it takes the page log's test. */
export function refusal(text) {
  const modules = testModules(text);
  const playwright = modules.find(module => PLAYWRIGHT.has(module));
  if (playwright) return `imports test from ${playwright}`;
  return modules.some(module => PAGE_LOG.test(module)) ? null : "does not import test from the page log";
}

/** The lines that the check prints for the test files under `dirs`, and whether it passes. */
export function check(dirs) {
  const files = dirs
    .filter(dir => existsSync(dir))
    .flatMap(dir => readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter(f => f.isFile() && TEST_FILE.test(f.name))
      .map(f => join(f.parentPath, f.name)));
  if (files.length === 0) return { ok: false, lines: [`${dirs.join(", ")}: no test files.`] };
  const refused = files.map(path => ({ path, why: refusal(readFileSync(path, "utf8")) })).filter(f => f.why);
  if (refused.length === 0) {
    return { ok: true, lines: [`Test files read: ${files.length}. Each takes the page log's test.`] };
  }
  return {
    ok: false,
    lines: refused.map(({ path, why }) => `${path.replaceAll("\\", "/")} ${why}. ` +
                                          'Import it from the page log: import { test } from "./page-log.ts".'),
  };
}

if (import.meta.main) {
  const dirs = process.argv.slice(2);
  const { ok, lines } = check(dirs.length > 0 ? dirs : [join(import.meta.dirname, "../apps/hedgeschool/tests")]);
  for (const line of lines) (ok ? console.log : console.error)(line);
  process.exit(ok ? 0 : 1);
}
