import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { blocks, documents, PATTERNS, refusals } from "./owner-steps.mjs";

/** A section with a block of the owner's steps that holds `step` as its first step. */
const withStep = step => ["## 4. PostHog", "", "**The owner's steps, once.**", "", `1. ${step}`, ""].join("\n");

test("each phrase that sends the reader elsewhere is refused, with its line and the phrase", () => {
  const cases = [
    ["Do the four steps of section 4's \"The owner's own visits\".", "steps of section"],
    ["Turn on the flag as section 5, step 2, says.", "as section 5"],
    ["Add the token as the job `hub` does.", "as the job `hub` does"],
    ["Set the filters as Hedge School's property has them.", "as Hedge School's property has"],
    ["Mark the events as design 17 lists them.", "as design 17 lists"],
    ["Repeat the steps for the second site.", "Repeat the"],
    ["Set the retention the same as the first project.", "the same as"],
  ];
  assert.equal(cases.length, PATTERNS.length);
  for (const [step, phrase] of cases) assert.deepEqual(refusals(withStep(step)), [{ line: 5, phrase }], step);
});

test("a link to a page for the reader's information is allowed, and the check reads a link's text", () => {
  const allowed = "In **Settings → Project → Filters**, select **Add filter** " +
    "([PostHog's guide](https://posthog.com/docs/product-analytics/testing-and-debugging)).";
  assert.deepEqual(refusals(withStep(allowed)), []);
  assert.deepEqual(refusals(withStep("Mark the events as [design 17](design/17-measurement.md) lists them.")),
    [{ line: 5, phrase: "as design 17 lists" }]);
});

test("a phrase that wraps to the next line is refused at the line where it starts", () => {
  const text = withStep("Add the property's two filters as section\n   5 gives them, then **Save**.");
  assert.deepEqual(refusals(text), [{ line: 5, phrase: "as section 5" }]);
});

test("a phrase does not join two sentences, and is refused only in a block of the owner's steps", () => {
  assert.deepEqual(refusals(withStep("Select it as shown. The job does the rest.")), []);
  const text = ["## 9. Cyanotype", "", "It counts its visits as Hedge School does.", "", "## 10. Next"].join("\n");
  assert.deepEqual(refusals(text), []);
});

test("a bold line's block runs to the next heading, a heading's block to one of its own level or higher", () => {
  const text = [
    "## 8. The hub", //                 1
    "**The owner's steps, once.**", //  2
    "1. Select **Create**.", //         3
    "### The hub's analytics", //       4
    "Repeat the steps.", //             5
    "## Owner's steps for Cyanotype", // 6
    "1. Select **Create**.", //         7
    "### Its analytics", //             8
    "Repeat the steps.", //             9
    "## The launch switch", //          10
    "Repeat the steps.", //             11
  ].join("\n");
  assert.deepEqual(blocks(text), [{ start: 2, end: 3 }, { start: 6, end: 9 }]);
  assert.deepEqual(refusals(text).map(r => r.line), [9]);
});

test("a fenced code block neither ends a block nor counts in it", () => {
  const text = [
    "**The owner's steps, once.**",
    "```sh",
    "# Repeat the build",
    "## not a heading",
    "```",
    "Repeat the build.",
  ].join("\n");
  assert.deepEqual(blocks(text), [{ start: 1, end: 6 }]);
  assert.deepEqual(refusals(text), [{ line: 6, phrase: "Repeat the" }]);
});

test("the check reads docs/ and each app's and package's README, and prints each refusal", () => {
  const root = mkdtempSync(join(tmpdir(), "owner-steps-"));
  const write = (path, text) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const run = () => spawnSync(process.execPath, [fileURLToPath(new URL("./owner-steps.mjs", import.meta.url)), root],
    { encoding: "utf8" });
  try {
    write("docs/hosting.md", withStep("Select **Create**."));
    write("docs/decisions/product.md", withStep("Select **Create**."));
    write("apps/site/README.md", withStep("Select **Create**."));
    write("apps/site/src/notes.md", withStep("Repeat the steps."));
    write("README.md", withStep("Repeat the steps."));
    assert.deepEqual(documents(root), ["apps/site/README.md", "docs/decisions/product.md", "docs/hosting.md"]);
    const passed = run();
    assert.equal(passed.status, 0);
    assert.match(passed.stdout, /owner-steps: PASS 3 blocks of the owner's steps in 3 Markdown files/);

    write("packages/engine/README.md", withStep("Repeat the steps."));
    write("docs/decisions/product.md", withStep("Set it the same as before."));
    const refused = run();
    assert.equal(refused.status, 1);
    assert.match(refused.stdout, /^docs\/decisions\/product\.md:5: "the same as"/m);
    assert.match(refused.stdout, /^packages\/engine\/README\.md:5: "Repeat the"/m);
    assert.match(refused.stdout, /owner-steps: FAIL 2 refusals/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
