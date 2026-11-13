// The sitemap of both sites (design 23).

/** The response of a site's `/sitemap.xml`: one `<url>` for each page, at the live address `origin`. A page is its
 *  path, with a leading slash. */
export function sitemapResponse(origin: string, pages: readonly string[]): Response {
  const urls = pages.map(p => `  <url><loc>${origin}${p}</loc></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
