// Each spec file of the browser tests takes its `test` from tests/page-log.ts, not from @playwright/test: the page log
// of a failing case (abscls-z0jz) is an auto fixture of that `test`, and a spec with Playwright's own `test` keeps no
// log. `npm run check:all` runs this check, so that a new spec takes the page log too.
//
//   node scripts/spec-page-log.mjs [DIR...]
//
// It reads each `*.spec.*` file under each DIR (default: apps/hedgeschool/tests, which holds the specs of both sites)
// and names each one that imports `test` as a value from "@playwright/test" (`import { test }`, `import { test as t }`,
// `import * as pw`, `import pw` or `export { test } from`). A type import does not count, and neither does `expect`,
// which page-log.ts re-exports as it is. A file that is not a spec (page-log.ts itself, a helper module) is not read.
// Without a name, it says how many specs it read, and exits 0. Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SPEC = /\.spec\.[cm]?[jt]sx?$/;
const FROM_PLAYWRIGHT = /\b(import|export)\s+(type\s+)?([^;'"]*?)\s*from\s*["']@playwright\/test["']/g;

/** Whether the source `text` takes `test` itself from @playwright/test. */
export function importsPlaywrightTest(text) {
  // A comment may show the import (page-log.ts's own does): read the code only.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const [, , typeOnly, clause] of code.matchAll(FROM_PLAYWRIGHT)) {
    if (typeOnly) continue;
    if (/^\*|^\w+\s*(,|$)/.test(clause.trim()) && !clause.trim().startsWith("{")) return true; // a namespace or default
    const braces = clause.match(/\{([^}]*)\}/);
    if (!braces) continue;
    for (const item of braces[1].split(",")) {
      const name = item.trim();
      if (name === "" || name.startsWith("type ")) continue;
      if (name.split(/\s+as\s+/)[0].trim() === "test") return true;
    }
  }
  return false;
}

/** The lines that the check prints for the specs under `dirs`, and whether it passes. */
export function check(dirs) {
  const specs = dirs
    .filter(dir => existsSync(dir))
    .flatMap(dir => readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter(f => f.isFile() && SPEC.test(f.name))
      .map(f => join(f.parentPath, f.name)));
  if (specs.length === 0) return { ok: false, lines: [`${dirs.join(", ")}: no spec files.`] };
  const named = specs.filter(path => importsPlaywrightTest(readFileSync(path, "utf8")));
  if (named.length === 0) {
    const count = `${specs.length} spec${specs.length === 1 ? "" : "s"}`;
    return { ok: true, lines: [`${count}, each with the page log's test.`] };
  }
  return {
    ok: false,
    lines: named.map(path => `${path.split("\\").join("/")} imports test from @playwright/test. ` +
                             'Import it from the page log: import { test } from "./page-log.ts".'),
  };
}

if (import.meta.main) {
  const dirs = process.argv.slice(2);
  const { ok, lines } = check(dirs.length > 0 ? dirs : ["apps/hedgeschool/tests"]);
  for (const line of lines) (ok ? console.log : console.error)(line);
  process.exit(ok ? 0 : 1);
}
