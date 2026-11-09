// No package imports a site (design 29, item 1). This check reads each file with code in packages/ (.ts, .mts, .js,
// .mjs, .svelte, but node_modules) and refuses an import whose path is in apps/, which names a site's package (the
// name in a package.json of apps/), or which starts with SvelteKit's `$lib`: a site's build reads that alias as the
// site's own src/lib. It reads the imports and exports `from` a path, the imports of a path alone and the dynamic
// imports of a literal path. It cannot read a path that the code computes, such as a join of the site's folder. So it
// refuses a dynamic import of a computed path too, but in the files that COMPUTED_PATHS names with what they load.
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

/** A dynamic import whose path the code computes: `import(` with no string literal as its whole argument. */
const COMPUTED = /\bimport\(\s*(?:\/\*[\s\S]*?\*\/\s*)*(?!["'][^"'\n]*["']\s*\)|`[^`$\n]*`\s*\))(?=[^\s)])/g;
/** The files of packages/ whose dynamic imports of a computed path load no site's code, each with what they load. */
export const COMPUTED_PATHS = new Map([
  ["packages/engine/src/library.ts", "the engine's JavaScript library, by its URL in the site's static/engine"],
  ["packages/engine/src/practice-check.ts", "the practice library, from the site's static/engine"],
  ["packages/practice/src/botWorker.ts", "the practice bot's libraries, by their URLs in the site's static/engine"],
  ["packages/practice/src/botFormsWorker.ts", "the practice bot's libraries, by their URLs in the site's static/engine"],
  ["packages/storage/src/persist.test.ts", "its own module again, with a query"],
]);

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** The paths that the code in `text` imports, each with its line. */
export function specifiers(text) {
  return [...text.matchAll(SPECIFIER)].map(m =>
    ({ specifier: m[2] ?? m[4] ?? m[6], line: lineOf(text, m.index + m[0].length) }));
}

/** The lines of the code in `text` with a dynamic import of a path that the code computes, but in a comment's line. */
export function computedImports(text) {
  const lines = text.split("\n");
  return [...text.matchAll(COMPUTED)].map(m => lineOf(text, m.index))
    .filter(line => !/^\s*(?:\/\/|\/\*|\*)/.test(lines[line - 1]));
}

/** The package that a bare path names: `@scope/name` or `name`, with no file. */
const packageOf = specifier =>
  specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");

/** Whether `specifier`, imported by the file at `file`, is a site's: a path in `apps` (the folder of the sites), a
 *  bare path that names a package of `sites` (the sites' package names), or a path in SvelteKit's `$lib`. */
export function importsSite(file, specifier, apps, sites) {
  if (specifier.startsWith(".") || isAbsolute(specifier)) {
    const path = relative(apps, resolve(dirname(file), specifier));
    return !(path.startsWith("..") || isAbsolute(path));
  }
  const name = packageOf(specifier);
  return name === "$lib" || sites.has(name);
}

/** Each file with code under `dir`, but node_modules. */
function codeFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : codeFiles(path);
    return CODE.test(entry.name) ? [path] : [];
  });
}

/** Each import in the packages of the repository at `root` that the check refuses, with its file (from the root) and
 *  line: an import of a site (its `specifier`), or a dynamic import of a path that the code computes (`specifier`
 *  null) in a file that COMPUTED_PATHS does not name. */
export function check(root) {
  const apps = join(root, "apps");
  const sites = new Set(readdirSync(apps, { withFileTypes: true }).flatMap(entry => {
    const json = join(apps, entry.name, "package.json");
    return entry.isDirectory() && existsSync(json) ? [JSON.parse(readFileSync(json, "utf8")).name] : [];
  }));
  return codeFiles(join(root, "packages")).flatMap(path => {
    const file = relative(root, path).replaceAll("\\", "/"), text = readFileSync(path, "utf8");
    const ofSites = specifiers(text).filter(({ specifier }) => importsSite(path, specifier, apps, sites))
      .map(({ specifier, line }) => ({ file, line, specifier }));
    const computed = COMPUTED_PATHS.has(file) ? [] : computedImports(text).map(line => ({ file, line, specifier: null }));
    return [...ofSites, ...computed];
  });
}

if (import.meta.main) {
  const root = process.argv[2] ?? join(import.meta.dirname, "..");
  const found = check(root);
  for (const { file, line, specifier } of found)
    console.log(specifier === null
      ? `${file}:${line}: imports a path that the code computes, which this check cannot read. Import a literal ` +
        `path, or name the file in COMPUTED_PATHS (scripts/package-imports.mjs) with what it loads.`
      : `${file}:${line}: imports "${specifier}", a site's. No package imports a site (design 29, item 1).`);
  console.log(found.length ? `package-imports: ${found.length} import(s) refused`
                           : "package-imports: no package imports a site, and no other file imports a computed path");
  process.exit(found.length ? 1 : 0);
}
