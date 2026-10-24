# The book explorer: Hedge School's opening book, for people to learn

## Users

Enclosure players who want to improve, top players included ([docs/context.md](../../context.md), "Goal"). They play
on meaf.us (60 s + 15 s a turn) and on strategyjam.org, and they bring their games to Hedge School for a review. A
game is short (120 edges), and its turns go 1-2-2: Blue's first turn is one edge, and each turn after it is two
edges. At that clock, a player plays the opening from memory and habit.

A player comes to the book in one of five situations:

- **After a game.** The player reviews a game, and the opening went wrong, or the player wants to know if their first
  turns were good. The player asks: where did my game leave the book, and what does the book play there? The player
  starts from the review, with the game on the board.
- **Study.** The player sits down to learn the opening, unhurried, for 10 to 30 minutes. The player asks: what is the
  main line, what else is fine at each turn, why is one move better, which traps must I avoid, and which can I set?
  The player starts from the site's menu or from a lesson.
- **Preparation.** A strong player gets ready for an event (a strategy jam tournament, rated games on meaf.us). The
  player builds a set of lines as Blue and as Red, checks a favourite line, and looks for traps to set. The player
  wants the exact values, the bounds, and the lines where the book is unsure.
- **An idea on the board.** On the Analysis board, the player tries a move at turn 2 or 3 and asks: is it in the
  book, and if not, how far from the book's moves is it?
- **A new player.** The player has learned the rules in the lessons and wants a sound start without theory: few
  choices, one recommendation, and its reason.

The first version serves two of them: after a game, and study, with the new player as a reader of the study's first
view. Preparation and an idea on the board come later.

The player reads the site in English, often not as a first language. Most use a desktop or a laptop. Some read on a
phone.

## Product

- **Hedge School:** a free, static site, a school for every play site ([design 19](../../design/19-position.md)). It
  has the review, the Analysis board ([design 21](../../design/21-analysis.md)), practice against HedgeFund
  ([design 24](../../design/24-practice.md)) and lessons ([design 28](../../design/28-lessons.md)). Visitors can
  tip through Ko-fi ("Support Us", [design 22](../../design/22-site-map.md)).
- **The book:** a tree of positions from the start, computed offline by the engine repository with KataGo's book
  method (the beads epic abscls-tpaj, "Decided so far"). Each position has:
  - its book moves, every fine move (Good or better) near the start, each with its label, its win chance and its
    bounds;
  - its traps: a move that a short search rates Good or better and a deep search rates a Mistake or worse, with the
    refutation;
  - the area map, and at each line's end a position symbol (=, ⩲, ⩱, ±, ∓, +−, −+, ∞).

  A position and its mirror image are one node. Positions that two move orders reach are one node.
  The book lists its choices one edge at a time, as it stores them. The move list groups the edges into turns, as
  the review's move list does.
- **The base:** the Analysis board. It has the board, the engine header, the candidates' table, the line drawn on
  hover, the move list with inline branches, the area map, the threat and the display settings.
- **The prototype's view** (branch abscls-tpaj.3, the route /lab/book-board): a book mode in the engine panel. It shows
  the book's table, the move list's branches folded under chevrons, the eight symbols drawn in SVG, and a trap's value
  at a short look beside its deep value.

## Constraints

- **Static files, no server.** The site serves the book as files, as it serves the engine's files. A lookup runs in
  the player's browser, and no game leaves it.
- **Values from the engine only.** The book has no game statistics: no count of how often people play a move, and no
  results of players. Other players' games are not used in public without their owner's permission
  ([docs/context.md](../../context.md), "Other people's games").
- **A position outside the book** has only the live engine on the player's CPU. It searches less deeply than the
  book's searches.
- **The book changes** when the engine repository computes a new one with a stronger network. A value can change from
  one version to the next.
- **Published methods first:** the explorers that people use in chess and Go (Lichess's opening explorer, KataGo's
  book pages, the joseki explorers of Go) are the reference. Each departure has its reason.
- **One language of marks:** the move labels and their colours and shapes as in the review
  ([design 10](../../design/10-labels.md), [design 03](../../design/03-stack.md)). The position symbols only in the
  book and in studies.
- **Desktop first, phone usable** ([design 04](../../design/04-product-shape.md)): on a phone, reading the book and
  following a line work. Fine analysis by touch is not a goal for the phone.
- **Accessibility:** WCAG 2.2, level AA. No mark relies on colour alone: each label has its shape.
- **The site's text rules** (CLAUDE.md, "Writing the site's text"): strict Simplified Technical English for text that
  a player follows, its sentence rules for text that explains.
- **Timeline:** no date. The engine repository computes the final book after this design. The prototypes' books are
  the samples until then.

## Ethical stance

- **A study tool, not an engagement product.** The player chooses what to study and when to stop. No streaks, no
  reminders, no notifications, no badges for time spent in the book.
- **Understanding over dependence.** The book teaches the ideas and the reasons behind its moves, so that the player
  needs it less over time. It does not ask the player to memorize numbers. Its sentences come only from the book's
  facts, as the review's sentences come from engine facts (design 04), never from a language model.
- **Honest values.** The book shows the engine's uncertainty (the bounds, the symbol ∞ for an unclear position) and
  the engine's version. It says when a position is outside the book. It never presents the engine's view as settled
  theory.
- **Privacy:** every lookup stays in the browser. Analytics as [design 17](../../design/17-measurement.md): counts
  only, never a game or a line.

## Success

- From a reviewed game, a player reaches the point where the game left the book, and the book's moves there, in one
  action.
- In a study session, a player can follow the main line, open every fine alternative at a turn, and see each trap
  with its refutation, without leaving the board.
- After a study session, a player can play the main line's first three turns and name one trap and its refutation.
- The counts of design 17 show where players open the book (from a review, from the Analysis board, from the menu)
  and how many positions they look at in a visit.

## Open questions

- What have players said they want from an opening book, in messages, on the play sites, or in person?
- Does the explorer test the player on its lines (a drill), or does a drill wait for a later training feature?
