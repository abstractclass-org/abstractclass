// The site's pages for search engines (design 23), at the live address: the pages that a visitor opens. /import (it
// takes a game that a link carries) is not in the list. src/lib/site.test.ts checks the list against the routes.
// Prerendered, as every page is.
import { sitemapResponse } from "@abstractclass/site/sitemap.ts";
import { SITE_ORIGIN } from "#lib/site.ts";

export const prerender = true;

const PAGES = ["/", "/review", "/how-reviews-work", "/notation", "/about", "/developers", "/privacy", "/notices"];

export function GET() {
  return sitemapResponse(SITE_ORIGIN, PAGES);
}
