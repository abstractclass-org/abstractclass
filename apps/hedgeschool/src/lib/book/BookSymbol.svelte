<script lang="ts" module>
  import type { PositionSymbol } from "./symbols.ts";
  // Informant's position symbols, drawn, not taken from a font: the site's font (system-ui: Segoe UI on Windows) has
  // no glyph for ⩲ and ⩱, so the browser takes them from another font, and they are blurry (the third prototype, the
  // branch abscls-tpaj.3). Each symbol is strokes on a grid 16 units high, as wide as it needs: sharp at every size.
  const plus = (x: number, y: number, r: number) => `M${x - r} ${y}H${x + r}M${x} ${y - r}V${y + r}`;
  const bar = (x0: number, x1: number, y: number) => `M${x0} ${y}H${x1}`;
  const SHAPES: Record<PositionSymbol, { width: number; d: string }> = {
    "=": { width: 12, d: bar(2, 10, 6) + bar(2, 10, 10.5) },
    "∞": { width: 16, d: "M8 8C10.5 4.5 14 4.5 14 8C14 11.5 10.5 11.5 8 8C5.5 4.5 2 4.5 2 8C2 11.5 5.5 11.5 8 8Z" },
    "⩲": { width: 12, d: plus(6, 4.5, 3) + bar(2, 10, 10.5) + bar(2, 10, 14) },
    "⩱": { width: 12, d: bar(2, 10, 2) + bar(2, 10, 5.5) + plus(6, 11.5, 3) },
    "±": { width: 12, d: plus(6, 6, 4) + bar(2, 10, 13.5) },
    "∓": { width: 12, d: bar(2, 10, 2.5) + plus(6, 10, 4) },
    "+−": { width: 22, d: plus(6, 8, 4) + bar(13, 20, 8) },
    "−+": { width: 22, d: bar(2, 9, 8) + plus(16, 8, 4) },
  };
  // Each side's symbols in a shade of its colour by their strength (site.css): = and ∞ in the text's colour, and the
  // stronger the position, the farther its shade from the text's colour
  const SHADES: Record<PositionSymbol, string> = {
    "⩲": "text-blue-slightly-better", "±": "text-blue-better", "+−": "text-blue-winning",
    "⩱": "text-red-slightly-better", "∓": "text-red-better", "−+": "text-red-winning", "=": "", "∞": "",
  };
</script>

<script lang="ts">
  // A position symbol (symbols.ts) and its words beside it (the table's title row). `alone`: the symbol with no words,
  // as Lichess shows its position symbols (a row's line end, design 32, item 3). Its words are then its title and its
  // accessible name, and its shade gives the side, as the words do beside it.
  import { SYMBOL_NAME } from "./symbols.ts";

  let { symbol, alone = false }: { symbol: PositionSymbol; alone?: boolean } = $props();
  const shape = $derived(SHAPES[symbol]);
  const name = $derived(alone ? SYMBOL_NAME[symbol] : undefined);
</script>

<span class={["inline-flex items-center gap-x-1", alone && SHADES[symbol]]} title={name} role={name && "img"} aria-label={name}>
  <svg class="flex-none" width="{shape.width / 16}em" height="1em" viewBox="0 0 {shape.width} 16" fill="none" stroke="currentColor"
       stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={shape.d} /></svg>
  {#if !name}<span>{SYMBOL_NAME[symbol]}</span>{/if}
</span>
