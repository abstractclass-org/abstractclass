// The bookmarklet's code (src/lib/game/bookmarklet.ts, design 11), which the bookmark loads into the game's page (meaf.us,
// strategyjam.org) at each click: so the bookmark keeps up with each build. Written once, at the build.
import { bookmarkletScript } from "#lib/game/bookmarklet.ts";

export const prerender = true;

export function GET() {
  return new Response(bookmarkletScript(), { headers: { "content-type": "text/javascript; charset=utf-8" } });
}
