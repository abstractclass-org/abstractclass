// The userscript's header alone (src/lib/game/tools.ts), which Tampermonkey checks for a newer version
// (`@updateURL`), as Greasy Fork serves a `.meta.js` beside each script: a small file for a frequent check. Written
// once, at the build.
import { userscriptHeader } from "#lib/game/tools.ts";

export const prerender = true;

export function GET() {
  return new Response(userscriptHeader(__SITE_ORIGIN__, __USERSCRIPT_VERSION__), { headers: { "content-type": "text/javascript; charset=utf-8" } });
}
