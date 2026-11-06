// A file that the page gives the player to save: text, or an image's bytes. Hedge School's exports and its move menu's
// images use it (its design 13 and design 07, item 17), and Cyanotype's exports.

/** Gives the player a file to save. */
export function download(name: string, data: BlobPart, type = "application/json") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
