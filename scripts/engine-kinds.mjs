// A jam game's site has everything that Hedge School has (design 29, "Consequences"). This check compares each jam
// site's engine lock (every `apps/*/engine.lock.json` but Hedge School's) with Hedge School's, by artifact kind: the
// module, the GPU module, the threaded practice bot and the rest. A kind that Hedge School's lock has and the jam
// site's lacks must be in the jam site's exceptions file beside its lock, `engine.lock.exceptions.json`: an object
// with each kind and the issue that holds the work or the decision about it, as text that names the issue's id
// ({ "gpu-module": "abscls-8tl1.29: ..." }). Its site's design lists the same gaps with their issues.
//
//   node scripts/engine-kinds.mjs [ROOT]
//
// It fails on a kind that the lock lacks with no exception, on an exception that names no issue (`abscls-…`), and on
// a stale exception: a kind that the lock has now, or one that Hedge School's lock does not have. It prints each
// site's result, and exits 1 on a failure. ROOT is the repository's root (the default: this script's).
// Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REFERENCE = "hedgeschool";
export const LOCK = "engine.lock.json";
export const EXCEPTIONS = "engine.lock.exceptions.json";
/** An issue's id in the planning repository's beads database: `abscls-to4f`, `abscls-8tl1.29`. */
const ISSUE = /\babscls-[0-9a-z]+(?:\.[0-9]+)*\b/;

/** The kinds of a lock's artifacts, each once, in the lock's order. */
const kindsOf = lock => [...new Set(lock.artifacts.map(a => a.kind))];
const readJson = path => JSON.parse(readFileSync(path, "utf8"));

/** One jam site's result: its lock's kinds `kinds` against Hedge School's `reference`, with its `exceptions` (the
 *  exceptions file's content, undefined with no file). `site` names it in the lines. */
export function compare(site, reference, kinds, exceptions) {
  const isObject = typeof exceptions === "object" && exceptions !== null && !Array.isArray(exceptions);
  if (exceptions !== undefined && !isObject) {
    return { ok: false, lines: [`${site}: ${EXCEPTIONS} is not an object of kinds and their issues.`] };
  }
  const excepted = exceptions ?? {};
  const issueOf = kind => typeof excepted[kind] === "string" ? excepted[kind].match(ISSUE)?.[0] : undefined;
  const problems = [];
  for (const kind of reference.filter(k => !kinds.includes(k) && !(k in excepted))) {
    problems.push(`${site}: its engine lock has no ${kind}, which Hedge School's has, and no exception in ` +
                  `${EXCEPTIONS} names the issue that holds the gap.`);
  }
  for (const kind of Object.keys(excepted)) {
    const stale = kinds.includes(kind) ? "its engine lock has that kind now"
      : !reference.includes(kind) ? "Hedge School's engine lock has no such kind" : null;
    if (stale) problems.push(`${site}: the exception for ${kind} is stale: ${stale}.`);
    else if (!issueOf(kind)) problems.push(`${site}: the exception for ${kind} names no issue (abscls-…).`);
  }
  if (problems.length > 0) return { ok: false, lines: problems };
  const gaps = Object.keys(excepted).map(kind => `${kind} (${issueOf(kind)})`);
  return {
    ok: true,
    lines: [`${site}: every kind of Hedge School's engine lock` +
            (gaps.length ? `, but ${gaps.length} with an exception: ${gaps.join(", ")}.` : ".")],
  };
}

/** Every jam site's result under `root`: each folder of `apps/` with an engine lock, but Hedge School's. */
export function check(root) {
  const apps = join(root, "apps");
  const referencePath = join(apps, REFERENCE, LOCK);
  if (!existsSync(referencePath)) return { ok: false, lines: [`apps/${REFERENCE}/${LOCK}: not found.`] };
  const reference = kindsOf(readJson(referencePath));
  const sites = readdirSync(apps, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== REFERENCE && existsSync(join(apps, d.name, LOCK)))
    .map(d => d.name).sort();
  if (sites.length === 0) return { ok: true, lines: ["No jam site has an engine lock."] };
  const results = sites.map(name => {
    const exceptionsPath = join(apps, name, EXCEPTIONS);
    return compare(`apps/${name}`, reference, kindsOf(readJson(join(apps, name, LOCK))),
                   existsSync(exceptionsPath) ? readJson(exceptionsPath) : undefined);
  });
  return { ok: results.every(r => r.ok), lines: results.flatMap(r => r.lines) };
}

if (import.meta.main) {
  const [root = join(dirname(fileURLToPath(import.meta.url)), ".."), ...rest] = process.argv.slice(2);
  if (rest.length > 0) { console.error("usage: node scripts/engine-kinds.mjs [ROOT]"); process.exit(2); }
  const { ok, lines } = check(root);
  for (const line of lines) (ok ? console.log : console.error)(line);
  process.exit(ok ? 0 : 1);
}
