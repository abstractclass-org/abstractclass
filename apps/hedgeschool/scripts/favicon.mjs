// Draws static/favicon.ico (design 12): the favicon's head (src/lib/assets/favicon.svg) at 16, 32 and 48 pixels, each
// drawn by the browser at its own size, with a clear background, in one ICO file. The file answers /favicon.ico, the
// address that browsers and other clients ask for when a page names no icon. Run: node scripts/favicon.mjs
// The browser is Edge's usual place on Windows, or EDGE. Edge starts only when the environment has HS_EDGE=1
// (scripts/edge.mjs), so only the owner runs this script.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { edgeProgram } from "./edge.mjs";

const EDGE = edgeProgram();
const SIZES = [16, 32, 48];
const svg = pathToFileURL(resolve("src/lib/assets/favicon.svg")).href;
const dir = mkdtempSync(join(tmpdir(), "favicon-"));

const images = SIZES.map(size => {
  const file = join(dir, `${size}.png`);
  execFileSync(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                      "--default-background-color=00000000", `--window-size=${size},${size}`, `--screenshot=${file}`, svg],
               { stdio: "ignore" });
  const png = readFileSync(file);
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20); // the PNG's IHDR
  if (width !== size || height !== size) throw new Error(`Edge drew ${width} × ${height} pixels, not ${size}`);
  return png;
});
rmSync(dir, { recursive: true });

// The ICO file: a header, one entry for each image, then the images as PNG (Windows Vista's form, which every current
// browser reads).
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2); // an icon
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((png, k) => {
  const at = 6 + 16 * k;
  header.writeUInt8(SIZES[k] % 256, at); // the width and the height, 0 for 256
  header.writeUInt8(SIZES[k] % 256, at + 1);
  header.writeUInt16LE(1, at + 4); // planes
  header.writeUInt16LE(32, at + 6); // bits per pixel
  header.writeUInt32LE(png.length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += png.length;
});
writeFileSync("static/favicon.ico", Buffer.concat([header, ...images]));
console.log(`static/favicon.ico: ${SIZES.join(", ")} pixels, ${offset} bytes`);
