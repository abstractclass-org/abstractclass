# Documentation

Hedge School's code is in `apps/hedgeschool` ([design 26](design/26-one-repository.md)). A path in these documents to
the site's files starts there, and the site's commands run there. `npm ci` runs at the repository's root. The shared
packages are in `packages/` ([design 29](design/29-shared-packages.md)): a path that starts with `packages/` starts at
the root.

| Document | What |
|---|---|
| [context.md](context.md) | The goal, the game and the sites, the engine repository and what its outputs mean, and the working agreements. |
| [working-notes.md](working-notes.md) | How to work and test on this machine: the owner's browser, the local server, the browser tool. |
| [design/](design/README.md) | The design documents, one per decision still in force. |
| [decisions/](decisions/README.md) | The decision log (an archive), by topic. The backlog and the work in flight are in beads (label `site`). |
| [requests/](requests/README.md) | Requests to the engine repository, and their status. |
| [hosting.md](hosting.md) | How the site is served (the domain, Cloudflare Pages, the analytics), how each part was set up, and how to deploy, check and roll back. |
| [research/](research/01-ux-survey.md) | Research before decisions. [01-ux-survey.md](research/01-ux-survey.md): how chess and Go analysis and training tools design their pages, and first design ideas. [02-search-tree-reuse.md](research/02-search-tree-reuse.md): reusing the engine's search tree across budgets and positions. |
