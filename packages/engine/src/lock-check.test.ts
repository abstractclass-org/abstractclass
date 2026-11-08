// Checks how the engine step compares a lock's sizes and maxThreads with the release's manifest (lock-check.ts). The
// manifest here is a fake with the fields of engine-91ab0b7d's real manifest.json: no network. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLockAgainstRelease, givesReleaseNumbers, releaseManifestEntry, type LockNumbers } from "./lock-check.ts";

const release = {
  engine: { sizes: { board: 67, policyChannels: 6 } },
  assets: [
    { file: "blueprints-engine.wasm" },
    { file: "blueprints-eval.wasm", maxThreads: 128 },
  ],
};
const lock = (extra: Partial<LockNumbers> = {}, maxThreads: number | null = 128): LockNumbers => ({
  sizes: { board: 67, policyChannels: 6 },
  releaseManifest: { source: { release: { tag: "engine-91ab0b7d", asset: "manifest.json" } }, sha256: "00" },
  artifacts: [
    { id: "module", file: "blueprints-engine.wasm", source: { release: { asset: "blueprints-engine.wasm" } } },
    { id: "eval", file: "blueprints-eval.wasm", source: { release: { asset: "blueprints-eval.wasm" } }, ...(maxThreads === null ? {} : { maxThreads }) },
  ],
  ...extra,
});

test("a lock with the release's sizes and maxThreads passes", () => {
  assert.doesNotThrow(() => checkLockAgainstRelease(lock(), release));
});

test("a size that differs stops the step, with the field, the lock's value and the release's", () => {
  assert.throws(() => checkLockAgainstRelease(lock({ sizes: { board: 19, policyChannels: 6 } }), release),
    (e: Error) => /sizes\.board 19/.test(e.message) && /release's manifest gives 67/.test(e.message)
                  && /engine\.sizes\.board/.test(e.message));
  assert.throws(() => checkLockAgainstRelease(lock({ sizes: { board: 67, policyChannels: 8 } }), release),
    /sizes\.policyChannels 8.*gives 6/);
});

test("a lock with sizes for a release with none stops the step", () => {
  assert.throws(() => checkLockAgainstRelease(lock(), { assets: release.assets }), /sizes\.board 67.*gives none/);
});

test("a maxThreads that differs stops the step, with the artifact, the file and both values", () => {
  assert.throws(() => checkLockAgainstRelease(lock({}, 64), release),
    (e: Error) => /^eval: /.test(e.message) && /maxThreads 64/.test(e.message) && /gives 128/.test(e.message)
                  && /blueprints-eval\.wasm/.test(e.message));
});

test("a maxThreads for an asset that the release does not list, or that has none, stops the step", () => {
  assert.throws(() => checkLockAgainstRelease(lock(), { ...release, assets: [{ file: "blueprints-eval.wasm" }] }),
    /maxThreads 128.*gives none/);
  assert.throws(() => checkLockAgainstRelease(lock(), { ...release, assets: [] }), /maxThreads 128.*gives none/);
});

test("a lock with only maxThreads, or only sizes, checks only that", () => {
  assert.doesNotThrow(() => checkLockAgainstRelease(lock({ sizes: undefined }), { assets: release.assets }));
  assert.doesNotThrow(() => checkLockAgainstRelease(lock({}, null), { engine: release.engine }));
});

test("the manifest is needed for a lock with sizes or maxThreads, and for no other", () => {
  assert.equal(givesReleaseNumbers(lock()), true);
  assert.deepEqual(releaseManifestEntry(lock()),
    { id: "release manifest", source: { release: { tag: "engine-91ab0b7d", asset: "manifest.json" } }, sha256: "00" });
  // Hedge School's lock: neither number, so no manifest and no check.
  const plain = lock({ sizes: undefined, releaseManifest: undefined }, null);
  assert.equal(givesReleaseNumbers(plain), false);
  assert.equal(releaseManifestEntry(plain), null);
});

test("a lock with numbers but no releaseManifest stops the step, and names the field", () => {
  assert.throws(() => releaseManifestEntry(lock({ releaseManifest: undefined })), /no releaseManifest/);
});
