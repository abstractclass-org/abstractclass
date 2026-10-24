// The checks that the Tests workflow runs before its browser tests (.github/workflows/tests.yml), as one command that
// the workflow and people both run: `npm run check:all` at the root, after `npm ci`. One list of steps, here.
// Each step runs with the environment that the workflow gave it. The engine's step takes --deploy: it refuses a
// local engine file, as the deploy does. The build is the production build of the browser tests, with the practice
// games' storage on. A failed step does not stop the steps after it, except the engine's: the others need its files.
// The output ends with one line: `check:all: PASS` or `check:all: FAIL`, then each step with PASS, FAIL or SKIP.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "apps/hedgeschool");
const board = join(root, "apps/drawingboard");

const steps = [
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
  // Drawing Board, Blueprints' site (design 33): its type check, its unit tests and its build.
  { name: "drawingboard-check", cwd: board, command: "npm run check" },
  { name: "drawingboard-test", cwd: board, command: "npm test" },
  { name: "drawingboard-build", cwd: board, command: "npm run build" },
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
