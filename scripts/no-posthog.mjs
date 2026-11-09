// A site's build without VITE_POSTHOG_KEY, as in development and on the previews, holds none of PostHog's code
// (Hedge School's design 11, Cyanotype's design 33, "Analytics"): the site imports PostHog's client only in a build
// with the key (packages/site/src/analytics.svelte.ts). `npm run check:all` runs this check on a build of Cyanotype
// without the key, before the build with a made-up key that the browser tests use.
//
//   node scripts/no-posthog.mjs DIR
//
// It names each script of the build that names PostHog's address (`i.posthog.com`, which the client of
// packages/site/src/posthog.ts always holds) or its client's extensions (`__PosthogExtensions__`), and exits 1. The
// pages' text may name PostHog (the Privacy page): only the scripts count. Without one, it says how many scripts it
// read, and exits 0. Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";

/** What only PostHog's client holds. */
export const POSTHOG_CODE = /i\.posthog\.com|__PosthogExtensions__/;

/** The lines that the check prints for the build in `dir`, and whether it passes. */
export function check(dir) {
  const scripts = (existsSync(dir) ? readdirSync(dir, { recursive: true, withFileTypes: true }) : [])
    .filter(f => f.isFile() && /\.m?js$/.test(f.name))
    .map(f => join(f.parentPath, f.name));
  if (scripts.length === 0) return { ok: false, lines: [`${dir}: no scripts. Build the site first.`] };
  const named = scripts.filter(path => POSTHOG_CODE.test(readFileSync(path, "utf8")));
  if (named.length === 0) {
    const count = `${scripts.length} script${scripts.length === 1 ? "" : "s"}`;
    return { ok: true, lines: [`${dir}: ${count}, none with PostHog's code.`] };
  }
  return {
    ok: false,
    lines: named.map(path => `${dir}: ${path.slice(dir.length + 1).split(sep).join("/")} holds PostHog's code, ` +
                             "in a build without VITE_POSTHOG_KEY."),
  };
}

if (import.meta.main) {
  const [dir, ...rest] = process.argv.slice(2);
  if (!dir || rest.length > 0) { console.error("usage: node scripts/no-posthog.mjs DIR"); process.exit(2); }
  const { ok, lines } = check(dir);
  for (const line of lines) (ok ? console.log : console.error)(line);
  process.exit(ok ? 0 : 1);
}
