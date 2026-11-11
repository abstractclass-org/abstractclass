// The commit that release-check.mjs checks a deployed site at, and the engine lock that it checks the site's engine
// files against. It runs in Node only, from release-check.mjs, whose header gives the reasons.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** The engine lock's parts that release-check.mjs reads. */
export type EngineLock = { artifacts: { id: string; kind: string; file: string; bytes: number; sha256: string }[] };

/** The commit that `ref` names, as its first 7 characters (the footer's rule, each site's vite.config.ts), and the
 *  site's engine lock: with `atCommit`, the lock of that commit, as Git keeps it, else this checkout's file,
 *  `lockUrl`. Git runs in the lock's folder, the site's folder. It throws an Error that the command line prints when
 *  the clone does not have the commit, and when the commit has no lock at the lock's path. */
export function commitAndLock(lockUrl: URL, ref: string, { atCommit }: { atCommit: boolean }):
  { commit: string; lock: EngineLock } {
  const lockPath = fileURLToPath(lockUrl);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: dirname(lockPath), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  let hash: string;
  try {
    hash = git("rev-parse", "--verify", "--quiet", `${ref}^{commit}`).trim();
  } catch {
    throw new Error(`${ref} is not a commit in this clone. Run \`git fetch\` (in a shallow clone, `
      + "`git fetch --unshallow`), then run the check again.");
  }
  const commit = hash.slice(0, 7);
  if (!atCommit) return { commit, lock: JSON.parse(readFileSync(lockPath, "utf8")) };
  const pathInRepo = git("rev-parse", "--show-prefix").trim() + basename(lockPath);
  let text: string;
  try {
    text = git("show", `${hash}:${pathInRepo}`);
  } catch {
    throw new Error(`commit ${commit} has no ${pathInRepo}`);
  }
  return { commit, lock: JSON.parse(text) };
}
