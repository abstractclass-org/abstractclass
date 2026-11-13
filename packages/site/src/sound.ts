// Move sounds (Hedge School's design 08), on every site: a move has one sound, and a move that removes the
// opponent's pieces has another (Enclosure's edge that cuts, Blueprints' placement that captures), from a set that the
// display settings choose. Each site serves the clips from its own static folder, at the paths below: Cyanotype's
// are Hedge School's, byte for byte (its sound.test.ts).
// - Button (the default), from Pixabay under the Pixabay Content License: "Button Press" by DRAGON-STUDIO (382713) for
//   a move, "Select Button UI" by Emilianodleon (395763) for a removal.
// - Pencil: two strokes from "Pencil_lines" by tmkappelt (freesound.org/s/85702, CC0), each without its first 60 ms
//   of quiet scratching: the one from 1.24 seconds for a move, the one from 0.72 seconds for a removal, played 12%
//   faster (two semitones higher). The recording's strokes are about as bright as each other, so the speed makes the
//   removal's higher pitch.
// Each sound is fixed, so that a removal is told by ear. Browsers start sound only after the visitor's first click or
// key.

interface Clip {
  url: string;
  rate: number; // the playback speed, which also sets the pitch
}

// The files keep Hedge School's names: `edge` for a move, `cut` for a removal.
export const MOVE_SOUNDS = {
  button: { move: { url: "/sounds/button/edge.mp3", rate: 1 }, removal: { url: "/sounds/button/cut.mp3", rate: 1 } },
  pencil: { move: { url: "/sounds/pencil/edge.mp3", rate: 1 }, removal: { url: "/sounds/pencil/cut.mp3", rate: 1.12 } },
} satisfies Record<string, Record<"move" | "removal", Clip>>;
export type MoveSound = keyof typeof MOVE_SOUNDS;
/** The sets' names in the display settings, in their order there. The choice shows when there are two or more. */
export const MOVE_SOUND_NAMES: Record<MoveSound, string> = { button: "Button", pencil: "Pencil" };
/** Whether a kept value is one of the sets (the display settings' `isSound`). */
export const isMoveSound = (s: unknown): s is MoveSound => typeof s === "string" && s in MOVE_SOUNDS;

const KINDS = ["move", "removal"] as const;
let ctx: AudioContext | null = null;
const files: Partial<Record<MoveSound, Promise<ArrayBuffer>[]>> = {};
const buffers: Partial<Record<MoveSound, Promise<AudioBuffer>[]>> = {};

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null; // no Web Audio here: silence
  }
}

/** Fetches a set's two sounds ahead, so that the first move's sound is not late. Decoding waits for the first sound. */
export function preload(set: MoveSound) {
  files[set] ??= KINDS.map(kind => fetch(MOVE_SOUNDS[set][kind].url).then(r => r.arrayBuffer()));
}

/** A move's sound at a volume from 0 to 1: the set's sound for a move, or for a move that removes the opponent's
 *  pieces. */
export async function playMove(volume: number, set: MoveSound, removal = false) {
  const a = audio();
  if (!a || volume <= 0) return;
  preload(set);
  const decoded = buffers[set] ??= files[set]!.map(f => f.then(data => a.decodeAudioData(data.slice(0))));
  const kind = removal ? 1 : 0;
  try {
    const src = a.createBufferSource();
    src.buffer = await decoded[kind];
    src.playbackRate.value = MOVE_SOUNDS[set][KINDS[kind]].rate;
    const gain = a.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(a.destination);
    src.start();
  } catch {
    // a sound that does not load stays silent
  }
}
