// The site's pages for search engines (design 23), at the live address: the pages that Hedge School's sitemap lists,
// all of which this site has, without /import, which only takes a game that a link carries, and the lab pages.
// Prerendered, as every page is.
import { sitemapResponse } from "@abstractclass/site/sitemap.ts";
import { SITE_ORIGIN } from "#lib/site.ts";

export const prerender = true;

const PAGES = ["/", "/review", "/analysis", "/practice", "/editor", "/how-reviews-work", "/tools", "/notation", "/about", "/developers", "/privacy",
               "/notices"];

export function GET() {
  return sitemapResponse(SITE_ORIGIN, PAGES);
}
