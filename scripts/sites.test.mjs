import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sites } from "./sites.mjs";

/** A repository in a folder of its own, removed after the test, with `files` (path from the root: text). */
function repository(t, files) {
  const root = mkdtempSync(join(tmpdir(), "sites-"));
  t.after(() => rmSync(root, { recursive: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

test("the sites are the folders of apps/ with a package.json, in order of their folders, with their packages' names",
  t => {
    const root = repository(t, {
      "apps/hedgeschool/package.json": JSON.stringify({ name: "hedgeschool" }),
      "apps/cyanotype/package.json": JSON.stringify({ name: "@abstractclass/cyanotype" }),
      "apps/hub/index.html": "",
      "apps/package.json": "{}",
    });
    assert.deepEqual(sites(root), [
      { folder: "cyanotype", path: join(root, "apps/cyanotype"), name: "@abstractclass/cyanotype" },
      { folder: "hedgeschool", path: join(root, "apps/hedgeschool"), name: "hedgeschool" },
    ]);
  });

test("a site's package.json with no name gives the site no name", t => {
  const root = repository(t, { "apps/x/package.json": "{}" });
  assert.deepEqual(sites(root), [{ folder: "x", path: join(root, "apps/x"), name: undefined }]);
});
