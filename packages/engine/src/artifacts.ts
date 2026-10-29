// An engine artifact's bytes, as fetch-engine.mjs stores it: one file, or, when the file is too large for
// Cloudflare Pages (25 MiB), its gzip compression in one or more parts. The parts are joined and decompressed here, and
// the bytes are checked against the manifest's SHA-256.

export interface StoredArtifact { url: string; sha256: string; bytes: number; parts?: string[]; encoding?: "gzip" }

const GZIP = [0x1f, 0x8b];

/** The artifact's bytes, checked. */
export async function fetchArtifact(a: StoredArtifact): Promise<Uint8Array> {
  const urls = a.parts ?? [a.url];
  const pieces = await Promise.all(urls.map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }));
  let bytes = join(pieces);
  // A server may already have undone the compression (a Content-Encoding header): then the bytes are not gzip.
  if (a.encoding === "gzip" && bytes[0] === GZIP[0] && bytes[1] === GZIP[1]) bytes = await gunzip(bytes);
  const sha = await sha256Hex(bytes);
  if (sha !== a.sha256) throw new Error(`${a.url}: SHA-256 ${sha} is not the manifest's ${a.sha256}`);
  return bytes;
}

/** The bytes of an artifact that the page checked (client.ts, checked): what a worker reads them with. */
export async function bytesOf(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function join(pieces: Uint8Array[]): Uint8Array {
  if (pieces.length === 1) return pieces[0];
  const out = new Uint8Array(pieces.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of pieces) { out.set(p, at); at += p.length; }
  return out;
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The SHA-256 of `bytes`, in hex. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
