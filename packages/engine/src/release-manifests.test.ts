// Checks how the engine step reads the manifests of a lock's releases (release-manifests.ts): a cache with no
// manifests downloads each once, and then the step reads no network. A fake download stands for GitHub. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Lock, ReleaseManifest } from "./lock-check.ts";
import { lockManifests, type Download } from "./release-manifests.ts";

const OLD = "engine-91ab0b7d", NEW = "engine-887be290";
const manifests: Record<string, ReleaseManifest> = {
  [OLD]: { tag: OLD, assets: [{ file: "blueprints-eval.wasm", sha256: "e1", bytes: 2 }] },
  [NEW]: { tag: NEW, assets: [{ file: "blueprints-eval.wasm", sha256: "e1", bytes: 2 },
                              { file: "blueprints-bot-batched.wasm", sha256: "b2", bytes: 1 }] },
};
const lock: Lock = { artifacts: [
  { id: "bot-batched", kind: "practice-threaded-module", sha256: "b2", bytes: 1,
    source: { release: { tag: NEW, asset: "blueprints-bot-batched.wasm" } } },
  { id: "eval", kind: "practice-evaluator", sha256: "e1", bytes: 2,
    source: { release: { tag: OLD, asset: "blueprints-eval.wasm" } } },
  { id: "local", kind: "terms", sha256: "tt", bytes: 3, source: {} },
] };

/** A fake GitHub that gives each release's manifest and counts the downloads (`calls`, "<tag>/<asset>"). */
function github(): { download: Download; calls: string[] } {
  const calls: string[] = [];
  return { calls, download: async (_id, tag, asset) => {
    calls.push(`${tag}/${asset}`);
    return Buffer.from(JSON.stringify(manifests[tag]));
  } };
}
const quiet = () => {};

/** Runs `body` with an empty cache folder, which it removes after. */
async function withCache(body: (dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "release-manifests-"));
  try { await body(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("a cache with no manifests downloads each once, and then reads no network", () => withCache(async dir => {
  const first = github();
  const releases = await lockManifests(lock, dir, first.download, quiet);
  assert.deepEqual(releases, [{ tag: NEW, manifest: manifests[NEW] }, { tag: OLD, manifest: manifests[OLD] }]);
  assert.deepEqual(first.calls.toSorted(), [`${NEW}/manifest.json`, `${OLD}/manifest.json`]);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "releases", OLD, "manifest.json"), "utf8")), manifests[OLD]);

  const offline: Download = async (id) => { throw new Error(`${id}: no network`); };
  const lines: string[] = [];
  assert.deepEqual(await lockManifests(lock, dir, offline, line => lines.push(line)), releases);
  assert.deepEqual(lines.toSorted(), [`release ${NEW} manifest.json: up to date`,
                                      `release ${OLD} manifest.json: up to date`]);
}));

test("a cached manifest that is not the release's for the lock is downloaded again", () => withCache(async dir => {
  await lockManifests(lock, dir, github().download, quiet);
  // Another entry for the lock's evaluator, and a file that is not JSON.
  writeFileSync(join(dir, "releases", OLD, "manifest.json"),
                JSON.stringify({ tag: OLD, assets: [{ file: "blueprints-eval.wasm", sha256: "e9", bytes: 2 }] }));
  writeFileSync(join(dir, "releases", NEW, "manifest.json"), "{");
  const again = github();
  assert.deepEqual((await lockManifests(lock, dir, again.download, quiet)).map(r => r.manifest),
                   [manifests[NEW], manifests[OLD]]);
  assert.equal(again.calls.length, 2);
  // JSON with the release's tag, but not in a manifest's form: assets that are not a list, or not objects.
  writeFileSync(join(dir, "releases", OLD, "manifest.json"), JSON.stringify({ tag: OLD, assets: {} }));
  writeFileSync(join(dir, "releases", NEW, "manifest.json"), JSON.stringify({ tag: NEW, assets: [null] }));
  const third = github();
  assert.deepEqual((await lockManifests(lock, dir, third.download, quiet)).map(r => r.manifest),
                   [manifests[NEW], manifests[OLD]]);
  assert.equal(third.calls.length, 2);
}));

test("a failed download stops the step with the download's error", () => withCache(async dir => {
  const failing: Download = async (id, tag, asset) => {
    throw new Error(`${id}: https://github.com/x/releases/download/${tag}/${asset} gave HTTP 504`);
  };
  await assert.rejects(lockManifests(lock, dir, failing, quiet),
    /release engine-\w+ manifest\.json: https:\/\/github\.com\/x\/releases\/download\/.* gave HTTP 504/);
  // A file that is not a manifest stops the step with the release's name, and the cache does not keep it.
  for (const text of ["<html>", "0", "42", "[]", JSON.stringify({ tag: OLD, assets: {} })]) {
    const notManifest: Download = async () => Buffer.from(text);
    await assert.rejects(lockManifests(lock, dir, notManifest, quiet),
      /release engine-\w+ manifest\.json: the file is not a release's manifest/, text);
  }
  assert.equal(existsSync(join(dir, "releases")), false);
}));
