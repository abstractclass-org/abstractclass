"""Plays the board lab's games (src/lib/board/games.json): the engine repository's alpha-beta bot for Tak
(games/tak/README.md there) against itself, one game for each size and seed, to a fixed depth, so that the same commit
plays the same games again. Each game gives its moves in PTN and the TPS after each ply. No playtak game, and no
player's name.

It needs the engine repository's rules module for Tak (core/binding/build.sh tak), and runs from that repository's root:

    PYTHONPATH=. .venv-linux/bin/python <this file> COMMIT SIZE:SEED:DEPTH:PLY,PLY... ... > games.json

COMMIT is the engine repository's commit that it runs on. Each other argument plays one game, and games.json gets the
position after each of the plies that it names, with the commit and this command. A job of more than a minute goes
through the planning repository's scripts/machine run.
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


def lab_positions(specs):
    """The positions of games.json, from the arguments SIZE:SEED:DEPTH:PLY,PLY..."""
    for spec in specs:
        size, seed, depth, plies = spec.split(":")
        game = play(int(size), int(seed), int(depth))
        for ply in map(int, plies.split(",")):
            yield {"size": game["size"], "seed": game["seed"], "depth": game["depth"], "ply": ply,
                   "plies": len(game["moves"]), "result": game["result"], "tps": game["tps"][ply]}


if __name__ == "__main__":
    commit, *specs = sys.argv[1:]
    command = "PYTHONPATH=. .venv-linux/bin/python board-games.py " + " ".join(sys.argv[1:])
    head = [f'  "commit": {json.dumps(commit)},', f'  "command": {json.dumps(command)},', '  "positions": [']
    rows = ",\n".join("    " + json.dumps(position) for position in lab_positions(specs))
    print("\n".join(["{", *head, rows, "  ]", "}"]))
