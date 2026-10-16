# Issue tracker: beads

Issues live in beads (`bd`), in one database shared with the engine repository. This repository's `.beads/redirect`
(local, ignored by Git) points `bd` to it. The workflow rules (start of a session, claim, notes, close, push) are in
`../CLAUDE.md`, "Tracking work in beads". Issue ids look like `abscls-xxx`.

## Conventions

- **Label:** every issue of this repository has the label `site`. Put it on every create and every query. Work for
  the engine repository gets the label `engines`.
- **Create an issue:** `bd create "<title>" -l site --body-file <file>` (`-d "<text>"` for a short body). Add
  `-t bug|feature|task|epic` and `-p 0-4` when known.
- **Read an issue:** `bd show <id>`: the description, notes, labels, dependencies and comments.
- **List issues:** `bd list -l site --status open`. Comma-separated labels must all match (`-l site,milestone-1`).
  `bd ready -l site` lists the open issues with no open blocker.
- **Sub-issue of a parent:** `bd create ... --parent <parent-id>`. The child's id is `<parent-id>.N`, and it inherits
  the parent's labels. `bd children <parent-id>` lists the children.
- **Comment:** `bd comment <id> "<text>"`.
- **Apply / remove labels:** `bd label add <id> <label>` / `bd label remove <id> <label>`.
- **Close:** `bd close <id> --reason "<text>"`.
- **Blocking:** `bd dep add <blocked-id> <blocker-id>`. A blocked issue leaves `bd ready` until its blockers close.

## When a skill says "publish to the issue tracker"

Create an issue with `bd create` and the label `site`. A spec is an epic (`-t epic`) whose description holds the
spec. Its implementation tickets are its children (`--parent <epic-id>`), one issue for each ticket.

## When a skill says "fetch the relevant ticket"

`bd show <id>`. The user normally gives the id. Otherwise find it with `bd search "<words>"`.

## Wayfinding operations

Used by `/wayfinder`. The map is an epic, with one child issue for each ticket.

- **Map:** `bd create "<title>" -t epic -l site,wayfinder:map --body-file <file>`. Its description holds the Notes
  and the Fog. The Decisions-so-far collect in its notes.
- **Child ticket:** `bd create "<question>" --parent <map-id> --no-inherit-labels -l site,wayfinder:<type>`
  (`research`, `prototype`, `grilling` or `task`). `--no-inherit-labels` keeps `wayfinder:map` off the child.
- **Blocking:** `bd dep add <child-id> <blocker-id>`. A ticket is unblocked when every blocker is closed.
- **Frontier query:** `bd ready --parent <map-id>`: the open children with no open blocker and no claim. The lowest
  child number (`<map-id>.N`) wins.
- **Claim:** `bd update <id> --claim`, the session's first write. It sets the assignee and the status in progress.
- **Resolve:** `bd comment <id> "<answer>"`, then `bd close <id>`, then add a context pointer to the map's
  Decisions-so-far: `bd update <map-id> --append-notes "<gist> (<id>)"`.
