# Move sounds

**Status:** in force, built in the review. **Decided:** 2026-10-11, from Lichess's move sounds, the browsers' rules
for sound, and the owner's choice by ear among recorded strokes. **Changed:** 2026-10-12, the crayon replaced by a
button (the default) and a pencil, chosen in the display settings, each with one sound for an edge and another for an
edge that cuts.

## Context

A move that makes a sound feels placed. Lichess plays a sound for each move, and for each step through a game in its
analysis board, and its sound is on by default. Its sound sets are not free to take: its repository's `COPYING.md`
lists them under "Exceptions (non-free)" (the standard set), AGPLv3+ (Enigmahack's sets) or CC BY-NC-SA (one set).

Browsers start sound only after the visitor clicks or presses a key on the page (their autoplay rules).

How the sound was chosen (decisions/product.md, "Move sounds, and progress bars that show the work runs"):

- **Sounds made in the browser** came first (Web Audio: a tap, a snap for a cut, a chime for a closed region, in seven
  voices with a tuning). The owner did not like them.
- **Recorded strokes** followed: the owner liked the idea of a pencil. An eraser for a cut and colouring for a closed
  region, played with the edge's sound, sounded odd, so every edge has one sound.
- **A sound lab** played twelve sets of strokes, each cut from one public-domain (CC0) recording: seven of pencil, two
  of marker, one of crayon, and a first set of mixed pencil lines. The owner chose five crayon strokes. The lab was then
  removed: it had no more to choose.
- **The crayon was replaced** after use. The owner brought two recordings: pencil lines, and a phone keyboard's taps.
  The display settings offered both, so that they were compared where they play, on a walk through a game. The pencil
  stayed, shortened. The phone keyboard went: its recording is the phone's own sound (Alternatives). Real keyboards,
  recorded at home, sounded poor. The owner then chose two button sounds, to play together, one more often. After
  trying the weights both ways, the owner gave each a meaning: the more frequent for an edge, the other for an edge
  that cuts. The pencil followed: two fixed strokes, the lower for an edge, the higher for a cut.

## Decision

1. **An edge has one sound, and an edge that cuts has another,** in each set. They never play together: a cut plays
   its sound instead of the edge's. A closed region has none of its own.
2. **Two sets,** each cut with ffmpeg from the samples decoded once (seeking in an MP3 is not exact). Mono MP3 at
   64 kbps.
   - **Button** (the default), from Pixabay under the Pixabay Content License, each a press and its release (170 and
     130 milliseconds apart):
     - **An edge:** "Button Press" by DRAGON-STUDIO
       ([Pixabay 382713](https://pixabay.com/sound-effects/film-special-effects-button-press-382713/)), 0.29
       seconds, 3.0 KB.
     - **A cut:** "Select Button UI" by Emilianodleon
       ([Pixabay 395763](https://pixabay.com/sound-effects/film-special-effects-select-button-ui-395763/)), 0.26
       seconds, 2.5 KB.

     A clip starts 1 millisecond before its first sample over −60 dB, and ends when the release dies away under
     −60 dB, before a faint tail at the file's end (0.35 and 0.30 seconds into the files), with a 1-millisecond fade in
     and a 30-millisecond fade out. One gain for the two (+2.2 dB) keeps their own levels.
   - **Pencil:** two strokes from "Pencil_lines" by tmkappelt
     ([Freesound 85702](https://freesound.org/people/tmkappelt/sounds/85702/), CC0). A stroke is found where its level
     passes −64 dB (22 dB under the loudest stroke, 6 dB over the recording's floor). Each stroke opens with 60 to 90
     milliseconds of quiet scratching, about 17 dB under its peak, before it rises: the clip starts 50 milliseconds
     after the stroke's start, so that it is shorter and its peak comes sooner after the move. It ends 30 milliseconds
     after the level falls back, with an 8-millisecond fade in and a 30-millisecond fade out. Each stroke's gain puts
     its loudest 400-millisecond window (EBU R128's momentary loudness) at −28.7 LUFS, the button's level (−28.6 and
     −28.8 LUFS): +19.3 dB for the edge's stroke, +16.9 dB for the cut's. The pencil's scratching is loud for its
     whole length, and the button is two short clicks, so at equal peaks the pencil was about 10 LU louder.
     - **An edge:** the stroke from 1.24 seconds, 0.31 seconds long, at its own speed.
     - **A cut:** the stroke from 0.72 seconds, played 12% faster: two semitones higher, 0.27 seconds long.

     The recording's four strokes are about as bright as each other: their spectral centroids, weighted by energy, lie
     within 2% (5,400 to 5,510 Hz). The edge's stroke is the darkest and the cut's the brightest, but by ear the speed
     makes the difference.
3. **The display settings choose the set** ("Sound", in the Sound group: Button, then Pencil). A change plays the new
   set's edge sound.
4. **The sounds are fixed:** no random choice and no change of speed, so that a cut is told by ear.
5. **When:** a step one move on, from any key or button, plays the sound, and so do a move played (the player's own
   edge, a candidate played by Space or a double-click, a line played from the list) and a move clicked in the move
   list. Other jumps are silent: back, the start and the end, the chart, the
   fork keys, the line beside. A click on the place already on screen is silent too: the sound plays only when the
   board changes. So holding → plays one sound a step, and the animated engine line plays none.
6. **On by default,** as on Lichess, at the owner's volume (0.4), with a "Move sounds" switch and a volume slider in
   the display settings' Sound group. A change of volume plays a clip at the new level. Nothing plays before the
   visitor's first click or key.

## Why

- **A button for the default:** short and dry, so a fast walk through a game stays clear.
- **A cut has its own sound.** A cut changes the board more than an edge does, and a walk through a game then tells
  it by ear. The first idea, an eraser played with the edge's sound, sounded odd because two sounds played at once.
  One sound instead of the other does not.
- **A drawn stroke fits the game.** An edge is a line drawn between two points, as on paper.
- **Shorter than the recording's strokes:** the owner found the whole stroke a little long. A speed-up of 5% would cut
  only 18 milliseconds and raise the pitch. Leaving out the quiet start cuts 60, and the stroke's peak comes sooner.
- **One sound for every edge.** Two sounds at once (an edge and a cut, or an edge and a chime) sounded odd.
- **Fixed sounds,** not a random choice among strokes: the first sets varied their clip and speed so that a walk did
  not sound mechanical, but a varied sound cannot carry a meaning. The two sounds alternate with the game's cuts.
- **Chosen by ear, where it plays.** A sound is hard to describe and easy to compare. A choice in the display settings
  compares the sets on a real game, which a separate lab did not.
- **Free to ship.** CC0 needs no attribution and has no conditions. The Pixabay Content License needs none either, and
  forbids only selling or sharing a sound on its own. The button sounds are their sound designers' own: their pages
  name no product. The sources are named here and on the notices page all the same.
- **Silent jumps** keep a fast walk through a game from turning into noise.

## Alternatives

- **Sounds made in the browser:** no files, but the owner did not like them.
- **A phone keyboard's taps:** "iPhone Keyboard Typing Sound Effect" by u_a4gfvwagf1 (Pixabay 336778, the Pixabay
  Content License). The recording is digital, the phone's own keyboard sound captured from the device: 55 taps of one
  peak with digital silence between them. Pixabay's licence comes from its uploader, and Pixabay leaves other rights
  in a sound (here, the phone maker's) to the user to check. Removed.
- **Real keyboards,** recorded under CC0: on Freesound (stu556's MX Brown 450282, SamsterBirdies' MX Blue 489424,
  khenshom's MacBook Pro 565645, grcekh's WhiteFox 546167, Trollarch2's 331656), most in a poor room sound, and
  Joseph Sardin's studio recordings on BigSoundBank (slow MacBook, MacBook Pro, iMac, Raspberry Pi and desktop
  keyboards, a typewriter's key). Not taken: the owner chose the button.
- **Clicks made for interfaces** under CC0: Kenney's UI Audio and Interface Sounds. Not taken, for the same reason.
- **Crayon strokes,** the first choice: five strokes from "Crayon Drawing on Paper" by wstarling
  ([Freesound 871478](https://freesound.org/s/871478/), CC0). Replaced after use.
- **Pencil and marker strokes** (the lab's other sets): from Freesound (123jorre456 46624, GeorgeHopkins 650994,
  JelloApocalypse 802603, thisisjoewells 463848, tosha73 509827, SholeColtis 683424, zembacraftworks 428338) and
  BigSoundBank (Joseph Sardin: pencils 0221, 3233, 3235, 3237, 3238, markers 0220, 0807), all CC0.
- **An eraser for a cut and colouring for a closed region:** odd with the edge's sound at once.
- **Lichess's sounds:** not free (above).
- **Sounds only for the moves the player plays,** and **off by default:** quieter, but a walk through the game loses
  its feel, and most visitors would never find the switch.

## Consequences

- The site ships four small sound files (`static/sounds/button/` and `static/sounds/pencil/`, `edge.mp3` and
  `cut.mp3` in each, about 11 KB), and downloads the chosen set's when sound is on. A browser without Web Audio stays
  silent.
- A set adds its two files and a line in `MOVE_SOUNDS`, with each sound's speed.
- A browser that kept "Pencil" from the trial keeps it: the default changes only where nothing was chosen.
- The puzzles and the lessons can use the same sound later (decisions/open-items.md).

## Where it is

- `static/sounds/button/`, `static/sounds/pencil/`: the clips.
- `src/lib/sound.ts`: the sets (`MOVE_SOUNDS`, with each sound's speed, and `MOVE_SOUND_NAMES`), `preload` and
  `playMove`, with the sources and the clips' times.
- `packages/review/src/ReviewView.svelte`: when the sound plays (`setPath`), and the Sound group of the display
  settings. `src/lib/review/enclosureView.ts` (`sounds`): whether the move cuts, which chooses the cut's sound.
- `src/lib/review/display.ts`: `sound`, `moveSound` and `volume`.

## Log entries

- [decisions/product.md](../decisions/product.md), "Move sounds, and progress bars that show the work runs", "Move
  sounds: the crayon replaced by a pencil and a keyboard", "Move sounds: the pencil shortened, the phone keyboard
  removed", "Move sounds: the button", "Move sounds: a sound for a cut".
