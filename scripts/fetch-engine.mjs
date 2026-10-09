// Gets the engine's artifacts that engine.lock.json pins, checks each SHA-256, and puts them in static/engine/<id>/.
// Writes static/engine/manifest.json, which the site reads to find the files and to name them in its results.
//
//   node scripts/fetch-engine.mjs [--deploy]
//
// A source is { "local": PATH } (a file in the engine repository's checkout, for development) or
// { "release": { "tag": TAG, "asset": NAME } } (a GitHub Release of the engine repository). --deploy refuses local
// sources: what ships must come from a release (docs/design/03-stack.md).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lock = JSON.parse(readFileSync(join(root, "engine.lock.json"), "utf8"));
const deploy = process.argv.includes("--deploy");
const outDir = join(root, "static", "engine");

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

const manifest = { artifacts: [] };
for (const artifact of lock.artifacts) {
  if (deploy && !artifact.source.release)
    throw new Error(`${artifact.id}: a deploy needs a released build, not a local file`);
  const target = join(outDir, artifact.id, artifact.file);
  let bytes = existsSync(target) ? readFileSync(target) : null;
  if (!bytes || sha256(bytes) !== artifact.sha256) {
    bytes = await get(artifact);
    const hash = sha256(bytes);
    if (hash !== artifact.sha256)
      throw new Error(`${artifact.id}: SHA-256 ${hash} is not the locked ${artifact.sha256}. ` +
                      `If the build changed on purpose, update engine.lock.json.`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
    console.log(`${artifact.id}: ${bytes.length} bytes from ${source(artifact)}`);
  } else {
    console.log(`${artifact.id}: up to date`);
  }
  manifest.artifacts.push({
    id: artifact.id, kind: artifact.kind, interface: artifact.interface ?? null, url: `/engine/${artifact.id}/${artifact.file}`,
    sha256: artifact.sha256, bytes: artifact.bytes, released: Boolean(artifact.source.release),
  });
}
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

function source(artifact) {
  return artifact.source.local ?? `release ${artifact.source.release.tag}`;
}
