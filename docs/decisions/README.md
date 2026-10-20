# Decision log

This log holds the key actions, findings and decisions, by topic. Each file is oldest first. Dates are local
(UTC+8).

This log is the archive. For the design as it is now, read the design documents ([../design/](../design/README.md)).
What is still to do and what is in flight are in beads (label `site`). When an issue is done, write its
result here, in the file whose topic fits.

Add a new entry at the end of the file whose topic fits. Give it a `###` heading with the date. Each file's `###`
headings list its entries, oldest first, and GitHub shows them as the file's outline.

The topic files merge by union (`.gitattributes`): when two branches each add an entry at a file's end, a merge or a
rebase keeps both entries, with no conflict. Union fits only a file that grows by new entries at its end. Two edits
of the same line, or of two lines next to each other, also give no conflict: the file then holds both versions of
the lines, one after the other. So add to the end, and after a merge or a rebase, read each earlier entry that both
branches changed. The union runs where Git's settings define its driver ([../working-notes.md](../working-notes.md)).
Without the driver, Git shows each conflict, as in any file. This README does not merge by union.

## Topics

- [architecture.md](architecture.md): the repositories and their organization, the stack, hosting and the deploy, how
  the engine's artifacts arrive, the public repository and the history rewrites.
- [engine.md](engine.md): the engine in the browser: loading, speed, memory and the GPU, the engine interface and the
  requests for it, the engine's releases, and the measurements that the labels rest on (label agreement, the human
  win curve, a turn's loss, complexity).
- [product.md](product.md): the interface and the review, labels and thresholds, game import and export, the Analysis
  board, practice, puzzles and lessons, the site's pages and text, the logo and colours, analytics, the launch on
  Cloudflare Pages, and the layout sweep.
- [open-items.md](open-items.md): a pointer. The backlog moved to beads on 2026-10-16.
