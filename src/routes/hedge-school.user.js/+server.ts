// The userscript (src/lib/game/userscript.ts, design 11) as a file: Tampermonkey offers to install a script from an
// address that ends in `.user.js`, and fetches it again from there for updates. Written once, at the build.
import { userscriptSource } from "#lib/game/userscript.ts";

export const prerender = true;

export function GET() {
  // A version that grows with each build (the build's time, UTC), so that Tampermonkey takes each new build as an update.
  const d = new Date(), pad = (n: number) => String(n).padStart(2, "0");
  const version = `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}.${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
  return new Response(userscriptSource(__SITE_ORIGIN__, version), { headers: { "content-type": "text/javascript; charset=utf-8" } });
}
