// The owner's own visits, kept out of PostHog's reports (Hedge School's design 17): the flag of internal
// traffic (@abstractclass/site/internalTraffic.ts), under Mistak's key. `?internal=on` sets it and `?internal=off`
// removes it, as the site starts (hooks.client.ts). Each site keeps its own flag: a browser sets it on each.
import { internalTraffic } from "@abstractclass/site/internalTraffic.ts";

export const { takeInternal, isInternal } = internalTraffic("mistak:internal-traffic:1");
