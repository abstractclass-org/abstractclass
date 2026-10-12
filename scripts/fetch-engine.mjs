// Gets the engine's artifacts that engine.lock.json pins, checks each SHA-256, and puts them in static/engine/<id>/.
// Also puts there the two files of ONNX Runtime Web that the GPU worker loads by URL (its version from
// node_modules: package-lock.json pins it). Writes static/engine/manifest.json, which the site reads to find the files
// and to name them in its results.
//
//   node scripts/fetch-engine.mjs [--deploy]
//
// A source is { "local": PATH } (a file in the engine repository's checkout, for development) or
// { "release": { "tag": TAG, "asset": NAME } } (a GitHub Release of the engine repository). --deploy refuses local
// sources: what ships must come from a release (docs/design/03-stack.md).
//
// Cloudflare Pages serves no file over 25 MiB (docs/hosting.md). A file over 24 MiB is stored compressed with gzip,
// and the compressed bytes are split into parts of 24 MiB or less when they are larger still: `model.onnx.gz.0`,
// `model.onnx.gz.1`. A network's graph is stored compressed at any size: gzip makes it 9% smaller (20.5 MB to 18.7 MB
// for b15c192). The manifest entry names the parts and the encoding, and the page joins and decompresses them
// (src/lib/engine/artifacts.ts). The downloads are kept in node_modules/.cache/engine/, by SHA-256.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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
  if (source.release) {
    const url = `https://github.com/${lock.repository}/releases/download/${source.release.tag}/${source.release.asset}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${artifact.id}: ${url} gave HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error(`${artifact.id}: the source must be "local" or "release"`);
}

/** Writes a file under static/engine/<id>/: compressed when asked or when it is too large to serve, and in parts when
 *  it is too large compressed. Returns how the manifest names it, with the bytes that a browser downloads for it
 *  (`download`). */
function store(id, file, bytes, compress = false) {
  const dir = join(outDir, id);
  mkdirSync(dir, { recursive: true });
  for (const old of [file, `${file}.gz`, ...Array.from({ length: 8 }, (_, k) => `${file}.gz.${k}`)])
    rmSync(join(dir, old), { force: true });
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

const manifest = { artifacts: [] };
for (const artifact of lock.artifacts) {
  if (deploy && !artifact.source.release)
    throw new Error(`${artifact.id}: a deploy needs a released build, not a local file`);
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
  const stored = store(artifact.id, artifact.file, bytes, artifact.kind === "graph");
  if (stored.parts) console.log(`  stored as ${stored.parts.length} gzip part(s) of ${bytes.length} bytes`);
  manifest.artifacts.push({
    id: artifact.id, kind: artifact.kind, interface: artifact.interface ?? null, ...stored,
    sha256: artifact.sha256, bytes: artifact.bytes, released: Boolean(artifact.source.release),
    ...(artifact.displayName ? { displayName: artifact.displayName } : {}),
    ...(artifact.graphOf ? { graphOf: artifact.graphOf } : {}),
  });
}

// ONNX Runtime Web's WebGPU build, in its form that loads the WebAssembly given to it (the package's
// `onnxruntime-web-use-extern-wasm` condition, vite.config.ts): the glue script by URL, and the WebAssembly as bytes.
const ort = join(root, "node_modules", "onnxruntime-web");
const ortVersion = JSON.parse(readFileSync(join(ort, "package.json"), "utf8")).version;
for (const [kind, file] of [["ort-glue", "ort-wasm-simd-threaded.asyncify.mjs"], ["ort-wasm", "ort-wasm-simd-threaded.asyncify.wasm"]]) {
  const bytes = readFileSync(join(ort, "dist", file));
  const stored = store(`ort-${ortVersion}`, file, bytes);
  manifest.artifacts.push({ id: `ort-${ortVersion}`, kind, interface: null, ...stored, sha256: sha256(bytes), bytes: bytes.length, released: true });
  console.log(`ort-${ortVersion} ${file}: ${bytes.length} bytes${stored.parts ? `, stored as ${stored.parts.length} gzip part(s)` : ""}`);
}
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

function source(artifact) {
  return artifact.source.local ?? `release ${artifact.source.release.tag}`;
}
