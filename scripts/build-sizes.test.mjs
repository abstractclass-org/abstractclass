import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { check, LIMIT } from "./build-sizes.mjs";

const script = join(dirname(fileURLToPath(import.meta.url)), "build-sizes.mjs");

function build(sizes) {
  const dir = mkdtempSync(join(tmpdir(), "build-sizes-"));
  for (const [path, bytes] of Object.entries(sizes)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), Buffer.alloc(bytes));
  }
  return dir;
}

test("the limit is Cloudflare Pages' 25 MiB", () => {
  assert.equal(LIMIT, 26214400);
});

test("a file at the limit passes, and the largest is named", () => {
  const dir = build({ "index.html": 10, "_app/a.wasm": 100 });
  try {
    const result = check(dir, 100);
    assert.equal(result.ok, true);
    assert.match(result.lines[0], /_app[/\\]a\.wasm/);
  } finally { rmSync(dir, { recursive: true }); }
});

test("each file over the limit is named with its size", () => {
  const dir = build({ "index.html": 10, "_app/workers/assets/ort.wasm": 101, "engine/x.bin": 200 });
  try {
    const result = check(dir, 100);
    assert.equal(result.ok, false);
    assert.equal(result.lines.length, 2);
    assert.match(result.lines[0], /engine[/\\]x\.bin is .* \(200 bytes\)/);
    assert.match(result.lines[1], /ort\.wasm is .* \(101 bytes\)/);
  } finally { rmSync(dir, { recursive: true }); }
});

test("an empty build fails: a missing build is not a pass", () => {
  const dir = build({});
  try { assert.equal(check(dir).ok, false); } finally { rmSync(dir, { recursive: true }); }
});

test("the command fails on a file one byte over 25 MiB, and passes without it", () => {
  const dir = build({ "index.html": 10, "big.wasm": LIMIT + 1 });
  try {
    const over = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
    assert.equal(over.status, 1);
    assert.match(over.stderr, /big\.wasm is 25\.0 MiB \(26214401 bytes\), over Cloudflare Pages' 25\.0 MiB/);
    rmSync(join(dir, "big.wasm"));
    const under = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
    assert.equal(under.status, 0);
  } finally { rmSync(dir, { recursive: true }); }
});
