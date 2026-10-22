// The animated GIF (gif.ts): the frames, their delays and offsets, the loop count, that each frame decodes to its
// colours, and the palette's rule (the flat colours exact, the others the nearest). The test reads the file by the
// GIF89a specification, with its own reader and LZW decoder. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { animatedGif, changedBox, gifPalette, lzw, paletteIndices, type GifFrame } from "./gif.ts";

/** RGBA pixels `w` × `h`, each pixel the colour that `colour(x, y)` gives as 0xRRGGBB. */
function pixels(w: number, h: number, colour: (x: number, y: number) => number): Uint8ClampedArray {
  const p = new Uint8ClampedArray(4 * w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = colour(x, y), i = 4 * (y * w + x);
      p.set([c >> 16, (c >> 8) & 255, c & 255, 255], i);
    }
  return p;
}

/** GIF's LZW, decoded as the specification gives it: the table grows one entry for each code after the first. */
function unlzw(data: Uint8Array, minSize: number): number[] {
  const clear = 1 << minSize, end = clear + 1, out: number[] = [];
  let size = minSize + 1, table: number[][] = [], prev: number[] | null = null, at = 0;
  const reset = () => { table = Array.from({ length: clear + 2 }, (_, i) => [i]); size = minSize + 1; prev = null; };
  reset();
  for (;;) {
    let code = 0;
    for (let k = 0; k < size; k++, at++) code |= ((data[at >> 3] >> (at & 7)) & 1) << k;
    assert.ok(at <= 8 * data.length, "the code stream ends with the end code");
    if (code === clear) { reset(); continue; }
    if (code === end) break;
    let entry: number[];
    if (!prev) entry = table[code];
    else {
      entry = code < table.length ? table[code] : [...prev, prev[0]];
      table.push([...prev, entry[0]]);
    }
    out.push(...entry);
    prev = entry;
    if (table.length === 1 << size && size < 12) size++;
  }
  return out;
}

type Read = { w: number; h: number; palette: number[]; loops: number | null;
              frames: { x: number; y: number; w: number; h: number; ms: number; disposal: number; colours: number[] }[] };
function readGif(file: Uint8Array): Read {
  const b = Buffer.from(file), u16 = (at: number) => b.readUInt16LE(at);
  assert.equal(b.toString("latin1", 0, 6), "GIF89a");
  const packed = b[10];
  assert.ok(packed & 0x80, "a global colour table");
  const n = 2 << (packed & 7), palette: number[] = [];
  for (let i = 0; i < n; i++) palette.push((b[13 + 3 * i] << 16) | (b[14 + 3 * i] << 8) | b[15 + 3 * i]);
  const read: Read = { w: u16(6), h: u16(8), palette, loops: null, frames: [] };
  let at = 13 + 3 * n, ms = 0, disposal = 0;
  const blocks = () => {
    const parts: Buffer[] = [];
    for (let size = b[at++]; size; size = b[at++]) { parts.push(b.subarray(at, at + size)); at += size; }
    return Buffer.concat(parts);
  };
  for (;;) {
    const kind = b[at++];
    if (kind === 0x3b) break;
    if (kind === 0x21) {
      const label = b[at++];
      if (label === 0xf9) {
        assert.equal(b[at], 4);
        disposal = (b[at + 1] >> 2) & 7;
        ms = 10 * u16(at + 2);
        at += 6;
      } else if (label === 0xff) {
        const app = blocks();
        assert.equal(app.toString("latin1", 0, 11), "NETSCAPE2.0");
        assert.equal(app[11], 1);
        read.loops = app.readUInt16LE(12);
      } else blocks();
      continue;
    }
    assert.equal(kind, 0x2c, "an image descriptor");
    const f = { x: u16(at), y: u16(at + 2), w: u16(at + 4), h: u16(at + 6), ms, disposal, colours: [] as number[] };
    assert.equal(b[at + 8], 0, "no local colour table, not interlaced");
    at += 9;
    const minSize = b[at++], indices = unlzw(blocks(), minSize);
    assert.equal(indices.length, f.w * f.h, "the frame's data holds its pixels");
    f.colours = indices.map(i => palette[i]);
    read.frames.push(f);
  }
  assert.equal(at, b.length, "the file ends after its trailer");
  return read;
}

const frame = (x: number, y: number, w: number, h: number, ms: number, colour: (x: number, y: number) => number): GifFrame =>
  ({ rgba: pixels(w, h, colour), x, y, w, h, ms });

test("an animated GIF holds each frame, with its delay, its offset and the loop count", () => {
  const file = animatedGif(4, 3, [
    frame(0, 0, 4, 3, 2000, (x, y) => (x + y) % 2 ? 0xffffff : 0x000000),
    frame(1, 2, 2, 1, 1000, () => 0x0000ff),
    frame(3, 0, 1, 1, 500, () => 0xff0000),
  ]);
  const read = readGif(file);
  assert.deepEqual([read.w, read.h], [4, 3]);
  assert.equal(read.loops, 0, "plays with no end");
  assert.deepEqual(read.frames.map(({ x, y, w, h, ms, disposal }) => ({ x, y, w, h, ms, disposal })), [
    { x: 0, y: 0, w: 4, h: 3, ms: 2000, disposal: 1 },
    { x: 1, y: 2, w: 2, h: 1, ms: 1000, disposal: 1 },
    { x: 3, y: 0, w: 1, h: 1, ms: 500, disposal: 1 },
  ]);
  // Each frame decodes to its own colours.
  assert.deepEqual(read.frames[0].colours, [0, 0xffffff, 0, 0xffffff, 0xffffff, 0, 0xffffff, 0, 0, 0xffffff, 0, 0xffffff]);
  assert.deepEqual(read.frames[1].colours, [0x0000ff, 0x0000ff]);
  assert.deepEqual(read.frames[2].colours, [0xff0000]);
});

test("an animated GIF takes a loop count, and refuses frames that do not fit", () => {
  assert.equal(readGif(animatedGif(1, 1, [frame(0, 0, 1, 1, 250, () => 0)], [], 3)).loops, 3);
  const first = frame(0, 0, 4, 4, 500, () => 0);
  assert.throws(() => animatedGif(4, 4, []));
  assert.throws(() => animatedGif(4, 4, [{ ...first, x: 1 }]), /first frame/);
  assert.throws(() => animatedGif(4, 4, [first, frame(3, 0, 2, 2, 500, () => 0)]), /outside/);
});

test("LZW: a long stream of many colours decodes, through the clear codes of a full table", () => {
  let seed = 7;
  const random = () => (seed = (seed * 1103515245 + 12345) >>> 0) >>> 24;
  const indices = Uint8Array.from({ length: 60_000 }, (_, i) => (i % 3 ? random() : i & 255));
  assert.deepEqual(unlzw(lzw(indices, 8), 8), [...indices]);
  const runs = Uint8Array.from({ length: 100_000 }, (_, i) => (i >> 9) & 3);
  assert.deepEqual(unlzw(lzw(runs, 2), 2), [...runs]);
});

test("the palette: with 256 colours or fewer, each one is exact", () => {
  const few = pixels(16, 16, (x, y) => (x * 16 + y) * 65793 & 0xffffff);
  const exact = gifPalette([{ rgba: few, x: 0, y: 0, w: 16, h: 16, ms: 0 }], [0x123456]);
  assert.equal(exact.length, 256, "a fixed colour that the image does not hold takes no place");
  const colours = paletteIndices(few, exact);
  for (let j = 0; j < 256; j++) assert.equal(exact[colours[j]], (few[4 * j] << 16) | (few[4 * j + 1] << 8) | few[4 * j + 2]);
});

test("the palette: the fixed and the flat colours stay exact, and the other colours take the nearest", () => {
  // Flat areas of 4 colours, one of them fixed, and between them rows one pixel high of 1,000 colours, one pixel each,
  // as anti-aliasing makes.
  const W = 100, H = 100, flat = [0xf4f1ea, 0x2563eb, 0xdc2626, 0xdde4f4];
  let n = 0;
  const p = pixels(W, H, (x, y) => y % 10 === 9 ? (Math.imul(++n, 2654435761) >>> 8) & 0xffffff
    : flat[Math.floor(x / 50) + 2 * Math.floor(y / 50)]);
  const palette = gifPalette([{ rgba: p, x: 0, y: 0, w: W, h: H, ms: 0 }], [0x111111, flat[2]]);
  assert.ok(palette.length <= 256);
  assert.deepEqual(palette.slice(0, 2), [0x111111, flat[2]], "the fixed colours come first");
  for (const c of flat) assert.ok(palette.includes(c), `the flat colour ${c.toString(16)} is in the palette`);
  const indices = paletteIndices(p, palette);
  for (let j = 0; j < W * H; j++) {
    const c = (p[4 * j] << 16) | (p[4 * j + 1] << 8) | p[4 * j + 2], q = palette[indices[j]];
    if (flat.includes(c)) assert.equal(q, c, "a flat colour is exact");
    else {
      // The nearest colour of the palette: none is nearer.
      const d = (a: number, b: number) => ((a >> 16) - (b >> 16)) ** 2 + (((a >> 8) & 255) - ((b >> 8) & 255)) ** 2 + ((a & 255) - (b & 255)) ** 2;
      assert.ok(palette.every(r => d(r, c) >= d(q, c)));
    }
  }
});

test("the changed box holds every pixel that differs, and only those rows and columns", () => {
  const w = 5, h = 4, a = new Uint8ClampedArray(w * h * 4), b = new Uint8ClampedArray(a);
  assert.deepEqual(changedBox(a, b, w, h), null);
  b[4 * (1 * w + 3) + 2] = 9; // (3, 1), blue
  b[4 * (2 * w + 1) + 3] = 9; // (1, 2), alpha
  assert.deepEqual(changedBox(a, b, w, h), { x: 1, y: 1, w: 3, h: 2 });
  b[0] = 1; // (0, 0)
  assert.deepEqual(changedBox(a, b, w, h), { x: 0, y: 0, w: 4, h: 3 });
});
