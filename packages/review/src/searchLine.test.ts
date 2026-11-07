import { test } from "node:test";
import assert from "node:assert/strict";
import { visitsText } from "./searchLine.ts";

const running = { visits: 1234, budget: 4096, goesOn: true, timedOut: false };

test("a search that runs short of its budget gives the budget", () => {
  assert.equal(visitsText(running), "1,234 of 4,096 visits");
});

test("a search that reaches its budget gives its visits alone", () => {
  assert.equal(visitsText({ ...running, visits: 4096 }), "4,096 visits");
  assert.equal(visitsText({ ...running, visits: 5000 }), "5,000 visits");
});

test("a search stopped short of its budget drops the budget", () => {
  assert.equal(visitsText({ ...running, goesOn: false }), "1,234 visits");
});

test("a search stopped at its time limit drops the budget and says so", () => {
  assert.equal(visitsText({ visits: 12345, budget: 100000, goesOn: false, timedOut: true }), "12,345 visits · time limit");
});

// The time limit ends the search, also where the page has not yet seen that no search goes on
test("a time limit drops the budget also while the search seems to go on", () => {
  assert.equal(visitsText({ ...running, timedOut: true }), "1,234 visits · time limit");
});

test("a page with no budget gives the visits alone", () => {
  assert.equal(visitsText({ ...running, budget: 0 }), "1,234 visits");
});
