// The commit that release-check.mjs checks a deployed site at, and the engine lock that it checks the site's engine
// files against: the lock of a commit, as Git keeps it, never the checkout's file. It runs in Node only, from
// release-check.mjs, whose header gives the reasons.
import { execFileSync } from "node:child_process";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** The engine lock's parts that release-check.mjs reads. */
export type EngineLock = { artifacts: { id: string; kind: string; file: string; bytes: number; sha256: string }[] };

/** The commit that the home page's footer names: the 7 characters after "version" (the footer's rule, each site's
 *  vite.config.ts and SiteFooter.svelte). None when the page has no footer, or when its build had no commit. */
export function footerCommit(html: string): string | undefined {
  return html.match(/version ([0-9a-f]{7})\b/)?.[1];
}

// Git in the lock's folder, the site's folder.
const gitAt = (lockUrl: URL) => (...args: string[]) => execFileSync("git", args,
  { cwd: dirname(fileURLToPath(lockUrl)), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const fullHash = (lockUrl: URL, ref: string) => {
  try {
    return gitAt(lockUrl)("rev-parse", "--verify", "--quiet", `${ref}^{commit}`).trim();
  } catch {
    throw new Error(`${ref} is not a commit in this clone. Run \`git fetch\` (in a shallow clone, `
      + "`git fetch --unshallow`), then run the check again.");
  }
};

/** The commit that `ref` names, as its first 7 characters (the footer's rule). It throws an Error that the command
 *  line prints when the clone, the clone of the site's lock `lockUrl`, does not have the commit. */
export function commitOf(lockUrl: URL, ref: string): string {
  return fullHash(lockUrl, ref).slice(0, 7);
}

/** The commit that `ref` names, as `commitOf` gives it, and the site's engine lock of that commit: the file at the
 *  path of `lockUrl`, as Git keeps it. It throws an Error that the command line prints when the clone does not have the
 *  commit, and when the commit has no lock at the lock's path. */
export function lockAt(lockUrl: URL, ref: string): { commit: string; lock: EngineLock } {
  const hash = fullHash(lockUrl, ref);
  const commit = hash.slice(0, 7);
  const git = gitAt(lockUrl);
  const pathInRepo = git("rev-parse", "--show-prefix").trim() + basename(fileURLToPath(lockUrl));
  let text: string;
  try {
    text = git("show", `${hash}:${pathInRepo}`);
  } catch {
    throw new Error(`commit ${commit} has no ${pathInRepo}`);
  }
  return { commit, lock: JSON.parse(text) };
}
