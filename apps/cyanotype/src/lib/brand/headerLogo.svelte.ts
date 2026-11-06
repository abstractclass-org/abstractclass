// A logo before the site's name in the header (src/routes/+layout.svelte). Only the logo lab's frame
// (/lab/logos/frame, abscls-8tl1.44) sets it, to show an option in the site's real header. Elsewhere the header has the
// wordmark alone, until the logo is chosen.
import type { Snippet } from "svelte";

export const headerLogo = $state<{ mark: Snippet | null }>({ mark: null });
