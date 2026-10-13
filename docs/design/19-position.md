# Hedge School's place: a school for every play site

**Status:** in force. **Decided:** 2026-10-14.

## Context

Enclosure is played on play sites. A play site can have accounts, matchmaking and storage, and add tools over time,
such as a review, puzzles and studies. Hedge School runs no play. It needs a place in the game's world that a play site
does not take away, and a plan for what it will need later: a backend, accounts, and human games for its puzzles.

## Decision

1. **Hedge School is a school:** the place to get better at Enclosure. It reviews games, explains moves, and teaches,
   with lessons (Learn), puzzles and studies.
2. **It runs no play:** no matchmaking, no live games, no game servers. Live play needs connections that stay open,
   uptime, the detection of cheats, and moderation. That is another service, at another cost.
3. **It serves every play site alike.** Each play site can link its games here and keep their reviews (design 18). A
   play site's tools serve its own players. A school can serve the players of all of them.
4. **Its edge is teaching, not the review alone:**
   - **The engine** (the engine repository's): the strongest analysis of the game.
   - **The explanations:** labels, notes, hard positions (design 10), and their reasons.
   - **The teaching material:** lessons, puzzles chosen to teach, studies.

   A play site's review can come to evaluate moves well enough. Hedge School must be better at explaining them.
5. **Static files and the browser first.** What can be static files, or stay in the player's browser, stays so:
   - **Lessons:** static pages.
   - **Puzzles from the player's own games:** the review finds the mistakes and the better moves, as Lichess's "Learn
     from your mistakes" does (the open items, "Learning from mistakes").
   - **A chosen set of puzzles:** files, with a difficulty from the engine (design 01).
   - **Studies:** files and links. The review file holds the game's tree, its branches and its notes (design 13).
6. **A light backend when a feature needs shared data, not before:**
   - **Optional accounts,** to keep a player's games and progress on all the player's devices.
   - **Puzzle ratings from players' attempts,** as Lichess rates its puzzles (design 01).
   - **Shared studies.**

   It runs on Cloudflare, where the site is (Workers and their database, D1): there are no servers to keep. A
   partner's sign-in can take the place of Hedge School's own accounts, if partners offer one.
7. **Human games come by agreement:**
   - **From play sites** that publish their games or share them, as Lichess publishes all of its games.
   - **From a play site's archive,** with its owner's permission before any public use.
   - **From players** who choose to give a reviewed game. Games stay in the player's browser until the player gives
     one.
   - **Games between weaker versions of the engine** can fill the gap at first, marked as such: their positions are
     less like a human's.

## Why

- **A play site has the players, the accounts and the games.** To match it feature for feature fails, and it is a
  service of another kind.
- **The same pattern in other games:** in Go, the play servers added an AI review, and teaching services that explain
  better, with games from several servers, keep their players. In chess, beside the large play sites, sites that do
  one thing better, such as courses or tactics training, keep theirs.
- **Neutrality is a place that no play site can take.** Each new play site is one more source of players, not one
  more rival.
- **Static first:** no servers to run, no cost until a feature earns a backend, and the privacy page's promise holds:
  a player's games stay in the player's browser.

## Alternatives

- **A play site too:** live servers, matchmaking and moderation, against sites that already have the players.
- **An engine provider only,** which licenses the engine to play sites: the engine's analysis becomes everyone's,
  and the teaching, which is the edge, goes unused.
- **Every feature of a play site's, one by one:** a race against sites with more players and more data.
- **Accounts and a backend now:** a cost to run, and a change of the privacy page's promise, before any feature
  needs them.

## Consequences

- **The partner link is central** (design 18): its quality decides whether a partner builds its own reviewer.
- **What to watch:** if a play site's analysis comes to match Hedge School's, the review stops drawing players. The
  answer is what only the school gives: lessons, puzzles from the player's own mistakes, and explanations. A better
  review button is not the answer.
- **Open questions** are in the backlog (the open items, "Hedge School's place"): the licence of the engine's networks,
  an open database of a play site's games, and a partner's sign-in for accounts.
- Puzzles and lessons stay outside the early access until they are ready (design 11).

## Where it is

- The method of the puzzles and the lessons: design 01. The labels and their explanations: design 10. The early
  access: design 11. The review file: design 13. The partner sites: design 18.
- The engine: the engine repository, [github.com/seankao31/enclosure-ai](https://github.com/seankao31/enclosure-ai).

## Log entries

- [decisions/product.md](../decisions/product.md): "Hedge School's place: a school for every play site" (2026-10-14).
