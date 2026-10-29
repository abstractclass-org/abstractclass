// Checks which engine protocols a site takes (speaksProtocol): a site written for 0.6.1, which brings describe_game,
// takes a later 0.6.x, and a site written for 0.7.0, which brings the search of the root's views (Blueprints' build),
// takes a later 0.7.x. Before 1.0 a breaking change takes the next minor version, and a compatible one the next patch
// (the engine repository's design 04, "Versioning"). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkVersion } from "./client.ts";
import { ROOT_VIEWS_PROTOCOL, speaksProtocol } from "./protocol.ts";

test("the site takes 0.6.1 and every later 0.6.x", () => {
  for (const v of ["0.6.1", "0.6.2", "0.6.10"]) assert.equal(speaksProtocol(v), true, v);
});

test("the site refuses another minor version, and 0.6.0, which has no describe_game", () => {
  for (const v of ["0.5", "0.6", "0.6.0", "0.7", "0.7.1", "1.0", "0.60", "0.6.1.1", "0.6.x", ""]) assert.equal(speaksProtocol(v), false, v);
});

test("a site written for the root's views takes 0.7.0 and every later 0.7.x, and refuses 0.6.x", () => {
  for (const v of ["0.7.0", "0.7.1", "0.7.12"]) assert.equal(speaksProtocol(v, ROOT_VIEWS_PROTOCOL), true, v);
  for (const v of ["0.6.1", "0.6.2", "0.7", "0.8.0", "1.0.0", ""]) assert.equal(speaksProtocol(v, ROOT_VIEWS_PROTOCOL), false, v);
});

test("a module's version is checked against the protocol that the manifest names, or 0.6.1", () => {
  const version = (protocol: string) => ({ id: "v", protocol, build: "b", search: "s", rules: "r", model: null, trained: [] });
  assert.equal(checkVersion(version("0.6.2")).protocol, "0.6.2");
  assert.throws(() => checkVersion(version("0.7.0")), /engine protocol 0.7.0: this site speaks 0.6.1/);
  assert.equal(checkVersion(version("0.7.0"), ROOT_VIEWS_PROTOCOL).protocol, "0.7.0");
  assert.throws(() => checkVersion(version("0.6.2"), ROOT_VIEWS_PROTOCOL), /this site speaks 0.7.0/);
});
