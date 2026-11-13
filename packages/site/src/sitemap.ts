// The sitemap that both sites serve (design 23): `/sitemap.xml`, prerendered. Each site's route gives its own pages and
// its live address, and this module writes the response.

/** The sitemap's text: one `<url>` for each page, at the live address `origin`. A page is its path, with a leading
 *  slash. */
export function sitemapXml(origin: string, pages: readonly string[]): string {
  const urls = pages.map(p => `  <url><loc>${origin}${p}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** The response of a site's `/sitemap.xml` route. */
export function sitemapResponse(origin: string, pages: readonly string[]): Response {
  return new Response(sitemapXml(origin, pages), { headers: { "Content-Type": "application/xml" } });
}
