import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { pathToFileURL } from "node:url";
import { commitOf, footerCommit, lockAt } from "./releaseLock.ts";

// A clone with a site's folder, apps/x: a commit with no lock, a commit with lock "one", a commit with lock "two", and
// lock "three" in the working tree, not committed.
let root = "";
let lockUrl: URL;
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
  mkdirSync(join(root, "apps", "x"), { recursive: true });
  const lock = join(root, "apps", "x", "engine.lock.json");
  lockUrl = pathToFileURL(lock);
  commitAs("none");
  for (const tag of ["one", "two"]) {
    writeFileSync(lock, JSON.stringify(lockTagged(tag)));
    git("add", "apps/x/engine.lock.json");
    commitAs(tag);
  }
  writeFileSync(lock, JSON.stringify(lockTagged("three")));
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
