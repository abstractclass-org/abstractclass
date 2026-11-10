import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { blocks, documents, PATTERNS, refusals } from "./owner-steps.mjs";

const script = join(import.meta.dirname, "owner-steps.mjs");

/** A repository in a folder of its own, removed after the test, with `files` (path from the root: text). */
function repository(t, files) {
  const root = mkdtempSync(join(tmpdir(), "owner-steps-"));
  t.after(() => rmSync(root, { recursive: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

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

test("the four steps that gave the check its reason are refused, each once", () => {
  // docs/hosting.md, "Cyanotype's analytics", as abscls-8tl1.48's branch first wrote it (54e1c960), shortened.
  const text = [
    "**The owner's steps, once,** before Cyanotype's launch (section 9, step 3).", // 1
    "", // 2
    "1. **Google Analytics: Cyanotype's own property and web stream.**", // 3
    "   1. Give the time zone and the currency as Hedge School's property has them. Finish the steps.", // 4
    "   4. Set up the property as Hedge School's: the custom dimensions and metrics, the key events and the data", // 5
    "      retention of 14 months, as design 17's \"The setup in Google Analytics\" lists them.", // 6
    "   5. The owner's own visits: do the four steps of section 4's \"The owner's own visits\" in this property.", // 7
    "2. **Cloudflare Web Analytics: Cyanotype's own site.**", // 8
    "   1. **Manage site → \"Enable with JS Snippet installation\" → Update**, as section 5, step 2, does", // 9
    "      for the domain.", // 10
  ].join("\n");
  assert.deepEqual(refusals(text), [
    { line: 4, phrase: "as Hedge School's property has" },
    { line: 6, phrase: "as design 17's \"The setup in Google Analytics\" lists" },
    { line: 7, phrase: "steps of section" },
    { line: 9, phrase: "as section 5, step 2, does" },
  ]);
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

test("the check reads docs/ and each app's and package's README, and prints each refusal", t => {
  const complete = withStep("Select **Create**.");
  const files = {
    "docs/hosting.md": complete,
    "docs/decisions/product.md": complete,
    "apps/site/README.md": complete,
    "apps/site/src/notes.md": withStep("Repeat the steps."),
    "README.md": withStep("Repeat the steps."),
  };
  const run = root => spawnSync(process.execPath, [script, root], { encoding: "utf8" });
  const passing = repository(t, files);
  assert.deepEqual(documents(passing), ["apps/site/README.md", "docs/decisions/product.md", "docs/hosting.md"]);
  const passed = run(passing);
  assert.equal(passed.status, 0);
  assert.match(passed.stdout, /owner-steps: PASS 3 blocks of the owner's steps in 3 Markdown files/);

  const refused = run(repository(t, {
    ...files,
    "packages/engine/README.md": withStep("Repeat the steps."),
    "docs/decisions/product.md": withStep("Set it the same as before."),
  }));
  assert.equal(refused.status, 1);
  assert.match(refused.stdout, /^docs\/decisions\/product\.md:5: "the same as"/m);
  assert.match(refused.stdout, /^packages\/engine\/README\.md:5: "Repeat the"/m);
  assert.match(refused.stdout, /owner-steps: FAIL 2 refusals/);
});
