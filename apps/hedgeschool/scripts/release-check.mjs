// The checks of a deployed site (docs/hosting.md, "Deploy, check and roll back"), against one address: the live site,
// hedgeschool.pages.dev, or a preview. Run it in apps/hedgeschool after the workflow Deploy has finished:
//   node scripts/release-check.mjs <base URL> [<commit>]
// <commit> is the commit that the deploy built, in any form that Git reads (a hash, origin/main). Without it: the live
// site and hedgeschool.pages.dev take origin/main, and dev's preview takes origin/dev, as of the last `git fetch`.
// An address that does not end in .pages.dev is the live site: it has no X-Robots-Tag, and its domain's answers are
// signed (DNSSEC). It reads engine.lock.json for the engine's files. It sends one POST that is not JSON to the
// practice games' Function, which answers 400 and stores nothing.
// Each line says PASS, FAIL or INFO. The last line is `release-check: PASS` or `release-check: FAIL`.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const [baseArg, commitArg] = process.argv.slice(2);
if (!baseArg) {
	console.error("usage: node scripts/release-check.mjs <base URL> [<commit>]");
	process.exit(2);
}
const base = baseArg.replace(/\/+$/, "");
const host = new URL(base).hostname;
const live = !host.endsWith(".pages.dev");
const ref = commitArg ?? (live || host === "hedgeschool.pages.dev" ? "origin/main"
	: host === "dev.hedgeschool.pages.dev" ? "origin/dev" : null);
if (!ref) {
	console.error(`${host}: name the commit that the deploy built`);
	process.exit(2);
}
const commit = execFileSync("git", ["rev-parse", "--short=7", "--verify", `${ref}^{commit}`], { encoding: "utf8" }).trim();
const lock = JSON.parse(readFileSync(new URL("../engine.lock.json", import.meta.url), "utf8"));

const results = [];
const check = (name, pass, detail = "") => {
	results.push(pass);
	console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `: ${detail}` : ""}`);
};
const sha256 = buf => createHash("sha256").update(buf).digest("hex");
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

const manifest = await fetch(`${base}/engine/manifest.json`);
const manifestText = await manifest.text();
check("/engine/manifest.json is not immutable", manifest.status === 200 && !/immutable/.test(cacheOf(manifest)),
	`${manifest.status} ${cacheOf(manifest)}`);

// The engine's files: the module's type, the largest network whole, the terms. Each against the lock.
const byKind = kind => lock.artifacts.filter(a => a.kind === kind);
const module = byKind("module")[0];
const moduleR = await fetch(`${base}/engine/${module.id}/${module.file}`, { method: "HEAD" });
check(`the module ${module.id} is application/wasm and immutable`,
	moduleR.headers.get("content-type") === "application/wasm" && /immutable/.test(cacheOf(moduleR)),
	`${moduleR.status} ${moduleR.headers.get("content-type")} ${cacheOf(moduleR)}`);

const networks = byKind("model").sort((a, b) => b.bytes - a.bytes);
const whole = async (artifact, name) => {
	const r = await fetch(`${base}/engine/${artifact.id}/${artifact.file}`);
	const buf = Buffer.from(await r.arrayBuffer());
	check(`${name} ${artifact.id}/${artifact.file} downloads whole (${artifact.bytes.toLocaleString("en")} bytes, `
		+ "the lock's SHA-256)", buf.length === artifact.bytes && sha256(buf) === artifact.sha256,
	`${r.status}, ${buf.length.toLocaleString("en")} bytes`);
};
await whole(networks[0], "the largest network");
const missing = networks.filter(n => !manifestText.includes(n.id)).map(n => n.id);
check("the manifest names every network of the lock", missing.length === 0, missing.join(", "));
await whole(byKind("terms")[0], "the terms");

// The practice games' Function.
const fn = await fetch(`${base}/api/practice-games`, {
	method: "POST", body: "not json", headers: { "content-type": "text/plain" },
});
check("the Function on /api/practice-games answers 400 to a request that is not JSON", fn.status === 400,
	String(fn.status));

if (live) {
	const dns = await (await fetch(`https://dns.google/resolve?name=${host}&type=A&do=1`)).json();
	check("the domain's answers are signed (DNSSEC validated)", dns.AD === true, `AD=${dns.AD} Status=${dns.Status}`);
}

const pass = results.every(Boolean);
console.log(`release-check: ${pass ? "PASS" : "FAIL"} ${base} at ${commit}, ${results.filter(Boolean).length} of `
	+ `${results.length} checks`);
process.exit(pass ? 0 : 1);
