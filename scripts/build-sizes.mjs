// Cloudflare Pages serves no file over 25 MiB (https://developers.cloudflare.com/pages/platform/limits/, "File
// size"), and Wrangler then refuses the whole upload. This check finds such a file in a site's build before a deploy
// does: `npm run check:all` runs it on the build of each site that deploys one (Hedge School and Cyanotype).
//
//   node scripts/build-sizes.mjs DIR...
//
// It names each file over the limit with its size, and exits 1. Without one, it names the largest file and exits 0.
import { readdirSync, statSync } from "node:fs";
import { join, relative as relativePath, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const LIMIT = 25 * 1024 * 1024;

const relative = (dir, path) => relativePath(dir, path).split(sep).join("/");
const mib = bytes =>`${(bytes / 1024 / 1024).toFixed(1)} MiB`;

/** Every file under `dir`, with its size in bytes, largest first. */
export function files(dir) {
  const found = [];
  const walk = d => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) found.push({ path, bytes: statSync(path).size });
    }
  };
  walk(dir);
  return found.sort((a, b) => b.bytes - a.bytes);
}

/** The lines that the check prints for `dir`, and whether it passes. */
export function check(dir, limit = LIMIT) {
  const all = files(dir), over = all.filter(f => f.bytes > limit);
  if (all.length === 0) return { ok: false, lines: [`${dir}: no files. Build the site first.`] };
  if (over.length === 0)
    return { ok: true, lines: [`${dir}: ${all.length} files, none over ${mib(limit)}. The largest: ` +
                                `${relative(dir, all[0].path)}, ${mib(all[0].bytes)} (${all[0].bytes} bytes).`] };
  return {
    ok: false,
    lines: over.map(f => `${dir}: ${relative(dir, f.path)} is ${mib(f.bytes)} (${f.bytes} bytes), over Cloudflare ` +
                         `Pages' ${mib(limit)} for one file.`),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dirs = process.argv.slice(2);
  if (dirs.length === 0) { console.error("usage: node scripts/build-sizes.mjs DIR..."); process.exit(2); }
  let ok = true;
  for (const dir of dirs) {
    const result = check(dir);
    for (const line of result.lines) (result.ok ? console.log : console.error)(line);
    ok &&= result.ok;
  }
  process.exit(ok ? 0 : 1);
}
