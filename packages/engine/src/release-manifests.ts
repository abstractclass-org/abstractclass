// The manifests of a lock's releases, which the engine step reads for its checks of the lock (fetch-engine.mjs,
// lock-check.ts): one manifest.json for each release that the lock takes files from. The step keeps each in its
// download cache by the release's tag (`releases/<tag>/manifest.json`). A cached manifest that is the release's for
// this lock (whyNotTheRelease) is read from there, so a warm cache reads no network. Else the step downloads it, and
// a download that fails or that is not a manifest stops the step. A manifest that is uploaded again to a release
// after the cache took it stays as the cache has it (design 03).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lockReleases, whyNotTheRelease, type Lock, type LockRelease, type ReleaseManifest } from "./lock-check.ts";

/** Downloads `asset` of release `tag` of the lock's repository. A failed download is an error that names `id`, the
 *  URL and the HTTP status or the network's error (fetch-engine.mjs, download). */
export type Download = (id: string, tag: string, asset: string) => Promise<Uint8Array>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The text as a release's manifest, in the form that the checks read: a JSON object whose `assets`, when it has
 *  them, is a list of objects. Null for any other text. */
function asManifest(text: string): ReleaseManifest | null {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isObject(value)) return null;
  const { assets } = value;
  return assets === undefined || (Array.isArray(assets) && assets.every(isObject)) ? value : null;
}

/** The manifest of each release of the lock (lockReleases), in the lock's order: from the cache in `cacheDir` when
 *  it holds the release's manifest for this lock, else by `download`, and then into the cache. Logs which. */
export async function lockManifests(lock: Lock, cacheDir: string, download: Download,
                                    log: (line: string) => void = console.log): Promise<LockRelease[]> {
  return Promise.all(lockReleases(lock).map(async tag => {
    const id = `release ${tag} manifest.json`, dir = join(cacheDir, "releases", tag);
    const file = join(dir, "manifest.json");
    const inCache = existsSync(file) ? asManifest(readFileSync(file, "utf8")) : null;
    if (inCache && whyNotTheRelease(lock, tag, inCache) === null) {
      log(`${id}: up to date`);
      return { tag, manifest: inCache };
    }
    const bytes = await download(id, tag, "manifest.json");
    const manifest = asManifest(new TextDecoder().decode(bytes));
    if (!manifest)
      throw new Error(`${id}: the file is not a release's manifest (a JSON object with a list of assets)`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, bytes);
    log(`${id}: ${bytes.length} bytes from release ${tag}`);
    return { tag, manifest };
  }));
}
