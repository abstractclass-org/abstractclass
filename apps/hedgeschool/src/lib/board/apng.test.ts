// The animated PNG (apng.ts): the frames, their delays and offsets, the play count, and that each frame decodes. The
// test reads the file by the chunks that the PNG specification (third edition) gives, with its own reader, and decodes
// each frame with Node's zlib. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync, inflateSync } from "node:zlib";
import { apng, changedBox } from "./apng.ts";

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** A PNG of 8-bit RGBA pixels, `width` × `height`, each pixel `rgba`: the form of a canvas's toBlob. */
function png(width: number, height: number, rgba: [number, number, number, number]): Uint8Array {
  const rows = Buffer.alloc(height * (1 + 4 * width));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) rows.set(rgba, y * (1 + 4 * width) + 1 + 4 * x); // filter 0 at each row's start
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const z = deflateSync(rows);
  // Two IDAT chunks, as an encoder may split its data.
  const half = z.length >> 1;
  return Buffer.concat([Buffer.from(SIGNATURE), chunk("IHDR", ihdr), chunk("sRGB", Buffer.from([0])),
                        chunk("IDAT", z.subarray(0, half)), chunk("IDAT", z.subarray(half)), chunk("IEND", Buffer.alloc(0))]);
}
function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "latin1");
  return Buffer.concat([head, data, Buffer.alloc(4)]); // the reader below does not check the CRC: crc() is tested apart
}

type Chunk = { type: string; data: Buffer; crc: number; body: Buffer };
function chunks(file: Uint8Array): Chunk[] {
  const b = Buffer.from(file);
  assert.deepEqual([...b.subarray(0, 8)], SIGNATURE);
  const out: Chunk[] = [];
  for (let at = 8; at < b.length;) {
    const n = b.readUInt32BE(at), type = b.toString("latin1", at + 4, at + 8);
    out.push({ type, data: b.subarray(at + 8, at + 8 + n), crc: b.readUInt32BE(at + 8 + n), body: b.subarray(at + 4, at + 8 + n) });
    at += 12 + n;
  }
  return out;
}

/** CRC-32 as the PNG specification gives it, bit by bit: independent of the encoder's table. */
function crc(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

type Frame = { w: number; h: number; x: number; y: number; ms: number; pixels: Buffer };
/** The file's frames: each fcTL with the data after it (IDAT for the first, fdAT for the others), decoded. */
function frames(file: Uint8Array): { plays: number; count: number; frames: Frame[]; order: string[] } {
  const cs = chunks(file), actl = cs.find(c => c.type === "acTL")!;
  const out: Frame[] = [];
  let seq = 0, data: Buffer[] = [];
  const close = () => {
    if (!out.length) return;
    const f = out.at(-1)!, raw = inflateSync(Buffer.concat(data));
    assert.equal(raw.length, f.h * (1 + 4 * f.w), "the frame's data holds its rows");
    f.pixels = raw;
    data = [];
  };
  for (const c of cs) {
    if (c.type === "fcTL" || c.type === "fdAT") assert.equal(c.data.readUInt32BE(0), seq++, "the sequence numbers run from 0");
    if (c.type === "fcTL") {
      close();
      const d = c.data;
      assert.equal(d[24], 0, "dispose: none");
      assert.equal(d[25], 0, "blend: source");
      out.push({ w: d.readUInt32BE(4), h: d.readUInt32BE(8), x: d.readUInt32BE(12), y: d.readUInt32BE(16),
                 ms: 1000 * d.readUInt16BE(20) / (d.readUInt16BE(22) || 100), pixels: Buffer.alloc(0) });
    }
    if (c.type === "IDAT") data.push(c.data);
    if (c.type === "fdAT") data.push(c.data.subarray(4));
  }
  close();
  return { plays: actl.data.readUInt32BE(4), count: actl.data.readUInt32BE(0), frames: out, order: cs.map(c => c.type) };
}

test("an animated PNG holds each frame, with its delay, its offset and the play count", () => {
  const file = apng([
    { png: png(4, 3, [255, 255, 255, 255]), x: 0, y: 0, ms: 1000 },
    { png: png(2, 1, [0, 0, 255, 255]), x: 1, y: 2, ms: 500 },
    { png: png(1, 1, [255, 0, 0, 255]), x: 3, y: 0, ms: 2000 },
  ]);
  const read = frames(file);
  assert.equal(read.count, 3);
  assert.equal(read.plays, 0, "plays with no end");
  assert.deepEqual(read.frames.map(({ w, h, x, y, ms }) => ({ w, h, x, y, ms })), [
    { w: 4, h: 3, x: 0, y: 0, ms: 1000 },
    { w: 2, h: 1, x: 1, y: 2, ms: 500 },
    { w: 1, h: 1, x: 3, y: 0, ms: 2000 },
  ]);
  // Each frame decodes to its own pixels.
  assert.deepEqual([...read.frames[1].pixels], [0, 0, 0, 255, 255, 0, 0, 255, 255]);
  assert.deepEqual([...read.frames[2].pixels], [0, 255, 0, 0, 255]);
  // The file is a PNG: its header and image size are the first frame's, the animation's chunks come before the image
  // data, and the first frame's other chunks (here sRGB) stay.
  const [ihdr] = chunks(file);
  assert.equal(ihdr.type, "IHDR");
  assert.equal(ihdr.data.readUInt32BE(0), 4);
  assert.equal(ihdr.data.readUInt32BE(4), 3);
  assert.deepEqual(read.order, ["IHDR", "sRGB", "acTL", "fcTL", "IDAT", "IDAT", "fcTL", "fdAT", "fdAT", "fcTL", "fdAT", "fdAT", "IEND"]);
  for (const c of chunks(file)) assert.equal(c.crc, crc(c.body), `the CRC of ${c.type}`);
});

test("an animated PNG takes a play count", () => {
  const file = apng([{ png: png(1, 1, [0, 0, 0, 255]), x: 0, y: 0, ms: 250 }], 3);
  assert.equal(frames(file).plays, 3);
  assert.equal(frames(file).frames[0].ms, 250);
});

test("an animated PNG refuses frames that do not fit", () => {
  const first = { png: png(4, 4, [0, 0, 0, 255]), x: 0, y: 0, ms: 500 };
  assert.throws(() => apng([]));
  assert.throws(() => apng([{ ...first, x: 1 }]), /first frame/);
  assert.throws(() => apng([first, { png: png(2, 2, [0, 0, 0, 255]), x: 3, y: 0, ms: 500 }]), /outside/);
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
