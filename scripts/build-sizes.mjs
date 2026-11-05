// Cloudflare Pages serves no file over 25 MiB (https://developers.cloudflare.com/pages/platform/limits/, "File
// size"), and Wrangler then refuses the whole upload. `npm run check:all` runs this check after each site's build
// (Hedge School's and Cyanotype's), so that the Tests workflow fails on such a file, and a release does not take it.
//
//   node scripts/build-sizes.mjs DIR
//
// It names each file over the limit with its size, and exits 1. Without one, it names the largest file and exits 0.
// Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

export const LIMIT = 25 * 1024 * 1024;

const mib = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;

/** The lines that the check prints for the build in `dir`, and whether it passes. */
export function check(dir, limit = LIMIT) {
  const files = (existsSync(dir) ? readdirSync(dir, { recursive: true }) : [])
    .map(name => ({ name: name.split(sep).join("/"), stat: statSync(join(dir, name)) }))
    .filter(f => f.stat.isFile())
    .map(f => ({ name: f.name, bytes: f.stat.size }))
    .sort((a, b) => b.bytes - a.bytes);
  if (files.length === 0) return { ok: false, lines: [`${dir}: no files. Build the site first.`] };
  const over = files.filter(f => f.bytes > limit);
  if (over.length === 0) {
    const [top] = files, count = `${files.length} file${files.length === 1 ? "" : "s"}`;
    return { ok: true, lines: [`${dir}: ${count}, none over ${mib(limit)}. ` +
                                `The largest: ${top.name}, ${mib(top.bytes)} (${top.bytes} bytes).`] };
  }
  return {
    ok: false,
    lines: over.map(f => `${dir}: ${f.name} is ${mib(f.bytes)} (${f.bytes} bytes), over Cloudflare Pages' ` +
                         `${mib(limit)} for one file.`),
  };
}

if (import.meta.main) {
  const [dir, ...rest] = process.argv.slice(2);
  if (!dir || rest.length > 0) { console.error("usage: node scripts/build-sizes.mjs DIR"); process.exit(2); }
  const { ok, lines } = check(dir);
  for (const line of lines) (ok ? console.log : console.error)(line);
  process.exit(ok ? 0 : 1);
}
