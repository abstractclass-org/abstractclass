// Draws static/favicon.ico (design 12): the favicon's head (src/lib/assets/favicon.svg) at 16, 32 and 48 pixels, each
// drawn by the browser at its own size, with a clear background, in one ICO file (@abstractclass/site/ico.ts, which
// Cyanotype's scripts/brand.mjs also uses). The file answers /favicon.ico, the address that browsers and other clients
// ask for when a page names no icon. Run: node scripts/favicon.mjs
// The browser is Edge's usual place on Windows, or EDGE. Edge starts only when the environment has HS_EDGE=1
// (scripts/edge.mjs), so only the owner runs this script.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { icoFile } from "@abstractclass/site/ico.ts";
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

const ico = icoFile(SIZES, images);
writeFileSync("static/favicon.ico", ico);
console.log(`static/favicon.ico: ${SIZES.join(", ")} pixels, ${ico.length} bytes`);
