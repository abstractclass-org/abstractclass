// The check of an engine lock's numbers against its release's manifest, which fetch-engine.mjs runs for a lock that
// gives them. A lock copies two kinds of number by hand from the release's manifest (`manifest.json`, an asset of each
// release): the networks' sizes (`sizes`, from the manifest's `engine.sizes`) and an evaluator's `maxThreads` (from
// the evaluator's entry in the manifest's `assets`). The CPU form of the evaluator cannot check them against a
// network (cpu_evaluator.mjs): a wrong size traps ("unreachable") or plays another move with no message. So the step
// compares them with the release's own numbers and stops at a difference (design 03, "The engine's artifacts"). A
// number that the release gives and the lock leaves out is a difference too.
//
// The lock does not pin the manifest. The step reads the manifest of each release that a network or a file with a
// maxThreads comes from (its source's tag). That manifest must give the release's tag, and list each file that the
// lock takes from the release with the lock's SHA-256 and size. So the numbers are compared with the release of the
// files that the lock pins, and a new release changes no other entry of the lock. A file from this machine (a source
// that is not a release) has no release's manifest, so the step names it and does not check it: a deploy refuses such
// a file. A lock that gives neither number is not checked, and the step reads no manifest: Hedge School's lock gives
// neither.
//
// The step also takes the lock's engine modules from one engine commit (checkOneEngineCommit). The engine modules are
// the WebAssembly modules that play the game's rules: the CPU and the GPU module (the analysis), and the practice
// bot's two modules. The step checks the komi cap of the practice modules only (practice-check.ts), and the analysis
// modules have the same rules only when they come from the same commit. A release's tag gives its commit:
// `engine-<commit>`, with or without a suffix (`engine-d6786eba`, `engine-d6786eba-terms2`). The other files do not
// count. The practice evaluator and the JavaScript libraries run the network and hold no rules. The networks, the
// terms and the notices come from releases of their own: Hedge School's earlier networks come from
// `wasm-v2-engine-632f2a0`, and Cyanotype's libraries and evaluator from `engine-91ab0b7d`, with its modules from
// `engine-887be290`.
import type { ArtifactKind } from "./client.ts";
import type { NetworkSizes } from "./library.ts";

/** The part of an engine lock that this check reads (engine.lock.json). */
export interface Lock {
  sizes?: NetworkSizes;
  artifacts: { id: string; kind: ArtifactKind; source: { release?: { tag: string; asset: string } }; sha256: string;
               bytes: number; maxThreads?: number }[];
}

/** The part of a release's manifest that this check reads. */
export interface ReleaseManifest {
  tag?: string;
  engine?: { sizes?: Partial<NetworkSizes> };
  assets?: { file: string; sha256?: string; bytes?: number; maxThreads?: number }[];
}

// Each field of `sizes`: a field that NetworkSizes gains must be added here, or this file does not compile.
const SIZE_FIELDS = Object.keys({ board: 0, policyChannels: 0 } satisfies Record<keyof NetworkSizes, 0>) as
  (keyof NetworkSizes)[];
const NETWORKS: ReadonlySet<ArtifactKind> = new Set(["model", "graph"]);

/** The releases whose manifests the step reads (`tags`), and the files with numbers from this machine, which no
 *  release's manifest describes (`unchecked`, their ids). For a lock that gives sizes or a maxThreads, the files with
 *  numbers are the networks (a model or its graph) and each file with a maxThreads. A lock with neither number has
 *  none, so both lists are empty. */
export function releasesToCheck(lock: Lock): { tags: string[]; unchecked: string[] } {
  const givesNumbers = lock.sizes !== undefined || lock.artifacts.some(a => a.maxThreads !== undefined);
  const numbered = givesNumbers ? lock.artifacts.filter(a => NETWORKS.has(a.kind) || a.maxThreads !== undefined) : [];
  return { tags: [...new Set(numbered.flatMap(a => (a.source.release ? [a.source.release.tag] : [])))],
           unchecked: numbered.filter(a => !a.source.release).map(a => a.id) };
}

/** The lock's files from release `tag`, each with its asset's name in the release and its entry in the manifest. */
const fromRelease = (lock: Lock, tag: string, release: ReleaseManifest) =>
  lock.artifacts.flatMap(a => {
    const asset = a.source.release?.tag === tag ? a.source.release.asset : null;
    return asset === null ? [] : [{ a, asset, entry: release.assets?.find(r => r.file === asset) }];
  });
const show = (value: unknown) => (value === undefined ? "none" : JSON.stringify(value));

/** Why `release` is not the manifest of release `tag` for this lock: it gives another tag, or it does not list a file
 *  that the lock takes from the release with the lock's SHA-256 and size. Null when it is that manifest. */
export function whyNotTheRelease(lock: Lock, tag: string, release: ReleaseManifest): string | null {
  if (release.tag !== tag) return `it gives the tag ${show(release.tag)}`;
  for (const { a, asset, entry } of fromRelease(lock, tag, release)) {
    if (entry?.sha256 !== a.sha256 || entry.bytes !== a.bytes)
      return `it gives ${asset} ` +
             (entry ? `the SHA-256 ${show(entry.sha256)} and ${show(entry.bytes)} bytes` : "no entry") +
             `, but engine.lock.json gives ${a.id} the SHA-256 "${a.sha256}" and ${a.bytes} bytes`;
  }
  return null;
}

/** Compares the lock's numbers with the manifest of release `tag`: its sizes when a network comes from the release,
 *  and the maxThreads of each file from the release. The manifest must be the release's first (whyNotTheRelease). An
 *  error names the field, the lock's value and the release's, for the first difference. */
export function checkLockAgainstRelease(lock: Lock, tag: string, release: ReleaseManifest): void {
  const wrong = whyNotTheRelease(lock, tag, release);
  if (wrong)
    throw new Error(`The manifest.json of release ${tag} does not describe the files that engine.lock.json takes ` +
                    `from it: ${wrong}. Copy the release's entries into engine.lock.json.`);
  const difference = (field: string, locked: unknown, released: unknown, where: string, why: string) =>
    new Error(`engine.lock.json gives ${field} ${show(locked)}, but the manifest of release ${tag} gives ` +
              `${show(released)} (${where}). ${why} Copy the release's value into engine.lock.json.`);
  const files = fromRelease(lock, tag, release);
  if (files.some(({ a }) => NETWORKS.has(a.kind))) {
    for (const field of SIZE_FIELDS) {
      const locked = lock.sizes?.[field], released = release.engine?.sizes?.[field];
      if (locked !== released)
        throw difference(`sizes.${field}`, locked, released, `engine.sizes.${field}`,
                         "A wrong size makes the CPU evaluator trap or play another move with no message.");
    }
  }
  for (const { a, asset, entry } of files) {
    if (a.maxThreads !== entry?.maxThreads)
      throw difference(`${a.id} the maxThreads`, a.maxThreads, entry?.maxThreads, `assets, ${asset}, maxThreads`,
                       "More search threads than the evaluator allows make it trap.");
  }
}

/** The engine modules: the kinds that play the game's rules. */
const ENGINE_MODULES: ReadonlySet<ArtifactKind> =
  new Set(["module", "gpu-module", "practice-module", "practice-threaded-module"]);
/** A release's tag with an engine commit: `engine-<commit>`, with or without a suffix. */
const ENGINE_TAG = /^engine-([0-9a-f]+)(?:-|$)/;

/** Checks that the lock's engine modules from releases all come from one engine commit, and gives it (null when no
 *  engine module comes from a release), with the engine modules from this machine (`unchecked`, their ids), which no
 *  tag describes. An error when a module's tag gives no commit, or when the tags give two commits or more: it names
 *  each commit with its modules. */
export function checkOneEngineCommit(lock: Lock): { commit: string | null; unchecked: string[] } {
  const modules = lock.artifacts.filter(a => ENGINE_MODULES.has(a.kind));
  const byCommit = new Map<string, string[]>();
  for (const a of modules) {
    if (!a.source.release) continue;
    const commit = ENGINE_TAG.exec(a.source.release.tag)?.[1];
    if (!commit)
      throw new Error(`${a.id}: the release ${show(a.source.release.tag)} gives no engine commit. An engine module ` +
                      `must come from a release whose tag is engine-<commit>, with or without a suffix.`);
    byCommit.set(commit, [...(byCommit.get(commit) ?? []), a.id]);
  }
  if (byCommit.size > 1)
    throw new Error(`engine.lock.json takes its engine modules from more than one engine commit: ` +
                    [...byCommit].map(([commit, ids]) => `${commit} (${ids.join(", ")})`).join(", ") + `. The step ` +
                    `checks the practice modules' komi cap only, and the analysis modules have the same rules only ` +
                    `from the same commit. Take every engine module from one engine commit's releases.`);
  return { commit: [...byCommit.keys()][0] ?? null, unchecked: modules.filter(a => !a.source.release).map(a => a.id) };
}
