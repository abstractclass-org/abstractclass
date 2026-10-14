// The site's pages for search engines (design 23), at the live address: the pages of the early access that a visitor
// opens, without the forwarding /import and the pages not built yet. Prerendered, as every page is.
import { SITE_ORIGIN } from "#lib/edition.ts";

export const prerender = true;

const PAGES = ["/", "/review", "/analysis", "/editor", "/tools", "/notation", "/about", "/developers", "/privacy", "/notices"];

export function GET() {
  const urls = PAGES.map(p => `  <url><loc>${SITE_ORIGIN}${p}</loc></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
                      { headers: { "Content-Type": "application/xml" } });
}
