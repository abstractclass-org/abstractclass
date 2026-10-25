// A line drawn on the board one edge at a time (design 07): the engine's line, or a branch's preview. As KaTrain draws a
// line (its anim_pv_time): its first edge, then one more every LINE_STEP_MS, staying drawn at its end. The same line
// lengthened, as a search lengthens it while it shows, goes on from the edges drawn; another line starts again. All at
// once when asked, or when reduced motion is asked for.
export const LINE_STEP_MS = 500;

export class LineDrawing {
  shown = $state(0); // the edges drawn so far
  private drawn = { start: "", edges: [] as string[] }; // not state: each step must not run the drawing again

  /** Draws the line `edges` (their names) from the position `start` (its path key), or no line (null). Call it from an
   *  effect: it returns the effect's cleanup. */
  draw(start: string | null, edges: string[], instant: boolean): (() => void) | undefined {
    const n = start === null ? 0 : edges.length;
    const show = (k: number) => { this.shown = k; this.drawn = { start: start ?? "", edges: edges.slice(0, k) }; };
    if (start === null || instant || n <= 1 || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show(n);
      return;
    }
    const d = this.drawn;
    const same = d.start === start && d.edges.length <= n && d.edges.every((e, i) => e === edges[i]);
    const kept = same ? Math.max(1, d.edges.length) : 1;
    show(Math.min(kept, n));
    if (kept >= n) return;
    const timer = setInterval(() => { show(this.shown + 1); if (this.shown >= n) clearInterval(timer); }, LINE_STEP_MS);
    return () => clearInterval(timer);
  }
}
