// The owner's own visits, kept out of PostHog's reports (design 17): the flag of internal traffic
// (@abstractclass/site/internalTraffic.ts), under Hedge School's key. `?internal=on` sets it and `?internal=off`
// removes it, as the site starts (hooks.client.ts).
import { internalTraffic } from "@abstractclass/site/internalTraffic.ts";

export const { takeInternal, isInternal } = internalTraffic("hedge-school:internal-traffic:1");
