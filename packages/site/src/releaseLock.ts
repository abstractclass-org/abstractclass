// The commit that release-check.mjs checks, and the engine lock that it checks the deployed engine's files against.
// It runs in Node only, from release-check.mjs.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** The engine lock's parts that release-check.mjs reads. */
export type EngineLock = {
  artifacts: { id: string; kind: string; file: string; bytes: number; sha256: string }[];
  [key: string]: unknown;
};

/** The commit that `ref` names (its first 7 characters, the footer's rule), and the site's engine lock for it.
 *  - `atCommit` true, for a commit that the command line names: the lock is that commit's, as Git keeps it. So after a
 *    rollback to a release before an engine change, the check uses the older release's engine files.
 *  - `atCommit` false: the lock is this checkout's file, `lockUrl`.
 *  Git runs in the lock's folder, the site's folder. It throws an Error that the command line prints, when the clone
 *  does not have the commit (a shallow clone, or a commit not fetched yet), and when the commit has no lock at the
 *  lock's path (a commit from before the site moved into its folder). */
export function commitAndLock(lockUrl: URL, ref: string, { atCommit }: { atCommit: boolean }):
  { commit: string; lock: EngineLock; lockFrom: string } {
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
  if (!atCommit) return { commit, lock: JSON.parse(readFileSync(lockPath, "utf8")), lockFrom: "this checkout" };
  const path = git("rev-parse", "--show-prefix").trim() + basename(lockPath);
  let text: string;
  try {
    text = git("show", `${hash}:${path}`);
  } catch {
    throw new Error(`commit ${commit} has no ${path}`);
  }
  return { commit, lock: JSON.parse(text), lockFrom: `commit ${commit}` };
}
