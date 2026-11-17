// The shared packages build in one order: each package depends only on packages below it (design 29, "The packages'
// order"). This check reads the package.json of each folder in packages/ and apps/, and its @abstractclass dependencies
// in every field (dependencies, devDependencies, peerDependencies, optionalDependencies). It refuses a cycle among
// them.
// npm's workspaces and Vite resolve a cycle, so no build fails on one. But a package in a cycle cannot be tested or
// type-checked alone, and a change in one package of the cycle can break the other's tests.
//
// It also reads each file with code in those folders, as package-imports.mjs's walker (codeFiles) finds them. It
// refuses an import of an @abstractclass package that the file's package.json does not list: without that line, the
// first part of the check cannot see the dependency.
//
//   node scripts/package-deps.mjs [ROOT]
//
// It prints each cycle and each import that it refuses, and exits 1 when there is one. ROOT is the repository's root
// (the default: this script's). npm run check:all runs it (scripts/check-all.mjs).
// Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { codeFiles, specifiers } from "./package-imports.mjs";

const SCOPE = "@abstractclass/";
const FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

/** The cycles of `graph` (each name, with the names that it depends on), one for each group of names that reach each
 *  other: from the group's first name in order, by the fewest steps, back to that name. A name that depends on itself
 *  is a cycle of one step. */
export function cycles(graph) {
  const reaches = from => {
    const seen = new Set([from]), queue = [from];
    for (const name of queue)
      for (const next of graph.get(name) ?? []) if (!seen.has(next)) seen.add(next), queue.push(next);
    return seen;
  };
  const reach = new Map([...graph.keys()].map(name => [name, reaches(name)]));
  const done = new Set(), found = [];
  for (const start of [...graph.keys()].sort()) {
    if (done.has(start)) continue;
    const group = [...reach.get(start)].filter(name => reach.get(name)?.has(start));
    group.forEach(name => done.add(name));
    // The shortest way back to `start`. Each name on it reaches `start`, so the way stays inside the group.
    const before = new Map(), queue = [start];
    let last = null;
    for (const name of queue) {
      const next = graph.get(name) ?? [];
      if (next.includes(start)) { last = name; break; }
      for (const n of next) if (!before.has(n)) before.set(n, name), queue.push(n);
    }
    if (last === null) continue;
    const path = [last];
    while (path[0] !== start) path.unshift(before.get(path[0]));
    found.push([...path, start]);
  }
  return found;
}

/** Each folder of packages/ and apps/ with a package.json: its path from the root, and its package.json. */
function manifests(root) {
  return ["packages", "apps"].flatMap(top => {
    const dir = join(root, top);
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory())
      .map(e => `${top}/${e.name}`)
      .filter(folder => existsSync(join(root, folder, "package.json")))
      .map(folder => ({ folder, manifest: JSON.parse(readFileSync(join(root, folder, "package.json"), "utf8")) }));
  });
}

/** The @abstractclass packages that `manifest` lists, in any field. */
const listed = manifest =>
  [...new Set(FIELDS.flatMap(field => Object.keys(manifest[field] ?? {})).filter(name => name.startsWith(SCOPE)))];

/** The cycles among the @abstractclass dependencies of the repository at `root`, and each import of an @abstractclass
 *  package that the importer's package.json does not list (its file from the root, its line and the package). */
export function check(root) {
  const all = manifests(root);
  const graph = new Map(all.map(({ manifest }) => [manifest.name, listed(manifest)]));
  const unlisted = all.flatMap(({ folder, manifest }) => {
    const known = new Set([manifest.name, ...listed(manifest)]);
    return codeFiles(join(root, folder)).flatMap(path => {
      const file = relative(root, path).replaceAll("\\", "/");
      return specifiers(readFileSync(path, "utf8"))
        .map(({ specifier, line }) => ({ file, line, name: specifier.split("/").slice(0, 2).join("/") }))
        .filter(({ name }) => name.startsWith(SCOPE) && !known.has(name));
    });
  }).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  const folders = new Map(all.map(({ folder, manifest }) => [manifest.name, folder]));
  return { cycles: cycles(graph), unlisted, folders };
}

if (import.meta.main) {
  const root = process.argv[2] ?? join(import.meta.dirname, "..");
  const { cycles: found, unlisted, folders } = check(root);
  for (const cycle of found)
    console.log(`A cycle of dependencies: ${cycle.join(" -> ")}. ` +
      `Each package depends only on packages below it (design 29). Remove one of these lines from its package.json ` +
      `and move what it imports down: ${cycle.slice(0, -1).map((name, i) =>
        `${folders.get(name)}/package.json lists ${cycle[i + 1]}`).join(", ")}.`);
  for (const { file, line, name } of unlisted)
    console.log(`${file}:${line}: imports ${name}, which its package.json does not list. List it there, so that ` +
      `this check sees the dependency.`);
  console.log(found.length || unlisted.length
    ? `package-deps: ${found.length} cycle(s), ${unlisted.length} unlisted import(s)`
    : "package-deps: no cycle among the @abstractclass dependencies, and no unlisted import");
  process.exit(found.length || unlisted.length ? 1 : 0);
}
