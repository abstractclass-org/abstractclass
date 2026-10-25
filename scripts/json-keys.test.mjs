import { test } from "node:test";
import assert from "node:assert/strict";
import { duplicateKeys } from "./json-keys.mjs";

test("two dependencies blocks, as a merge can leave them, are found", () => {
  const text = `{
	"name": "drawingboard",
	"dependencies": { "@abstractclass/record": "*" },
	"imports": { "#lib/*": "./src/lib/*" },
	"dependencies": { "@abstractclass/site": "*" }
}`;
  assert.deepEqual(duplicateKeys(text), [{ path: "dependencies", line: 5 }]);
});

test("a key twice inside a nested object is found with its path", () => {
  assert.deepEqual(duplicateKeys(`{"scripts": {"test": "a", "check": "b", "test": "c"}}`), [{ path: "scripts.test", line: 1 }]);
});

test("one key in two objects, and keys inside strings and arrays, are not duplicates", () => {
  const text = `{"a": {"x": 1}, "b": {"x": [{"x": 2}, {"x": "\\"x\\": {"}]}, "c": "{\\"a\\": 1}"}`;
  assert.deepEqual(duplicateKeys(text), []);
});

test("every kind of value parses", () => {
  assert.deepEqual(duplicateKeys(`{"t": true, "f": false, "n": null, "i": -12, "d": 1.5e3, "s": "é\\u00e9", "e": {}, "l": []}`), []);
});

test("malformed JSON is an error, not a pass", () => {
  assert.throws(() => duplicateKeys(`{"a": 1,}`), SyntaxError);
  assert.throws(() => duplicateKeys(`{"a" 1}`), SyntaxError);
});
