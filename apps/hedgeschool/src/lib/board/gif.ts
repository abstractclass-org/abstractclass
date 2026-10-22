// An animated GIF (GIF89a, with its LZW compression), from frames of RGBA pixels. GIF and not APNG: Windows Photos and
// Discord show an APNG as a still image (decisions/product.md, "The animated image of a line is a GIF"). The first
// frame is the whole image, and an app that shows a still shows it. A later frame may hold only the part of the image
// that changed, at its offset, drawn over the frame before it (disposal: do not dispose). The file plays with no end,
// by the NETSCAPE2.0 extension. No library: the encoder is short, and the palette needs the board's own rule
// (gifPalette).

/** A frame: the RGBA pixels of a box `w` × `h` at `x`, `y` on the image, and how long it shows. Alpha is not read:
 *  every pixel is opaque. */
export interface GifFrame { rgba: ArrayLike<number>; x: number; y: number; w: number; h: number; ms: number }

/** A colour as 0xRRGGBB. */
const rgbAt = (p: ArrayLike<number>, i: number) => (p[i] << 16) | (p[i + 1] << 8) | p[i + 2];

/** The 256 colours or fewer of the frames. GIF holds 256 colours, and a board image holds more: its anti-aliased
 *  pixels blend the flat colours. The flat colours stay exact: first the `fixed` colours (the board's and the
 *  caption's), then each colour that fills a 2 × 2 block of pixels somewhere, the colour of the most blocks first (the
 *  regions, which blend a player's colour over the board). The places that are left go to the other colours, by
 *  median cut, weighted by their count. Where the frames hold 256 colours or fewer, each one is exact. */
export function gifPalette(frames: GifFrame[], fixed: number[] = []): number[] {
  const count = new Map<number, number>(), blocks = new Map<number, number>();
  for (const { rgba: p, w, h } of frames)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = 4 * (y * w + x), c = rgbAt(p, i);
        count.set(c, (count.get(c) ?? 0) + 1);
        if (x + 1 < w && y + 1 < h && rgbAt(p, i + 4) === c && rgbAt(p, i + 4 * w) === c && rgbAt(p, i + 4 * w + 4) === c)
          blocks.set(c, (blocks.get(c) ?? 0) + 1);
      }
  if (count.size <= 256) return [...count.keys()];
  const palette = [...new Set(fixed)].slice(0, 256);
  const flat = [...blocks].filter(([c]) => !palette.includes(c)).sort((a, b) => b[1] - a[1]);
  // A quarter of the places stay for the anti-aliased colours.
  for (const [c] of flat.slice(0, Math.max(0, FLAT_PLACES - palette.length))) palette.push(c);
  const kept = new Set(palette);
  return palette.concat(medianCut([...count].filter(([c]) => !kept.has(c)), 256 - palette.length));
}
const FLAT_PLACES = 192;

/** `places` colours or fewer for `colours` (each with its count): the weighted mean of each box of a median cut. The
 *  box to split is the one with the most pixels times its widest range, cut at its weighted median on that range. */
function medianCut(colours: [number, number][], places: number): number[] {
  if (places <= 0 || !colours.length) return [];
  const channel = (c: number, k: number) => (c >> (16 - 8 * k)) & 255;
  type Box = { colours: [number, number][]; pixels: number; axis: number; range: number };
  const box = (colours: [number, number][]): Box => {
    let axis = 0, range = -1;
    for (let k = 0; k < 3; k++) {
      let lo = 255, hi = 0;
      for (const [c] of colours) { const v = channel(c, k); if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi - lo > range) { range = hi - lo; axis = k; }
    }
    return { colours, pixels: colours.reduce((n, [, m]) => n + m, 0), axis, range };
  };
  const boxes = [box(colours)];
  while (boxes.length < places) {
    let at = -1;
    boxes.forEach((b, i) => { if (b.range > 0 && (at < 0 || b.pixels * b.range > boxes[at].pixels * boxes[at].range)) at = i; });
    if (at < 0) break;
    const { colours: cs, pixels, axis } = boxes[at];
    cs.sort((a, b) => channel(a[0], axis) - channel(b[0], axis));
    let cut = 0;
    for (let n = 0; cut < cs.length - 1 && (n += cs[cut][1]) < pixels / 2;) cut++;
    cut = Math.max(1, Math.min(cs.length - 1, cut)); // both halves keep a colour
    boxes.splice(at, 1, box(cs.slice(0, cut)), box(cs.slice(cut)));
  }
  return boxes.map(({ colours, pixels }) => {
    const sum = [0, 0, 0];
    for (const [c, n] of colours) for (let k = 0; k < 3; k++) sum[k] += n * channel(c, k);
    return (Math.round(sum[0] / pixels) << 16) | (Math.round(sum[1] / pixels) << 8) | Math.round(sum[2] / pixels);
  });
}

/** Each pixel's place in `palette`: its own colour where the palette holds it, else the nearest colour (by distance in
 *  RGB). No dithering: a flat area keeps one colour. */
export function paletteIndices(rgba: ArrayLike<number>, palette: number[]): Uint8Array {
  const place = new Map<number, number>();
  palette.forEach((c, i) => { if (!place.has(c)) place.set(c, i); });
  const out = new Uint8Array(rgba.length / 4);
  for (let j = 0; j < out.length; j++) {
    const c = rgbAt(rgba, 4 * j);
    let i = place.get(c);
    if (i === undefined) {
      let best = Infinity;
      palette.forEach((q, k) => {
        const dr = (q >> 16) - (c >> 16), dg = ((q >> 8) & 255) - ((c >> 8) & 255), db = (q & 255) - (c & 255);
        const d = dr * dr + dg * dg + db * db;
        if (d < best) { best = d; i = k; }
      });
      place.set(c, i!);
    }
    out[j] = i!;
  }
  return out;
}

/** The LZW code stream of `indices`, as GIF compresses an image's data: codes of `minSize` + 1 bits and more, up to
 *  12, with a clear code when the table holds 4,096 codes. */
export function lzw(indices: Uint8Array, minSize: number): Uint8Array {
  const clear = 1 << minSize, end = clear + 1, out: number[] = [];
  let size = minSize + 1, next = end + 1, table = new Map<number, number>(), bits = 0, held = 0;
  const emit = (code: number) => {
    bits |= code << held;
    held += size;
    while (held >= 8) { out.push(bits & 255); bits >>>= 8; held -= 8; }
  };
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = (prefix << 8) | k, code = table.get(key);
    if (code !== undefined) { prefix = code; continue; }
    emit(prefix);
    if (next === 4096) {
      emit(clear);
      table = new Map();
      size = minSize + 1;
      next = end + 1;
    } else {
      if (next >= 1 << size) size++;
      table.set(key, next++);
    }
    prefix = k;
  }
  if (indices.length) emit(prefix);
  emit(end);
  if (held > 0) out.push(bits & 255);
  return new Uint8Array(out);
}

/** The GIF of `frames`, played again with no end. The first frame is the whole image, at 0, 0, and gives its size. The
 *  colours are gifPalette's, which keeps the `fixed` colours exact. */
export function animatedGif(frames: GifFrame[], fixed: number[] = []): Uint8Array<ArrayBuffer> {
  if (!frames.length) throw new Error("an animation needs a frame");
  const { x, y, w: width, h: height } = frames[0];
  if (x || y) throw new Error("the first frame is the whole image, at 0, 0");
  if (frames.some(f => f.x < 0 || f.y < 0 || f.x + f.w > width || f.y + f.h > height)) throw new Error("a frame lies outside the image");
  const palette = gifPalette(frames, fixed);
  // The colour table holds 2 ** bits colours: 2 at the least.
  const bits = Math.max(1, Math.ceil(Math.log2(palette.length))), minSize = Math.max(2, bits);
  const out: number[] = [];
  const bytes = (...b: number[]) => { for (const v of b) out.push(v); };
  const u16 = (v: number) => bytes(v & 255, (v >> 8) & 255);
  const text = (t: string) => bytes(...[...t].map(c => c.charCodeAt(0)));

  text("GIF89a");
  u16(width);
  u16(height);
  bytes(0x80 | (7 << 4) | (bits - 1), 0, 0); // a global colour table, 8 bits a channel; background 0; no aspect ratio
  for (let i = 0; i < 1 << bits; i++) { const c = palette[i] ?? 0; bytes(c >> 16, (c >> 8) & 255, c & 255); }
  bytes(0x21, 0xff, 11);
  text("NETSCAPE2.0");
  bytes(3, 1);
  u16(0); // the loop count: with no end
  bytes(0);
  for (const f of frames) {
    // The graphic control extension: disposal 1 (do not dispose), the delay in hundredths of a second, no transparency.
    bytes(0x21, 0xf9, 4, 1 << 2);
    u16(Math.round(f.ms / 10));
    bytes(0, 0);
    bytes(0x2c);
    u16(f.x);
    u16(f.y);
    u16(f.w);
    u16(f.h);
    bytes(0); // no local colour table, not interlaced
    const data = lzw(paletteIndices(f.rgba, palette), minSize);
    bytes(minSize);
    for (let at = 0; at < data.length; at += 255) {
      const block = data.subarray(at, at + 255);
      out.push(block.length);
      for (const b of block) out.push(b);
    }
    bytes(0);
  }
  bytes(0x3b);
  return new Uint8Array(out);
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
