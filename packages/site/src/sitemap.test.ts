import { test } from "node:test";
import assert from "node:assert/strict";
import { sitemapResponse, sitemapXml } from "./sitemap.ts";

test("the sitemap holds one url for each page, at the given address", () => {
  assert.equal(sitemapXml("https://example.test", ["/", "/about"]),
               `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
               `  <url><loc>https://example.test/</loc></url>\n  <url><loc>https://example.test/about</loc></url>\n</urlset>\n`);
});

test("the response is XML", async () => {
  const response = sitemapResponse("https://example.test", ["/"]);
  assert.equal(response.headers.get("Content-Type"), "application/xml");
  assert.equal(await response.text(), sitemapXml("https://example.test", ["/"]));
});
