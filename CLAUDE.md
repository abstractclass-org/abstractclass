# Hedge School

This project builds Hedge School, a website that helps people learn the board game Enclosure. It reviews their games, labels their
moves, and later offers puzzles and training. Before you change anything, read these documents:

- [docs/handoff.md](docs/handoff.md): the latest session's handoff. It tells what is in flight and what to check
  first. Read it first. It holds only work in flight. Rewrite it at the end of each session.
- [docs/decisions/open-items.md](docs/decisions/open-items.md): the one backlog. It holds all work still to do that
  is not in flight. When work on an item starts, move the item to the handoff. If the work stops unfinished, move the
  item back. When the item is done, remove it and write its result in its topic file. Never keep one item in both
  places.
- [docs/context.md](docs/context.md): the goal, the game and the sites, the engine repository and what its outputs
  mean, and the working agreements.
- [docs/design/](docs/design/README.md): the design documents, one per decision that is still in force. When a
  lasting decision is made or changed, write or update its design document.
- [docs/decisions/](docs/decisions/README.md): the archive of what was decided and measured, by topic.
- [docs/requests/](docs/requests/README.md): what this repository asked of the engine repository, and the status of
  each request.

## The engine repository

The engine, the rules and the bots live in the engine repository,
[github.com/abstractclass-org/enclosure-ai](https://github.com/abstractclass-org/enclosure-ai), checked out at
`../enclosure`.

- **Read it. Never change it from a session of this repository.** Changes there go through its own sessions. When
  this repository needs something from it, write a request in `docs/requests/` and tell the owner.
- **Never copy engine or rules code here.** The rules engine must match the site, and the engine repository's tests
  guard that. This repository uses the engine as versioned artifacts: a tagged WebAssembly build and a model.
- **Decisions live where the thing decided lives.** Engine, rules, fork and protocol decisions stay there. Product
  decisions (labels, thresholds, the interface, puzzles) live here. Link across the repositories by URL and path.

## How to work

- Follow published methods (Lichess, KaTrain, Maia, KataGo). Name any departure, and ask before taking it. Find where
  each constant came from before relying on it.
- Measure speed on the real workload, in a real browser. Decide questions of learning quality by reasoning, not by
  short tests.
- Before you change a site-wide layout mechanism (the page area that scrolls and its scroll bar's room, the header's
  height, a breakpoint), search for what depends on it: viewport units (`vw`, `vh`), `--site-header`, and fixed pixel
  allowances. After the change, run the layout sweep (`npm run test:layout`).
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
