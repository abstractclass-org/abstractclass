import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { check, cycles } from "./package-deps.mjs";

const script = join(import.meta.dirname, "package-deps.mjs");

/** A repository in a folder of its own, removed after the test. `manifests` maps a folder (`packages/a`, `apps/x`) to
 *  its package.json, and `files` maps a path from the root to its text. */
function repository(t, manifests, files = {}) {
  const root = mkdtempSync(join(tmpdir(), "package-deps-"));
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(join(root, "packages"), { recursive: true });
  mkdirSync(join(root, "apps/hub"), { recursive: true }); // the hub: a folder with no package.json
  for (const [folder, manifest] of Object.entries(manifests)) {
    mkdirSync(join(root, folder), { recursive: true });
    writeFileSync(join(root, folder, "package.json"), JSON.stringify(manifest));
  }
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const pkg = (name, fields = {}) => ({ name, ...fields });
const on = (...names) => Object.fromEntries(names.map(n => [`@abstractclass/${n}`, "*"]));

test("a graph with no cycle has none", () => {
  assert.deepEqual(cycles(new Map([["a", ["b", "c"]], ["b", ["c"]], ["c", []]])), []);
});

test("each cycle once, from its first name in order, back to that name", () => {
  const graph = new Map([["a", ["b"]], ["b", ["a", "c"]], ["c", ["d"]], ["d", ["e"]], ["e", ["c"]], ["f", ["f"]]]);
  assert.deepEqual(cycles(graph), [["a", "b", "a"], ["c", "d", "e", "c"], ["f", "f"]]);
});

test("a cycle among the packages, through any field of dependencies", t => {
  const root = repository(t, {
    "packages/site": pkg("@abstractclass/site", { dependencies: on("import", "storage") }),
    "packages/import": pkg("@abstractclass/import", { devDependencies: on("site") }),
    "packages/storage": pkg("@abstractclass/storage"),
    "apps/hedgeschool": pkg("hedgeschool", { dependencies: on("site", "import", "storage") }),
  });
  assert.deepEqual(check(root).cycles, [["@abstractclass/import", "@abstractclass/site", "@abstractclass/import"]]);
});

test("an app's dependencies count too, and other packages do not", t => {
  const root = repository(t, {
    "packages/site": pkg("@abstractclass/site", { peerDependencies: { svelte: "^5" }, dependencies: on("x") }),
    "apps/x": pkg("@abstractclass/x", { dependencies: on("site") }),
  });
  assert.deepEqual(check(root).cycles, [["@abstractclass/site", "@abstractclass/x", "@abstractclass/site"]]);
});

test("an import of an @abstractclass package that the importer's package.json does not list", t => {
  const root = repository(t, {
    "packages/site": pkg("@abstractclass/site", { dependencies: on("storage") }),
    "packages/storage": pkg("@abstractclass/storage"),
    "packages/record": pkg("@abstractclass/record"),
    "apps/hedgeschool": pkg("hedgeschool", { dependencies: on("site") }),
  }, {
    "packages/site/src/a.ts": [
      'import { readLocal } from "@abstractclass/storage/local.ts";', // listed
      'import { own } from "@abstractclass/site/own.ts";', // its own name
      '// "@abstractclass/record" in a comment is no import',
      'import { readTexts } from "@abstractclass/record/texts.ts";',
    ].join("\n"),
    "packages/site/node_modules/x/index.js": 'import "@abstractclass/record/record.ts";',
    "apps/hedgeschool/src/routes/+page.svelte": [
      "<script>",
      '  import { DISCORD } from "@abstractclass/site/community.ts";',
      '  import Q from "@abstractclass/storage/local.ts";',
      "</script>",
    ].join("\n"),
  });
  assert.deepEqual(check(root).unlisted, [
    { file: "apps/hedgeschool/src/routes/+page.svelte", line: 3, name: "@abstractclass/storage" },
    { file: "packages/site/src/a.ts", line: 4, name: "@abstractclass/record" },
  ]);
});

test("the script exits 1 and names the cycle, and 0 on a repository with none", t => {
  const bad = repository(t, {
    "packages/a": pkg("@abstractclass/a", { dependencies: on("b") }),
    "packages/b": pkg("@abstractclass/b", { dependencies: on("a") }),
  });
  const failed = spawnSync(process.execPath, [script, bad], { encoding: "utf8" });
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /@abstractclass\/a -> @abstractclass\/b -> @abstractclass\/a/);
  assert.match(failed.stdout, /packages\/a\/package\.json/);
  const good = repository(t, { "packages/a": pkg("@abstractclass/a", { dependencies: on("b") }),
                              "packages/b": pkg("@abstractclass/b") });
  const passed = spawnSync(process.execPath, [script, good], { encoding: "utf8" });
  assert.equal(passed.status, 0, passed.stdout);
});
