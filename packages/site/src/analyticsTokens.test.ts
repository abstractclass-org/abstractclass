// Checks the build's check of the analytics' tokens (analyticsTokens.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyticsTokenCheck, analyticsTokenProblems } from "./analyticsTokens.ts";

// Made-up values in each form. The real ones are repository variables (docs/hosting.md, section 3).
const POSTHOG_KEY = "phc_TEST0000000000000000000000000000000000000000";
const CF_TOKEN = "0123456789abcdef0123456789abcdef";

test("a well-formed PostHog token and Cloudflare token pass", () => {
  assert.deepEqual(analyticsTokenProblems({ VITE_POSTHOG_KEY: POSTHOG_KEY, VITE_CF_ANALYTICS_TOKEN: CF_TOKEN }), []);
  assert.deepEqual(analyticsTokenProblems({ VITE_POSTHOG_KEY: "phc_aZ09" }), []);
});

test("an empty or unset value passes, as in previews and local builds", () => {
  assert.deepEqual(analyticsTokenProblems({}), []);
  assert.deepEqual(analyticsTokenProblems({ VITE_POSTHOG_KEY: "", VITE_CF_ANALYTICS_TOKEN: "" }), []);
});

test("a value that is not a PostHog project token fails, with its name, its first 4 characters and the form", () => {
  const malformed = ["GTM-5KWQ7P6P", "G-C5RY6DWGWN", "UA-12345-1", "phx_TEST0000", "phc_", "phc_TEST-0000",
                     ` ${POSTHOG_KEY}`];
  for (const value of malformed) {
    const problems = analyticsTokenProblems({ VITE_POSTHOG_KEY: value });
    assert.equal(problems.length, 1, value);
    // The quote closes after 4 characters, and the rest of the message is fixed text: no more of the value shows.
    assert.ok(problems[0].startsWith(`VITE_POSTHOG_KEY starts with "${value.slice(0, 4)}", `), value);
    assert.match(problems[0], /phc_ and then letters and digits only/);
  }
});

test("a Cloudflare token that is not 32 hexadecimal digits fails", () => {
  for (const value of [CF_TOKEN.slice(1), CF_TOKEN + "0", CF_TOKEN.toUpperCase(), "g" + CF_TOKEN.slice(1)]) {
    const problems = analyticsTokenProblems({ VITE_CF_ANALYTICS_TOKEN: value });
    assert.equal(problems.length, 1, value);
    assert.ok(problems[0].startsWith(`VITE_CF_ANALYTICS_TOKEN starts with "${value.slice(0, 4)}", `), value);
    assert.match(problems[0], /32 hexadecimal digits/);
  }
});

test("the plugin stops the build with each message, and passes a build with well-formed tokens", () => {
  const plugin = analyticsTokenCheck();
  assert.doesNotThrow(() => plugin.configResolved({ env: { VITE_POSTHOG_KEY: POSTHOG_KEY } }));
  const malformed = { VITE_POSTHOG_KEY: "GTM-5KWQ7P6P", VITE_CF_ANALYTICS_TOKEN: "x" };
  assert.throws(() => plugin.configResolved({ env: malformed }),
                /VITE_POSTHOG_KEY starts with "GTM-"[^]*VITE_CF_ANALYTICS_TOKEN starts with "x"/);
});
