// The test books' files for the tests that read the book from disk (tests/fixtures/test-book, scripts/test-book.mjs):
// the book's unit tests and the label snapshot (review/labels.snapshot.test.ts). Each file by its address on the
// servers, as the loader reads it (book.ts, BookReader). One reader for every test that reads the book.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BookReader } from "../book.ts";

/** The test book's index (the prototype), and the index of its hand-made cases. */
export const TEST_BOOK = "/test-book/prototype/index.json", CASES = "/test-book/cases/index.json";

const site = fileURLToPath(new URL("../../../..", import.meta.url));
/** A test book's file on the disk, by its address on the servers. */
export const fixture = (url: string) => join(site, "tests", "fixtures", url);
/** A test book's file as JSON, by its address on the servers. It throws when the file does not exist. */
export const readJson = (url: string) => JSON.parse(readFileSync(fixture(url), "utf8"));
/** Reads the test books' files as the browser fetches them, and logs each address in `log`. A file that does not
 *  exist fails, as a fetch does. */
export const files = (log?: string[]): BookReader => async url => {
  log?.push(url);
  return readJson(url);
};
