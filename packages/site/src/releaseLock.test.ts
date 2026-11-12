import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { pathToFileURL } from "node:url";
import { checkoutDiffers, commitOf, footerCommit, lockAt } from "./releaseLock.ts";

// A clone with a site's folder, apps/x: a commit with no lock and no script, a commit with lock "one" and script "one",
// a commit with lock "two" and script "two", and lock "three" in the working tree, not committed. The working tree's
// script is commit "two"'s. The working tree also has a script that Git does not track.
let root = "";
let lockUrl: URL;
let scriptUrl: URL;
let untrackedUrl: URL;
const commits: Record<string, string> = {};
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const lockTagged = (tag: string) => ({ tag, artifacts: [] });
// The test's commits take none of the user's settings for commits: no hooks, no signature.
const commitAs = (name: string) => {
  git("-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit",
    "--no-verify", "--allow-empty", "-q", "-m", name);
  commits[name] = git("rev-parse", "HEAD");
};

before(() => {
  root = mkdtempSync(join(tmpdir(), "release-lock-"));
  git("init", "-q");
  mkdirSync(join(root, "apps", "x", "scripts"), { recursive: true });
  const lock = join(root, "apps", "x", "engine.lock.json");
  const script = join(root, "apps", "x", "scripts", "check.mjs");
  lockUrl = pathToFileURL(lock);
  scriptUrl = pathToFileURL(script);
  commitAs("none");
  for (const tag of ["one", "two"]) {
    writeFileSync(lock, JSON.stringify(lockTagged(tag)));
    writeFileSync(script, `// script ${tag}\n`);
    git("add", "apps/x");
    commitAs(tag);
  }
  writeFileSync(lock, JSON.stringify(lockTagged("three")));
  const untracked = join(root, "apps", "x", "scripts", "new.mjs");
  writeFileSync(untracked, "// a new script\n");
  untrackedUrl = pathToFileURL(untracked);
});

after(() => rmSync(root, { recursive: true, force: true }));

test("the lock is the commit's, not the checkout's", () => {
  const { commit, lock } = lockAt(lockUrl, commits.one);
  assert.equal(commit, commits.one.slice(0, 7));
  assert.deepEqual(lock, lockTagged("one"));
  assert.deepEqual(lockAt(lockUrl, "HEAD").lock, lockTagged("two"));
});

test("a short hash and a branch name are commits too", () => {
  assert.deepEqual(lockAt(lockUrl, commits.one.slice(0, 7)).lock, lockTagged("one"));
  assert.equal(commitOf(lockUrl, "HEAD"), commits.two.slice(0, 7));
});

test("a commit that the clone does not have: an error that says to fetch", () => {
  assert.throws(() => lockAt(lockUrl, "0123456789abcdef0123456789abcdef01234567"),
    /0123456789abcdef0123456789abcdef01234567 is not a commit in this clone.*git fetch/s);
  assert.throws(() => commitOf(lockUrl, "origin/nothing"), /origin\/nothing is not a commit in this clone/);
});

test("a commit that has no lock in the site's folder: an error that names the path", () => {
  assert.throws(() => lockAt(lockUrl, commits.none),
    new RegExp(`commit ${commits.none.slice(0, 7)} has no apps/x/engine\\.lock\\.json`));
});

test("the footer's commit: the 7 characters after its word version, none for a build with no commit", () => {
  const footer = (version: string) => `<footer><span class="ml-auto">Hedge School, version ${version} · © 2026</span>`
    + "</footer>";
  assert.equal(footerCommit(footer("34058e5")), "34058e5");
  assert.equal(footerCommit(footer("unknown")), undefined);
  assert.equal(footerCommit("<p>a page with no footer</p>"), undefined);
});

test("the checkout's code differs from a commit's: a file that changed since, or that the commit lacks", () => {
  assert.equal(checkoutDiffers(lockUrl, commits.two, [scriptUrl]), false);
  assert.equal(checkoutDiffers(lockUrl, commits.one, [scriptUrl]), true);
  assert.equal(checkoutDiffers(lockUrl, commits.none, [scriptUrl]), true);
  // A change in the working tree counts: it holds lock "three", which no commit has. One file of several is enough.
  assert.equal(checkoutDiffers(lockUrl, commits.two, [scriptUrl, lockUrl]), true);
});

test("the checkout's code differs when Git cannot compare it: an untracked file, another letter case, a bad commit, "
  + "a file outside the clone", () => {
  assert.equal(checkoutDiffers(lockUrl, commits.two, [scriptUrl, untrackedUrl]), true);
  assert.equal(checkoutDiffers(lockUrl, commits.two, [new URL("Check.mjs", scriptUrl)]), true);
  assert.equal(checkoutDiffers(lockUrl, "0123456789abcdef0123456789abcdef01234567", [scriptUrl]), true);
  assert.equal(checkoutDiffers(lockUrl, commits.two, [pathToFileURL(join(tmpdir(), "outside.mjs"))]), true);
});

// checkoutDiffers gets a site's check script and release-check.mjs. A part that a site's script imported from another
// file could change with no mark, so the script imports nothing but the shared check.
test("each site's check script imports only the shared check", () => {
  const apps = new URL("../../../apps/", import.meta.url);
  const scripts = readdirSync(apps).map(app => new URL(`${app}/scripts/release-check.mjs`, apps)).filter(existsSync);
  assert.ok(scripts.length >= 2, "the check scripts of Hedge School and Cyanotype");
  for (const script of scripts) {
    const text = readFileSync(script, "utf8");
    const imports = [...text.matchAll(/^import\b[^"']*["']([^"']+)["']/gm)].map(m => m[1]);
    assert.deepEqual(imports, ["@abstractclass/site/release-check.mjs"], script.pathname);
    assert.doesNotMatch(text, /\bimport\s*\(/, script.pathname);
  }
});
