// The site's pages for search engines (design 23), at the live address: the pages that a visitor opens. /import (it
// only takes a game that a link carries) and the lab pages are not in the list. src/lib/site.test.ts checks the list
// against the routes. Prerendered, as every page is.
import { sitemapResponse } from "@abstractclass/site/sitemap.ts";
import { SITE_ORIGIN } from "#lib/site.ts";

export const prerender = true;

const PAGES = ["/", "/review", "/analysis", "/practice", "/editor", "/how-reviews-work", "/tools", "/notation", "/about", "/developers", "/privacy",
               "/notices"];

export function GET() {
  return sitemapResponse(SITE_ORIGIN, PAGES);
}
