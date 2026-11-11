import { test } from "node:test";
import assert from "node:assert/strict";
import { icoFile } from "./ico.ts";

/** The start of a PNG file of width × height pixels, as far as icoFile reads it, then `rest`. */
function png(width: number, height: number, rest: string): Buffer {
  const ihdr = Buffer.alloc(8);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]), Buffer.from("IHDR"),
                        ihdr, Buffer.from(rest)]);
}

test("an ICO file holds its images after one entry each, with their sizes and places", () => {
  const images = [png(16, 16, "first"), png(32, 32, "second image"), png(256, 256, "256")];
  const ico = icoFile(images);
  assert.deepEqual([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)], [0, 1, 3]);
  let offset = 6 + 16 * 3;
  images.forEach((image, k) => {
    const at = 6 + 16 * k;
    assert.equal(ico.readUInt8(at), [16, 32, 0][k]); // 0 is 256
    assert.equal(ico.readUInt8(at + 1), [16, 32, 0][k]);
    assert.deepEqual([ico.readUInt16LE(at + 4), ico.readUInt16LE(at + 6)], [1, 32]);
    assert.deepEqual([ico.readUInt32LE(at + 8), ico.readUInt32LE(at + 12)], [image.length, offset]);
    assert.deepEqual(ico.subarray(offset, offset + image.length), image);
    offset += image.length;
  });
  assert.equal(ico.length, offset);
});

test("an ICO file takes PNG images of 256 pixels at most", () => {
  assert.throws(() => icoFile([png(16, 16, ""), Buffer.from("GIF89a, not a PNG file")]), /image 2 is not a PNG file/);
  assert.throws(() => icoFile([png(512, 512, "")]), /image 1 is 512 × 512 pixels: 256 is the most/);
});
