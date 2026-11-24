// The checks that the Tests workflow runs before its browser tests (.github/workflows/tests.yml), as one command that
// the workflow and people both run: `npm run check:all` at the root, after `npm ci`. One list of steps, here.
// Each step runs with the environment that the workflow gave it. Each site's engine step takes --deploy: it refuses a
// local engine file, as the deploy does. Each site's build is the production build of the browser tests, in the early
// edition (VITE_EDITION=early), with a made-up PostHog key and the practice games' storage on.
// Cyanotype is also built once without the key, for the check that such a build holds none of PostHog's code. A
// failed step does not stop the steps after it, except an engine step: the others need its files.
// The output ends with one line: `check:all: PASS` or `check:all: FAIL`, then each step with PASS, FAIL or SKIP.
// `--only <step>,<step>` runs only the named steps, in this list's order: the workflow's job test-webkit takes the
// engines and the builds of the browser tests from here, so that its builds are the ones that the other parts test.
// With another argument, or a name that is not a step, check:all stops before its first step, with exit code 2.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "apps/hedgeschool");
const cyanotype = join(root, "apps/cyanotype");
const mistak = join(root, "apps/mistak");

/** A made-up PostHog project key, in the form of a real one: `phc_` and 44 characters. */
const TEST_POSTHOG_KEY = "phc_TEST0000000000000000000000000000000000000000";

const allSteps = [
  // No package.json with a key twice (a merge can leave two "dependencies" blocks), and the root scripts' own tests.
  { name: "json-keys", cwd: root, command: 'node --test "scripts/*.test.mjs" && node scripts/json-keys.mjs' },
  // Each jam site's engine lock has every kind of Hedge School's, or an exception that names the gap's issue (design
  // 29, "Consequences").
  { name: "engine-kinds", cwd: root, command: "node scripts/engine-kinds.mjs" },
  // No package imports a site (design 29, item 1).
  { name: "package-imports", cwd: root, command: "node scripts/package-imports.mjs" },
  // No cycle among the @abstractclass dependencies of packages/ and apps/, and no import of an @abstractclass package
  // that the importer's package.json does not list (design 29, "The packages' order").
  { name: "package-deps", cwd: root, command: "node scripts/package-deps.mjs" },
  // Each spec file takes its test from tests/page-log.ts, which keeps the page log of a failing case.
  { name: "spec-page-log", cwd: root, command: "node scripts/spec-page-log.mjs" },
  // Each block of the owner's steps in the documents names its own URL, clicks and values, and sends the reader to no
  // other section for what to do (scripts/owner-steps.mjs).
  { name: "owner-steps", cwd: root, command: "node scripts/owner-steps.mjs" },
  { name: "engine", cwd: site, command: "npm run engine -- --deploy", stopsOnFailure: true },
  { name: "site-check", cwd: site, command: "npm run check" },
  // The browser tests' type check: Hedge School's tests/ (Cyanotype's specs too) and playwright.config.ts, with
  // apps/hedgeschool/tests/tsconfig.json. svelte-check covers src only. tsc also reads the site and package modules
  // that the specs import, and checks those few again.
  { name: "site-tests-check", cwd: site, command: "npm run check:tests" },
  { name: "site-test", cwd: site, command: "npm test" },
  // The shared packages' type checks and unit tests (design 29): every workspace in packages/.
  { name: "packages-check", cwd: root, command: "npm run check --workspace=packages" },
  { name: "packages-test", cwd: root, command: "npm test --workspace=packages" },
  // The hub's board is the one that its script writes from Hedge School's home board, and its colours are Hedge
  // School's (apps/hub/scripts/enclosure-board.mjs).
  { name: "hub-board", cwd: root, command: "node apps/hub/scripts/enclosure-board.mjs --check" },
  // The colours of the page of Hedge School's link preview picture are the site's dark theme's tokens
  // (apps/hedgeschool/scripts/social-card.mjs).
  { name: "social-card", cwd: site, command: "node scripts/social-card.mjs --check" },
  // Each site's build has a made-up PostHog key, so that the browser tests check the measuring and the events
  // (tests/analytics.spec.ts, tests/cyanotype-events.spec.ts). No test reaches PostHog: the browser tests' Chromium
  // resolves none of its addresses (playwright.config.ts), and the tests answer them in PostHog's place.
  {
    name: "build", cwd: site, command: "npm run build",
    env: { VITE_EDITION: "early", VITE_STORE_PRACTICE_GAMES: "on", VITE_POSTHOG_KEY: TEST_POSTHOG_KEY },
  },
  // No file of a build over 25 MiB: Cloudflare Pages refuses the upload of a larger file (docs/hosting.md, section 2).
  { name: "build-sizes", cwd: root, command: "node scripts/build-sizes.mjs apps/hedgeschool/build" },
  // Mistak, Tak's site (design 34): its type check, its unit tests, its build for the browser tests and its build's
  // file sizes. It ships no engine yet, so it has no engine step, and its steps come before Cyanotype's, whose engine
  // step stops the steps after it when it fails.
  { name: "mistak-check", cwd: mistak, command: "npm run check" },
  { name: "mistak-test", cwd: mistak, command: "npm test" },
  {
    name: "mistak-build", cwd: mistak, command: "npm run build",
    env: { VITE_EDITION: "early", VITE_POSTHOG_KEY: TEST_POSTHOG_KEY },
  },
  { name: "mistak-build-sizes", cwd: root, command: "node scripts/build-sizes.mjs apps/mistak/build" },
  // Cyanotype, Blueprints' site (design 33): its engine's release files, its type check, its unit tests, its build
  // without the key and the check that it holds none of PostHog's code, its build for the browser tests and its build's
  // file sizes.
  // Cyanotype's steps come last, so that a failure of its engine step skips only Cyanotype's steps.
  { name: "cyanotype-engine", cwd: cyanotype, command: "npm run engine -- --deploy", stopsOnFailure: true },
  { name: "cyanotype-check", cwd: cyanotype, command: "npm run check" },
  { name: "cyanotype-test", cwd: cyanotype, command: "npm test" },
  // A build without the key, as the previews' (design 33, "Analytics"): the next build replaces it.
  {
    name: "cyanotype-build-no-key", cwd: cyanotype, command: "npm run build",
    env: { VITE_EDITION: "early", VITE_POSTHOG_KEY: "" },
  },
  { name: "cyanotype-no-posthog", cwd: root, command: "node scripts/no-posthog.mjs apps/cyanotype/build" },
  {
    name: "cyanotype-build", cwd: cyanotype, command: "npm run build",
    env: { VITE_EDITION: "early", VITE_STORE_PRACTICE_GAMES: "on", VITE_POSTHOG_KEY: TEST_POSTHOG_KEY },
  },
  { name: "cyanotype-build-sizes", cwd: root, command: "node scripts/build-sizes.mjs apps/cyanotype/build" },
];

const names = allSteps.map(step => step.name);
const refuse = why => {
  console.error(`check:all: ${why}. --only takes step names, from: ${names.join(", ")}`);
  process.exit(2);
};
let only;
try {
  only = parseArgs({ options: { only: { type: "string" } } }).values.only?.split(",").filter(Boolean);
} catch (error) {
  refuse(error.message);
}
const unknown = only?.filter(name => !names.includes(name)) ?? [];
if (unknown.length > 0) refuse(`Not a step: ${unknown.join(", ")}`);
if (only?.length === 0) refuse("No step named");
const steps = only ? allSteps.filter(step => only.includes(step.name)) : allSteps;

const results = [];
for (const step of steps) {
  console.log(`\n=== check:all: ${step.name}: ${step.command}`);
  const start = Date.now();
  const run = spawnSync(step.command, {
    cwd: step.cwd, stdio: "inherit", shell: true, env: { ...process.env, ...step.env },
  });
  const status = run.status === 0 ? "PASS" : "FAIL";
  console.log(`=== check:all: ${step.name}: ${status} (${Math.round((Date.now() - start) / 1000)} s)`);
  results.push({ name: step.name, status });
  if (status === "FAIL" && step.stopsOnFailure) break;
}
for (const step of steps.slice(results.length)) results.push({ name: step.name, status: "SKIP" });

const pass = results.every(r => r.status === "PASS");
console.log(`\ncheck:all: ${pass ? "PASS" : "FAIL"}: ${results.map(r => `${r.status} ${r.name}`).join(", ")}`);
process.exit(pass ? 0 : 1);
