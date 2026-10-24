# The book explorer: user stories

Each story names the player's situation ([context-book-explorer.md](context-book-explorer.md), "Users"), what the
player wants and why. "Done when" gives the test that the design must pass.

## After a game

1. **Where my game left the book.** As a player who reviews a game, I want to see the turn where my game left the
   book, so that I know where my opening went its own way.
   - Done when: the review marks the last book move of the game, and one action opens the book at that position.
2. **My move against the book's moves.** As that player, I want to compare my move at that point with the book's
   moves, with their values, so that I see what my move cost and what to play next time.
   - Done when: the book's moves and my move are in one table, each value with its source.
3. **Who left first, and the traps.** As that player, I want to see if my opponent left the book first, and if one of
   us fell into a trap, so that I learn the punishment that I missed or that I met.
   - Done when: the review names the side that left the book first, and a trap in the game shows its refutation.
4. **Back to my game.** As that player, I want to explore the book from my game's position and then come back to the
   game where I left it, so that the book does not lose my place in the review.
   - Done when: one action returns to the review at the same move, with the review's state kept.

## Study

5. **The main line.** As a player who studies the opening, I want to see the book's main line from the start, so that
   I have one line to learn first.
   - Done when: the main line plays through on the board, one edge at a time, from the start to its end.
6. **Every fine move, compared.** As that player, I want to see all the fine moves at a position, with their label,
   their win chance and the symbol at the end of their line, so that I can choose the lines that suit my play.
   - Done when: every book move of the position is visible at once, sorted from the best, with the same marks as the
     review's.
7. **What a move does.** As that player, I want to step through a line on the board with the area map, so that I see
   what each edge takes and gives.
   - Done when: each step shows the board and its area map, and the line's next edges are drawn on hover.
8. **The traps.** As that player, I want to see the traps at a position, why each one tempts and how the opponent
   refutes it, so that I avoid them and can set them.
   - Done when: a trap shows its value at a short look and at the deep look, and one action plays its refutation.
9. **Where I am.** As that player, I want to know where I am in the tree and go back to any earlier position, so that
   the branches do not lose me.
   - Done when: the path from the start to the position on screen is visible, and each step of it is one action away.
10. **One position, two move orders.** As that player, I want to know when two move orders reach the same position,
    so that I learn positions, not only sequences.
    - Done when: a position reached by more than one line says so and lists the other lines.
11. **Why this move.** As that player, I want each book move's idea in words, so that I understand why it is good, not
    only that it is.
    - Done when: each book move has a short explanation built from the engine's facts, or the design records why it
      has none.
12. **A sound start.** As a new player, I want one recommended first move and reply, with its reason, and the detail
    hidden until I ask, so that I start well without theory.
    - Done when: a first view shows the main line and its reason, and the values and bounds open on request.

## Preparation

13. **My lines, kept.** As a player who prepares for an event, I want to mark the lines that I play as Blue and as Red
    and find them again later, so that I can review them before the event.
    - Done when: the marked lines stay in the browser, and one view lists them for each side.
14. **Where the book is unsure.** As that player, I want the exact values, the bounds and the unclear positions, so
    that I know which lines need my own analysis.
    - Done when: the bounds and the symbol ∞ are visible on request at every book position.
15. **Beyond the book.** As that player, I want to take a book position to the Analysis board and search further, so
    that I can go past the book's end.
    - Done when: one action opens the Analysis board at the position, with the line that leads to it.
16. **Test myself.** As that player, I want to play my lines against the book and be told when I leave them, so that
    I know them before the event.
    - Done when: a drill plays the opponent's book moves and marks each move of mine that leaves my lines.
17. **A position to share.** As that player, I want to send a book position to a friend by a link, so that we can
    discuss it.
    - Done when: the address names the position, and the link opens the book there.

## An idea on the board

18. **In the book or not.** As a player on the Analysis board, I want to know at once if the position on screen is in
    the book, and the book's moves there, so that I do not wait for the live engine.
    - Done when: the book's moves show as soon as the position is on screen, before any search ends.
19. **How far from the book.** As that player, when my move leaves the book, I want to see that it left and how far
    its value is from the book's moves, so that I can judge my idea.
    - Done when: the move list marks the first move outside the book, and the live engine's value of that move shows
      beside the book's best.
