// The bookmarklet's code (src/lib/game/tools.ts, design 11), which the bookmark loads into the game's page on
// strategyjam.org at each click: so the bookmark keeps up with each build. Written once, at the build.
import { bookmarkletScript } from "#lib/game/tools.ts";

export const prerender = true;

export function GET() {
  return new Response(bookmarkletScript(), { headers: { "content-type": "text/javascript; charset=utf-8" } });
}
