// The commit that release-check.mjs checks a deployed site at, and the engine lock that it checks the site's engine
// files against: the lock of a commit, as Git keeps it, never the checkout's file. Also whether the checkout's code of
// the check differs from a commit's, for the lines that come from the checkout. It runs in Node only, from
// release-check.mjs, whose header gives the reasons.
import { execFileSync } from "node:child_process";
import { basename, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** The engine lock's parts that release-check.mjs reads. */
export type EngineLock = { artifacts: { id: string; kind: string; file: string; bytes: number; sha256: string }[] };

/** The commit that the home page's footer names: the 7 characters after "version" (the footer's rule, each site's
 *  vite.config.ts and SiteFooter.svelte). None when the page has no footer, or when its build had no commit. */
export function footerCommit(html: string): string | undefined {
  return html.match(/version ([0-9a-f]{7})\b/)?.[1];
}

// Git in the folder of the site's lock, `lockPath`.
const git = (lockPath: string, ...args: string[]) =>
  execFileSync("git", args, { cwd: dirname(lockPath), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function fullHash(lockPath: string, ref: string): string {
  try {
    return git(lockPath, "rev-parse", "--verify", "--quiet", `${ref}^{commit}`).trim();
  } catch {
    throw new Error(`${ref} is not a commit in this clone. Run \`git fetch\` (in a shallow clone, `
      + "`git fetch --unshallow`), then run the check again.");
  }
}

/** The commit that `ref` names, as its first 7 characters (the footer's rule). It throws an Error that the command
 *  line prints when the clone, the clone of the site's lock `lockUrl`, does not have the commit. */
export function commitOf(lockUrl: URL, ref: string): string {
  return fullHash(fileURLToPath(lockUrl), ref).slice(0, 7);
}

/** The commit that `ref` names, as `commitOf` gives it, and the site's engine lock of that commit: the file at the
 *  path of `lockUrl`, as Git keeps it. It throws an Error that the command line prints when the clone does not have the
 *  commit, and when the commit has no lock at the lock's path. */
export function lockAt(lockUrl: URL, ref: string): { commit: string; lock: EngineLock } {
  const lockPath = fileURLToPath(lockUrl);
  const hash = fullHash(lockPath, ref);
  const commit = hash.slice(0, 7);
  const pathInRepo = git(lockPath, "rev-parse", "--show-prefix").trim() + basename(lockPath);
  let text: string;
  try {
    text = git(lockPath, "show", `${hash}:${pathInRepo}`);
  } catch {
    throw new Error(`commit ${commit} has no ${pathInRepo}`);
  }
  return { commit, lock: JSON.parse(text) };
}

/** Whether one of the files `files`, in the clone of the site's lock `lockUrl`, differs between commit `ref` and the
 *  checkout's working tree. A file that one side lacks differs. When Git cannot compare them, they differ too: the
 *  caller marks what comes from the checkout, and a mark too many misleads less than one too few. */
export function checkoutDiffers(lockUrl: URL, ref: string, files: URL[]): boolean {
  const lockPath = fileURLToPath(lockUrl);
  const paths = files.map(file => relative(dirname(lockPath), fileURLToPath(file)).replaceAll("\\", "/"));
  try {
    git(lockPath, "diff", "--quiet", ref, "--", ...paths);
    return false;
  } catch {
    return true;
  }
}
