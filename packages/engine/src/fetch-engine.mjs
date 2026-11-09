// Gets the engine's artifacts that a site's engine.lock.json pins, checks each SHA-256, and puts them in the site's
// static/engine/<id>/. For a lock with a GPU module, also puts there the two files of ONNX Runtime Web that the GPU
// worker loads by URL. Their version is the installed package's, which package-lock.json pins. Node finds the package
// as it finds an import of this script. Writes static/engine/manifest.json, which the site reads to find the files and
// to name them in its results. Both sites run it, each in its own folder (its `npm run engine`): Hedge School's lock
// has Enclosure's engine, Cyanotype's Blueprints'.
//
//   node scripts/engine.mjs [--deploy]      in the site's folder
//
// The step is fetchEngine, which each site's scripts/engine.mjs calls with the site's komi limit: no package imports
// a site (design 29, item 1). This file run alone stops with an error.
//
// A source is { "local": PATH } (a file, from the site's folder), { "engines": PATH } (a file in the engine
// repository's checkout beside this repository's, for a build that is on this machine only), or
// { "release": { "tag": TAG, "asset": NAME } } (a GitHub Release of the lock's repository). --deploy refuses the first
// two: what ships must come from a release (docs/design/03-stack.md). The lock's `protocol` is the protocol that the
// site's code is written for, when it is not the engine package's own PROTOCOL (protocol.ts). The lock's `sizes` are
// the networks' sizes, from the release's manifest (`engine.sizes`): the evaluators of the GPU and of the threaded
// bot's CPU workers take them (library.ts, sizesOption). A lock without them has Enclosure's, the library's default.
// The practice evaluator's `maxThreads`, from the release's manifest too, caps the threaded bot's search threads on
// its CPU workers.
// The step checks these numbers against the manifests of the releases that the files come from, and stops at a
// difference. It also stops when the lock's files are not one release's set: when no release of the lock names every
// file of the lock with the lock's SHA-256 and size (lock-check.ts).
//
// Cloudflare Pages serves no file over 25 MiB (docs/hosting.md). A file over 24 MiB is stored compressed with gzip,
// and the compressed bytes are split into parts of 24 MiB or less when they are larger still: `model.onnx.gz.0`,
// `model.onnx.gz.1`. A network's graph is stored compressed at any size: gzip makes it 9% smaller (20.5 MB to 18.7 MB
// for b15c192). The manifest entry names the parts and the encoding, and the page joins and decompresses them
// (@abstractclass/engine/artifacts.ts). The downloads are kept in node_modules/.cache/engine/, by SHA-256, and each
// release's manifest by its tag (`releases/<tag>/manifest.json`).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { PROTOCOL, speaksProtocol } from "./protocol.ts";
import { enginesCheckout, nodeEngine } from "./node-engine.mjs";
import { checkPracticeModules, checkThreadedBot } from "./practice-check.ts";
import { checkLockAgainstRelease, checkOneEngineCommit, checkOneReleaseSet, releasesToCheck } from "./lock-check.ts";
import { lockManifests } from "./release-manifests.ts";

const root = process.cwd();
const lock = JSON.parse(readFileSync(join(root, "engine.lock.json"), "utf8"));
const deploy = process.argv.includes("--deploy");
const outDir = join(root, "static", "engine");
const cacheDir = join(root, "node_modules", ".cache", "engine");
const LIMIT = 24 * 1024 * 1024; // under Cloudflare Pages' 25 MiB for one file

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

async function get(artifact) {
  const { source } = artifact;
  if (source.local) {
    return readFileSync(resolve(root, source.local));
  }
  if (source.engines) {
    const engines = enginesCheckout(root);
    if (!engines) throw new Error(`${artifact.id}: no engine repository's checkout beside this repository's`);
    return readFileSync(join(engines, source.engines));
  }
  if (source.release) return download(artifact.id, source.release.tag, source.release.asset);
  throw new Error(`${artifact.id}: the source must be "local", "engines" or "release"`);
}

/** Downloads `asset` of release `tag` of the lock's repository. A failed download stops the step with an error that
 *  names `id`, the URL and the HTTP status or the network's error. */
async function download(id, tag, asset) {
  const url = `https://github.com/${lock.repository}/releases/download/${tag}/${asset}`;
  let response;
  try {
    response = await fetch(url);
  } catch (e) {
    throw new Error(`${id}: ${url} gave no answer (${e.cause?.code ?? e.cause?.message ?? e.message})`, { cause: e });
  }
  if (!response.ok) throw new Error(`${id}: ${url} gave HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Writes a file under static/engine/<id>/: compressed when asked or when it is too large to serve, and in parts when
 *  it is too large compressed. Returns how the manifest names it, with the bytes that a browser downloads for it
 *  (`download`). */
function store(id, file, bytes, compress = false) {
  const dir = join(outDir, id);
  mkdirSync(dir, { recursive: true });
  const url = `/engine/${id}/${file}`;
  if (bytes.length <= LIMIT && !compress) {
    writeFileSync(join(dir, file), bytes);
    return { url, download: bytes.length };
  }
  const gz = gzipSync(bytes, { level: 9 });
  if (gz.length <= LIMIT) {
    writeFileSync(join(dir, `${file}.gz`), gz);
    return { url, encoding: "gzip", parts: [`${url}.gz`], download: gz.length };
  }
  const parts = [];
  for (let k = 0; k * LIMIT < gz.length; k++) {
    writeFileSync(join(dir, `${file}.gz.${k}`), gz.subarray(k * LIMIT, (k + 1) * LIMIT));
    parts.push(`${url}.gz.${k}`);
  }
  return { url, encoding: "gzip", parts, download: gz.length };
}

/** The engine step, in the site's folder: gets, checks and stores the lock's files, then checks the modules in Node.
 *  `maxKomi` is the site's MAX_RECORD_KOMI, which each practice module's komi cap must be (practice-check.ts). The
 *  lock's engine modules must come from one engine commit (lock-check.ts, checkOneEngineCommit). */
export async function fetchEngine({ maxKomi }) {
  if (!(Number.isFinite(maxKomi) && maxKomi > 0))
    throw new Error(`fetchEngine needs the site's komi limit, its record's MAX_RECORD_KOMI (a number above 0), not ` +
                    `${maxKomi}. Run the step by the site's npm run engine (its scripts/engine.mjs).`);
  const engine = checkOneEngineCommit(lock);
  console.log(engine.commit ? `the engine modules: engine commit ${engine.commit}` : "no engine module from a release");
  if (engine.unchecked.length)
    console.log(`engine modules not checked for their commit, since they are files on this machine: ` +
                engine.unchecked.join(", "));

  // The lock's files as one release's set: one release of the lock names every file with the lock's entry
  // (lock-check.ts, checkOneReleaseSet). A warm cache holds the manifests (release-manifests.ts).
  const releases = await lockManifests(lock, cacheDir, download);
  const set = checkOneReleaseSet(lock, releases);
  if (set.release)
    console.log(`the lock's files are one release's set: release ${set.release} names each of them with the lock's ` +
                `entry (${releases.length} release(s) read)`);
  if (set.unchecked.length)
    console.log(`not checked against a release's set, since they are files on this machine: ` +
                set.unchecked.join(", "));

  // The lock's sizes and maxThreads against its releases' manifests (lock-check.ts). A lock that gives neither, Hedge
  // School's, prints nothing more.
  const toCheck = releasesToCheck(lock);
  for (const tag of toCheck.tags) {
    checkLockAgainstRelease(lock, tag, releases.find(r => r.tag === tag).manifest);
    console.log(`release ${tag}: the lock's sizes and maxThreads are the release's`);
  }
  if (toCheck.unchecked.length)
    console.log(`not checked against a release's manifest, since they are files on this machine: ` +
                toCheck.unchecked.join(", "));

  // The folder holds only what this run writes: it is generated (and ignored by Git), and the downloads stay in the
  // cache.
  rmSync(outDir, { recursive: true, force: true });
  const manifest = { ...(lock.protocol ? { protocol: lock.protocol } : {}),
                     ...(lock.sizes ? { sizes: lock.sizes } : {}), artifacts: [] };
  for (const artifact of lock.artifacts) {
    if (deploy && !artifact.source.release)
      throw new Error(`${artifact.id}: a deploy needs a released build, not a file on this machine`);
    const cached = join(cacheDir, artifact.sha256);
    let bytes = existsSync(cached) ? readFileSync(cached) : null;
    if (!bytes || sha256(bytes) !== artifact.sha256) {
      bytes = await get(artifact);
      const hash = sha256(bytes);
      if (hash !== artifact.sha256)
        throw new Error(`${artifact.id}: SHA-256 ${hash} is not the locked ${artifact.sha256}. ` +
                        `If the build changed on purpose, update engine.lock.json.`);
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cached, bytes);
      console.log(`${artifact.id}: ${bytes.length} bytes from ${source(artifact)}`);
    } else {
      console.log(`${artifact.id}: up to date`);
    }
    // A file that imports another by a relative path (the engine's JavaScript libraries) shares its folder (`dir`).
    const stored = store(artifact.dir ?? artifact.id, artifact.file, bytes, artifact.kind === "graph");
    if (stored.parts) console.log(`  stored as ${stored.parts.length} gzip part(s) of ${bytes.length} bytes`);
    manifest.artifacts.push({
      id: artifact.id, kind: artifact.kind, interface: artifact.interface ?? null, ...stored,
      sha256: artifact.sha256, bytes: artifact.bytes, released: Boolean(artifact.source.release),
      ...(artifact.displayName ? { displayName: artifact.displayName } : {}),
      ...(artifact.graphOf ? { graphOf: artifact.graphOf } : {}),
      ...(artifact.search ? { search: artifact.search } : {}),
      ...(artifact.sameSearchAs ? { sameSearchAs: artifact.sameSearchAs } : {}),
      ...(artifact.maxThreads ? { maxThreads: artifact.maxThreads } : {}),
    });
  }

  // ONNX Runtime Web's WebGPU build, in its form that loads the WebAssembly given to it (the package's
  // `onnxruntime-web-use-extern-wasm` condition, Hedge School's vite.config.ts): the glue script by URL, and the
  // WebAssembly as bytes. Only for a lock with a GPU module: a site whose engine runs on the CPU alone needs neither.
  if (lock.artifacts.some(a => a.kind === "gpu-module")) {
    const ortPackageJson = findPackageJSON("onnxruntime-web", import.meta.url), ort = dirname(ortPackageJson);
    const ortVersion = JSON.parse(readFileSync(ortPackageJson, "utf8")).version;
    for (const [kind, file] of [["ort-glue", "ort-wasm-simd-threaded.asyncify.mjs"], ["ort-wasm", "ort-wasm-simd-threaded.asyncify.wasm"]]) {
      const bytes = readFileSync(join(ort, "dist", file));
      const stored = store(`ort-${ortVersion}`, file, bytes);
      manifest.artifacts.push({ id: `ort-${ortVersion}`, kind, interface: null, ...stored, sha256: sha256(bytes), bytes: bytes.length, released: true });
      console.log(`ort-${ortVersion} ${file}: ${bytes.length} bytes${stored.parts ? `, stored as ${stored.parts.length} gzip part(s)` : ""}`);
    }
  }
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  // The CPU module, run once in Node: its protocol must be one the site speaks, and the lock must give its own
  // protocol and search, for the CPU and the GPU module of the release. The page reads the lock's search before the
  // module answers (@abstractclass/analysis/cache.ts, warmCache), so a wrong one would read no stored result, and say
  // nothing.
  const { module, call } = await nodeEngine(root);
  const version = call({ id: "v", action: "query_version" });
  const site = lock.protocol ?? PROTOCOL;
  if (!speaksProtocol(version.protocol, site))
    throw new Error(`${module.id}: protocol ${version.protocol}, but the site's code is written for ${site} (protocol.ts, speaksProtocol)`);
  for (const a of lock.artifacts.filter(a => a.kind === "module" || a.kind === "gpu-module")) {
    if (a.interface !== `engine-protocol-${version.protocol}` || a.search !== version.search)
      throw new Error(`${a.id}: engine.lock.json gives ${a.interface} and the search ${a.search}, but the module ` +
                      `reports protocol ${version.protocol} and the search ${version.search}`);
  }
  console.log(`${module.id}: protocol ${version.protocol}, search ${version.search}, as engine.lock.json gives`);

  // Each practice module, run once in Node: its minPlayoutsPerThread must be 8, and its komi cap the site's
  // MAX_RECORD_KOMI, which each site's record copies from the engine (practice-check.ts). Then Practice's CPU form:
  // the threaded bot on the CPU evaluator must play the one-thread bot's moves (checkThreadedBot).
  await checkPracticeModules(root, manifest, maxKomi);
  await checkThreadedBot(root, manifest, call);
}

function source(artifact) {
  return artifact.source.local ?? (artifact.source.engines ? `engines/${artifact.source.engines}` : `release ${artifact.source.release.tag}`);
}

// Run alone, as a site's `npm run engine` ran it before each site had its scripts/engine.mjs, the file would do nothing
// and exit 0: a site whose package.json still runs it would build with the engine files of an earlier run, or none.
if (import.meta.main)
  throw new Error("packages/engine/src/fetch-engine.mjs runs no step alone. The site's package.json must run the " +
                  `site's scripts/engine.mjs ("engine": "node scripts/engine.mjs"), which calls fetchEngine with the ` +
                  "site's komi limit.");
