// Turns a single-file SvelteKit page into an artifact fragment: the head's contents (without the charset and viewport
// metas and the old title) and the body's contents, under a new title. Slices by the first <head>, the first </head>,
// the first <body> and the last </body>, because the inlined script contains those strings too.
const fs = require("fs");
const [src, out, title] = process.argv.slice(2);
const html = fs.readFileSync(src, "utf8");
const h0 = html.indexOf("<head>") + 6, h1 = html.indexOf("</head>");
const b0 = html.indexOf(">", html.indexOf("<body", h1)) + 1, b1 = html.lastIndexOf("</body>");
const head = html.slice(h0, h1).replace(/<meta charset[^>]*>/, "").replace(/<meta name="viewport"[^>]*>/, "")
  .replace(/<meta name="text-scale"[^>]*>/, "").replace(/<title>[\s\S]*?<\/title>/, "");
const frag = `<title>${title}</title>\n${head.trim()}\n${html.slice(b0, b1).trim()}\n`;
fs.writeFileSync(out, frag);
fs.writeFileSync(out.replace(/\.html$/, "-test.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${frag}</body></html>`);
console.log("bytes", frag.length, "of", html.length);
