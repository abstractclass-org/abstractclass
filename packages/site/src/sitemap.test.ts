// Checks the sitemap's response (sitemap.ts): its type and its text. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sitemapResponse } from "./sitemap.ts";

test("the sitemap is XML with one url for each page, at the given address", async () => {
  const response = sitemapResponse("https://example.test", ["/", "/about"]);
  assert.equal(response.headers.get("Content-Type"), "application/xml");
  assert.equal(await response.text(),
               `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
               `  <url><loc>https://example.test/</loc></url>\n  <url><loc>https://example.test/about</loc></url>\n</urlset>\n`);
});
