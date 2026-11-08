// The check of an engine lock's numbers against the release's manifest, which fetch-engine.mjs runs for a lock that
// gives them. A lock copies two kinds of number by hand from the release's manifest (`manifest.json`, an asset of the
// release): the networks' sizes (`sizes`, from the manifest's `engine.sizes`) and an evaluator's `maxThreads` (from
// the evaluator's entry in the manifest's `assets`). The CPU form of the evaluator cannot check them against a
// network (cpu_evaluator.mjs): a wrong size traps ("unreachable") or plays another move with no message. So the step
// compares them with the release's own numbers and stops at a difference (design 03, "The engine's artifacts").
//
// A lock that gives neither number is not checked, and the step does not fetch the manifest: Hedge School's lock
// gives neither.
import type { NetworkSizes } from "./library.ts";

/** The part of an engine lock that this check reads (engine.lock.json). */
export interface LockNumbers {
  sizes?: NetworkSizes;
  /** Where the release's manifest is and its SHA-256, as an artifact has them: the step checks the file as it checks
   *  an artifact. */
  releaseManifest?: { source: { release?: { tag: string; asset: string }; local?: string; engines?: string }; sha256: string };
  artifacts: { id: string; file: string; source: { release?: { asset: string } }; maxThreads?: number }[];
}

/** The part of the release's manifest that this check reads. */
export interface ReleaseNumbers {
  engine?: { sizes?: Partial<NetworkSizes> };
  assets?: { file: string; maxThreads?: number }[];
}

const SIZE_FIELDS = ["board", "policyChannels"] as const;

/** Whether the lock gives numbers that the release's manifest holds. */
export function givesReleaseNumbers(lock: LockNumbers): boolean {
  return Boolean(lock.sizes) || lock.artifacts.some(a => a.maxThreads !== undefined);
}

/** The lock's entry for the release's manifest, as an artifact: null for a lock that gives no number to check. An
 *  error for a lock that gives numbers but no `releaseManifest`, since the step cannot check them without it. */
export function releaseManifestEntry(lock: LockNumbers): { id: string; source: NonNullable<LockNumbers["releaseManifest"]>["source"]; sha256: string } | null {
  if (!givesReleaseNumbers(lock)) return null;
  if (!lock.releaseManifest)
    throw new Error("engine.lock.json gives sizes or maxThreads but no releaseManifest (the release's manifest.json: " +
                    "{ \"source\": { \"release\": { \"tag\": TAG, \"asset\": \"manifest.json\" } }, \"sha256\": HASH }), " +
                    "so the step cannot check them against the release.");
  return { id: "release manifest", ...lock.releaseManifest };
}

const show = (value: unknown) => value === undefined ? "none" : JSON.stringify(value);

/** Compares the lock's `sizes` and each artifact's `maxThreads` with the release's manifest. An error names the field,
 *  the lock's value and the release's, for the first difference. */
export function checkLockAgainstRelease(lock: LockNumbers, release: ReleaseNumbers): void {
  if (lock.sizes) {
    for (const field of SIZE_FIELDS) {
      const locked = lock.sizes[field], released = release.engine?.sizes?.[field];
      if (locked !== released)
        throw new Error(`engine.lock.json gives sizes.${field} ${show(locked)}, but the release's manifest gives ` +
                        `${show(released)} (engine.sizes.${field}). A wrong size makes the CPU evaluator trap or play ` +
                        `another move with no message. Copy the release's value into engine.lock.json.`);
    }
  }
  for (const a of lock.artifacts) {
    if (a.maxThreads === undefined) continue;
    const file = a.source.release?.asset ?? a.file;
    const entry = release.assets?.find(r => r.file === file);
    if (entry?.maxThreads !== a.maxThreads)
      throw new Error(`${a.id}: engine.lock.json gives maxThreads ${show(a.maxThreads)}, but the release's manifest ` +
                      `gives ${show(entry?.maxThreads)} (assets, ${file}, maxThreads). More search threads than the ` +
                      `evaluator allows make it trap. Copy the release's value into engine.lock.json.`);
  }
}
