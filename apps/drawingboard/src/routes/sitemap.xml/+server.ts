// The site's pages for search engines (design 23), at the live address. Prerendered, as every page is.
import { SITE_ORIGIN } from "#lib/site.ts";

export const prerender = true;

const PAGES = ["/", "/notation", "/about", "/privacy", "/notices"];

export function GET() {
  const urls = PAGES.map(p => `  <url><loc>${SITE_ORIGIN}${p}</loc></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
                      { headers: { "Content-Type": "application/xml" } });
}
