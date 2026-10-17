// The bookmarklet's code (src/lib/game/bookmarklet.ts, design 11), which the bookmark loads into the meaf.us page at
// each click: so the bookmark keeps up with each build. Written once, at the build.
import { bookmarkletScript } from "#lib/game/bookmarklet.ts";

export const prerender = true;

export function GET() {
  return new Response(bookmarkletScript(), { headers: { "content-type": "text/javascript; charset=utf-8" } });
}
