import { test } from "node:test";
import assert from "node:assert/strict";
import { ENGINE_NAME, SITE_NAME } from "./site.ts";

test("the site and its engine have their names", () => {
  assert.equal(SITE_NAME, "Drawing Board");
  assert.equal(ENGINE_NAME, "Stamp Duty");
});
