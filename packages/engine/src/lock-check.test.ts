// Checks how the engine step compares a lock's sizes and maxThreads with the release's manifest (lock-check.ts). The
// manifest here is a fake with the fields of engine-91ab0b7d's real manifest.json: no network. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLockAgainstRelease, releasesToCheck, whyNotTheRelease, type Lock, type ReleaseManifest }
  from "./lock-check.ts";

const TAG = "engine-91ab0b7d";
const release: ReleaseManifest = {
  tag: TAG,
  engine: { sizes: { board: 67, policyChannels: 6 } },
  assets: [
    { file: "blueprints-engine.wasm", sha256: "aa", bytes: 10 },
    { file: "settings.cfg", sha256: "ss", bytes: 5 },
    { file: "net.model-float16.bin", sha256: "mm", bytes: 30 },
    { file: "blueprints-eval.wasm", sha256: "ee", bytes: 20, maxThreads: 128 },
  ],
};
const from = (asset: string, tag = TAG) => ({ release: { tag, asset } });
const lock = (extra: Partial<Lock> = {}, maxThreads: number | null = 128): Lock => ({
  sizes: { board: 67, policyChannels: 6 },
  artifacts: [
    { id: "module", kind: "module", source: from("blueprints-engine.wasm"), sha256: "aa", bytes: 10 },
    { id: "net", kind: "model", source: from("net.model-float16.bin"), sha256: "mm", bytes: 30 },
    { id: "eval", kind: "practice-evaluator", source: from("blueprints-eval.wasm"), sha256: "ee", bytes: 20,
      ...(maxThreads === null ? {} : { maxThreads }) },
  ],
  ...extra,
});
const check = (l: Lock, r: ReleaseManifest = release) => () => checkLockAgainstRelease(l, TAG, r);

test("a lock with the release's sizes and maxThreads passes", () => {
  assert.doesNotThrow(check(lock()));
});

test("a size that differs stops the step, with the field, the lock's value and the release's", () => {
  assert.throws(check(lock({ sizes: { board: 19, policyChannels: 6 } })),
    (e: Error) => /sizes\.board 19/.test(e.message) && /release engine-91ab0b7d gives 67/.test(e.message)
                  && /\(engine\.sizes\.board\)/.test(e.message));
  assert.throws(check(lock({ sizes: { board: 67, policyChannels: 8 } })), /sizes\.policyChannels 8.*gives 6/);
});

test("a maxThreads that differs stops the step, with the file, the asset and both values", () => {
  assert.throws(check(lock({}, 64)),
    (e: Error) => /gives eval the maxThreads 64/.test(e.message) && /gives 128/.test(e.message)
                  && /assets, blueprints-eval\.wasm, maxThreads/.test(e.message));
});

test("a number that only one of the lock and the release gives stops the step", () => {
  // The lock gives it, the release does not.
  assert.throws(check(lock(), { ...release, engine: {} }), /sizes\.board 67.*gives none/);
  const noCap = { ...release, assets: release.assets!.map(({ maxThreads: _, ...a }) => a) };
  assert.throws(check(lock(), noCap), /maxThreads 128.*gives none/);
  // The release gives it, the lock does not: without its sizes, the CPU evaluator would take Enclosure's.
  assert.throws(check(lock({ sizes: undefined })), /sizes\.board none.*gives 67/);
  assert.throws(check(lock({}, null)), /eval the maxThreads none.*gives 128/);
});

test("a manifest that is not the release's for the lock stops the step before its numbers", () => {
  assert.throws(check(lock(), { ...release, tag: "engine-0000000" }), /does not describe.*the tag "engine-0000000"/);
  const changed = (file: string, entry: object) =>
    ({ ...release, assets: release.assets!.map(a => (a.file === file ? { ...a, ...entry } : a)) });
  // The module has no number, but the lock takes it from the release: the manifest must list it as the lock does.
  assert.throws(check(lock(), changed("blueprints-engine.wasm", { sha256: "zz" })),
    /blueprints-engine\.wasm the SHA-256 "zz" and 10 bytes, but engine\.lock\.json gives module the SHA-256 "aa"/);
  assert.throws(check(lock(), changed("blueprints-eval.wasm", { bytes: 21 })), /21 bytes.*gives eval/);
  assert.throws(check(lock(), { ...release, assets: release.assets!.filter(a => a.file !== "net.model-float16.bin") }),
    /net\.model-float16\.bin no entry/);
  assert.equal(whyNotTheRelease(lock(), TAG, release), null);
});

test("each release is checked for the lock's files from it only", () => {
  // Hedge School's lock mixes releases: a file from another release is not in this manifest, and not looked for.
  const mixed = lock();
  mixed.artifacts.push({ id: "old", kind: "model", source: from("old.bin", "engine-old"), sha256: "oo", bytes: 1 });
  assert.doesNotThrow(check(mixed));
  // The sizes are the networks': a release that gives no network to the lock is not asked for them.
  const evalOnly = lock({ artifacts: lock().artifacts.filter(a => a.id === "eval") });
  assert.doesNotThrow(check(evalOnly, { ...release, engine: {} }));
});

test("the step reads the manifest of each release with a network or a maxThreads, for a lock with a number", () => {
  assert.deepEqual(releasesToCheck(lock()), { tags: [TAG], unchecked: [] });
  const evalElsewhere = lock({ sizes: undefined });
  evalElsewhere.artifacts[2].source = from("blueprints-eval.wasm", "engine-eval");
  assert.deepEqual(releasesToCheck(evalElsewhere), { tags: [TAG, "engine-eval"], unchecked: [] });
  // Hedge School's lock: neither number, so no manifest and no check.
  assert.deepEqual(releasesToCheck(lock({ sizes: undefined }, null)), { tags: [], unchecked: [] });
});

test("a file with numbers from this machine is named, not checked", () => {
  const local = lock();
  local.artifacts[1].source = {};
  assert.deepEqual(releasesToCheck(local), { tags: [TAG], unchecked: ["net"] });
});
