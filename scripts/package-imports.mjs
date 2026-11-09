// No package imports a site (design 29, item 1). A site gives a package what is its own as a parameter: Hedge
// School's komi limit goes to the engine step through the site's scripts/engine.mjs, for example. This check reads
// each file with code in packages/ (.ts, .mts, .js, .mjs, .svelte, but node_modules) and refuses an import whose
// path is in apps/, or which names a site's package (the name in a package.json of apps/). It reads the imports and
// exports `from` a path, the imports of a path alone and the dynamic imports of a literal path. A path that the code
// computes, such as a join of the site's folder, is not one that this check can read.
//
//   node scripts/package-imports.mjs [ROOT]
//
// It prints each import that it refuses, with its file and line, and exits 1 when there is one. ROOT is the
// repository's root (the default: this script's). npm run check:all runs it (scripts/check-all.mjs).
// Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const CODE = /\.(?:ts|mts|js|mjs|svelte)$/;
/** An import's or an export's path: `… from "P"`, `import "P"` and `import("P")`. */
const SPECIFIER = new RegExp([
  /\b(?:import|export)\b[^"'`;]*?\bfrom\s*(["'])([^"'\n]+)\1/.source,
  /\bimport\s*(["'])([^"'\n]+)\3/.source,
  /\bimport\s*\(\s*(["'`])([^"'`\n]+)\5\s*\)/.source,
].join("|"), "g");

/** The paths that the code in `text` imports, each with its line. */
export function specifiers(text) {
  return [...text.matchAll(SPECIFIER)].map(m => ({
    specifier: m[2] ?? m[4] ?? m[6],
    line: text.slice(0, m.index + m[0].length).split("\n").length,
  }));
}

/** The package that a bare path names: `@scope/name` or `name`, with no file. */
const packageOf = specifier =>
  specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");

/** Whether `specifier`, imported by the file at `file`, is a site's: a path in `apps` (the folder of the sites), or a
 *  bare path that names a package of `sites` (the sites' package names). */
export function importsSite(file, specifier, apps, sites) {
  if (specifier.startsWith(".") || isAbsolute(specifier)) {
    const path = relative(apps, resolve(dirname(file), specifier));
    return path === "" || !(path.startsWith("..") || isAbsolute(path));
  }
  return sites.has(packageOf(specifier));
}

/** Each file with code under `dir`, but node_modules. */
function codeFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : codeFiles(path);
    return CODE.test(entry.name) ? [path] : [];
  });
}

/** Each import of a site in the packages of the repository at `root`: its file (from the root), line and path. */
export function check(root) {
  const apps = join(root, "apps");
  const sites = new Set(readdirSync(apps, { withFileTypes: true }).flatMap(entry => {
    const json = join(apps, entry.name, "package.json");
    return entry.isDirectory() && existsSync(json) ? [JSON.parse(readFileSync(json, "utf8")).name] : [];
  }));
  return codeFiles(join(root, "packages")).flatMap(file =>
    specifiers(readFileSync(file, "utf8"))
      .filter(({ specifier }) => importsSite(file, specifier, apps, sites))
      .map(({ specifier, line }) => ({ file: relative(root, file).replaceAll("\\", "/"), line, specifier })));
}

if (import.meta.main) {
  const root = process.argv[2] ?? join(import.meta.dirname, "..");
  const found = check(root);
  for (const { file, line, specifier } of found)
    console.log(`${file}:${line}: imports "${specifier}", a site's. No package imports a site (design 29, item 1).`);
  console.log(found.length ? `package-imports: ${found.length} import(s) of a site`
                           : "package-imports: no package imports a site");
  process.exit(found.length ? 1 : 0);
}
