// An animated PNG (APNG), from frames that are each a PNG: the chunks acTL, fcTL and fdAT, as the PNG specification
// (third edition, 2025) gives them. The first frame is the file's image, so a viewer without animation shows it. A later
// frame may hold only the part of the image that changed, at its offset: it is drawn over the frame before it
// (dispose: none, blend: source). No library: the format is a few chunks around the PNGs that the browser makes.

/** A frame: a PNG, where it goes on the image, and how long it shows. */
export interface ApngFrame { png: Uint8Array; x: number; y: number; ms: number }

type Chunk = { type: string; data: Uint8Array };

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** The chunks of a PNG, in their order. */
function readChunks(png: Uint8Array): Chunk[] {
  if (SIGNATURE.some((b, i) => png[i] !== b)) throw new Error("a frame is not a PNG");
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength), out: Chunk[] = [];
  for (let at = 8; at + 12 <= png.length;) {
    const n = view.getUint32(at), type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    out.push({ type, data: png.subarray(at + 8, at + 8 + n) });
    at += 12 + n;
  }
  return out;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  return c >>> 0;
});
/** The CRC-32 of a chunk's type and data. */
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A chunk as bytes: its length, its type, its data and its CRC. */
function chunkBytes(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Big-endian fields as bytes: each [value, size in bytes]. */
function fields(...f: [number, 1 | 2 | 4][]): Uint8Array {
  const out = new Uint8Array(f.reduce((n, [, s]) => n + s, 0)), view = new DataView(out.buffer);
  let at = 0;
  for (const [v, s] of f) {
    if (s === 1) view.setUint8(at, v);
    else if (s === 2) view.setUint16(at, v);
    else view.setUint32(at, v);
    at += s;
  }
  return out;
}

/** The APNG of `frames`, played `plays` times (0: with no end). The first frame is the whole image, at 0, 0. Every
 *  frame has the first frame's bit depth and colour type, and lies inside the first frame. */
export function apng(frames: ApngFrame[], plays = 0): Uint8Array<ArrayBuffer> {
  if (!frames.length) throw new Error("an animation needs a frame");
  const read = frames.map(f => {
    const chunks = readChunks(f.png), ihdr = chunks.find(c => c.type === "IHDR");
    if (!ihdr) throw new Error("a frame has no header");
    const view = new DataView(ihdr.data.buffer, ihdr.data.byteOffset, 13);
    return { ...f, chunks, ihdr: ihdr.data, w: view.getUint32(0), h: view.getUint32(4) };
  });
  const [first] = read;
  if (first.x || first.y) throw new Error("the first frame is the whole image, at 0, 0");
  for (const f of read) {
    // Bit depth, colour type, compression, filter and interlace: the file's header holds them for every frame.
    if (f.ihdr.subarray(8, 13).some((b, i) => b !== first.ihdr[8 + i])) throw new Error("a frame has another pixel format");
    if (f.chunks.some(c => c.type === "PLTE")) throw new Error("a frame has a palette");
    if (f.x + f.w > first.w || f.y + f.h > first.h) throw new Error("a frame lies outside the image");
  }

  const parts: Uint8Array[] = [new Uint8Array(SIGNATURE)];
  let seq = 0;
  // The first frame's chunks before its image data (IHDR, and sRGB, gAMA, pHYs where the browser writes them), then
  // the animation's control.
  const before = first.chunks.slice(0, first.chunks.findIndex(c => c.type === "IDAT"));
  for (const c of before) parts.push(chunkBytes(c.type, c.data));
  parts.push(chunkBytes("acTL", fields([read.length, 4], [plays, 4])));
  read.forEach((f, i) => {
    // The delay in milliseconds, as a fraction of a second: delay_num / 1000.
    parts.push(chunkBytes("fcTL", fields([seq++, 4], [f.w, 4], [f.h, 4], [f.x, 4], [f.y, 4],
                                         [Math.round(f.ms), 2], [1000, 2], [0, 1], [0, 1])));
    for (const c of f.chunks.filter(c => c.type === "IDAT")) {
      if (!i) parts.push(chunkBytes("IDAT", c.data));
      else {
        const data = new Uint8Array(4 + c.data.length);
        new DataView(data.buffer).setUint32(0, seq++);
        data.set(c.data, 4);
        parts.push(chunkBytes("fdAT", data));
      }
    }
  });
  parts.push(chunkBytes("IEND", new Uint8Array(0)));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

/** The smallest box that holds every pixel where two RGBA images of `width` × `height` differ. Null where none does. */
export function changedBox(a: ArrayLike<number>, b: ArrayLike<number>, width: number, height: number):
  { x: number; y: number; w: number; h: number } | null {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = 4 * (y * width + x);
      if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2] && a[i + 3] === b[i + 3]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      y1 = y;
    }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
