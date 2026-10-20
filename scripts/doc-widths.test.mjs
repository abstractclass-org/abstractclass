import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { addedLines, chars, overlong, WIDTH } from "./doc-widths.mjs";

const long = (n, word = "a") => Array.from({ length: n }, () => word).join(" ");

test("a line counts characters, not bytes or UTF-16 units", () => {
  assert.equal(chars("−×"), 2);
  assert.equal(chars("𝄞"), 1);
});

test("only an added line over the width is refused", () => {
  const text = [long(61), long(60), "x".repeat(WIDTH), "x".repeat(WIDTH + 1) + " b"].join("\n");
  assert.equal(chars(long(61)), WIDTH + 1);
  assert.deepEqual(overlong(text, new Set([1, 2, 3, 4])), [{ line: 1, chars: 121 }, { line: 4, chars: 123 }]);
  assert.deepEqual(overlong(text, new Set([2, 3])), []);
});

test("a table row, a code block and a long URL may be longer", () => {
  const text = [
    "| " + long(70) + " |",
    "   | " + long(70) + " |",
    "```sh",
    long(70),
    "```",
    "  ~~~",
    long(70),
    "  ~~~",
    "Read [the guide](https://example.com/" + "p".repeat(150) + ").",
    "- " + long(40) + " <https://example.com/" + "p".repeat(150) + ">",
    "See https://example.com/" + "p".repeat(150),
    long(70),
  ].join("\n");
  assert.deepEqual(overlong(text, new Set(text.split("\n").map((_, i) => i + 1))), [{ line: 12, chars: 139 }]);
});

test("the text around a URL still counts", () => {
  const line = long(60) + " [x](https://example.com/" + "p".repeat(150) + ")";
  assert.deepEqual(overlong(line, new Set([1])), [{ line: 1, chars: chars(line) }]);
});

test("a fence closes only with its own mark, at least as long", () => {
  const text = ["````md", "```", long(70), "````", long(70)].join("\n");
  assert.deepEqual(overlong(text, new Set([3, 5])), [{ line: 5, chars: 139 }]);
});

test("a diff with no context gives each file's added lines", () => {
  const diff = [
    "diff --git docs/a.md docs/a.md",
    "index 1111111..2222222 100644",
    "--- docs/a.md",
    "+++ docs/a.md",
    "@@ -3,0 +4,2 @@ heading",
    "+one",
    "+two",
    "@@ -10 +12 @@",
    "-old",
    "+new",
    "@@ -20,2 +21,0 @@",
    "-gone",
    "-gone",
    "diff --git README.md README.md",
    "new file mode 100644",
    "--- /dev/null",
    "+++ README.md",
    "@@ -0,0 +1,3 @@",
    "+a",
    "+b",
    "+c",
    "diff --git docs/gone.md docs/gone.md",
    "deleted file mode 100644",
    "--- docs/gone.md",
    "+++ /dev/null",
    "@@ -1 +0,0 @@",
    "-x",
  ].join("\n");
  assert.deepEqual(addedLines(diff), new Map([
    ["docs/a.md", new Set([4, 5, 12])],
    ["README.md", new Set([1, 2, 3])],
  ]));
});

test("an added line that starts with ++ is no file's header, and a path with a space loses Git's tab", () => {
  const diff = [
    "diff --git docs/a b.md docs/a b.md",
    "index 1111111..2222222 100644",
    "--- docs/a b.md\t",
    "+++ docs/a b.md\t",
    "@@ -1,0 +2,3 @@",
    "+one",
    "+++ two",
    "--- three",
  ].join("\n");
  assert.deepEqual(addedLines(diff), new Map([["docs/a b.md", new Set([2, 3, 4])]]));
});

test("--staged checks the index, not the working tree, and says nothing when it passes", () => {
  const dir = mkdtempSync(join(tmpdir(), "doc-widths-"));
  const run = () => spawnSync(process.execPath, [fileURLToPath(new URL("./doc-widths.mjs", import.meta.url)), "--staged"],
    { cwd: dir, encoding: "utf8" });
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    writeFileSync(join(dir, "a.md"), long(70) + "\n");
    execFileSync("git", ["add", "a.md"], { cwd: dir });
    const refused = run();
    assert.equal(refused.status, 1);
    assert.match(refused.stdout, /^a\.md:1: 139 characters/m);
    assert.match(refused.stdout, /no commit/);

    writeFileSync(join(dir, "a.md"), long(10) + "\n");
    execFileSync("git", ["add", "a.md"], { cwd: dir });
    writeFileSync(join(dir, "a.md"), long(70) + "\n"); // not staged: the commit does not take it
    const passed = run();
    assert.equal(passed.status, 0);
    assert.equal(passed.stdout, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
