// The reverse proxy that takes PostHog's requests on each site's own address (Hedge School's design 11, item 7, and
// design 27, item 6): a Pages Function of each site, on POSTHOG_PATH (functions/relay/[[path]].ts, and the path in
// static/_routes.json). It is PostHog's Worker for Cloudflare in its US region
// (posthog.com/docs/advanced/proxy/cloudflare, "Add the proxy code"), with one departure: the Worker serves a
// subdomain from its root, and this Function serves a path of the site, so it removes the path before it forwards.
// Its bundle takes this module only: it has no imports.

/** The path on each site's own address that takes PostHog's requests: posthog.ts's `api_host`, and the folder of each
 *  site's Function. PostHog's guide: "Don't use obvious path names like `/analytics`, `/tracking`, `/telemetry`, or
 *  `/posthog`. Blockers will catch them. Use something unique to your app instead." A change renames the folder
 *  `functions/relay/` and the path in `static/_routes.json` of each site. */
export const POSTHOG_PATH = "/relay";

/** PostHog's hosts in its US region: the events, and the assets (its scripts and the project's remote settings). */
export const API_HOST = "us.i.posthog.com";
export const ASSET_HOST = "us-assets.i.posthog.com";

/** PostHog's address for a request to the site's POSTHOG_PATH, or null for any other path. The guide's Worker sends
 *  `/static/` and `/array/` to the assets' host without the query, and every other path to the events' host with it. */
export function posthogTarget(url: URL): URL | null {
  if (!url.pathname.startsWith(`${POSTHOG_PATH}/`)) return null;
  const path = url.pathname.slice(POSTHOG_PATH.length);
  if (path.startsWith("/static/") || path.startsWith("/array/")) return new URL(`https://${ASSET_HOST}${path}`);
  return new URL(`https://${API_HOST}${path}${url.search}`);
}

/** What the Function needs of Cloudflare: its fetch and its cache (`caches.default`). Tests give their own. */
export interface ProxyDeps {
  fetch: (request: Request) => Promise<Response>;
  cache: () => Pick<Cache, "match" | "put"> | undefined;
}

/** The part of a Pages Function's context that the proxy reads. */
export interface ProxyContext { request: Request; waitUntil(promise: Promise<unknown>): void }

const cloudflare: ProxyDeps = {
  fetch: request => fetch(request),
  // Cloudflare's Cache API, as the guide's Worker uses it. It caches nothing on a *.pages.dev address.
  cache: () => (globalThis as { caches?: { default?: Cache } }).caches?.default,
};

/** The Function's handler for every method (`export const onRequest = posthogProxy();`). */
export function posthogProxy(deps: ProxyDeps = cloudflare) {
  return async ({ request, waitUntil }: ProxyContext): Promise<Response> => {
    const target = posthogTarget(new URL(request.url));
    if (!target) return new Response(null, { status: 404 });
    return target.host === ASSET_HOST ? asset(request, target, deps, waitUntil) : forward(request, target, deps);
  };
}

/** The guide's retrieveAsset: from Cloudflare's cache, or from PostHog's assets' host, which then fills the cache. It
 *  "improves performance and preserves correct cache-control headers that the asset server provides". */
async function asset(request: Request, target: URL, deps: ProxyDeps, waitUntil: ProxyContext["waitUntil"]) {
  const cache = deps.cache();
  const cached = await cache?.match(request);
  if (cached) return cached;
  const response = await deps.fetch(new Request(target));
  if (cache) waitUntil(cache.put(request, response.clone()));
  return response;
}

/** The guide's forwardRequest: the browser's request as it came, to PostHog's events' host, with its method and its
 *  body. It removes the cookies, and an Authorization that is not a PostHog key ("Forward PostHog keys (Bearer phc_,
 *  phs_ or phx_), which the SDKs need. Strip any other credentials."). It names the browser's IP address in
 *  X-Forwarded-For, from Cloudflare's CF-Connecting-IP: "This ensures PostHog records accurate user locations instead
 *  of showing all users at Cloudflare's data center locations." */
async function forward(request: Request, target: URL, deps: ProxyDeps) {
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  if (!/^Bearer ph[csx]_/.test(headers.get("authorization") ?? "")) headers.delete("authorization");
  headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") ?? "");
  // The whole body, as the guide reads it: with a stream, events can go missing.
  const body = request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer();
  return deps.fetch(new Request(target, { method: request.method, headers, body, redirect: request.redirect }));
}
