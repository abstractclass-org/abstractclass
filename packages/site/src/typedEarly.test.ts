import "@abstractclass/analysis/testing/svelteModules.ts";
import { test } from "node:test";
import assert from "node:assert/strict";

const { readTypedEarly, typedEarly } = await import("./typedEarly.ts");

test("typedEarly: the field's text when it differs from the rendered text, else nothing", () => {
  assert.equal(typedEarly({ value: "a b c", defaultValue: "" }), "a b c");
  assert.equal(typedEarly({ value: "", defaultValue: "" }), "");
  assert.equal(typedEarly({ value: "start", defaultValue: "start" }), "");
  assert.equal(typedEarly({ value: "", defaultValue: "start" }), ""); // the player cleared it: nothing to read
});

test("readTypedEarly: reads the typed text after the page's first update, and reads nothing when none was typed", async () => {
  const read: string[] = [];
  readTypedEarly({ value: "typed", defaultValue: "" }, t => read.push(t));
  readTypedEarly({ value: "", defaultValue: "" }, t => read.push(t));
  assert.deepEqual(read, []); // not yet: the page's first update comes first
  await new Promise(resolve => setTimeout(resolve));
  assert.deepEqual(read, ["typed"]);
});
