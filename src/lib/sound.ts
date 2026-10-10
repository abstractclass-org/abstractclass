// Move sounds (design 08): a crayon stroke, one sound for every edge. Five strokes cut from one recording released as
// CC0 (public domain): "Crayon Drawing on Paper" by wstarling (freesound.org/s/871478), at 4.32, 14.87, 36.6, 83.19 and
// 97.52 seconds. They sound alike but not the same, as one hand's strokes. Each move plays one, never the one just
// played, at a speed varied by up to 3%, so that a walk through a game does not sound mechanical. Browsers start sound
// only after the visitor's first click or key.

const CLIPS = [1, 2, 3, 4, 5].map(n => `/sounds/crayon/${n}.mp3`);
let ctx: AudioContext | null = null;
let files: Promise<ArrayBuffer>[] | null = null;
let buffers: Promise<AudioBuffer>[] | null = null;
let last = -1;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null; // no Web Audio here: silence
  }
}

/** Fetches the strokes ahead, so that the first move's sound is not late. Decoding waits for the first sound. */
export function preload() {
  files ??= CLIPS.map(url => fetch(url).then(r => r.arrayBuffer()));
}

/** A move's sound at a volume from 0 to 1: a stroke, not the last one played, at a speed varied by up to 3%. */
export async function playMove(volume: number) {
  const a = audio();
  if (!a || volume <= 0) return;
  preload();
  buffers ??= files!.map(f => f.then(data => a.decodeAudioData(data.slice(0))));
  const choices = CLIPS.map((_, k) => k).filter(k => k !== last);
  const k = choices[Math.floor(Math.random() * choices.length)];
  last = k;
  try {
    const src = a.createBufferSource();
    src.buffer = await buffers[k];
    src.playbackRate.value = 1 + (Math.random() * 2 - 1) * 0.03;
    const gain = a.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(a.destination);
    src.start();
  } catch {
    // a stroke that does not load stays silent
  }
}
