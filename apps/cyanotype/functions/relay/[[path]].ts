// PostHog's requests, on the site's own address: the sites' shared reverse proxy (packages/site/src/posthogProxy.ts),
// on the path that this folder names (POSTHOG_PATH) and that static/_routes.json routes to it.
import { posthogProxy } from "@abstractclass/site/posthogProxy.ts";

export const onRequest = posthogProxy();
