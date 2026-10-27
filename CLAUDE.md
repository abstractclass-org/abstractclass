# Hedge School

This project builds Hedge School, a website that helps people learn the board game Enclosure. It reviews their games,
labels their moves, and later offers puzzles and training. Before you change anything, read these:

- **The work, in beads** (label `site`): what is live, what is in flight, and the backlog. The rules are in
  [../CLAUDE.md](../CLAUDE.md), "Tracking work in beads". Read the pinned issue "What is live" and the work in
  progress first.
- [docs/working-notes.md](docs/working-notes.md): how to test on this machine (the owner's browser, the local server,
  the browser tool). Read it before a test in a browser. Add a note when you learn a lasting one.
- [docs/context.md](docs/context.md): the goal, the game and the sites, the engine repository and what its outputs
  mean, and the working agreements.
- [docs/design/](docs/design/README.md): the design documents, one per decision that is still in force. When a
  lasting decision is made or changed, write or update its design document.
- [docs/decisions/](docs/decisions/README.md): the archive of what was decided and measured, by topic.
- [docs/requests/](docs/requests/README.md): what this repository asked of the engine repository, and the status of
  each request.

## The code

Hedge School's code is in `apps/hedgeschool` ([design 26](docs/design/26-one-repository.md)). The repository's root
holds one npm workspace and its one lockfile, the documents and the workflows. Run `npm ci` at the root, and the
site's commands ([README.md](README.md)) in `apps/hedgeschool`. `npm run check:all` at the root runs the checks of
the Tests workflow before its browser tests, as the workflow does. A path in the documents to the site's files starts
there ([docs/README.md](docs/README.md)). The parts that a jam game's site shares with Hedge School (the engine, the
storage, the analysis, the review's view and the import's frame) are packages in `packages/`
([design 29](docs/design/29-shared-packages.md)): a path that starts with `packages/` starts at the root.

## The engine repository

The engine, the rules and the bots live in the engine repository,
[github.com/abstractclass-org/engines](https://github.com/abstractclass-org/engines), checked out at
`../engines`.

- **Read it. Never change it from a session of this repository.** Changes there go through its own sessions. When
  this repository needs something from it, write a request in `docs/requests/`, file an issue with the label
  `engines` that links the request, and tell the owner. Work here that waits for the request depends on that issue.
- **Never copy engine or rules code here.** The rules engine must match the site, and the engine repository's tests
  guard that. This repository uses the engine as versioned artifacts: a tagged WebAssembly build and a model.
- **Decisions live where the thing decided lives.** Engine, rules, fork and protocol decisions stay there. Product
  decisions (quality labels, thresholds, the interface, puzzles) live here. Link across the repositories by URL and
  path.

## How to work

- Follow published methods (Lichess, KaTrain, Maia, KataGo). Name any departure, and ask before taking it. Find where
  each constant came from before relying on it.
- Measure speed on the real workload, in a real browser. Decide questions of learning quality by reasoning, not by
  short tests.
- Before you change a site-wide layout mechanism (the page area that scrolls and its scroll bar's room, the header's
  height, a breakpoint), search for what depends on it: viewport units (`vw`, `vh`), `--site-header`, and fixed pixel
  allowances. After the change, run the layout test (`npm run test:layout`). It runs in Chromium. Edge runs only with
  `HS_EDGE=1`, and only the owner sets it.
- Ask design questions a few at a time, each with its background and each option's merits. Stop only at real
  decisions.
- Ask before any public use of other people's games (the meaf.us archive).
- Commits: stage named files only, never `git add -A`. Commit only when asked. No attribution lines.
- Branches: work on `dev`, and push it after each commit, so that GitHub holds the work. The workflow **Deploy** puts
  a preview of each push to `dev` on Cloudflare Pages. `main` is the live site: push to it only when the owner says to
  release (`git push origin dev:main`). See [docs/hosting.md](docs/hosting.md).

## Writing documents

Write the documents as standalone documentation, not as a record of our sessions:

- Write in the style of Simplified Technical English (the `/asd-ste100` skill): short sentences, active voice, no
  semicolons.
- Give a date or a time only when the reader needs it. The decision logs keep the date of each entry.
- Do not use labels that exist only in a chat, such as "decision D2" or "step 3". Describe the thing.
- Mention iviazovetskyi only where an idea came from their work, and cite their GitHub repository or Hugging Face
  page. Their work is not published or peer reviewed, so it is not a standard like KataGo or Stockfish.
- Do not tag text with who decided it ("(owner)", "owner:", "the owner's choice"). Write the decision and its
  reason.
- Do not name the owner's accounts in general prose.

## Writing the site's text

Write each piece of the site's text by what it does:

- **Text that a player follows,** such as error messages, notices and the steps to install the bookmarklet: strict
  Simplified Technical English (the `/asd-ste100` skill, its strict mode). A wrong reading there costs the player.
- **Text that explains,** such as the Privacy, Notation and About pages and How reviews work: the sentence rules of
  Simplified Technical English (the skill's STE-flavored mode). Short sentences, active voice and no semicolons, with
  a freer choice of words.
- **Text that invites or persuades,** such as the home page, the consent banner and the Support Us dialog: plain web
  writing, as the [GOV.UK style guides](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/)
  give it. Its tone matters, and the flat style of Simplified Technical English does not fit it.

## Agent skills

### Issue tracker

Issues live in beads, with the label `site`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles, as beads labels. See `docs/agents/triage-labels.md`.

### Domain docs

The glossaries are in the planning repository (`../GLOSSARY.md` for the shared terms, `../glossary/<game>.md` for
each game's), and the decision records in `docs/design/`. See `docs/agents/domain.md`.
