// The userscript (src/lib/game/tools.ts, design 11) as a file: Tampermonkey offers to install a script from an
// address that ends in `.user.js`, and fetches it again from there when its header (hedge-school.meta.js) names a newer
// version. Written once, at the build.
import { userscriptSource } from "#lib/game/tools.ts";

export const prerender = true;

export function GET() {
  return new Response(userscriptSource(__SITE_ORIGIN__, __USERSCRIPT_VERSION__, __USERSCRIPT_CODE__),
                      { headers: { "content-type": "text/javascript; charset=utf-8" } });
}
