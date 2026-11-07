// The checks that the Tests workflow runs before its browser tests (.github/workflows/tests.yml), as one command that
// the workflow and people both run: `npm run check:all` at the root, after `npm ci`. One list of steps, here.
// Each step runs with the environment that the workflow gave it. Each site's engine step takes --deploy: it refuses a
// local engine file, as the deploy does. Each site's build is the production build of the browser tests, in the early
// edition (VITE_EDITION=early), and Hedge School's has the practice games' storage on. A failed step does not stop
// the steps after it, except an engine step: the others need its files.
// The output ends with one line: `check:all: PASS` or `check:all: FAIL`, then each step with PASS, FAIL or SKIP.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "apps/hedgeschool");
const cyanotype = join(root, "apps/cyanotype");

const steps = [
  // No package.json with a key twice (a merge can leave two "dependencies" blocks), and the root scripts' own tests.
  { name: "json-keys", cwd: root, command: 'node --test "scripts/*.test.mjs" && node scripts/json-keys.mjs' },
  // Each jam site's engine lock has every kind of Hedge School's, or an exception that names the gap's issue (design
  // 29, "Consequences").
  { name: "engine-kinds", cwd: root, command: "node scripts/engine-kinds.mjs" },
  { name: "engine", cwd: site, command: "npm run engine -- --deploy", stopsOnFailure: true },
  { name: "site-check", cwd: site, command: "npm run check" },
  { name: "site-test", cwd: site, command: "npm test" },
  // The shared packages' type checks and unit tests (design 29): every workspace in packages/.
  { name: "packages-check", cwd: root, command: "npm run check --workspace=packages" },
  { name: "packages-test", cwd: root, command: "npm test --workspace=packages" },
  // The hub's board is the one that its script writes from Hedge School's home board, and its colours are Hedge
  // School's (apps/hub/scripts/enclosure-board.mjs).
  { name: "hub-board", cwd: root, command: "node apps/hub/scripts/enclosure-board.mjs --check" },
  {
    name: "build", cwd: site, command: "npm run build",
    env: { VITE_EDITION: "early", VITE_STORE_PRACTICE_GAMES: "on" },
  },
  // No file of a build over 25 MiB: Cloudflare Pages refuses the upload of a larger file (docs/hosting.md, section 2).
  { name: "build-sizes", cwd: root, command: "node scripts/build-sizes.mjs apps/hedgeschool/build" },
  // Cyanotype, Blueprints' site (design 33): its engine's release files, its type check, its unit tests, its build and
  // its build's file sizes.
  // Cyanotype's steps come last, so that a failure of its engine step skips only Cyanotype's steps.
  { name: "cyanotype-engine", cwd: cyanotype, command: "npm run engine -- --deploy", stopsOnFailure: true },
  { name: "cyanotype-check", cwd: cyanotype, command: "npm run check" },
  { name: "cyanotype-test", cwd: cyanotype, command: "npm test" },
  { name: "cyanotype-build", cwd: cyanotype, command: "npm run build", env: { VITE_EDITION: "early" } },
  { name: "cyanotype-build-sizes", cwd: root, command: "node scripts/build-sizes.mjs apps/cyanotype/build" },
];

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
