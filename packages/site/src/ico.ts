// The ICO file of a site's favicon (Hedge School's design 12, Cyanotype's design 33, "The logo"): the file that answers
// /favicon.ico, which browsers and other clients ask for when a page names no icon. Each site's script draws the PNG
// images, and this file joins them: Hedge School's scripts/favicon.mjs and Cyanotype's scripts/brand.mjs. For Node.

/** An ICO file of PNG images, square, one of each size in `sizes` (in pixels, 256 at most): a header, one entry for
 *  each image, then the images as PNG (Windows Vista's form, which every current browser reads). */
export function icoFile(sizes: readonly number[], images: readonly Buffer[]): Buffer {
  if (sizes.length !== images.length) throw new Error(`${sizes.length} sizes for ${images.length} images`);
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2); // an icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((png, k) => {
    const at = 6 + 16 * k;
    header.writeUInt8(sizes[k] % 256, at); // the width and the height, 0 for 256
    header.writeUInt8(sizes[k] % 256, at + 1);
    header.writeUInt16LE(1, at + 4); // planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images]);
}
