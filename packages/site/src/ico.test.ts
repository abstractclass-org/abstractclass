import { test } from "node:test";
import assert from "node:assert/strict";
import { icoFile } from "./ico.ts";

test("an ICO file holds its images after one entry each, with their sizes and places", () => {
  const images = [Buffer.from("first"), Buffer.from("second image"), Buffer.from("256")];
  const ico = icoFile([16, 32, 256], images);
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

test("an ICO file needs one size for each image", () => {
  assert.throws(() => icoFile([16, 32], [Buffer.from("one")]), /2 sizes for 1 images/);
});
