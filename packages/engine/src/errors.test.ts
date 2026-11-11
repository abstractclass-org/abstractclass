import { test } from "node:test";
import assert from "node:assert/strict";
import { errorSentence, errorText } from "./errors.ts";

test("an error's text has no \"Error: \" before it", () => {
  assert.equal(errorText(new Error("the file is empty")), "the file is empty");
  assert.equal(errorText("the file is empty"), "the file is empty");
});

test("an error as a sentence's end has one period", () => {
  assert.equal(errorSentence(new Error("the file is empty")), "the file is empty.");
  assert.equal(errorSentence("the file is empty."), "the file is empty.");
  assert.equal(errorSentence("move 3 is not legal"), "move 3 is not legal.");
});
