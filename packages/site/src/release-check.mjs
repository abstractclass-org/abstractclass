// The checks of a deployed site that every site shares (docs/hosting.md, "Deploy, check and roll back"), against one
// address: the live site, the project's pages.dev address, or a preview. Each site runs them from its own
// scripts/release-check.mjs, which gives the site's parts and adds its own checks:
//   node scripts/release-check.mjs <base URL> [<commit>]      in the site's folder
// <commit> is the commit that the deploy built, in any form that Git reads (a hash, origin/main). Without it: the live
// site and the project's pages.dev address take origin/main, and dev's preview takes origin/dev, as of the last
// `git fetch`. An address that does not end in .pages.dev is the live site: it has no X-Robots-Tag, and its domain's
// answers are signed (DNSSEC). The check reads the engine's files as the page does, by the site's manifest, and checks
// them against the site's engine.lock.json: with <commit>, the lock of that commit, as Git keeps it, so that a check
// after a rollback uses the release's own engine files. Without it, the lock of this checkout. The first line names the
// lock. The check stops before any request, with exit code 2, when the clone does not have the commit (a shallow clone,
// or a commit not fetched yet): its line says to run `git fetch`. It stops in the same way when the commit has no lock
// in the site's folder (a commit from before the site moved into apps/): its line names the path. It reads public
// pages only, and a site's own checks may send a request that stores nothing. Each line says PASS, FAIL or INFO. The
// last line is `release-check: PASS` or `release-check: FAIL`.
//
// It runs in Node only, and no page imports it: it is why this package depends on @abstractclass/engine (design 29).
import { fetchArtifact } from "@abstractclass/engine/artifacts.ts";
import { commitAndLock } from "./releaseLock.ts";

/** Runs the checks on the command line's address, prints a line for each, and ends the process: exit code 0 when all
 *  pass, 1 when one fails, 2 for a wrong command line or a commit that gives no lock. The site's parts:
 *  - `lock`: the URL of the site's engine.lock.json.
 *  - `branchOf`: the commit of each pages.dev address: the project's, origin/main, and dev's preview, origin/dev.
 *  - `menu`: the links that the header shows.
 *  - `leadHome`: the pages that lead home: a redirect, or a page that refreshes to /. None by default.
 *  - `ownChecks(base, check)`: the site's own checks, after the engine's files. `check(name, pass, detail)` prints a
 *    line and counts it. */
export async function releaseCheck({ lock: lockUrl, branchOf, menu, leadHome = [], ownChecks }) {
  const [baseArg, commitArg] = process.argv.slice(2);
  if (!baseArg) {
    console.error("usage: node scripts/release-check.mjs <base URL> [<commit>]");
    process.exit(2);
  }
  const base = baseArg.replace(/\/+$/, "");
  const host = new URL(base).hostname;
  const live = !host.endsWith(".pages.dev");
  const ref = commitArg ?? (live ? "origin/main" : branchOf[host]);
  if (!ref) {
    console.error(`${host}: name the commit that the deploy built`);
    process.exit(2);
  }
  const atCommit = commitArg !== undefined;
  let commit, lock;
  try {
    ({ commit, lock } = commitAndLock(lockUrl, ref, { atCommit }));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }

  const results = [];
  const check = (name, pass, detail = "") => {
    results.push(pass);
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `: ${detail}` : ""}`);
  };
  const cacheOf = r => r.headers.get("cache-control") ?? "";

  console.log(`INFO  ${base}, ${live ? "the live site" : "not the live site"}, commit ${commit} (${ref}), `
    + `the engine lock of ${atCommit ? `commit ${commit}` : "this checkout"}`);

  // The home page: the footer's version, the robots' header, the header's links.
  const home = await fetch(`${base}/`);
  const html = await home.text();
  check("the home page answers 200", home.status === 200, String(home.status));
  const version = html.match(/version ([0-9a-f]{7})\b/)?.[1];
  check(`the footer's version is ${commit}`, version === commit, String(version));
  const robots = home.headers.get("x-robots-tag");
  check(live ? "no X-Robots-Tag" : "X-Robots-Tag: noindex", live ? robots === null : /noindex/.test(robots ?? ""),
    String(robots));
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
  const links = [...header.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map(m => m[1].trim());
  check(`the header shows ${menu.join(", ")}`, menu.every(name => links.includes(name)), links.join(", "));

  const unknown = await fetch(`${base}/no-such-page-${Date.now()}`);
  check("an unknown address answers 404", unknown.status === 404, String(unknown.status));

  for (const path of leadHome) {
    const r = await fetch(base + path, { redirect: "manual" });
    const body = r.status === 200 ? await r.text() : "";
    const leads = (r.status >= 300 && r.status < 400 && new URL(r.headers.get("location") ?? "", base).pathname === "/")
      || /http-equiv="refresh" content="0;\s*url=\/"/.test(body);
    check(`${path} leads home`, leads, `${r.status} ${r.headers.get("location") ?? ""}`.trim());
  }

  // The caches: a year, never checked again, for the build's hashed code and the engine's files (static/_headers).
  const immutable = html.match(/\/_app\/immutable\/[^"']+\.js/)?.[0];
  if (immutable) {
    const r = await fetch(base + immutable, { method: "HEAD" });
    check("/_app/immutable/ is immutable", /immutable/.test(cacheOf(r)), `${immutable} ${cacheOf(r)}`);
  } else check("the home page names a file in /_app/immutable/", false);

  const manifestR = await fetch(`${base}/engine/manifest.json`);
  check("/engine/manifest.json is not immutable", manifestR.status === 200 && !/immutable/.test(cacheOf(manifestR)),
    `${manifestR.status} ${cacheOf(manifestR)}`);
  const manifest = await manifestR.json().catch(() => ({ artifacts: [] }));
  const stored = new Map(manifest.artifacts.map(a => [a.id, a]));

  // The engine's files: the manifest names each one of the lock, with the lock's SHA-256.
  const missing = lock.artifacts.filter(a => stored.get(a.id)?.sha256 !== a.sha256).map(a => a.id);
  check(`the manifest names the ${lock.artifacts.length} files of the lock`, missing.length === 0, missing.join(", "));

  const engineModule = lock.artifacts.find(a => a.kind === "module");
  const moduleEntry = stored.get(engineModule.id);
  const moduleR = moduleEntry ? await fetch(base + moduleEntry.url, { method: "HEAD" }) : null;
  check(`the module ${engineModule.id} is application/wasm and immutable`,
    moduleR?.headers.get("content-type") === "application/wasm" && /immutable/.test(cacheOf(moduleR)),
    moduleR ? `${moduleR.status} ${moduleR.headers.get("content-type")} ${cacheOf(moduleR)}` : "not in the manifest");

  // A file downloads whole as the page reads it (@abstractclass/engine/artifacts.ts): its parts joined and
  // decompressed, and its SHA-256 checked, here against the lock.
  const checkWhole = async (artifact, name) => {
    const label = `${name} ${artifact.id}/${artifact.file} downloads whole (${artifact.bytes.toLocaleString("en")} `
      + "bytes, the lock's SHA-256)";
    const entry = stored.get(artifact.id);
    if (!entry) return check(label, false, "not in the manifest");
    try {
      const bytes = await fetchArtifact({
        ...entry, sha256: artifact.sha256, url: base + entry.url, parts: entry.parts?.map(part => base + part),
      });
      check(label, bytes.length === artifact.bytes, `${bytes.length.toLocaleString("en")} bytes`);
    } catch (error) {
      check(label, false, error.message);
    }
  };
  const networks = lock.artifacts.filter(a => a.kind === "model").sort((a, b) => b.bytes - a.bytes);
  await checkWhole(networks[0], "the largest network");
  await checkWhole(lock.artifacts.find(a => a.kind === "terms"), "the terms");

  if (ownChecks) await ownChecks(base, check);

  if (live) {
    const dns = await (await fetch(`https://dns.google/resolve?name=${host}&type=A&do=1`)).json();
    check("the domain's answers are signed (DNSSEC validated)", dns.AD === true, `AD=${dns.AD} Status=${dns.Status}`);
  }

  const pass = results.every(Boolean);
  console.log(`release-check: ${pass ? "PASS" : "FAIL"} ${base} at ${commit}, ${results.filter(Boolean).length} of `
    + `${results.length} checks`);
  process.exit(pass ? 0 : 1);
}
