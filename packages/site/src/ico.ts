// The ICO file of a site's favicon (Hedge School's design 12, Cyanotype's design 33, "The logo"): the file that answers
// /favicon.ico, which browsers and other clients ask for when a page names no icon. Each site's script draws the PNG
// images, and this file joins them: Hedge School's scripts/favicon.mjs and Cyanotype's scripts/brand.mjs. For Node.

/** The first eight bytes of every PNG file. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** An ICO file of PNG images, each 256 pixels wide and high at most: a header, one entry for each image with the size
 *  that its PNG header gives, then the images as PNG (Windows Vista's form, which every current browser reads). */
export function icoFile(images: readonly Buffer[]): Buffer {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2); // an icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((png, k) => {
    if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`image ${k + 1} is not a PNG file`);
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20); // the PNG's IHDR chunk
    if (width > 256 || height > 256) throw new Error(`image ${k + 1} is ${width} × ${height} pixels: 256 is the most`);
    const at = 6 + 16 * k;
    header.writeUInt8(width % 256, at); // 0 for 256
    header.writeUInt8(height % 256, at + 1);
    header.writeUInt16LE(1, at + 4); // planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images]);
}
