// Checks the error texts (errors.ts): an error's message alone, as the end of a sentence, and why a request failed.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { errorSentence, errorText, fetchReason } from "./errors.ts";

test("an error's text has no \"Error: \" before it", () => {
  assert.equal(errorText(new Error("the file is empty")), "the file is empty");
  assert.equal(errorText("the file is empty"), "the file is empty");
});

test("an error as a sentence's end has one period", () => {
  assert.equal(errorSentence(new Error("the file is empty")), "the file is empty.");
  assert.equal(errorSentence("the file is empty."), "the file is empty.");
  assert.equal(errorSentence("move 3 is not legal"), "move 3 is not legal.");
});

test("a failed request's reason is its cause's message, else the cause's code, else its own message", () => {
  const failed = (cause: object) => new TypeError("fetch failed", { cause });
  assert.equal(fetchReason(failed({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND example.org" })),
    "getaddrinfo ENOTFOUND example.org");
  assert.equal(fetchReason(failed({ code: "UND_ERR_SOCKET", message: "" })), "UND_ERR_SOCKET");
  assert.equal(fetchReason(failed({})), "fetch failed");
  assert.equal(fetchReason(new Error("terminated")), "terminated");
  assert.equal(fetchReason("no answer"), "no answer");
});
