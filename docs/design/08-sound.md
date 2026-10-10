# Move sounds

**Status:** in force, built in the review. **Decided:** 2026-10-11, from Lichess's move sounds, the browsers' rules
for sound, and the owner's choice by ear among recorded strokes.

## Context

A move that makes a sound feels placed. Lichess plays a sound for each move, and for each step through a game in its
analysis board, and its sound is on by default. Its sound sets are not free to take: its repository's `COPYING.md`
lists them under "Exceptions (non-free)" (the standard set), AGPLv3+ (Enigmahack's sets) or CC BY-NC-SA (one set).

Browsers start sound only after the visitor has clicked or pressed a key on the page (their autoplay rules).

How the sound was chosen (decisions/product.md, "Move sounds, and progress bars that show the work runs"):

- **Sounds made in the browser** came first (Web Audio: a tap, a snap for a cut, a chime for a closed region, in seven
  voices with a tuning). The owner did not like them.
- **Recorded strokes** followed: the owner liked the idea of a pencil. An eraser for a cut and colouring for a closed
  region, played with the edge's sound, sounded odd, so every edge has one sound.
- **A sound lab** played twelve sets of strokes, each cut from one public-domain (CC0) recording: seven of pencil, two
  of marker, one of crayon, and a first set of mixed pencil lines. The owner chose five crayon strokes. The lab was then
  removed: it had no more to choose.

## Decision

1. **An edge sounds like a crayon stroke,** recorded. Every edge has this one sound: a cut and a closed region have
   none of their own.
2. **Five strokes from one recording:** "Crayon Drawing on Paper" by wstarling
   ([Freesound 871478](https://freesound.org/s/871478/), CC0), at 4.32, 14.87, 36.6, 83.19 and 97.52 seconds, taken
   from Freesound's public preview (its downloads need an account, and CC0 covers any copy). They were cut with
   ffmpeg: the strokes found by their silences (a threshold 30 dB under the recording's peak), each at most 0.55
   seconds with a 4-millisecond fade in and a fade out, one gain for the set (its middle stroke at −4 dB), mono MP3 at
   64 kbps. They last 0.17 to 0.29 seconds, 1.9 to 3.0 KB each.
3. **Each move plays one of the five,** never the one just played, at a speed varied by up to 3%, so that a walk
   through a game does not repeat one sound.
4. **When:** a step one move on, from any key or button, plays the sound, and so do a move played (the player's own
   edge, a candidate played by Space or a double-click, a line played from the list) and a move clicked in the move
   list. Other jumps are silent: back, the start and the end, the chart, the fork keys, the line beside. So holding →
   plays one sound a step, and the animated engine line plays none.
5. **On by default,** as on Lichess, at the owner's volume (0.4), with a "Move sounds" switch and a volume slider in
   the display settings' Sound group. A change of volume plays a stroke at the new level. Nothing plays before the
   visitor's first click or key.

## Why

- **A drawn stroke fits the game.** An edge is a line drawn between two points, as on paper.
- **One sound for every edge.** Two sounds at once (an edge and a cut, or an edge and a chime) sounded odd.
- **Strokes from one recording** sound like one hand's strokes: alike, not the same. One clip, repeated at every step,
  soon sounds mechanical.
- **Chosen by ear.** A sound is hard to describe and easy to compare, so the owner chose by listening.
- **Free to ship.** CC0 needs no attribution and has no conditions. The source is named here all the same.
- **Silent jumps** keep a fast walk through a game from turning into noise.

## Alternatives

- **Sounds made in the browser:** no files, but the owner did not like them.
- **Pencil and marker strokes** (the lab's other sets): from Freesound (123jorre456 46624, GeorgeHopkins 650994,
  JelloApocalypse 802603, thisisjoewells 463848, tosha73 509827, SholeColtis 683424, zembacraftworks 428338) and
  BigSoundBank (Joseph Sardin: pencils 0221, 3233, 3235, 3237, 3238, markers 0220, 0807), all CC0.
- **An eraser for a cut and colouring for a closed region:** odd with the edge's sound at once.
- **Lichess's sounds:** not free (above).
- **Sounds only for the moves the player plays,** and **off by default:** quieter, but a walk through the game loses
  its feel, and most visitors would never find the switch.

## Consequences

- The site ships five small sound files (`static/sounds/crayon/`, about 11 KB), fetched when sound is on. A browser
  without Web Audio stays silent.
- The puzzles and the lessons can use the same sound later (decisions/open-items.md).

## Where it is

- `static/sounds/crayon/`: the five strokes.
- `src/lib/sound.ts`: `preload` and `playMove`, with the source and the strokes' times.
- `src/lib/review/ReviewView.svelte`: when the sound plays (`setPath`), and the Sound group of the display settings.
- `src/lib/review/display.ts`: `sound` and `volume`.

## Log entries

- [decisions/product.md](../decisions/product.md), "Move sounds, and progress bars that show the work runs".
