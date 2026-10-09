# Decision log

This log holds the key actions, findings and decisions, by topic. Each file is oldest first. Dates are local
(UTC+8).

This log is the archive. For the design as it is now, read the design documents ([../design/](../design/README.md)).
What is still to do is in [open-items.md](open-items.md) (the one backlog). What is in flight is in
[../handoff.md](../handoff.md).

Add a new entry at the end of the file whose topic fits. Give it a `###` heading with the date. Add its title to the
list below.

## Topics

- [architecture.md](architecture.md): the repository, the stack, hosting, how the engine's artifacts arrive.
  - The repository starts. The stack.
- [engine.md](engine.md): the engine in the browser: loading, speed, the engine interface and the requests for it.
  - The current module in a Web Worker, and the time a position. The engine repository answers the requests. The engine protocol in the browser. The review on the engine. Label agreement against search budget.
- [product.md](product.md): the interface, the review, puzzles, lessons, labels and thresholds.
  - A survey of chess and Go tools. The product's shape. The review wireframe. The review wireframe, first feedback. The review wireframe, second feedback. The review wireframe, third feedback. Prototypes of the other parts.
- [open-items.md](open-items.md): the one backlog.
