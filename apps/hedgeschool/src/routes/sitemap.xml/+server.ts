// The site's pages for search engines (design 23), at the live address: the pages of the early access that a visitor
// opens. /import (it only takes a game that a link carries), the lab pages and the pages not built yet are not in the
// list. Prerendered, as every page is.
import { sitemapResponse } from "@abstractclass/site/sitemap.ts";
import { SITE_ORIGIN } from "#lib/edition.ts";

export const prerender = true;

const PAGES = ["/", "/review", "/analysis", "/practice", "/editor", "/how-reviews-work", "/tools", "/notation", "/about", "/developers", "/privacy",
               "/notices"];

export function GET() {
  return sitemapResponse(SITE_ORIGIN, PAGES);
}
