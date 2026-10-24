# The test book

This is a test book, not the engine's book. The explorer's work uses it until the engine repository's book comes
(request 22). Its values come from the third prototype's book (the branch abscls-tpaj.3), which the site's engine
searched in WebAssembly at 512 visits, with the site's network. The engine's book searches deeper, with the strongest
network.

- `prototype/`: the prototype's 404 positions and 38 traps.
- `cases/`: hand-made cases for the explorer's tests. Its added positions have copied values, not searched ones, and
  its part 2 has no file on purpose: it is the part that fails to load.

The unit tests read these files (`src/lib/book/book.test.ts`). The dev and preview servers serve them at `/test-book/`
(`vite.config.ts`, `testBook`), and no build holds them. The form is in design 32, "The book file"
(`docs/design/32-book-explorer.md`). `scripts/test-book.mjs` writes both books again from the prototype's `book.json`.
Do not edit these files by hand.
