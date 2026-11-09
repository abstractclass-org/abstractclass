// A jam game's site has everything that Hedge School has (design 29, "Consequences"). This check compares each jam
// site's engine lock with Hedge School's, by artifact kind: the module, the GPU module, the threaded practice bot and
// the rest. A jam site is each game site (scripts/sites.mjs) but Hedge School. A kind that Hedge School's lock has
// and the jam site's lacks must be in the jam site's exceptions file beside its lock, `engine.lock.exceptions.json`:
// an object with each kind and the issue that holds the decision about it, as text that names the issue's id
// ({ "gpu-module": "abscls-8tl1.29: ..." }). Its site's design lists the same gaps with their issues.
//
//   node scripts/engine-kinds.mjs [ROOT]
//
// It fails on a kind that the lock lacks with no exception, on an exception that names no issue (`abscls-…`), and on
// a stale exception: a kind that the lock has now, or one that Hedge School's lock does not have. A jam site with no
// engine lock has none of the kinds. It also fails on a file that is not JSON, and on a kind twice in an exceptions
// file, since JSON keeps only the last one. It prints each site's result, and exits 1 on a failure. ROOT is the
// repository's root (the default: this script's).
// Tests: node --test "scripts/*.test.mjs"
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { duplicateKeys } from "./json-keys.mjs";
import { gameSites } from "./sites.mjs";

const REFERENCE = "hedgeschool";
const LOCK = "engine.lock.json";
const EXCEPTIONS = "engine.lock.exceptions.json";
/** An issue's id in the planning repository's beads database: `abscls-to4f`, `abscls-8tl1.29`. */
const ISSUE = /\babscls-[0-9a-z]+(?:\.[0-9]+)*\b/;

/** A file that the check cannot read: it fails the check with this message, which names the file. */
class Unreadable extends Error {}

/** The JSON of the file at `path`, which the messages call `name`: its text and its value. */
function readJson(path, name) {
  const text = readFileSync(path, "utf8");
  try {
    return { text, value: JSON.parse(text) };
  } catch (e) {
    throw new Unreadable(`${name}: not valid JSON: ${e.message}`);
  }
}

/** The kinds of the engine lock of `apps/<folder>`, each once, in the lock's order: none with no lock. */
function lockKinds(apps, folder) {
  const path = join(apps, folder, LOCK);
  if (!existsSync(path)) return [];
  const name = `apps/${folder}/${LOCK}`;
  const { value } = readJson(path, name);
  if (!Array.isArray(value?.artifacts)) throw new Unreadable(`${name}: it has no list "artifacts".`);
  return [...new Set(value.artifacts.map(a => a.kind))];
}

/** The exceptions file of `apps/<folder>`: its content, or undefined with no file. */
function exceptionsOf(apps, folder) {
  const path = join(apps, folder, EXCEPTIONS);
  if (!existsSync(path)) return undefined;
  const name = `apps/${folder}/${EXCEPTIONS}`;
  const { text, value } = readJson(path, name);
  const [twice] = duplicateKeys(text);
  if (twice) {
    throw new Unreadable(`${name}:${twice.line}: the exception for ${twice.path} is there twice: JSON keeps only the ` +
                         "last one.");
  }
  return value;
}

/** `read`'s result, or a failure with the message of a file that it cannot read. */
function orUnreadable(read) {
  try {
    return read();
  } catch (e) {
    if (e instanceof Unreadable) return { ok: false, lines: [e.message] };
    throw e;
  }
}

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
    const subject = `${site}: the exception for ${kind}`;
    if (kinds.includes(kind)) {
      problems.push(`${subject} is stale: its engine lock has that kind now.`);
    } else if (!reference.includes(kind)) {
      problems.push(`${subject} is stale: Hedge School's engine lock has no such kind.`);
    } else if (!issueOf(kind)) {
      problems.push(`${subject} names no issue (abscls-…).`);
    }
  }
  if (problems.length > 0) return { ok: false, lines: problems };
  const gaps = Object.keys(excepted).map(kind => `${kind} (${issueOf(kind)})`);
  return {
    ok: true,
    lines: [`${site}: every kind of Hedge School's engine lock` +
            (gaps.length ? `, but ${gaps.length} with an exception: ${gaps.join(", ")}.` : ".")],
  };
}

/** Every jam site's result under `root`. */
export function check(root) {
  const apps = join(root, "apps");
  if (!existsSync(join(apps, REFERENCE, LOCK))) return { ok: false, lines: [`apps/${REFERENCE}/${LOCK}: not found.`] };
  return orUnreadable(() => {
    const reference = lockKinds(apps, REFERENCE);
    const sites = gameSites(root).map(s => s.folder).filter(folder => folder !== REFERENCE);
    if (sites.length === 0) return { ok: true, lines: ["No jam site in apps/."] };
    const results = sites.map(name => orUnreadable(() => {
      const result = compare(`apps/${name}`, reference, lockKinds(apps, name), exceptionsOf(apps, name));
      if (existsSync(join(apps, name, LOCK))) return result;
      return { ...result, lines: [`apps/${name}: it has no ${LOCK}, so it has none of the kinds.`, ...result.lines] };
    }));
    return { ok: results.every(r => r.ok), lines: results.flatMap(r => r.lines) };
  });
}

if (import.meta.main) {
  const [root = join(import.meta.dirname, ".."), ...rest] = process.argv.slice(2);
  if (rest.length > 0) { console.error("usage: node scripts/engine-kinds.mjs [ROOT]"); process.exit(2); }
  const { ok, lines } = check(root);
  for (const line of lines) (ok ? console.log : console.error)(line);
  process.exit(ok ? 0 : 1);
}
