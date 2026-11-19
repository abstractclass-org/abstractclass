// PostHog's requests, on the site's own address (docs/design/11-early-access.md, item 7, and design 27, item 6):
// a reverse proxy to PostHog's US hosts, as PostHog's guide for Cloudflare gives it. The folder's name is the path
// (POSTHOG_PATH, which packages/site/src/posthog.ts sends to), and static/_routes.json routes it to the Function.
// The handler is the sites' shared one (@abstractclass/site/posthogProxy.ts), which says what it forwards and why.
import { posthogProxy } from "@abstractclass/site/posthogProxy.ts";

export const onRequest = posthogProxy();
