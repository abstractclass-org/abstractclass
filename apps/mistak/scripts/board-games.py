"""Plays the board lab's games (src/lib/board/games.json): the engine repository's alpha-beta bot for Tak
(games/tak/README.md there) against itself, one game for each size and seed, to a fixed depth, so that the same commit
plays the same games again. Each game gives its moves in PTN and the TPS after each ply. No playtak game, and no
player's name.

It needs the engine repository's rules module for Tak (core/binding/build.sh tak), and runs from that repository's root:

    PYTHONPATH=. .venv-linux/bin/python <this file> SIZE:SEED:DEPTH... > games.json

A job of more than a minute goes through the planning repository's scripts/machine run.
"""

import json
import random
import sys

from games.tak.rules import AlphaBeta, Position


def play(size, seed, depth):
    """One game: its moves in PTN, the TPS after each ply (the start's first), and how it ended."""
    position, search, draw = Position(size, size), AlphaBeta(seed=seed), random.Random(seed)
    moves, tps = [], [" ".join(position.position_text().split()[:3])]
    while not position.is_terminal() and len(moves) < 300:
        # The first two plies, the swap opening, are drawn: the search would play each game from the same corner.
        action = draw.choice(position.legal_actions()) if len(moves) < 2 else search.search(position, max_depth=depth).action
        moves.append(position.action_text(action))
        position.apply_action(action)
        tps.append(" ".join(position.position_text().split()[:3]))
    return {"size": size, "seed": seed, "depth": depth, "moves": moves, "tps": tps, "ending": position.ending(),
            "result": position.result_text(0)}


if __name__ == "__main__":
    json.dump([play(*map(int, spec.split(":"))) for spec in sys.argv[1:]], sys.stdout, indent=1)
