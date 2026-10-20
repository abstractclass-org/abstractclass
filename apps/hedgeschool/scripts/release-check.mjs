// The checks of a deployed site (docs/hosting.md, "Deploy, check and roll back"), against one address: the live site,
// hedgeschool.pages.dev, or a preview. Run it in apps/hedgeschool after the workflow Deploy has finished:
//   node scripts/release-check.mjs <base URL> [<commit>]
// <commit> is the commit that the deploy built, in any form that Git reads (a hash, origin/main). Without it: the live
// site and hedgeschool.pages.dev take origin/main, and dev's preview takes origin/dev, as of the last `git fetch`.
// An address that does not end in .pages.dev is the live site: it has no X-Robots-Tag, and its domain's answers are
// signed (DNSSEC). It reads the engine's files as the page does, by the site's manifest, and checks them against
// engine.lock.json. It sends one POST that is not JSON to the practice games' Function, which answers 400 and stores
// nothing. Each line says PASS, FAIL or INFO. The last line is `release-check: PASS` or `release-check: FAIL`.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fetchArtifact } from "@abstractclass/engine/artifacts.ts";

const [baseArg, commitArg] = process.argv.slice(2);
if (!baseArg) {
  console.error("usage: node scripts/release-check.mjs <base URL> [<commit>]");
  process.exit(2);
}
const base = baseArg.replace(/\/+$/, "");
const host = new URL(base).hostname;
const live = !host.endsWith(".pages.dev");
const branchOf = { "hedgeschool.pages.dev": "origin/main", "dev.hedgeschool.pages.dev": "origin/dev" };
const ref = commitArg ?? (live ? "origin/main" : branchOf[host]);
if (!ref) {
  console.error(`${host}: name the commit that the deploy built`);
  process.exit(2);
}
// The footer's rule (vite.config.ts, edition.ts): the commit's first 7 characters.
const commit = execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { encoding: "utf8" }).trim().slice(0, 7);
const lock = JSON.parse(readFileSync(new URL("../engine.lock.json", import.meta.url), "utf8"));

const results = [];
const check = (name, pass, detail = "") => {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `: ${detail}` : ""}`);
};
const cacheOf = r => r.headers.get("cache-control") ?? "";

console.log(`INFO  ${base}, ${live ? "the live site" : "not the live site"}, commit ${commit} (${ref})`);

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
const menu = ["Practice", "Review", "Analysis", "Tools", "Notation", "About"];
check(`the header shows ${menu.join(", ")}`, menu.every(name => links.includes(name)), links.join(", "));

const unknown = await fetch(`${base}/no-such-page-${Date.now()}`);
check("an unknown address answers 404", unknown.status === 404, String(unknown.status));

// The pages that are not in the early access lead home: a redirect, or a page that refreshes to /.
for (const path of ["/puzzles", "/learn", "/lab/engine"]) {
  const r = await fetch(base + path, { redirect: "manual" });
  const body = r.status === 200 ? await r.text() : "";
  const leads = (r.status >= 300 && r.status < 400 && new URL(r.headers.get("location") ?? "", base).pathname === "/")
    || /http-equiv="refresh" content="0;\s*url=\/"/.test(body);
  check(`${path} leads home`, leads, `${r.status} ${r.headers.get("location") ?? ""}`.trim());
}

// The caches: a year, never checked again, for the build's hashed code and the engine's files.
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

// The practice games' Function.
const practiceGames = await fetch(`${base}/api/practice-games`, {
  method: "POST", body: "not json", headers: { "content-type": "text/plain" },
});
check("the Function on /api/practice-games answers 400 to a request that is not JSON",
  practiceGames.status === 400, String(practiceGames.status));

if (live) {
  const dns = await (await fetch(`https://dns.google/resolve?name=${host}&type=A&do=1`)).json();
  check("the domain's answers are signed (DNSSEC validated)", dns.AD === true, `AD=${dns.AD} Status=${dns.Status}`);
}

const pass = results.every(Boolean);
console.log(`release-check: ${pass ? "PASS" : "FAIL"} ${base} at ${commit}, ${results.filter(Boolean).length} of `
  + `${results.length} checks`);
process.exit(pass ? 0 : 1);
