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
  const failed = (cause: unknown) => new TypeError("fetch failed", { cause });
  const withCode = (error: Error, code: string) => Object.assign(error, { code });
  // A host that does not exist: the message names the host, and the code does not.
  assert.equal(fetchReason(failed(withCode(new Error("getaddrinfo ENOTFOUND example.org"), "ENOTFOUND"))),
    "getaddrinfo ENOTFOUND example.org");
  // localhost with no server: Node's cause is an AggregateError with an empty message.
  assert.equal(fetchReason(failed(withCode(new AggregateError([], ""), "ECONNREFUSED"))), "ECONNREFUSED");
  assert.equal(fetchReason(failed({ code: "ECONNREFUSED" })), "ECONNREFUSED");
  // A cause with no message and no code.
  for (const cause of [{}, "no route", null, undefined]) {
    assert.equal(fetchReason(failed(cause)), "fetch failed", String(cause));
  }
  assert.equal(fetchReason(new Error("terminated")), "terminated");
  assert.equal(fetchReason("no answer"), "no answer");
});
