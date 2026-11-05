import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, compare } from "./engine-kinds.mjs";

const script = join(import.meta.dirname, "engine-kinds.mjs");

const HEDGE_SCHOOL = ["module", "notices", "gpu-module", "graph", "model"];

/** A repository in a folder of its own, removed after the test: Hedge School's lock with `HEDGE_SCHOOL`'s kinds, and
 *  each site of `sites` with its lock's kinds and its exceptions (none: no file). */
function repository(t, sites) {
  const root = mkdtempSync(join(tmpdir(), "engine-kinds-"));
  t.after(() => rmSync(root, { recursive: true }));
  const lock = kinds => JSON.stringify({ artifacts: kinds.map(kind => ({ id: kind, kind })) });
  mkdirSync(join(root, "apps/hedgeschool"), { recursive: true });
  writeFileSync(join(root, "apps/hedgeschool/engine.lock.json"), lock(HEDGE_SCHOOL));
  mkdirSync(join(root, "apps/hub"), { recursive: true }); // a site with no engine: no lock, not compared
  for (const [name, { kinds, exceptions }] of Object.entries(sites)) {
    mkdirSync(join(root, "apps", name), { recursive: true });
    writeFileSync(join(root, "apps", name, "engine.lock.json"), lock(kinds));
    if (exceptions) writeFileSync(join(root, "apps", name, "engine.lock.exceptions.json"), JSON.stringify(exceptions));
  }
  return root;
}

test("a lock with every kind of Hedge School's passes with no exceptions", () => {
  const result = compare("apps/x", HEDGE_SCHOOL, [...HEDGE_SCHOOL, "practice-module"], undefined);
  assert.equal(result.ok, true);
  assert.match(result.lines[0], /^apps\/x: every kind of Hedge School's engine lock\.$/);
});

test("each kind that the lock lacks fails, by name, with no exceptions file", () => {
  const result = compare("apps/x", HEDGE_SCHOOL, ["module", "notices", "model"], undefined);
  assert.equal(result.ok, false);
  assert.equal(result.lines.length, 2);
  assert.match(result.lines[0], /^apps\/x: its engine lock has no gpu-module, which Hedge School's has, and no /);
  assert.match(result.lines[1], /^apps\/x: its engine lock has no graph, /);
});

test("an exception that names its issue covers its kind", () => {
  const result = compare("apps/x", HEDGE_SCHOOL, ["module", "notices", "model"],
                         { "gpu-module": "abscls-8tl1.29: no GPU build yet", graph: "the GPU review, abscls-wqdl" });
  assert.equal(result.ok, true);
  assert.match(result.lines[0], /: every kind of Hedge School's engine lock, but 2 with an exception: /);
  assert.match(result.lines[0], /gpu-module \(abscls-8tl1\.29\), graph \(abscls-wqdl\)/);
});

test("an exception with no issue fails, also when another exception covers the rest", () => {
  const result = compare("apps/x", HEDGE_SCHOOL, ["module", "notices", "model"],
                         { "gpu-module": "abscls-8tl1.29", graph: "later" });
  assert.equal(result.ok, false);
  assert.deepEqual(result.lines.length, 1);
  assert.match(result.lines[0], /^apps\/x: the exception for graph names no issue \(abscls-…\)/);
  for (const text of ["", "abscls-", "see abscls"]) {
    assert.equal(compare("apps/x", ["graph"], [], { graph: text }).ok, false, JSON.stringify(text));
  }
  assert.equal(compare("apps/x", ["graph"], [], { graph: 29 }).ok, false);
});

test("a stale exception fails: the lock has the kind now, or Hedge School's has not", () => {
  const has = compare("apps/x", HEDGE_SCHOOL, HEDGE_SCHOOL, { graph: "abscls-8tl1.29" });
  assert.equal(has.ok, false);
  assert.match(has.lines[0], /^apps\/x: the exception for graph is stale: its engine lock has that kind now\./);
  const other = compare("apps/x", HEDGE_SCHOOL, HEDGE_SCHOOL, { "gpu-modul": "abscls-8tl1.29" });
  assert.equal(other.ok, false);
  assert.match(other.lines[0], /the exception for gpu-modul is stale: Hedge School's engine lock has no such kind\./);
});

test("an exceptions file that is not an object of kinds fails", () => {
  for (const exceptions of [[], "abscls-8tl1.29", null]) {
    const result = compare("apps/x", ["graph"], [], exceptions);
    assert.equal(result.ok, false, JSON.stringify(exceptions));
    assert.match(result.lines[0], /engine\.lock\.exceptions\.json is not an object of kinds and their issues/);
  }
});

test("the check reads each jam site's lock and exceptions beside it, and skips a site with no lock", t => {
  const root = repository(t, {
    a: { kinds: HEDGE_SCHOOL },
    b: { kinds: ["module", "notices", "model"], exceptions: { "gpu-module": "abscls-1", graph: "abscls-2" } },
  });
  const result = check(root);
  assert.equal(result.ok, true);
  assert.deepEqual(result.lines.map(l => l.split(":")[0]), ["apps/a", "apps/b"]);
});

test("the command fails with no exceptions file, passes with one, and fails on a stale one or one with no issue", t => {
  const root = repository(t, { c: { kinds: ["module", "notices", "model"] } });
  const run = () => spawnSync(process.execPath, [script, root], { encoding: "utf8" });
  const exceptions = value => writeFileSync(join(root, "apps/c/engine.lock.exceptions.json"), JSON.stringify(value));

  const none = run();
  assert.equal(none.status, 1);
  assert.match(none.stderr, /apps\/c: its engine lock has no gpu-module, .*\n.*apps\/c: [^\n]* no graph, /);

  exceptions({ "gpu-module": "abscls-8tl1.29", graph: "abscls-8tl1.29" });
  const covered = run();
  assert.equal(covered.status, 0, covered.stderr);
  assert.match(covered.stdout, /apps\/c: every kind of Hedge School's engine lock, but 2 with an exception/);

  exceptions({ "gpu-module": "abscls-8tl1.29", graph: "abscls-8tl1.29", module: "abscls-8tl1.29" });
  const stale = run();
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /the exception for module is stale/);

  exceptions({ "gpu-module": "abscls-8tl1.29", graph: "the owner's decision" });
  const noIssue = run();
  assert.equal(noIssue.status, 1);
  assert.match(noIssue.stderr, /the exception for graph names no issue/);
});

test("the command fails when Hedge School's lock is missing", t => {
  const root = repository(t, {});
  rmSync(join(root, "apps/hedgeschool/engine.lock.json"));
  const run = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /apps\/hedgeschool\/engine\.lock\.json/);
});
