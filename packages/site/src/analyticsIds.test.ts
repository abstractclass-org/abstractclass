// Checks the build's check of the analytics' IDs (analyticsIds.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyticsIdCheck, analyticsIdProblems } from "./analyticsIds.ts";

// Made-up values in each form. The real ones are repository variables (docs/hosting.md, section 3).
const POSTHOG_KEY = "phc_TEST0000000000000000000000000000000000000000";
const CF_TOKEN = "0123456789abcdef0123456789abcdef";

test("a well-formed PostHog token and Cloudflare token pass", () => {
  assert.deepEqual(analyticsIdProblems({ VITE_POSTHOG_KEY: POSTHOG_KEY, VITE_CF_ANALYTICS_TOKEN: CF_TOKEN }), []);
  assert.deepEqual(analyticsIdProblems({ VITE_POSTHOG_KEY: "phc_aZ09" }), []);
});

test("an empty or unset value passes, as in previews and local builds", () => {
  assert.deepEqual(analyticsIdProblems({}), []);
  assert.deepEqual(analyticsIdProblems({ VITE_POSTHOG_KEY: "", VITE_CF_ANALYTICS_TOKEN: "" }), []);
});

test("a value that is not a PostHog project token fails, with its variable, its first 4 characters and the form", () => {
  for (const value of ["GTM-5KWQ7P6P", "G-C5RY6DWGWN", "phx_TEST0000", "phc_", "phc_TEST-0000", ` ${POSTHOG_KEY}`]) {
    const problems = analyticsIdProblems({ VITE_POSTHOG_KEY: value });
    assert.equal(problems.length, 1, value);
    assert.equal(problems[0].match(/^VITE_POSTHOG_KEY starts with "([^"]*)"/)?.[1], value.slice(0, 4), value);
    assert.ok(value.length <= 4 || !problems[0].includes(value.slice(4)), `${value}: more than 4 characters`);
    assert.match(problems[0], /phc_ and then letters and digits only/);
  }
});

test("a Cloudflare token that is not 32 hexadecimal digits fails", () => {
  for (const value of [CF_TOKEN.slice(1), CF_TOKEN + "0", CF_TOKEN.toUpperCase(), "g" + CF_TOKEN.slice(1)]) {
    const problems = analyticsIdProblems({ VITE_CF_ANALYTICS_TOKEN: value });
    assert.equal(problems.length, 1, value);
    assert.match(problems[0], /^VITE_CF_ANALYTICS_TOKEN starts with "/);
    assert.match(problems[0], /32 hexadecimal digits/);
  }
});

test("the plugin stops the build with each message, and passes a build with well-formed IDs", () => {
  const plugin = analyticsIdCheck();
  assert.doesNotThrow(() => plugin.configResolved({ env: { VITE_POSTHOG_KEY: POSTHOG_KEY } }));
  assert.throws(() => plugin.configResolved({ env: { VITE_POSTHOG_KEY: "GTM-5KWQ7P6P", VITE_CF_ANALYTICS_TOKEN: "x" } }),
                (error: Error) => /VITE_POSTHOG_KEY starts with "GTM-"/.test(error.message)
                  && /VITE_CF_ANALYTICS_TOKEN starts with "x"/.test(error.message));
});
