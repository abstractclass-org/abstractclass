// The owner's own visits, kept out of Google Analytics' reports (Hedge School's design 17). Its "Internal Traffic"
// filter drops the events whose `traffic_type` is "internal". A browser keeps a flag under the site's key, and the
// Google tag marks its events while the flag is set (analytics.svelte.ts). Any page sets it with `?internal=on` and
// removes it with `?internal=off`, as the site starts (each site's hooks.client.ts). The flag changes only this
// browser's own events, as a Decline does, so it needs no secret.
import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";

/** The flag of a site that keeps it under `key`. */
export function internalTraffic(key: string) {
  return {
    /** Reads the address's `internal` parameter and keeps the flag that it gives. Returns the address without the
     *  parameter, or null when it has none. */
    takeInternal(href: string): string | null {
      const url = new URL(href);
      const value = url.searchParams.get("internal");
      if (value === null) return null;
      if (value === "on") writeLocal(key, "on");
      else if (value === "off") writeLocal(key, null);
      url.searchParams.delete("internal");
      return url.href;
    },
    /** Whether this browser's visits are internal traffic. */
    isInternal: () => readLocal(key) === "on",
  };
}
