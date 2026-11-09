import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { check, specifiers } from "./package-imports.mjs";

const script = join(import.meta.dirname, "package-imports.mjs");

/** A repository in a folder of its own, removed after the test: the sites `hedgeschool` and `cyanotype` (each with its
 *  package.json), the hub's folder with none, and each file of `files` (its path from the root, and its text). */
function repository(t, files) {
  const root = mkdtempSync(join(tmpdir(), "package-imports-"));
  t.after(() => rmSync(root, { recursive: true }));
  for (const site of ["hedgeschool", "cyanotype"]) {
    mkdirSync(join(root, "apps", site, "src/lib/game"), { recursive: true });
    writeFileSync(join(root, "apps", site, "package.json"), JSON.stringify({ name: site }));
  }
  mkdirSync(join(root, "apps/hub"), { recursive: true });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

test("the paths of the imports, the exports, the imports of a path alone and the dynamic imports, with their lines", () => {
  const text = [
    'import { a } from "./a.ts";',
    "import {",
    "  b,",
    "} from '../b.mjs';",
    'import type { C } from "@abstractclass/record/record.ts";',
    'export { d } from "./d.ts";',
    'export * from "./e.ts";',
    'import "./side-effect.css";',
    'const f = await import("./f.mjs");',
    "// The step imports the site's limit from its record: prose, with no path.",
  ].join("\n");
  assert.deepEqual(specifiers(text).map(s => [s.specifier, s.line]), [
    ["./a.ts", 1], ["../b.mjs", 4], ["@abstractclass/record/record.ts", 5], ["./d.ts", 6], ["./e.ts", 7],
    ["./side-effect.css", 8], ["./f.mjs", 9],
  ]);
});

test("a package that imports nothing of a site passes", t => {
  const root = repository(t, {
    "packages/engine/src/step.mjs": 'import { x } from "./x.ts";\nimport { y } from "@abstractclass/record/y.ts";\n',
    "packages/engine/src/x.ts": 'import "node:fs";\n',
    // A site imports a package: that is the way it should go.
    "apps/hedgeschool/scripts/engine.mjs": 'import { fetchEngine } from "@abstractclass/engine/fetch-engine.mjs";\n',
  });
  assert.deepEqual(check(root), []);
});

test("an import of a site's file or of a site's package stops the check, with its file, line and path", t => {
  const root = repository(t, {
    "packages/engine/src/step.mjs": 'import { x } from "./x.ts";\n' +
      'import { MAX_RECORD_KOMI } from "../../../apps/hedgeschool/src/lib/game/record.ts";\n',
    "packages/review/src/View.svelte": '<script lang="ts">\n  import { tools } from "hedgeschool/src/lib/game/tools.ts";\n',
    "packages/analysis/src/load.ts": 'const record = await import("../../../apps/cyanotype/src/lib/game/record.ts");\n',
    // A package's own node_modules is not the package's code.
    "packages/engine/node_modules/dep/index.js": 'import "../../../../apps/hedgeschool/x.js";\n',
  });
  assert.deepEqual(check(root).sort((a, b) => a.file.localeCompare(b.file)), [
    { file: "packages/analysis/src/load.ts", line: 1, specifier: "../../../apps/cyanotype/src/lib/game/record.ts" },
    { file: "packages/engine/src/step.mjs", line: 2, specifier: "../../../apps/hedgeschool/src/lib/game/record.ts" },
    { file: "packages/review/src/View.svelte", line: 2, specifier: "hedgeschool/src/lib/game/tools.ts" },
  ]);
});

test("the script exits 1 and names the import, or exits 0", t => {
  const bad = repository(t, { "packages/engine/src/a.ts": 'import "../../../apps/hedgeschool/x.ts";\n' });
  const failed = spawnSync(process.execPath, [script, bad], { encoding: "utf8" });
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /packages\/engine\/src\/a\.ts:1: imports "\.\.\/\.\.\/\.\.\/apps\/hedgeschool\/x\.ts"/);
  const good = repository(t, { "packages/engine/src/a.ts": 'import "./b.ts";\n' });
  const passed = spawnSync(process.execPath, [script, good], { encoding: "utf8" });
  assert.equal(passed.status, 0, passed.stdout);
  assert.match(passed.stdout, /no package imports a site/);
});
