// What runs once when the site starts in the browser, before the router reads the address and before a page can start
// the analytics (SvelteKit's `init` hook).
import type { ClientInit } from "@sveltejs/kit/hooks";
import { takeInternal } from "#lib/internalTraffic.ts";

export const init: ClientInit = () => {
  // The flag of internal traffic (design 17). The address loses the parameter, so that a copied address does not carry
  // it and no page view records it. The history entry keeps its state: the router reads it next, for a reload's place.
  const href = takeInternal(location.href);
  if (href) history.replaceState(history.state, "", href);
};
