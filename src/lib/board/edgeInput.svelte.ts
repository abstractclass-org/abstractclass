// Entering an edge with two clicks: a first point, then a second within 3 units (the rules' box). Clicking the first
// point again cancels. A second point farther than 3 starts over from it. The engine's rules will refuse illegal
// edges when the engine protocol gives them (docs/requests/02-engine-protocol.md).
import type { Edge } from "#lib/review/model.ts";

export class EdgeInput {
  pending = $state<[number, number] | null>(null);

  constructor(private onedge: (edge: Edge) => void) {}

  click = (x: number, y: number) => {
    if (!this.pending) { this.pending = [x, y]; return; }
    const [px, py] = this.pending;
    const d = Math.max(Math.abs(px - x), Math.abs(py - y));
    if (d === 0) { this.pending = null; return; }
    if (d > 3) { this.pending = [x, y]; return; }
    this.pending = null;
    this.onedge([px, py, x, y]);
  };

  reset = () => { this.pending = null; };
}
