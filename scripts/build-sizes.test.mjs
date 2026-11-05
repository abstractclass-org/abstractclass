import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { check, LIMIT } from "./build-sizes.mjs";

const script = join(import.meta.dirname, "build-sizes.mjs");

/** A build in a folder of its own with files of these sizes, removed after the test. The files are made by
 *  truncation, so that a file of 25 MiB writes no 25 MiB. */
function build(t, sizes) {
  const dir = mkdtempSync(join(tmpdir(), "build-sizes-"));
  t.after(() => rmSync(dir, { recursive: true }));
  for (const [path, bytes] of Object.entries(sizes)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), "");
    truncateSync(join(dir, path), bytes);
  }
  return dir;
}

test("a file at the limit passes, and the largest is named", t => {
  const result = check(build(t, { "index.html": 10, "_app/a.wasm": 100 }), 100);
  assert.equal(result.ok, true);
  assert.match(result.lines[0], /2 files, .* The largest: _app\/a\.wasm, 0\.0 MiB \(100 bytes\)/);
});

test("each file over the limit is named with its size, the largest first", t => {
  const result = check(build(t, { "index.html": 10, "_app/workers/assets/ort.wasm": 101, "engine/x.bin": 200 }), 100);
  assert.equal(result.ok, false);
  assert.equal(result.lines.length, 2);
  assert.match(result.lines[0], /: engine\/x\.bin is .* \(200 bytes\)/);
  assert.match(result.lines[1], /: _app\/workers\/assets\/ort\.wasm is .* \(101 bytes\)/);
});

test("an empty or missing build fails: no build is not a pass", t => {
  const dir = build(t, {});
  assert.equal(check(dir).ok, false);
  assert.equal(check(join(dir, "build")).ok, false);
});

test("the command fails on a file one byte over 25 MiB, and passes without it", t => {
  const dir = build(t, { "index.html": 10, "big.wasm": LIMIT + 1 });
  const over = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
  assert.equal(over.status, 1);
  assert.match(over.stderr, /big\.wasm is 25\.0 MiB \(26214401 bytes\), over Cloudflare Pages' 25\.0 MiB/);
  rmSync(join(dir, "big.wasm"));
  const under = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
  assert.equal(under.status, 0);
  assert.match(under.stdout, /: 1 file, none over 25\.0 MiB/);
});
